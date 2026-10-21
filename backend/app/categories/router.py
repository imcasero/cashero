import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.categories.schemas import CategoryCreate, CategoryRead, CategoryUpdate
from app.core.database import SessionDep
from app.core.security import require_api_key
from app.models.budgets import Budget
from app.models.categories import Category
from app.models.movement_templates import MovementTemplate
from app.models.movements import Movement

router = APIRouter(
    prefix="/categories", tags=["categories"], dependencies=[Depends(require_api_key)]
)


async def get_category_or_404(session: AsyncSession, category_id: uuid.UUID) -> Category:
    db_category = await session.get(Category, category_id)
    if db_category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    return db_category


async def commit_or_409(session: AsyncSession, detail: str) -> None:
    """Commit, translating an integrity violation into a 409 with the given detail."""
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail) from exc


def duplicate_name_detail(name: str | None) -> str:
    return f"A category named {name!r} already exists"


async def is_category_in_use(session: AsyncSession, category_id: uuid.UUID) -> bool:
    """Whether any movement, template or budget points at the category."""
    for model in (Movement, MovementTemplate, Budget):
        stmt = select(model.id).where(model.category_id == category_id).limit(1)
        if (await session.execute(stmt)).first() is not None:
            return True
    return False


@router.get("")
async def get_categories(session: SessionDep) -> list[CategoryRead]:
    result = await session.execute(select(Category))
    return [CategoryRead.model_validate(category) for category in result.scalars()]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(category: CategoryCreate, session: SessionDep) -> CategoryRead:
    db_category = Category(**category.model_dump())
    session.add(db_category)
    await commit_or_409(session, duplicate_name_detail(category.name))
    await session.refresh(db_category)
    return CategoryRead.model_validate(db_category)


@router.patch("/{category_id}")
async def update_category(
    category_id: uuid.UUID, category: CategoryUpdate, session: SessionDep
) -> CategoryRead:
    db_category = await get_category_or_404(session, category_id)
    changes = category.model_dump(exclude_unset=True)
    # Nothing in the database ties a movement's kind to its category's kind, so flipping the
    # kind of a category in use would leave expenses filed under an income category.
    if changes.get("kind", db_category.kind) != db_category.kind and await is_category_in_use(
        session, category_id
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "The category is in use by movements, templates or a budget: its kind cannot change",
        )
    for key, value in changes.items():
        setattr(db_category, key, value)
    await commit_or_409(session, duplicate_name_detail(category.name))
    await session.refresh(db_category)
    return CategoryRead.model_validate(db_category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: uuid.UUID, session: SessionDep) -> None:
    db_category = await get_category_or_404(session, category_id)
    await session.delete(db_category)
    # movements and templates reference the category with on delete restrict
    await commit_or_409(
        session, "The category has movements or templates: delete or move them first"
    )
