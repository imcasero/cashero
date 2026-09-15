import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionDep
from app.core.security import require_api_key
from app.models.movements import Movement
from app.movements.schemas import (
    MovementCreate,
    MovementRead,
    MovementUpdate,
    check_category_shape,
    check_counterparty_account_shape,
)

router = APIRouter(
    prefix="/movements", tags=["movements"], dependencies=[Depends(require_api_key)]
)

MONTH_PATTERN = r"^\d{4}-(0[1-9]|1[0-2])$"


async def get_movement_or_404(session: AsyncSession, movement_id: uuid.UUID) -> Movement:
    db_movement = await session.get(Movement, movement_id)
    if db_movement is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Movement not found")
    return db_movement


async def commit_or_422(session: AsyncSession) -> None:
    """Commit, translating a bad foreign key into a 422."""
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "account_id, counterparty_account_id or category_id does not "
            "reference an existing row",
        ) from exc


def month_bounds(month: str) -> tuple[date, date]:
    """'YYYY-MM' -> (first day of that month, first day of the next month)."""
    year, month_num = (int(part) for part in month.split("-"))
    start = date(year, month_num, 1)
    end = date(year + (month_num == 12), month_num % 12 + 1, 1)
    return start, end


@router.get("")
async def get_movements(
    session: SessionDep,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    month: str | None = Query(default=None, pattern=MONTH_PATTERN, description="YYYY-MM"),
) -> list[MovementRead]:
    stmt = select(Movement)
    if account_id is not None:
        stmt = stmt.where(Movement.account_id == account_id)
    if category_id is not None:
        stmt = stmt.where(Movement.category_id == category_id)
    if month is not None:
        start, end = month_bounds(month)
        stmt = stmt.where(Movement.occurred_on >= start, Movement.occurred_on < end)
    result = await session.execute(stmt)
    return [MovementRead.model_validate(movement) for movement in result.scalars()]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_movement(movement: MovementCreate, session: SessionDep) -> MovementRead:
    db_movement = Movement(**movement.model_dump())
    session.add(db_movement)
    await commit_or_422(session)
    await session.refresh(db_movement)
    return MovementRead.model_validate(db_movement)


@router.patch("/{movement_id}")
async def update_movement(
    movement_id: uuid.UUID, movement: MovementUpdate, session: SessionDep
) -> MovementRead:
    db_movement = await get_movement_or_404(session, movement_id)
    payload = movement.model_dump(exclude_unset=True)

    merged_kind = payload.get("kind", db_movement.kind)
    merged_account_id = payload.get("account_id", db_movement.account_id)
    merged_counterparty_id = payload.get(
        "counterparty_account_id", db_movement.counterparty_account_id
    )
    merged_category_id = payload.get("category_id", db_movement.category_id)
    try:
        check_category_shape(merged_kind, merged_category_id)
        check_counterparty_account_shape(merged_kind, merged_account_id, merged_counterparty_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    for key, value in payload.items():
        setattr(db_movement, key, value)
    await commit_or_422(session)
    await session.refresh(db_movement)
    return MovementRead.model_validate(db_movement)


@router.delete("/{movement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_movement(movement_id: uuid.UUID, session: SessionDep) -> None:
    db_movement = await get_movement_or_404(session, movement_id)
    await session.delete(db_movement)
    await session.commit()
