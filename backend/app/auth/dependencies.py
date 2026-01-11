from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.auth.utils import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict[str, Any]:
    """Validate standard access token"""
    payload = verify_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
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
