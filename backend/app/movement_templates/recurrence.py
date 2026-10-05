"""Pure recurrence planning: given templates and a date, decide which movements
should exist. No database and no FastAPI here, so the rules can be reasoned
about and tested on their own; persisting the result is the router's job.
"""

import calendar
import uuid
from dataclasses import dataclass
from datetime import date, timedelta

from app.models.categories import CategoryKind
from app.models.movement_templates import MovementTemplate, TemplateFrequency


@dataclass(frozen=True)
class PlannedMovement:
    """One movement a template says should exist, not yet persisted."""

    template_id: uuid.UUID
    kind: CategoryKind
    amount: float
    occurred_on: date
    description: str | None
    account_id: uuid.UUID
    category_id: uuid.UUID


@dataclass(frozen=True)
class TemplatePlan:
    """What to do with one template after planning.

    `next_run_on` is `None` when the template has no occurrence left (it ran
    past its end_date), which is how the caller knows to deactivate it.
    """

    template_id: uuid.UUID
    movements: list[PlannedMovement]
    next_run_on: date | None

    @property
    def last_run_on(self) -> date | None:
        return self.movements[-1].occurred_on if self.movements else None


def add_months(anchor: date, months: int) -> date:
    """Shift a date by whole months, clamping the day to the target month's
    length (31 Jan + 1 month -> 28 Feb)."""
    total = anchor.month - 1 + months
    year = anchor.year + total // 12
    month = total % 12 + 1
    day = min(anchor.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def occurrence_on(template: MovementTemplate, index: int) -> date:
    """Date of the template's occurrence number `index` (0 = start_date).

    Always derived from start_date instead of stepping from the previous
    occurrence, so a clamped month doesn't drag the rest of the series with it:
    a monthly template starting 31 Jan hits 28 Feb and then 31 Mar, not 28 Mar.
    """
    periods = template.interval_count * index
    match template.frequency:
        case TemplateFrequency.DAILY:
            return template.start_date + timedelta(days=periods)
        case TemplateFrequency.WEEKLY:
            return template.start_date + timedelta(weeks=periods)
        case TemplateFrequency.MONTHLY:
            return add_months(template.start_date, periods)
        case TemplateFrequency.YEARLY:
            return add_months(template.start_date, periods * 12)


def plan_template(template: MovementTemplate, on_date: date) -> TemplatePlan:
    """Occurrences of one template that are due on or before `on_date`.

    Due means: at or after the template's `next_run_on` (so what already ran is
    never generated twice) and not past its `end_date`. A template left behind
    for months catches up here, emitting one movement per missed occurrence.
    """
    movements: list[PlannedMovement] = []
    index = 0
    while True:
        occurrence = occurrence_on(template, index)
        if template.end_date is not None and occurrence > template.end_date:
            return TemplatePlan(template.id, movements, next_run_on=None)
        if occurrence > on_date:
            return TemplatePlan(template.id, movements, next_run_on=occurrence)
        if occurrence >= template.next_run_on:
            movements.append(
                PlannedMovement(
                    template_id=template.id,
                    kind=template.kind,
                    amount=template.amount,
                    occurred_on=occurrence,
                    description=template.description,
                    account_id=template.account_id,
                    category_id=template.category_id,
                )
            )
        index += 1


def plan_recurring_movements(
    templates: list[MovementTemplate], on_date: date
) -> list[TemplatePlan]:
    """Plan every active template, dropping those with nothing to do."""
    plans = [plan_template(template, on_date) for template in templates if template.is_active]
    return [plan for plan in plans if plan.movements or plan.next_run_on is None]
