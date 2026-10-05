"""Rules of recurring movements: when a template owes a movement, and when it
stops owing them.

Everything is checked through `plan_template` / `plan_recurring_movements` —
what the product promises — rather than through the date helpers behind them.
"""

from datetime import date

from app.models.movement_templates import TemplateFrequency
from app.movement_templates.recurrence import plan_recurring_movements, plan_template
from tests.conftest import make_template


def charges_on(template, on_date: date) -> list[date]:
    return [movement.occurred_on for movement in plan_template(template, on_date).movements]


class TestWhenATemplateIsCharged:
    def test_a_monthly_rent_is_charged_once_a_month_from_its_start_date(self):
        rent = make_template(start_date=date(2026, 1, 10))
        assert charges_on(rent, date(2026, 3, 31)) == [
            date(2026, 1, 10),
            date(2026, 2, 10),
            date(2026, 3, 10),
        ]

    def test_a_template_is_charged_on_its_start_date_itself(self):
        rent = make_template(start_date=date(2026, 10, 5))
        assert charges_on(rent, date(2026, 10, 5)) == [date(2026, 10, 5)]

    def test_a_template_is_not_charged_before_it_starts(self):
        """A rent starting in November owes nothing when October is closed."""
        rent = make_template(start_date=date(2026, 11, 1))
        assert charges_on(rent, date(2026, 10, 31)) == []

    def test_every_other_week_means_every_fourteen_days(self):
        payment = make_template(
            start_date=date(2026, 1, 5), frequency=TemplateFrequency.WEEKLY, interval_count=2
        )
        assert charges_on(payment, date(2026, 2, 10)) == [
            date(2026, 1, 5),
            date(2026, 1, 19),
            date(2026, 2, 2),
        ]

    def test_a_yearly_insurance_is_charged_on_its_anniversary(self):
        insurance = make_template(start_date=date(2024, 6, 15), frequency=TemplateFrequency.YEARLY)
        assert charges_on(insurance, date(2026, 12, 31)) == [
            date(2024, 6, 15),
            date(2025, 6, 15),
            date(2026, 6, 15),
        ]


class TestMonthsThatAreTooShort:
    def test_a_rent_due_on_the_31st_is_charged_on_the_last_day_of_february(self):
        rent = make_template(start_date=date(2026, 1, 31))
        assert date(2026, 2, 28) in charges_on(rent, date(2026, 2, 28))

    def test_a_short_month_does_not_move_the_rent_for_good(self):
        """The business rule users care about: paying rent on the 28th of
        february must not turn it into a rent due on the 28th forever."""
        rent = make_template(start_date=date(2026, 1, 31))
        assert charges_on(rent, date(2026, 4, 15)) == [
            date(2026, 1, 31),
            date(2026, 2, 28),
            date(2026, 3, 31),
        ]

    def test_a_yearly_charge_on_29_february_comes_back_on_the_next_leap_year(self):
        charge = make_template(start_date=date(2024, 2, 29), frequency=TemplateFrequency.YEARLY)
        assert charges_on(charge, date(2028, 12, 31)) == [
            date(2024, 2, 29),
            date(2025, 2, 28),
            date(2026, 2, 28),
            date(2027, 2, 28),
            date(2028, 2, 29),
        ]


class TestNoDuplicatesAndNoGaps:
    def test_a_template_is_never_charged_twice_for_the_same_date(self):
        """Pressing the button again must not re-create what already ran: a
        template only owes movements from its next due date onwards."""
        rent = make_template(start_date=date(2026, 1, 31), next_run_on=date(2026, 3, 31))
        assert charges_on(rent, date(2026, 4, 15)) == [date(2026, 3, 31)]

    def test_months_without_a_close_are_caught_up_one_charge_each(self):
        """Three months without pressing the button owe three rents, not one."""
        rent = make_template(start_date=date(2026, 1, 1))
        assert charges_on(rent, date(2026, 6, 10)) == [
            date(2026, 1, 1),
            date(2026, 2, 1),
            date(2026, 3, 1),
            date(2026, 4, 1),
            date(2026, 5, 1),
            date(2026, 6, 1),
        ]


class TestWhenATemplateStops:
    def test_nothing_is_charged_after_the_end_date(self):
        subscription = make_template(start_date=date(2026, 1, 31), end_date=date(2026, 3, 1))
        assert charges_on(subscription, date(2026, 12, 1)) == [
            date(2026, 1, 31),
            date(2026, 2, 28),
        ]

    def test_a_charge_falling_exactly_on_the_end_date_is_still_due(self):
        subscription = make_template(start_date=date(2026, 1, 15), end_date=date(2026, 2, 15))
        assert charges_on(subscription, date(2026, 12, 1)) == [
            date(2026, 1, 15),
            date(2026, 2, 15),
        ]

    def test_a_finished_template_is_reported_so_it_stops_being_active(self):
        subscription = make_template(
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 1),
            next_run_on=date(2026, 1, 2),
            last_run_on=date(2026, 1, 1),
        )
        plan = plan_template(subscription, date(2026, 6, 1))
        assert plan.movements == []
        assert plan.next_run_on is None, "a finished template has to be deactivatable"

    def test_a_paused_template_is_not_charged(self):
        paused = make_template(start_date=date(2026, 1, 1), is_active=False)
        assert plan_recurring_movements([paused], date(2026, 6, 1)) == []


class TestWhatTheChargeLooksLike:
    def test_the_charge_copies_the_amount_and_the_category_of_the_template(self):
        rent = make_template(start_date=date(2026, 10, 1), amount=812.35)
        charge = plan_template(rent, date(2026, 10, 1)).movements[0]

        assert charge.amount == 812.35
        assert charge.kind == rent.kind
        assert charge.account_id == rent.account_id
        assert charge.category_id == rent.category_id
        assert charge.description == rent.description

    def test_the_charge_points_back_to_the_template_that_created_it(self):
        """So deleting a template can keep its history, and the next close
        knows what already ran."""
        rent = make_template(start_date=date(2026, 10, 1))
        assert plan_template(rent, date(2026, 10, 1)).movements[0].template_id == rent.id


class TestPlanningSeveralTemplates:
    def test_only_templates_with_something_to_charge_are_returned(self):
        due = make_template(start_date=date(2026, 1, 1))
        not_started = make_template(start_date=date(2026, 11, 1))
        plans = plan_recurring_movements([due, not_started], date(2026, 2, 15))
        assert [plan.template_id for plan in plans] == [due.id]

    def test_each_template_is_planned_on_its_own_schedule(self):
        rent = make_template(start_date=date(2026, 1, 1))
        weekly = make_template(start_date=date(2026, 1, 1), frequency=TemplateFrequency.WEEKLY)
        plans = plan_recurring_movements([rent, weekly], date(2026, 1, 31))
        charges = {plan.template_id: len(plan.movements) for plan in plans}
        assert charges[rent.id] == 1
        assert charges[weekly.id] == 5
