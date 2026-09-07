import uuid

from pydantic import BaseModel

from app.models.categories import CategoryKind


class CategoryCreate(BaseModel):
    name: str
    kind: CategoryKind
    color: str | None = None


class CategoryRead(BaseModel):
    id: uuid.UUID
    name: str
    kind: CategoryKind
    color: str | None

    model_config = {
        "from_attributes": True,
    }
