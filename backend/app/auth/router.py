from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.auth.utils import create_access_token

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Mock user database for testing
TEST_USERS = {
    "testuser1": "testuser@123",
    "admin": "adminuser@123",
    "testclinician": "testclinician@123",
    "testradiographer": "testradiographer@123",
    "testclinic": "testclinic@123",
    "testradiologist": "testradiologist@123",
}


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest) -> TokenResponse | dict[str, str]:
    """
    Mock login endpoint to issue access tokens.
    In real world, verify credentials against database.
    """
    # Verify credentials against mock database
    username = credentials.username
    password = credentials.password

    if username not in TEST_USERS or TEST_USERS[username] != password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": username})
    return {"access_token": access_token, "token_type": "bearer"}
