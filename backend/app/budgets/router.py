import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.budgets.schemas import BudgetCreate, BudgetRead, BudgetStatusRead, BudgetUpdate
from app.core.database import SessionDep
from app.core.dates import MONTH_PATTERN, month_bounds
from app.core.security import require_api_key
from app.models.budgets import Budget
from app.models.movements import Movement, MovementKind

router = APIRouter(prefix="/budgets", tags=["budgets"], dependencies=[Depends(require_api_key)])

CENTS = 2


async def get_budget_or_404(session: AsyncSession, budget_id: uuid.UUID) -> Budget:
    db_budget = await session.get(Budget, budget_id)
    if db_budget is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Budget not found")
    return db_budget


async def commit_or_conflict(session: AsyncSession) -> None:
    """Commit, separating the two ways a budget can be invalid: a second budget
    for a category that already has one (409) and a category that doesn't exist
    at all (422)."""
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        cause = exc.orig.__cause__ if exc.orig is not None else None
        constraint = getattr(cause, "constraint_name", None)
        if constraint == "budgets_one_per_category":
            raise HTTPException(
                status.HTTP_409_CONFLICT, "this category already has a budget"
            ) from exc
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "category_id does not reference an existing row",
        ) from exc


async def get_spent_per_category(
    session: AsyncSession, month_start: date, next_month_start: date
) -> dict[uuid.UUID, float]:
    """Expenses per category within the month, summed by Postgres.

    Only `expense` movements count: an income or a transfer in a category would
    otherwise cancel out spending that really happened.
    """
    result = await session.execute(
        select(Movement.category_id, func.sum(Movement.amount))
        .where(
            Movement.kind == MovementKind.EXPENSE,
            Movement.occurred_on >= month_start,
            Movement.occurred_on < next_month_start,
        )
        .group_by(Movement.category_id)
    )
    return {category_id: float(total) for category_id, total in result.all() if category_id}


@router.get("")
async def get_budgets(
    session: SessionDep,
    month: str | None = Query(default=None, pattern=MONTH_PATTERN, description="YYYY-MM"),
) -> list[BudgetStatusRead]:
    """Every budget with the month's spending against it, defaulting to the
    current month — that is the only one the user is still able to change."""
    requested_month = month or date.today().strftime("%Y-%m")
    month_start, next_month_start = month_bounds(requested_month)
    spent_per_category = await get_spent_per_category(session, month_start, next_month_start)

    result = await session.execute(select(Budget))
    budgets = []
    for budget in result.scalars():
        spent = spent_per_category.get(budget.category_id, 0.0)
        budgets.append(
            BudgetStatusRead(
                id=budget.id,
                category_id=budget.category_id,
                monthly_limit=budget.monthly_limit,
                month=requested_month,
                spent=round(spent, CENTS),
                remaining=round(budget.monthly_limit - spent, CENTS),
            )
        )
    return budgets


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_budget(budget: BudgetCreate, session: SessionDep) -> BudgetRead:
    db_budget = Budget(**budget.model_dump())
    session.add(db_budget)
    await commit_or_conflict(session)
    await session.refresh(db_budget)
    return BudgetRead.model_validate(db_budget)


@router.patch("/{budget_id}")
async def update_budget(
    budget_id: uuid.UUID, budget: BudgetUpdate, session: SessionDep
) -> BudgetRead:
    db_budget = await get_budget_or_404(session, budget_id)
    for key, value in budget.model_dump(exclude_unset=True).items():
        setattr(db_budget, key, value)
    await commit_or_conflict(session)
    await session.refresh(db_budget)
    return BudgetRead.model_validate(db_budget)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(budget_id: uuid.UUID, session: SessionDep) -> None:
    db_budget = await get_budget_or_404(session, budget_id)
    await session.delete(db_budget)
    await session.commit()
