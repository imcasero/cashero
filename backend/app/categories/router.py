from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.categories.schemas import CategoryCreate, CategoryRead
from app.core.database import SessionDep
from app.core.security import require_api_key
from app.models.categories import Category

router = APIRouter(
    prefix="/categories", tags=["categories"], dependencies=[Depends(require_api_key)]
)


@router.get("")
async def get_categories(session: SessionDep) -> list[CategoryRead]:
    result = await session.execute(select(Category))
    return [CategoryRead.model_validate(category) for category in result.scalars()]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_category(category: CategoryCreate, session: SessionDep) -> CategoryRead:
    db_category = Category(**category.model_dump())
    session.add(db_category)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"A category named {category.name!r} already exists",
        ) from exc
    await session.refresh(db_category)
    return CategoryRead.model_validate(db_category)
