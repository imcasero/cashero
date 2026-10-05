"""Tests for the cross-field rules that live in the schemas.

These are the validations FastAPI turns into a 422 on create, and that the
routers re-run by hand on PATCH against the merged row.
"""

import uuid
from datetime import date

import pytest
from pydantic import ValidationError

from app.budgets.schemas import BudgetCreate
from app.models.movements import MovementKind
from app.movement_templates.schemas import MovementTemplateCreate, check_date_range
from app.movements.schemas import (
    MovementCreate,
    check_category_shape,
    check_counterparty_account_shape,
)
from app.surplus_allocation_rules.schemas import SurplusAllocationReplace

ACCOUNT = uuid.uuid4()
OTHER_ACCOUNT = uuid.uuid4()
CATEGORY = uuid.uuid4()


def movement_payload(**overrides) -> dict:
    return {
        "kind": MovementKind.EXPENSE,
        "amount": 100,
        "occurred_on": date(2026, 10, 1),
        "account_id": ACCOUNT,
        "category_id": CATEGORY,
    } | overrides


def template_payload(**overrides) -> dict:
    return {
        "kind": "expense",
        "amount": 800,
        "account_id": ACCOUNT,
        "category_id": CATEGORY,
        "frequency": "monthly",
        "start_date": date(2026, 10, 1),
    } | overrides


class TestCheckCategoryShape:
    def test_an_expense_needs_a_category(self):
        with pytest.raises(ValueError, match="category_id is required"):
            check_category_shape(MovementKind.EXPENSE, None)

    def test_an_income_needs_a_category(self):
        with pytest.raises(ValueError, match="category_id is required"):
            check_category_shape(MovementKind.INCOME, None)

    def test_a_transfer_must_not_have_one(self):
        with pytest.raises(ValueError, match="must be null for a transfer"):
            check_category_shape(MovementKind.TRANSFER, CATEGORY)

    def test_the_valid_combinations_pass(self):
        check_category_shape(MovementKind.EXPENSE, CATEGORY)
        check_category_shape(MovementKind.TRANSFER, None)


class TestCheckCounterpartyAccountShape:
    def test_a_transfer_needs_a_destination(self):
        with pytest.raises(ValueError, match="counterparty_account_id is required"):
            check_counterparty_account_shape(MovementKind.TRANSFER, ACCOUNT, None)

    def test_a_transfer_cannot_target_its_own_account(self):
        with pytest.raises(ValueError, match="must differ from account_id"):
            check_counterparty_account_shape(MovementKind.TRANSFER, ACCOUNT, ACCOUNT)

    def test_an_expense_must_not_have_a_destination(self):
        with pytest.raises(ValueError, match="must be null for an expense or income"):
            check_counterparty_account_shape(MovementKind.EXPENSE, ACCOUNT, OTHER_ACCOUNT)

    def test_the_valid_combinations_pass(self):
        check_counterparty_account_shape(MovementKind.TRANSFER, ACCOUNT, OTHER_ACCOUNT)
        check_counterparty_account_shape(MovementKind.INCOME, ACCOUNT, None)


class TestMovementCreate:
    def test_accepts_an_expense(self):
        assert MovementCreate(**movement_payload()).amount == 100

    def test_accepts_a_transfer(self):
        payload = movement_payload(
            kind=MovementKind.TRANSFER, category_id=None, counterparty_account_id=OTHER_ACCOUNT
        )
        assert MovementCreate(**payload).counterparty_account_id == OTHER_ACCOUNT

    def test_rejects_a_transfer_with_a_category(self):
        payload = movement_payload(
            kind=MovementKind.TRANSFER, counterparty_account_id=OTHER_ACCOUNT
        )
        with pytest.raises(ValidationError):
            MovementCreate(**payload)

    def test_rejects_an_expense_without_a_category(self):
        with pytest.raises(ValidationError):
            MovementCreate(**movement_payload(category_id=None))

    @pytest.mark.parametrize("amount", [0, -5])
    def test_rejects_a_non_positive_amount(self, amount):
        with pytest.raises(ValidationError):
            MovementCreate(**movement_payload(amount=amount))


class TestCheckDateRange:
    def test_an_end_before_the_start_is_rejected(self):
        with pytest.raises(ValueError, match="on or after start_date"):
            check_date_range(date(2026, 10, 1), date(2026, 9, 1))

    def test_the_same_day_is_allowed(self):
        check_date_range(date(2026, 10, 1), date(2026, 10, 1))

    def test_no_end_date_is_allowed(self):
        check_date_range(date(2026, 10, 1), None)


class TestMovementTemplateCreate:
    def test_defaults_to_an_interval_of_one_and_active(self):
        template = MovementTemplateCreate(**template_payload())
        assert template.interval_count == 1
        assert template.is_active is True

    def test_rejects_a_transfer_kind(self):
        """Templates reuse category_kind: a transfer cannot be templated."""
        with pytest.raises(ValidationError):
            MovementTemplateCreate(**template_payload(kind="transfer"))

    def test_rejects_an_end_date_before_the_start(self):
        with pytest.raises(ValidationError):
            MovementTemplateCreate(**template_payload(end_date=date(2026, 9, 1)))

    def test_rejects_a_zero_interval(self):
        with pytest.raises(ValidationError):
            MovementTemplateCreate(**template_payload(interval_count=0))


class TestSurplusAllocationReplace:
    def test_accepts_a_set_below_one_hundred(self):
        payload = {"rules": [{"account_id": ACCOUNT, "percentage": 30}]}
        assert len(SurplusAllocationReplace(**payload).rules) == 1

    def test_accepts_exactly_one_hundred(self):
        payload = {
            "rules": [
                {"account_id": ACCOUNT, "percentage": 60},
                {"account_id": OTHER_ACCOUNT, "percentage": 40},
            ]
        }
        assert len(SurplusAllocationReplace(**payload).rules) == 2

    def test_rejects_more_than_one_hundred_by_a_cent(self):
        payload = {
            "rules": [
                {"account_id": ACCOUNT, "percentage": 60},
                {"account_id": OTHER_ACCOUNT, "percentage": 40.01},
            ]
        }
        with pytest.raises(ValidationError, match="exceeds 100"):
            SurplusAllocationReplace(**payload)

    def test_rejects_the_same_account_twice(self):
        payload = {
            "rules": [
                {"account_id": ACCOUNT, "percentage": 10},
                {"account_id": ACCOUNT, "percentage": 10},
            ]
        }
        with pytest.raises(ValidationError, match="only once"):
            SurplusAllocationReplace(**payload)

    def test_an_empty_set_is_valid(self):
        """It means "send the whole surplus to the primary account"."""
        assert SurplusAllocationReplace(rules=[]).rules == []

    @pytest.mark.parametrize("percentage", [0, -1, 100.01])
    def test_rejects_a_percentage_outside_the_range(self, percentage):
        payload = {"rules": [{"account_id": ACCOUNT, "percentage": percentage}]}
        with pytest.raises(ValidationError):
            SurplusAllocationReplace(**payload)

    def test_a_split_with_decimals_adding_to_one_hundred_is_accepted(self):
        """99.9% plus 0.1% is a valid split, and must not be rejected for
        adding up to a hair over 100."""
        payload = {
            "rules": [
                {"account_id": ACCOUNT, "percentage": 99.9},
                {"account_id": OTHER_ACCOUNT, "percentage": 0.1},
            ]
        }
        assert len(SurplusAllocationReplace(**payload).rules) == 2


class TestBudgetCreate:
    def test_accepts_a_positive_limit(self):
        assert BudgetCreate(category_id=CATEGORY, monthly_limit=300).monthly_limit == 300

    @pytest.mark.parametrize("limit", [0, -10])
    def test_rejects_a_non_positive_limit(self, limit):
        with pytest.raises(ValidationError):
            BudgetCreate(category_id=CATEGORY, monthly_limit=limit)
