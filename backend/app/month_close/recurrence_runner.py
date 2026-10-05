"""The database half of recurrence: load the templates, ask the pure planner
what should exist, and write the result back. The rules themselves live in
`app.movement_templates.recurrence`.
"""

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.movement_templates import MovementTemplate
from app.models.movements import Movement, MovementKind, MovementOrigin
from app.movement_templates.recurrence import plan_recurring_movements


async def generate_recurring_movements(
    session: AsyncSession, on_date: date
) -> tuple[list[Movement], list[uuid.UUID]]:
    """Create every movement the active templates owe up to `on_date`.

    Returns the new movements and the ids of the templates that ran out of
    occurrences. Nothing is committed: the caller owns the transaction.
    """
    result = await session.execute(
        select(MovementTemplate).where(MovementTemplate.is_active.is_(True))
    )
    templates = {template.id: template for template in result.scalars()}
    plans = plan_recurring_movements(list(templates.values()), on_date)

    created: list[Movement] = []
    deactivated: list[uuid.UUID] = []
    for plan in plans:
        template = templates[plan.template_id]
        for planned in plan.movements:
            created.append(
                Movement(
                    # A template is expense|income, which is a subset of the
                    # movement kinds, so the value maps straight across.
                    kind=MovementKind(planned.kind.value),
                    amount=planned.amount,
                    occurred_on=planned.occurred_on,
                    description=planned.description,
                    account_id=planned.account_id,
                    category_id=planned.category_id,
                    counterparty_account_id=None,
                    origin=MovementOrigin.RECURRING,
                    template_id=template.id,
                )
            )
        if plan.last_run_on is not None:
            template.last_run_on = plan.last_run_on
        if plan.next_run_on is None:
            # Past its end_date: keep next_run_on as the last value the row had
            # (the column is NOT NULL) and stop it from being picked up again.
            template.is_active = False
            deactivated.append(template.id)
        else:
            template.next_run_on = plan.next_run_on

    session.add_all(created)
    return created, deactivated
