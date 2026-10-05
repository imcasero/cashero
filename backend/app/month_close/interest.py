"""Pure monthly interest calculation. No database: the caller supplies the
account and, for compound interest, the previous month's closing balance.
"""

import uuid
from dataclasses import dataclass

from app.models.accounts import Account, AccountInterestType

MONTHS_PER_YEAR = 12
CENTS = 2


@dataclass(frozen=True)
class InterestAccrual:
    """Interest one account earned in the month being closed."""

    account_id: uuid.UUID
    amount: float


def monthly_interest(account: Account, previous_closing_balance: float | None) -> float:
    """Interest earned by one account in a single month.

    `interest_rate` is read as an annual percentage, so a month earns a twelfth
    of it. The two types differ only in the base they apply to:

    - simple: always `initial_balance`, so it pays the same amount every month.
    - compound: the previous month's closing balance, so it pays on the interest
      already earned. With no previous close (the first one ever) it falls back
      to `initial_balance`, which is what the account was worth until then.
    """
    if account.interest_type is None or account.interest_rate is None:
        return 0.0

    is_compound = account.interest_type == AccountInterestType.COMPOUND
    base = account.initial_balance
    if is_compound and previous_closing_balance is not None:
        base = previous_closing_balance

    monthly_rate = account.interest_rate / 100 / MONTHS_PER_YEAR
    return round(base * monthly_rate, CENTS)


def plan_interest(
    accounts: list[Account], previous_closing_balances: dict[uuid.UUID, float]
) -> list[InterestAccrual]:
    """Interest for every account that earns any, skipping the ones that don't."""
    accruals = [
        InterestAccrual(
            account_id=account.id,
            amount=monthly_interest(account, previous_closing_balances.get(account.id)),
        )
        for account in accounts
    ]
    return [accrual for accrual in accruals if accrual.amount != 0]
