import secrets
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.core.config import settings


def require_api_key(x_api_key: Annotated[str | None, Header()] = None) -> None:
    """Reject the request unless it carries the configured API key.

    Single-user app: the only client sends a static secret in the "X-API-Key"
    header. compare_digest avoids leaking the key through timing differences.
    """
    if not settings.api_key:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "API_KEY is not configured")
    if x_api_key is None or not secrets.compare_digest(x_api_key, settings.api_key):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing or invalid API key")


# Add to a router/endpoint as: dependencies=[Depends(require_api_key)]
RequireApiKey = Depends(require_api_key)
