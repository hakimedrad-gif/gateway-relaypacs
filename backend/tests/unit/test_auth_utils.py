from datetime import UTC, datetime, timedelta

from app.auth.utils import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    create_refresh_token,
    create_upload_token,
    hash_password,
    verify_password,
    verify_token,
)
from jose import jwt


def test_hash_password():
    """Test password hashing."""
    pwd = "securepassword"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")  # bcrypt prefix


def test_verify_password():
    """Test password verification."""
    pwd = "securepassword"
    hashed = hash_password(pwd)
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_verify_password_timing_attack_resistance():
    """Test password verification is robust."""
    # This is more of a functional test than a timing attack test,
    # ensuring it works for various inputs.
    pwd = "password"
    hashed = hash_password(pwd)
    assert verify_password(pwd, hashed) is True
    assert verify_password("Password", hashed) is False
    assert verify_password("", hashed) is False


def test_create_access_token():
    """Test access token creation."""
    data = {"sub": "testuser"}
    token = create_access_token(data)
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert decoded["sub"] == "testuser"
    assert decoded["type"] == "access"
    assert "exp" in decoded


def test_create_access_token_with_expiry():
    """Test access token with custom expiry."""
    data = {"sub": "testuser"}
    delta = timedelta(minutes=5)
    token = create_access_token(data, expires_delta=delta)
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    # Check expiry is roughly 5 mins from now
    exp_time = datetime.fromtimestamp(decoded["exp"], tz=UTC)
    now = datetime.now(UTC)
    assert now < exp_time <= now + delta + timedelta(seconds=2)


def test_create_refresh_token():
    """Test refresh token creation."""
    data = {"sub": "testuser"}
    token = create_refresh_token(data)
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert decoded["sub"] == "testuser"
    assert decoded["type"] == "refresh"
    assert "exp" in decoded


def test_create_upload_token():
    """Test scoped upload token creation."""
    upload_id = "up_123"
    user_id = "u_456"
    token = create_upload_token(upload_id, user_id)
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert decoded["sub"] == upload_id
    assert decoded["user_id"] == user_id
    assert decoded["type"] == "upload"
    assert "upload:write" in decoded["scopes"]


def test_verify_token_valid():
    """Test token verification with valid token."""
    data = {"sub": "testuser"}
    token = create_access_token(data)
    payload = verify_token(token)
    assert payload is not None
    assert payload["sub"] == "testuser"


def test_verify_token_expired():
    """Test token verification with expired token."""
    data = {"sub": "testuser"}
    # Manually create expired token
    expire = datetime.now(UTC) - timedelta(minutes=1)
    to_encode = data.copy()
    to_encode.update({"exp": expire, "type": "access"})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    payload = verify_token(token)
    assert payload is None


def test_verify_token_invalid_signature():
    """Test token verification with tampered token."""
    data = {"sub": "testuser"}
    token = create_access_token(data)
    # Tamper with the token (e.g. change last char)
    # This might make it invalid base64 or invalid signature
    # A cleaner way is using a different key
    tampered_token = jwt.encode(data, "wrong_secret_key", algorithm=ALGORITHM)
    payload = verify_token(tampered_token)
    assert payload is None


def test_verify_token_wrong_type():
    """Test token type validation logic (application level)."""
    # The utils.verify_token doesn't check type, but we can verify it returns the type field
    # so the caller can check it.
    data = {"sub": "testuser"}
    token = create_access_token(data)
    payload = verify_token(token)
    assert payload["type"] == "access"

    refresh_token = create_refresh_token(data)
    refresh_payload = verify_token(refresh_token)
    assert refresh_payload["type"] == "refresh"
