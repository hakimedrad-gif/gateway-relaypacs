from datetime import UTC, datetime, timedelta
from typing import Any

from jose import jwt

from app.config import get_settings

settings = get_settings()


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a standard access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return str(encoded_jwt)


def create_upload_token(upload_id: str) -> str:
    """Create a scoped token specifically for a single upload session"""
    expire = datetime.now(UTC) + timedelta(minutes=settings.upload_token_expire_minutes)
    to_encode = {"sub": str(upload_id), "exp": expire, "type": "upload", "scopes": ["upload:write"]}
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return str(encoded_jwt)


def verify_token(token: str) -> dict[str, Any] | None:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return dict(payload)
    except Exception:
        return None
