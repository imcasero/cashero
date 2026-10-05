from app.models.accounts import AccountInterestType
from app.month_close.interest import monthly_interest, plan_interest
from tests.conftest import make_account


class TestMonthlyInterest:
    def test_an_account_without_interest_earns_nothing(self):
        assert monthly_interest(make_account(initial_balance=1000), None) == 0.0

    def test_a_rate_without_a_type_earns_nothing(self):
        """Both columns go together — the DB has a check constraint for it —
        so half a configuration must not silently pay interest."""
        account = make_account(initial_balance=1000, interest_rate=12)
        assert monthly_interest(account, None) == 0.0

    def test_simple_interest_is_a_twelfth_of_the_annual_rate(self):
        account = make_account(
            initial_balance=1000, interest_type=AccountInterestType.SIMPLE, interest_rate=12
        )
        assert monthly_interest(account, None) == 10.0

    def test_simple_interest_ignores_the_previous_balance(self):
        """That is what makes it simple: always the same amount every month."""
        account = make_account(
            initial_balance=1000, interest_type=AccountInterestType.SIMPLE, interest_rate=12
        )
        assert monthly_interest(account, 5000) == 10.0

    def test_compound_interest_grows_on_the_previous_close(self):
        account = make_account(
            initial_balance=1000, interest_type=AccountInterestType.COMPOUND, interest_rate=12
        )
        assert monthly_interest(account, 1010) == 10.1

    def test_compound_interest_falls_back_to_the_initial_balance(self):
        """The first close ever has no previous month to grow on."""
        account = make_account(
            initial_balance=1000, interest_type=AccountInterestType.COMPOUND, interest_rate=12
        )
        assert monthly_interest(account, None) == 10.0

    def test_rounds_to_cents(self):
        account = make_account(
            initial_balance=333.33, interest_type=AccountInterestType.SIMPLE, interest_rate=5
        )
        assert monthly_interest(account, None) == 1.39

    def test_an_empty_account_earns_nothing(self):
        account = make_account(
            initial_balance=0, interest_type=AccountInterestType.COMPOUND, interest_rate=12
        )
        assert monthly_interest(account, None) == 0.0


class TestThreeConsecutiveMonths:
    """IMC-32's acceptance criterion: over three months, compound has to come
    out ahead of simple on the same rate and starting balance."""

    RATE = 12
    INITIAL = 1000.0

    def simple_total(self) -> float:
        account = make_account(
            initial_balance=self.INITIAL,
            interest_type=AccountInterestType.SIMPLE,
            interest_rate=self.RATE,
        )
        return round(sum(monthly_interest(account, None) for _ in range(3)), 2)

    def compound_total(self) -> float:
        account = make_account(
            initial_balance=self.INITIAL,
            interest_type=AccountInterestType.COMPOUND,
            interest_rate=self.RATE,
        )
        balance = self.INITIAL
        previous: float | None = None
        for _ in range(3):
            balance += monthly_interest(account, previous)
            previous = balance
        return round(balance - self.INITIAL, 2)

    def test_simple_pays_the_same_every_month(self):
        assert self.simple_total() == 30.0

    def test_compound_pays_a_little_more_each_month(self):
        # 10.00 + 10.10 + 10.20
        assert self.compound_total() == 30.3

    def test_compound_ends_up_ahead(self):
        assert self.compound_total() > self.simple_total()


class TestPlanInterest:
    def test_skips_accounts_that_earn_nothing(self):
        accounts = [
            make_account(
                initial_balance=1000,
                interest_type=AccountInterestType.SIMPLE,
                interest_rate=12,
            ),
            make_account(initial_balance=500),
        ]
        accruals = plan_interest(accounts, {})
        assert len(accruals) == 1
        assert accruals[0].amount == 10.0

    def test_looks_up_each_account_previous_balance(self):
        compound = make_account(
            initial_balance=1000, interest_type=AccountInterestType.COMPOUND, interest_rate=12
        )
        accruals = plan_interest([compound], {compound.id: 2000.0})
        assert accruals[0].account_id == compound.id
        assert accruals[0].amount == 20.0

    def test_no_accounts_means_no_accruals(self):
        assert plan_interest([], {}) == []
