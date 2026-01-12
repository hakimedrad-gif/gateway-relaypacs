from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.utils import create_access_token, create_refresh_token, hash_password, verify_password
from app.db.database import get_db
from app.db.models import User as UserModel
from app.models.user import TokenPair, UserCreate, UserLogin, UserResponse

router = APIRouter()


# Mock user database preserved for backward compatibility (TestingOnly)
# TODO: Remove after all tests migrated to database
TEST_USERS = {
    "testuser1": "testuser@123",
    "admin": "adminuser@123",
    "testclinician": "testclinician@123",
    "testradiographer": "testradiographer@123",
    "testclinic": "testclinic@123",
    "testradiologist": "testradiologist@123",
}


@router.post("/login", response_model=TokenPair)
async def login(credentials: UserLogin, db: Session = Depends(get_db)) -> TokenPair:
    """
    Authenticate user and issue access tokens.
    Supports both database users and legacy TEST_USERS for backward compatibility.
    """
    username = credentials.username
    password = credentials.password

    # Try database first
    user = db.query(UserModel).filter(UserModel.username == username).first()

    if user and verify_password(password, user.hashed_password):
        # Database user - verify against hashed password
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled",
            )

        access_token = create_access_token(data={"sub": username})
        refresh_token = create_refresh_token(data={"sub": username})
        return TokenPair(access_token=access_token, refresh_token=refresh_token)

    # Fallback to TEST_USERS for backward compatibility
    if username in TEST_USERS and TEST_USERS[username] == password:
        access_token = create_access_token(data={"sub": username})
        refresh_token = create_refresh_token(data={"sub": username})
        return TokenPair(access_token=access_token, refresh_token=refresh_token)

    # Authentication failed
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)) -> TokenPair:
    """
    Register a new user account with hashed password.
    """
    # Check if username already exists
    existing_user = db.query(UserModel).filter(UserModel.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID already exists. Please choose another one.",
        )

    # Check if email already exists
    existing_email = db.query(UserModel).filter(UserModel.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please use a different email.",
        )

    # Create new user with hashed password
    hashed_pw = hash_password(user_data.password)
    new_user = UserModel(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pw,
        full_name=user_data.full_name,
        role=user_data.role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Issue tokens for immediate login
    access_token = create_access_token(data={"sub": new_user.username})
    refresh_token = create_refresh_token(data={"sub": new_user.username})
    return TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict[str, str] = Depends(lambda: {"sub": "testuser"}),  # Placeholder
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Get current authenticated user's information.
    """
    username = current_user.get("sub")
    user = db.query(UserModel).filter(UserModel.username == username).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserResponse.model_validate(user)
