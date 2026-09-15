import uuid

from pydantic import BaseModel

from app.models.accounts import AccountInterestType


class AccountCreate(BaseModel):
    name: str
    type: str
    currency: str = "EUR"
    initial_balance: float = 0.0
    interest_type: AccountInterestType | None = None
    interest_rate: float | None = None
    is_primary: bool = False


class AccountRead(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    currency: str
    initial_balance: float
    interest_type: AccountInterestType | None
    interest_rate: float | None
    is_primary: bool
    model_config = {"from_attributes": True}


class AccountUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    currency: str | None = None
    initial_balance: float | None = None
    interest_type: AccountInterestType | None = None
    interest_rate: float | None = None
    is_primary: bool | None = None


class AccountBalanceRead(BaseModel):
    account_id: uuid.UUID
    current_balance: float
    model_config = {"from_attributes": True}
