"""Token refresh endpoint."""

from fastapi import APIRouter, HTTPException, status
from jose import JWTError, jwt

from app.auth.utils import ALGORITHM, SECRET_KEY, create_access_token, create_refresh_token
from app.models.user import TokenPair

router = APIRouter()


@router.post("/refresh", response_model=TokenPair)
async def refresh_token(refresh_token: str) -> TokenPair:
    """
    Exchange a valid refresh token for a new access token and refresh token.

    Args:
        refresh_token: The refresh token to exchange

    Returns:
        New access and refresh tokens
    """
    try:
        # Verify refresh token
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        token_type = payload.get("type")

        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )

        # Issue new tokens
        new_access_token = create_access_token(data={"sub": username})
        new_refresh_token = create_refresh_token(data={"sub": username})

        return TokenPair(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
