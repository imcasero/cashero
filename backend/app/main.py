from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_api_key
from app.config import settings
from app.db import get_session

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@app.get("/health")
def health():
    """Public: liveness probe, no auth."""
    return {"status": "ok"}


@app.get("/db-check", dependencies=[Depends(require_api_key)])
async def db_check(session: SessionDep):
    """Runs a trivial query to prove the Postgres connection works."""
    result = await session.execute(text("select 1"))
    return {"db": result.scalar_one()}
