from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.core.database import SessionDep
from app.core.security import require_api_key

router = APIRouter(tags=["system"])


@router.get("/health")
def health():
    """Public: liveness probe, no auth."""
    return {"status": "ok"}


@router.get("/db-check", dependencies=[Depends(require_api_key)])
async def db_check(session: SessionDep):
    """Runs a trivial query to prove the Postgres connection works."""
    result = await session.execute(text("select 1"))
    return {"db": result.scalar_one()}
