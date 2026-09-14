import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.accounts.schemas import AccountCreate, AccountRead, AccountUpdate
from app.core.database import SessionDep
from app.core.security import require_api_key
from app.models.accounts import Account

router = APIRouter(
    prefix="/accounts", tags=["accounts"], dependencies=[Depends(require_api_key)]
)


async def get_account_or_404(session: AsyncSession, account_id: uuid.UUID) -> Account:
    db_account = await session.get(Account, account_id)
    if db_account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    return db_account


@router.get("")
async def get_accounts(session: SessionDep) -> list[AccountRead]:
    result = await session.execute(select(Account))
    return [AccountRead.model_validate(account) for account in result.scalars()]


@router.get("/{account_id}")
async def get_account(account_id: uuid.UUID, session: SessionDep) -> AccountRead:
    db_account = await get_account_or_404(session, account_id)
    return AccountRead.model_validate(db_account)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_account(account: AccountCreate, session: SessionDep) -> AccountRead:
    db_account = Account(**account.model_dump())
    session.add(db_account)
    await session.commit()
    await session.refresh(db_account)
    return AccountRead.model_validate(db_account)


@router.patch("/{account_id}")
async def update_account(
    account_id: uuid.UUID, account: AccountUpdate, session: SessionDep
) -> AccountRead:
    db_account = await get_account_or_404(session, account_id)
    for key, value in account.model_dump(exclude_unset=True).items():
        setattr(db_account, key, value)
    await session.commit()
    await session.refresh(db_account)
    return AccountRead.model_validate(db_account)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(account_id: uuid.UUID, session: SessionDep) -> None:
    db_account = await get_account_or_404(session, account_id)
    await session.delete(db_account)
    await session.commit()
