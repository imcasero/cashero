import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.accounts.schemas import AccountBalanceRead, AccountCreate, AccountRead, AccountUpdate
from app.core.database import SessionDep
from app.core.security import require_api_key
from app.models.account_balances import AccountBalance
from app.models.accounts import Account

router = APIRouter(prefix="/accounts", tags=["accounts"], dependencies=[Depends(require_api_key)])


async def get_account_or_404(session: AsyncSession, account_id: uuid.UUID) -> Account:
    db_account = await session.get(Account, account_id)
    if db_account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    return db_account


_CONSTRAINT_MESSAGES = {
    "accounts_interest_consistent": (
        "interest_type and interest_rate must be both set or both empty"
    ),
}


async def clear_other_primary_accounts(session: AsyncSession, keep_id: uuid.UUID | None) -> None:
    """Unset is_primary on every other account so at most one stays primary."""
    stmt = update(Account).where(Account.is_primary.is_(True)).values(is_primary=False)
    if keep_id is not None:
        stmt = stmt.where(Account.id != keep_id)
    await session.execute(stmt)


async def commit_or_409(session: AsyncSession) -> None:
    """Commit, translating a known constraint violation into a 409."""
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        cause = exc.orig.__cause__ if exc.orig is not None else None
        constraint_name = getattr(cause, "constraint_name", None)
        detail = "The account could not be saved: constraint violated"
        if isinstance(constraint_name, str) and constraint_name in _CONSTRAINT_MESSAGES:
            detail = _CONSTRAINT_MESSAGES[constraint_name]
        raise HTTPException(status.HTTP_409_CONFLICT, detail) from exc


@router.get("")
async def get_accounts(session: SessionDep) -> list[AccountRead]:
    result = await session.execute(select(Account))
    return [AccountRead.model_validate(account) for account in result.scalars()]


@router.get("/{account_id}")
async def get_account(account_id: uuid.UUID, session: SessionDep) -> AccountRead:
    db_account = await get_account_or_404(session, account_id)
    return AccountRead.model_validate(db_account)


@router.get("/{account_id}/balance")
async def get_account_balance(account_id: uuid.UUID, session: SessionDep) -> AccountBalanceRead:
    await get_account_or_404(session, account_id)
    balance = await session.get(AccountBalance, account_id)
    if balance is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    return AccountBalanceRead.model_validate(balance)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_account(account: AccountCreate, session: SessionDep) -> AccountRead:
    if account.is_primary:
        await clear_other_primary_accounts(session, keep_id=None)
    db_account = Account(**account.model_dump())
    session.add(db_account)
    await commit_or_409(session)
    await session.refresh(db_account)
    return AccountRead.model_validate(db_account)


@router.patch("/{account_id}")
async def update_account(
    account_id: uuid.UUID, account: AccountUpdate, session: SessionDep
) -> AccountRead:
    db_account = await get_account_or_404(session, account_id)
    payload = account.model_dump(exclude_unset=True)
    if payload.get("is_primary") is True:
        await clear_other_primary_accounts(session, keep_id=account_id)
    for key, value in payload.items():
        setattr(db_account, key, value)
    await commit_or_409(session)
    await session.refresh(db_account)
    return AccountRead.model_validate(db_account)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(account_id: uuid.UUID, session: SessionDep) -> None:
    db_account = await get_account_or_404(session, account_id)
    await session.delete(db_account)
    await session.commit()
