import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionDep
from app.core.dates import MONTH_PATTERN, month_bounds, previous_month_start
from app.core.security import require_api_key
from app.models.accounts import Account
from app.models.monthly_balances import MonthlyBalance
from app.models.movements import Movement, MovementKind
from app.models.surplus_allocation_rules import SurplusAllocationRule
from app.month_close.balances import balances_as_of
from app.month_close.interest import CENTS, plan_interest
from app.month_close.recurrence_runner import generate_recurring_movements
from app.month_close.schemas import MonthCloseRequest, MonthCloseResult, MonthlyBalanceRead
from app.month_close.surplus import plan_month_close
from app.movements.schemas import MovementRead

router = APIRouter(
    prefix="/month-close", tags=["month-close"], dependencies=[Depends(require_api_key)]
)


async def get_primary_account_or_422(session: AsyncSession) -> Account:
    """The close has to know where uncovered money lives, so a primary account
    is a precondition rather than something to guess."""
    result = await session.execute(select(Account).where(Account.is_primary.is_(True)))
    account = result.scalars().first()
    if account is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "no primary account is set; mark one account as primary first",
        )
    return account


async def reject_if_already_closed(session: AsyncSession, month_start: date) -> None:
    """Refuse a second close for the same month before touching anything.

    The unique index on (account_id, period_month) would stop it anyway, but
    only after the recurring movements had been generated, so this check keeps
    a double click from leaving the month half closed.
    """
    result = await session.execute(
        select(MonthlyBalance.id).where(MonthlyBalance.period_month == month_start)
    )
    if result.scalars().first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "this month is already closed")


@router.get("")
async def get_monthly_balances(
    session: SessionDep,
    month: str | None = Query(default=None, pattern=MONTH_PATTERN, description="YYYY-MM"),
) -> list[MonthlyBalanceRead]:
    stmt = select(MonthlyBalance).order_by(MonthlyBalance.period_month.desc())
    if month is not None:
        month_start, _ = month_bounds(month)
        stmt = stmt.where(MonthlyBalance.period_month == month_start)
    result = await session.execute(stmt)
    return [MonthlyBalanceRead.model_validate(balance) for balance in result.scalars()]


@router.post("", status_code=status.HTTP_201_CREATED)
async def run_month_close(payload: MonthCloseRequest, session: SessionDep) -> MonthCloseResult:
    """Close a month: generate what the templates owe, redistribute the result
    and snapshot every balance. One transaction, so either all of it lands or
    none of it does.
    """
    month_start, next_month_start = month_bounds(payload.month)
    closing_date = next_month_start - timedelta(days=1)

    await reject_if_already_closed(session, month_start)
    primary_account = await get_primary_account_or_422(session)

    # 1. Recurring movements first, so the month they belong to counts them.
    generated, deactivated = await generate_recurring_movements(session, closing_date)
    await session.flush()

    # 2. The month's own result, transfers excluded (they move nothing new).
    result = await session.execute(
        select(Movement).where(
            Movement.occurred_on >= month_start, Movement.occurred_on < next_month_start
        )
    )
    month_movements = list(result.scalars())
    rules = (await session.execute(select(SurplusAllocationRule))).scalars().all()
    plan = plan_month_close(month_movements, list(rules), primary_account.id)

    transfers = [
        Movement(
            kind=MovementKind.TRANSFER,
            amount=planned.amount,
            occurred_on=closing_date,
            description=f"Month close {payload.month}",
            account_id=planned.account_id,
            counterparty_account_id=planned.counterparty_account_id,
            category_id=None,
            origin=planned.origin,
        )
        for planned in plan.transfers
    ]
    session.add_all(transfers)
    await session.flush()

    # 3. Interest and the snapshot, both computed at the closing date.
    accounts = list((await session.execute(select(Account))).scalars())
    previous_closing_balances = await get_previous_closing_balances(session, month_start)
    accruals = {
        accrual.account_id: accrual.amount
        for accrual in plan_interest(accounts, previous_closing_balances)
    }

    result = await session.execute(select(Movement).where(Movement.occurred_on < next_month_start))
    balances = balances_as_of(
        {account.id: account.initial_balance for account in accounts}, list(result.scalars())
    )
    # Interest is not a movement, so recomputing a balance from the movements
    # alone would drop every previous month's interest and compound interest
    # would never actually compound. Carry the accrued total forward.
    earned_before = await get_accrued_interest(session, month_start)
    snapshots = [
        MonthlyBalance(
            account_id=account.id,
            period_month=month_start,
            closing_balance=round(
                balances[account.id]
                + earned_before.get(account.id, 0.0)
                + accruals.get(account.id, 0.0),
                CENTS,
            ),
            interest_accrued=accruals.get(account.id, 0.0),
        )
        for account in accounts
    ]
    session.add_all(snapshots)
    await commit_or_409(session)

    for db_object in [*generated, *transfers, *snapshots]:
        await session.refresh(db_object)
    return MonthCloseResult(
        month=payload.month,
        surplus=plan.surplus,
        generated_recurring=[MovementRead.model_validate(movement) for movement in generated],
        transfers=[MovementRead.model_validate(movement) for movement in transfers],
        monthly_balances=[MonthlyBalanceRead.model_validate(snapshot) for snapshot in snapshots],
        deactivated_templates=deactivated,
    )


async def get_accrued_interest(session: AsyncSession, month_start: date) -> dict[uuid.UUID, float]:
    """Interest each account has earned in every close before this month."""
    result = await session.execute(
        select(MonthlyBalance.account_id, func.sum(MonthlyBalance.interest_accrued))
        .where(MonthlyBalance.period_month < month_start)
        .group_by(MonthlyBalance.account_id)
    )
    return {account_id: float(total) for account_id, total in result.all()}


async def get_previous_closing_balances(
    session: AsyncSession, month_start: date
) -> dict[uuid.UUID, float]:
    """Last month's snapshot, which is the base compound interest grows on."""
    result = await session.execute(
        select(MonthlyBalance).where(
            MonthlyBalance.period_month == previous_month_start(month_start)
        )
    )
    return {balance.account_id: balance.closing_balance for balance in result.scalars()}


async def commit_or_409(session: AsyncSession) -> None:
    """Commit, translating the one-snapshot-per-month index into a 409.

    The upfront check already covers the normal case; this catches two closes
    racing each other.
    """
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "this month is already closed") from exc
