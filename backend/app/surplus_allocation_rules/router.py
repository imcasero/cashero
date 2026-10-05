from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionDep
from app.core.security import require_api_key
from app.models.surplus_allocation_rules import SurplusAllocationRule
from app.surplus_allocation_rules.schemas import (
    SurplusAllocationReplace,
    SurplusAllocationRuleRead,
)

router = APIRouter(
    prefix="/surplus-allocation-rules",
    tags=["surplus-allocation-rules"],
    dependencies=[Depends(require_api_key)],
)


async def commit_or_422(session: AsyncSession) -> None:
    """Commit, translating a bad foreign key into a 422."""
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "account_id does not reference an existing row",
        ) from exc


async def list_rules(session: AsyncSession) -> list[SurplusAllocationRuleRead]:
    result = await session.execute(select(SurplusAllocationRule))
    return [SurplusAllocationRuleRead.model_validate(rule) for rule in result.scalars()]


@router.get("")
async def get_rules(session: SessionDep) -> list[SurplusAllocationRuleRead]:
    return await list_rules(session)


@router.put("")
async def replace_rules(
    payload: SurplusAllocationReplace, session: SessionDep
) -> list[SurplusAllocationRuleRead]:
    """Replace the whole set of rules in one transaction.

    Row-by-row CRUD would let the set sit above 100% between two requests, so
    the only way to change the split is to send all of it at once.
    """
    await session.execute(delete(SurplusAllocationRule))
    session.add_all(
        SurplusAllocationRule(account_id=rule.account_id, percentage=rule.percentage)
        for rule in payload.rules
    )
    await commit_or_422(session)
    return await list_rules(session)
