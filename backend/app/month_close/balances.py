"""Pure balance arithmetic for the month close.

The `account_balances` view answers "what is the balance right now", which is
not the same question the close asks: it needs the balance as it stood at the
end of the month being closed, ignoring anything that happened later.
"""

import uuid

from app.models.movements import Movement, MovementKind


def balances_as_of(
    initial_balances: dict[uuid.UUID, float], movements: list[Movement]
) -> dict[uuid.UUID, float]:
    """Balance per account after applying `movements` to the initial balances.

    Mirrors the `account_balances` view: income adds, expenses subtract, and a
    transfer subtracts from its source account and adds to its destination.
    Pass only the movements up to the closing date and the result is the
    balance at that date.
    """
    balances = dict(initial_balances)
    for movement in movements:
        match movement.kind:
            case MovementKind.INCOME:
                balances[movement.account_id] += movement.amount
            case MovementKind.EXPENSE:
                balances[movement.account_id] -= movement.amount
            case MovementKind.TRANSFER:
                balances[movement.account_id] -= movement.amount
                if movement.counterparty_account_id is not None:
                    balances[movement.counterparty_account_id] += movement.amount
    return balances
