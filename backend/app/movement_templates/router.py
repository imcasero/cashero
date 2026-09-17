import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionDep
from app.core.security import require_api_key
from app.models.movement_templates import MovementTemplate
from app.movement_templates.schemas import (
    MovementTemplateCreate,
    MovementTemplateRead,
    MovementTemplateUpdate,
    check_date_range,
)

router = APIRouter(
    prefix="/movement-templates",
    tags=["movement-templates"],
    dependencies=[Depends(require_api_key)],
)


async def get_template_or_404(session: AsyncSession, template_id: uuid.UUID) -> MovementTemplate:
    db_template = await session.get(MovementTemplate, template_id)
    if db_template is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Movement template not found")
    return db_template


async def commit_or_422(session: AsyncSession) -> None:
    """Commit, translating a bad foreign key into a 422."""
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "account_id or category_id does not reference an existing row",
        ) from exc


@router.get("")
async def get_templates(
    session: SessionDep,
    account_id: uuid.UUID | None = None,
    is_active: bool | None = None,
) -> list[MovementTemplateRead]:
    stmt = select(MovementTemplate).order_by(MovementTemplate.next_run_on)
    if account_id is not None:
        stmt = stmt.where(MovementTemplate.account_id == account_id)
    if is_active is not None:
        stmt = stmt.where(MovementTemplate.is_active.is_(is_active))
    result = await session.execute(stmt)
    return [MovementTemplateRead.model_validate(template) for template in result.scalars()]


@router.get("/{template_id}")
async def get_template(template_id: uuid.UUID, session: SessionDep) -> MovementTemplateRead:
    db_template = await get_template_or_404(session, template_id)
    return MovementTemplateRead.model_validate(db_template)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_template(
    template: MovementTemplateCreate, session: SessionDep
) -> MovementTemplateRead:
    # The first occurrence is due on the start date itself.
    db_template = MovementTemplate(**template.model_dump(), next_run_on=template.start_date)
    session.add(db_template)
    await commit_or_422(session)
    await session.refresh(db_template)
    return MovementTemplateRead.model_validate(db_template)


@router.patch("/{template_id}")
async def update_template(
    template_id: uuid.UUID, template: MovementTemplateUpdate, session: SessionDep
) -> MovementTemplateRead:
    db_template = await get_template_or_404(session, template_id)
    payload = template.model_dump(exclude_unset=True)

    merged_start_date = payload.get("start_date", db_template.start_date)
    merged_end_date = payload.get("end_date", db_template.end_date)
    try:
        check_date_range(merged_start_date, merged_end_date)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    # A template that never ran is still waiting for its start date, so moving
    # start_date moves the first due date too. Once it has run, the generator
    # owns next_run_on and editing start_date doesn't rewrite the schedule.
    if "start_date" in payload and db_template.last_run_on is None:
        payload["next_run_on"] = payload["start_date"]

    for key, value in payload.items():
        setattr(db_template, key, value)
    await commit_or_422(session)
    await session.refresh(db_template)
    return MovementTemplateRead.model_validate(db_template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(template_id: uuid.UUID, session: SessionDep) -> None:
    # Movements already generated survive: movements.template_id is ON DELETE SET NULL.
    db_template = await get_template_or_404(session, template_id)
    await session.delete(db_template)
    await session.commit()
