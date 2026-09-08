import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.categories.schemas import CategoryCreate, CategoryRead, CategoryUpdate
from app.core.database import SessionDep
from app.core.security import require_api_key
from app.models.categories import Category

router = APIRouter(
    prefix="/categories", tags=["categories"], dependencies=[Depends(require_api_key)]
)


async def get_category_or_404(session: AsyncSession, category_id: uuid.UUID) -> Category:
    db_category = await session.get(Category, category_id)
    if db_category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    return db_category


async def commit_or_409(session: AsyncSession, name: str | None) -> None:
    """Commit, translating a unique-constraint violation into a 409."""
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"A category named {name!r} already exists",
        ) from exc


@router.get("")
async def get_categories(session: SessionDep) -> list[CategoryRead]:
    result = await session.execute(select(Category))
    return [CategoryRead.model_validate(category) for category in result.scalars()]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(category: CategoryCreate, session: SessionDep) -> CategoryRead:
    db_category = Category(**category.model_dump())
    session.add(db_category)
    await commit_or_409(session, category.name)
    await session.refresh(db_category)
    return CategoryRead.model_validate(db_category)


@router.patch("/{category_id}")
async def update_category(
    category_id: uuid.UUID, category: CategoryUpdate, session: SessionDep
) -> CategoryRead:
    db_category = await get_category_or_404(session, category_id)
    for key, value in category.model_dump(exclude_unset=True).items():
        setattr(db_category, key, value)
    await commit_or_409(session, category.name)
    await session.refresh(db_category)
    return CategoryRead.model_validate(db_category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: uuid.UUID, session: SessionDep) -> None:
    db_category = await get_category_or_404(session, category_id)
    await session.delete(db_category)
    await session.commit()
