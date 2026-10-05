"""Rules of how a balance is made up: an account is worth its initial balance
plus what came in, minus what went out.
"""

from app.models.movements import MovementKind
from app.month_close.balances import balances_as_of
from tests.conftest import make_movement


class TestWhatAnAccountIsWorth:
    def test_an_account_with_no_movements_is_worth_its_initial_balance(self, account_ids):
        initial = {account_ids["primary"]: 1000.0, account_ids["savings"]: 500.0}
        assert balances_as_of(initial, []) == initial

    def test_income_adds_to_the_balance_and_expenses_take_from_it(self, account_ids):
        initial = {account_ids["primary"]: 1000.0}
        movements = [
            make_movement(MovementKind.INCOME, 2000, account_ids["primary"]),
            make_movement(MovementKind.EXPENSE, 400, account_ids["primary"]),
        ]
        assert balances_as_of(initial, movements)[account_ids["primary"]] == 2600.0

    def test_an_account_can_end_up_negative(self, account_ids):
        """Nothing stops the user from spending more than an account holds."""
        initial = {account_ids["primary"]: 10.0}
        movements = [make_movement(MovementKind.EXPENSE, 50, account_ids["primary"])]
        assert balances_as_of(initial, movements)[account_ids["primary"]] == -40.0


class TestTransfersBetweenOwnAccounts:
    def test_a_transfer_leaves_one_account_and_reaches_the_other(self, account_ids):
        initial = {account_ids["primary"]: 1000.0, account_ids["savings"]: 0.0}
        movements = [
            make_movement(
                MovementKind.TRANSFER,
                250,
                account_ids["primary"],
                counterparty_account_id=account_ids["savings"],
            )
        ]
        balances = balances_as_of(initial, movements)
        assert balances[account_ids["primary"]] == 750.0
        assert balances[account_ids["savings"]] == 250.0

    def test_a_transfer_does_not_make_the_user_richer_or_poorer(self, account_ids):
        """The reason the month's surplus ignores transfers: moving money
        between your own accounts changes no total."""
        initial = {account_ids["primary"]: 1000.0, account_ids["savings"]: 0.0}
        movements = [
            make_movement(
                MovementKind.TRANSFER,
                250,
                account_ids["primary"],
                counterparty_account_id=account_ids["savings"],
            )
        ]
        assert sum(balances_as_of(initial, movements).values()) == sum(initial.values())
