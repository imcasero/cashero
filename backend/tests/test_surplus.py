from app.models.movements import MovementKind, MovementOrigin
from app.month_close.surplus import month_surplus, plan_month_close
from tests.conftest import make_movement, make_rule


class TestWhatCountsAsTheMonthsResult:
    def test_income_minus_expenses(self, account_ids):
        movements = [
            make_movement(MovementKind.INCOME, 2000, account_ids["primary"]),
            make_movement(MovementKind.EXPENSE, 1200, account_ids["primary"]),
        ]
        assert month_surplus(movements) == 800

    def test_transfers_do_not_count(self, account_ids):
        """A transfer only moves money between the user's own accounts, so
        counting it would invent surplus out of nothing."""
        movements = [
            make_movement(
                MovementKind.TRANSFER,
                500,
                account_ids["primary"],
                counterparty_account_id=account_ids["savings"],
            )
        ]
        assert month_surplus(movements) == 0

    def test_a_month_with_no_movements(self):
        assert month_surplus([]) == 0

    def test_rounds_to_cents(self, account_ids):
        movements = [
            make_movement(MovementKind.INCOME, 0.1, account_ids["primary"]),
            make_movement(MovementKind.INCOME, 0.2, account_ids["primary"]),
        ]
        assert month_surplus(movements) == 0.3


class TestSplittingASurplus:
    def test_splits_the_surplus_out_of_the_primary_account(self, account_ids):
        movements = [make_movement(MovementKind.INCOME, 1000, account_ids["primary"])]
        rules = [make_rule(account_ids["savings"], 30), make_rule(account_ids["fund"], 20)]
        plan = plan_month_close(movements, rules, account_ids["primary"])

        assert plan.surplus == 1000
        assert [(t.account_id, t.counterparty_account_id, t.amount) for t in plan.transfers] == [
            (account_ids["primary"], account_ids["savings"], 300.0),
            (account_ids["primary"], account_ids["fund"], 200.0),
        ]

    def test_marks_the_transfers_as_coming_from_a_surplus(self, account_ids):
        movements = [make_movement(MovementKind.INCOME, 1000, account_ids["primary"])]
        plan = plan_month_close(
            movements, [make_rule(account_ids["savings"], 30)], account_ids["primary"]
        )
        assert plan.transfers[0].origin == MovementOrigin.MONTH_CLOSE_SURPLUS

    def test_the_uncovered_share_stays_put(self, account_ids):
        """Rules need not add up to 100: the rest simply never moves."""
        movements = [make_movement(MovementKind.INCOME, 1000, account_ids["primary"])]
        plan = plan_month_close(
            movements, [make_rule(account_ids["savings"], 30)], account_ids["primary"]
        )
        assert len(plan.transfers) == 1
        assert plan.transfers[0].amount == 300.0

    def test_no_rules_means_no_transfers(self, account_ids):
        movements = [make_movement(MovementKind.INCOME, 1000, account_ids["primary"])]
        plan = plan_month_close(movements, [], account_ids["primary"])
        assert plan.transfers == []

    def test_rounds_each_share_to_cents(self, account_ids):
        movements = [make_movement(MovementKind.INCOME, 100.05, account_ids["primary"])]
        plan = plan_month_close(
            movements, [make_rule(account_ids["savings"], 30)], account_ids["primary"]
        )
        assert plan.transfers[0].amount == 30.02


class TestCoveringADeficit:
    def test_runs_the_same_rules_backwards(self, account_ids):
        movements = [
            make_movement(MovementKind.INCOME, 500, account_ids["primary"]),
            make_movement(MovementKind.EXPENSE, 900, account_ids["primary"]),
        ]
        rules = [make_rule(account_ids["savings"], 30), make_rule(account_ids["fund"], 20)]
        plan = plan_month_close(movements, rules, account_ids["primary"])

        assert plan.surplus == -400
        assert [(t.account_id, t.counterparty_account_id, t.amount) for t in plan.transfers] == [
            (account_ids["savings"], account_ids["primary"], 120.0),
            (account_ids["fund"], account_ids["primary"], 80.0),
        ]

    def test_marks_the_transfers_as_covering_a_deficit(self, account_ids):
        movements = [make_movement(MovementKind.EXPENSE, 400, account_ids["primary"])]
        plan = plan_month_close(
            movements, [make_rule(account_ids["savings"], 30)], account_ids["primary"]
        )
        assert plan.transfers[0].origin == MovementOrigin.MONTH_CLOSE_DEFICIT

    def test_the_amounts_stay_positive(self, account_ids):
        """Direction lives in the transfer's two accounts, never in the sign:
        the database rejects a non-positive amount."""
        movements = [make_movement(MovementKind.EXPENSE, 400, account_ids["primary"])]
        plan = plan_month_close(
            movements, [make_rule(account_ids["savings"], 30)], account_ids["primary"]
        )
        assert all(transfer.amount > 0 for transfer in plan.transfers)


class TestMonthsThatMoveNothing:
    def test_a_rule_on_the_primary_account_is_skipped(self, account_ids):
        """IMC-30's consolidation case: a transfer to itself moves no money and
        the database forbids it, so that share just stays where it is."""
        movements = [make_movement(MovementKind.INCOME, 1000, account_ids["primary"])]
        rules = [make_rule(account_ids["primary"], 50), make_rule(account_ids["savings"], 30)]
        plan = plan_month_close(movements, rules, account_ids["primary"])

        assert [t.counterparty_account_id for t in plan.transfers] == [account_ids["savings"]]

    def test_a_balanced_month_moves_nothing(self, account_ids):
        movements = [
            make_movement(MovementKind.INCOME, 100, account_ids["primary"]),
            make_movement(MovementKind.EXPENSE, 100, account_ids["primary"]),
        ]
        plan = plan_month_close(
            movements, [make_rule(account_ids["savings"], 30)], account_ids["primary"]
        )
        assert plan.surplus == 0
        assert plan.transfers == []

    def test_a_share_too_small_to_be_a_cent_moves_nothing(self, account_ids):
        """Money only moves in cents, so 1% of a single cent moves nothing."""
        movements = [make_movement(MovementKind.INCOME, 0.01, account_ids["primary"])]
        plan = plan_month_close(
            movements, [make_rule(account_ids["savings"], 1)], account_ids["primary"]
        )
        assert plan.transfers == []

    def test_a_month_of_pure_spending_is_a_deficit(self, account_ids):
        movements = [make_movement(MovementKind.EXPENSE, 250, account_ids["primary"])]
        plan = plan_month_close(movements, [], account_ids["primary"])
        assert plan.surplus == -250
