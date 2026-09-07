from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.categories.schemas import CategoryRead
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
