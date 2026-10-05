"""Pure month-close calculation: what the month left over and which transfers
that implies. The most delicate business logic in the project, so it lives here
with no database and no FastAPI — the caller passes the data in and persists the
result.
"""

import uuid
from dataclasses import dataclass

from app.models.movements import Movement, MovementKind, MovementOrigin
from app.models.surplus_allocation_rules import SurplusAllocationRule

CENTS = 2


@dataclass(frozen=True)
class PlannedTransfer:
    """A transfer the close wants to create. `account_id` is the source and
    `counterparty_account_id` the destination, same as on a Movement."""

    account_id: uuid.UUID
    counterparty_account_id: uuid.UUID
    amount: float
    origin: MovementOrigin


@dataclass(frozen=True)
class MonthClosePlan:
    surplus: float
    transfers: list[PlannedTransfer]


def month_surplus(movements: list[Movement]) -> float:
    """Income minus expenses for the month.

    Transfers are deliberately excluded: they only move money between the
    user's own accounts, so counting them would invent surplus out of nothing.
    """
    income = sum(m.amount for m in movements if m.kind == MovementKind.INCOME)
    expenses = sum(m.amount for m in movements if m.kind == MovementKind.EXPENSE)
    return round(income - expenses, CENTS)


def plan_month_close(
    movements: list[Movement],
    rules: list[SurplusAllocationRule],
    primary_account_id: uuid.UUID,
) -> MonthClosePlan:
    """Turn the month's result into the transfers that redistribute it.

    With a surplus, each rule moves its share out of the primary account into
    its own account; the uncovered share (100% minus the rules) simply stays
    where it is. With a deficit the same rules run backwards, each account
    returning its share to the primary account, and the uncovered part is borne
    by the primary account itself.

    A rule on the primary account never produces a movement: it would be a
    transfer to itself, which the database forbids and which moves no money.
    That is the consolidation case — its share just stays in the account.
    """
    surplus = month_surplus(movements)
    transfers = []
    for rule in rules:
        if rule.account_id == primary_account_id:
            continue
        amount = round(abs(surplus) * rule.percentage / 100, CENTS)
        if amount == 0:
            continue
        # Direction is the only difference between covering and distributing.
        source, destination = (
            (primary_account_id, rule.account_id)
            if surplus > 0
            else (rule.account_id, primary_account_id)
        )
        transfers.append(
            PlannedTransfer(
                account_id=source,
                counterparty_account_id=destination,
                amount=amount,
                origin=(
                    MovementOrigin.MONTH_CLOSE_SURPLUS
                    if surplus > 0
                    else MovementOrigin.MONTH_CLOSE_DEFICIT
                ),
            )
        )
    return MonthClosePlan(surplus=surplus, transfers=transfers)
