from collections.abc import AsyncGenerator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


@lru_cache
def get_engine() -> AsyncEngine:
    """Build the async engine once and reuse it (it owns the connection pool).

    statement_cache_size=0 is required when connecting through Supabase's pooler
    (pgbouncer), which does not support prepared statements in transaction mode.
    """
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is not set (see .env.example)")
    return create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
        connect_args={"statement_cache_size": 0},
    )


@lru_cache
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    # expire_on_commit=False keeps ORM objects usable after commit.
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession]:
    """FastAPI dependency: yields a session and closes it when the request ends."""
    async with get_sessionmaker()() as session:
        yield session


# FastAPI dependency alias: annotate endpoint params as `session: SessionDep`.
SessionDep = Annotated[AsyncSession, Depends(get_session)]
