import uuid

from pydantic import BaseModel, Field


class BudgetCreate(BaseModel):
    category_id: uuid.UUID
    monthly_limit: float = Field(gt=0)


class BudgetRead(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    monthly_limit: float
    model_config = {"from_attributes": True}


class BudgetStatusRead(BudgetRead):
    """A budget plus how the month is going. `spent` and `remaining` are
    computed on read, never stored; `remaining` goes negative when the limit
    has been exceeded, which is the point of showing it."""

    month: str
    spent: float
    remaining: float


class BudgetUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    monthly_limit: float | None = Field(default=None, gt=0)
