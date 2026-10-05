import uuid
from datetime import date

from pydantic import BaseModel, Field

from app.core.dates import MONTH_PATTERN
from app.movements.schemas import MovementRead


class MonthCloseRequest(BaseModel):
    month: str = Field(pattern=MONTH_PATTERN, description="YYYY-MM")


class MonthlyBalanceRead(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    period_month: date
    closing_balance: float
    interest_accrued: float
    model_config = {"from_attributes": True}


class MonthCloseResult(BaseModel):
    """What one run of the close did, so the UI can report it after the click."""

    month: str
    surplus: float
    generated_recurring: list[MovementRead]
    transfers: list[MovementRead]
    monthly_balances: list[MonthlyBalanceRead]
    deactivated_templates: list[uuid.UUID]
