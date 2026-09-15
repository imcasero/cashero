import uuid
from datetime import date

from pydantic import BaseModel, Field, model_validator

from app.models.movements import MovementKind, MovementOrigin


def check_category_shape(kind: MovementKind, category_id: uuid.UUID | None) -> None:
    is_transfer = kind == MovementKind.TRANSFER
    if is_transfer and category_id is not None:
        raise ValueError("category_id must be null for a transfer")
    if not is_transfer and category_id is None:
        raise ValueError("category_id is required for an expense or income")


def check_counterparty_account_shape(
    kind: MovementKind,
    account_id: uuid.UUID,
    counterparty_account_id: uuid.UUID | None,
) -> None:
    is_transfer = kind == MovementKind.TRANSFER
    if not is_transfer and counterparty_account_id is not None:
        raise ValueError("counterparty_account_id must be null for an expense or income")
    if is_transfer and counterparty_account_id is None:
        raise ValueError("counterparty_account_id is required for a transfer")
    if is_transfer and counterparty_account_id == account_id:
        raise ValueError("counterparty_account_id must differ from account_id")


class MovementCreate(BaseModel):
    kind: MovementKind
    amount: float = Field(gt=0)
    occurred_on: date
    description: str | None = None
    account_id: uuid.UUID
    counterparty_account_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def check_category(self) -> "MovementCreate":
        check_category_shape(self.kind, self.category_id)
        return self

    @model_validator(mode="after")
    def check_counterparty_account(self) -> "MovementCreate":
        check_counterparty_account_shape(
            self.kind, self.account_id, self.counterparty_account_id
        )
        return self


class MovementRead(BaseModel):
    id: uuid.UUID
    kind: MovementKind
    amount: float
    occurred_on: date
    description: str | None
    account_id: uuid.UUID
    counterparty_account_id: uuid.UUID | None
    category_id: uuid.UUID | None
    origin: MovementOrigin
    template_id: uuid.UUID | None
    model_config = {"from_attributes": True}


class MovementUpdate(BaseModel):
    """All fields optional. Shape (category/counterparty vs. kind) is re-checked
    by the router against the merged result, not here: a partial patch alone
    doesn't know the movement's current kind."""

    kind: MovementKind | None = None
    amount: float | None = Field(default=None, gt=0)
    occurred_on: date | None = None
    description: str | None = None
    account_id: uuid.UUID | None = None
    counterparty_account_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
