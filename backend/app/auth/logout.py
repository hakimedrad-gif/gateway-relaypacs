"""Logout endpoint with token revocation."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import TokenRevokeRequest

router = APIRouter()

# In-memory token blacklist (in production, use Redis or database table)
revoked_tokens: set[str] = set()


@router.post("/logout")
async def logout(payload: TokenRevokeRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    """
    Logout user and revoke their access token.

    Args:
        token: The access token to revoke

    Returns:
        Success message
    """
    # Add token to revocation list
    revoked_tokens.add(payload.token)

    return {"message": "Successfully logged out"}


def is_token_revoked(token: str) -> bool:
    """
    Check if a token has been revoked.

    Args:
        token: The token to check

    Returns:
        True if token is revoked, False otherwise
    """
    return token in revoked_tokens
