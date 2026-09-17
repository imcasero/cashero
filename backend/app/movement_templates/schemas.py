import uuid
from datetime import date

from pydantic import BaseModel, Field, model_validator

from app.models.categories import CategoryKind
from app.models.movement_templates import TemplateFrequency


def check_date_range(start_date: date, end_date: date | None) -> None:
    if end_date is not None and end_date < start_date:
        raise ValueError("end_date must be on or after start_date")


class MovementTemplateCreate(BaseModel):
    """next_run_on and last_run_on are not accepted: the router seeds next_run_on
    from start_date and the recurrence generator owns both from then on."""

    kind: CategoryKind
    amount: float = Field(gt=0)
    description: str | None = None
    account_id: uuid.UUID
    category_id: uuid.UUID
    frequency: TemplateFrequency
    interval_count: int = Field(default=1, gt=0)
    start_date: date
    end_date: date | None = None
    is_active: bool = True

    @model_validator(mode="after")
    def check_dates(self) -> "MovementTemplateCreate":
        check_date_range(self.start_date, self.end_date)
        return self


class MovementTemplateRead(BaseModel):
    id: uuid.UUID
    kind: CategoryKind
    amount: float
    description: str | None
    account_id: uuid.UUID
    category_id: uuid.UUID
    frequency: TemplateFrequency
    interval_count: int
    start_date: date
    end_date: date | None
    next_run_on: date
    last_run_on: date | None
    is_active: bool
    model_config = {"from_attributes": True}


class MovementTemplateUpdate(BaseModel):
    """All fields optional. The date range is re-checked by the router against
    the merged result, since a patch may carry only one of the two dates."""

    kind: CategoryKind | None = None
    amount: float | None = Field(default=None, gt=0)
    description: str | None = None
    account_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    frequency: TemplateFrequency | None = None
    interval_count: int | None = Field(default=None, gt=0)
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None
