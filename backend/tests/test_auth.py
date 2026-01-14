"""Tests for authentication endpoints."""

from app.auth.utils import hash_password, verify_password
from app.db.models import User


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "relay-pacs-api"}


def test_login_success_with_database_user(client):
    """Test login with database user (hashed password)."""
    response = client.post("/auth/login", json={"username": "admin", "password": "adminuser@123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_fallback_to_test_users(client):
    """Test login falls back to TEST_USERS for backward compatibility."""
    # This will work if user doesn't exist in DB but is in TEST_USERS
    response = client.post(
        "/auth/login", json={"username": "testuser1", "password": "testuser@123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


def test_login_failure(client):
    """Test login with wrong credentials."""
    response = client.post("/auth/login", json={"username": "wrong", "password": "wrong"})
    assert response.status_code == 401


def test_password_hashing():
    """Test password hashing and verification."""
    password = "TestPassword123!"
    hashed = hash_password(password)

    # Verify hash is not the same as plaintext
    assert hashed != password

    # Verify correct password
    assert verify_password(password, hashed) is True

    # Verify incorrect password
    assert verify_password("WrongPassword", hashed) is False


def test_register_new_user(client, db_session):
    """Test user registration with hashed password."""
    response = client.post(
        "/auth/register",
        json={
            "username": "testregister",
            "email": "test@register.com",
            "password": "SecurePassword123!",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

    # Verify user was created in database
    user = db_session.query(User).filter(User.username == "testregister").first()
    assert user is not None
    assert user.email == "test@register.com"
    # Verify password was hashed
    assert user.hashed_password != "SecurePassword123!"
    assert verify_password("SecurePassword123!", user.hashed_password)


def test_register_duplicate_username(client):
    """Test registration with existing username fails."""
    # Register first user
    client.post(
        "/auth/register",
        json={"username": "duplicate", "email": "first@test.com", "password": "SecurePassword123!"},
    )

    # Try to register with same username
    response = client.post(
        "/auth/register",
        json={
            "username": "duplicate",
            "email": "second@test.com",
            "password": "SecurePassword456!",
        },
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_token_refresh(client):
    """Test token refresh endpoint."""
    # First login to get tokens
    login_response = client.post(
        "/auth/login", json={"username": "admin", "password": "adminuser@123"}
    )
    refresh_token = login_response.json()["refresh_token"]

    # Use refresh token to get new tokens
    response = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_logout(client):
    """Test logout endpoint revokes token."""
    # Login first
    login_response = client.post(
        "/auth/login", json={"username": "admin", "password": "adminuser@123"}
    )
    token = login_response.json()["access_token"]

    # Logout
    response = client.post("/auth/logout", json={"token": token})
    assert response.status_code == 200
    assert "Successfully logged out" in response.json()["message"]


def test_password_requirements(client):
    """Test password validation (min 8 chars)."""
    response = client.post(
        "/auth/register",
        json={
            "username": "weakpass",
            "email": "weak@test.com",
            "password": "short",  # Only 5 characters
        },
    )
    assert response.status_code == 422  # Pydantic validation error
