from typing import Any

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer

from app.auth.utils import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    token_query: str | None = Query(None, alias="token"),
) -> dict[str, Any]:
    """Validate standard access token from header or query param"""
    final_token = token_query if token_query else token

    if not final_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(final_token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


async def get_upload_token(token: str = Depends(oauth2_scheme)) -> dict[str, Any]:
    """Validate upload-scoped token"""
    payload = verify_token(token)
    if not payload or payload.get("type") != "upload":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid upload token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload
