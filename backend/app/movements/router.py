from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.core.database import SessionDep
from app.core.security import require_api_key
from app.models.movements import Movement
from app.movements.schemas import MovementCreate, MovementRead

router = APIRouter(
    prefix="/movements", tags=["movements"], dependencies=[Depends(require_api_key)]
)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_movement(movement: MovementCreate, session: SessionDep) -> MovementRead:
    db_movement = Movement(**movement.model_dump())
    session.add(db_movement)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "account_id, counterparty_account_id or category_id does not "
            "reference an existing row",
        ) from exc
    await session.refresh(db_movement)
    return MovementRead.model_validate(db_movement)
