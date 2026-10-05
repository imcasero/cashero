"""Factories for the tests.

Every test here is a unit test over the pure business logic, so the models are
built in memory and never go near a session: SQLAlchemy objects are plain
Python objects until you add them to one.
"""

import uuid
from datetime import date

import pytest

from app.models.accounts import Account, AccountInterestType
from app.models.budgets import Budget
from app.models.categories import CategoryKind
from app.models.movement_templates import MovementTemplate, TemplateFrequency
from app.models.movements import Movement, MovementKind, MovementOrigin
from app.models.surplus_allocation_rules import SurplusAllocationRule


@pytest.fixture
def account_ids() -> dict[str, uuid.UUID]:
    """Stable, readable ids so failures name an account instead of a UUID."""
    return {name: uuid.uuid4() for name in ("primary", "savings", "fund")}


def make_account(
    account_id: uuid.UUID | None = None,
    initial_balance: float = 0.0,
    interest_type: AccountInterestType | None = None,
    interest_rate: float | None = None,
    is_primary: bool = False,
) -> Account:
    return Account(
        id=account_id or uuid.uuid4(),
        name="account",
        type="bank",
        currency="EUR",
        initial_balance=initial_balance,
        interest_type=interest_type,
        interest_rate=interest_rate,
        is_primary=is_primary,
    )


def make_movement(
    kind: MovementKind,
    amount: float,
    account_id: uuid.UUID,
    occurred_on: date = date(2026, 10, 10),
    counterparty_account_id: uuid.UUID | None = None,
) -> Movement:
    return Movement(
        id=uuid.uuid4(),
        kind=kind,
        amount=amount,
        occurred_on=occurred_on,
        description=None,
        account_id=account_id,
        counterparty_account_id=counterparty_account_id,
        category_id=None if kind == MovementKind.TRANSFER else uuid.uuid4(),
        origin=MovementOrigin.MANUAL,
        template_id=None,
    )


def make_template(
    start_date: date = date(2026, 1, 31),
    next_run_on: date | None = None,
    frequency: TemplateFrequency = TemplateFrequency.MONTHLY,
    interval_count: int = 1,
    end_date: date | None = None,
    is_active: bool = True,
    last_run_on: date | None = None,
    amount: float = 800.0,
    kind: CategoryKind = CategoryKind.EXPENSE,
) -> MovementTemplate:
    return MovementTemplate(
        id=uuid.uuid4(),
        kind=kind,
        amount=amount,
        description="rent",
        account_id=uuid.uuid4(),
        category_id=uuid.uuid4(),
        frequency=frequency,
        interval_count=interval_count,
        start_date=start_date,
        end_date=end_date,
        # A fresh template is due on its start date, the same default the POST
        # endpoint applies.
        next_run_on=next_run_on or start_date,
        last_run_on=last_run_on,
        is_active=is_active,
    )


def make_rule(account_id: uuid.UUID, percentage: float) -> SurplusAllocationRule:
    return SurplusAllocationRule(id=uuid.uuid4(), account_id=account_id, percentage=percentage)


def make_budget(category_id: uuid.UUID, monthly_limit: float) -> Budget:
    return Budget(id=uuid.uuid4(), category_id=category_id, monthly_limit=monthly_limit)
