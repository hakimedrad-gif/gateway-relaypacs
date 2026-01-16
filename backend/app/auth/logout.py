"""Logout endpoint with token revocation."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.cache.service import cache_service
from app.db.database import get_db
from app.models.user import TokenRevokeRequest

router = APIRouter()

# Token revocation prefix
REVOKED_TOKEN_PREFIX = "revoked_token:"


@router.post("/logout")
async def logout(payload: TokenRevokeRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    """
    Logout user and revoke their access token using Redis.
    """
    # Store token in Redis with a 24-hour expiry
    # (matching max possible token life)
    await cache_service.set(f"{REVOKED_TOKEN_PREFIX}{payload.token}", "1", expire=86400)

    return {"message": "Successfully logged out"}


async def is_token_revoked(token: str) -> bool:
    """
    Check if a token has been revoked in Redis.
    """
    result = await cache_service.get(f"{REVOKED_TOKEN_PREFIX}{token}")
    return result is not None
