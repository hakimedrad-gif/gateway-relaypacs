"""Pydantic models for User API contracts."""

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    """Base user schema with common fields."""

    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$")
    email: EmailStr
    full_name: str | None = None
    role: str = Field(default="clinician", pattern="^(clinician|radiographer|radiologist|admin)$")


class UserCreate(UserBase):
    """Schema for user registration."""

    password: str = Field(
        ...,
        min_length=12,
        max_length=128,
        description="Password must be at least 12 characters with uppercase, lowercase, digit, and special character",
    )

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """
        Enforce strong password requirements to prevent account compromise.

        Requirements:
        - Minimum 12 characters (already enforced by Field)
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit
        - At least one special character
        """
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter (A-Z)")

        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter (a-z)")

        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit (0-9)")

        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", v):
            raise ValueError(
                "Password must contain at least one special character (!@#$%^&*()_+-=[]{}etc.)"
            )

        return v


class UserLogin(BaseModel):
    """Schema for user login."""

    username: str
    password: str
    totp_code: str | None = None


class UserResponse(UserBase):
    """Schema for user data in responses (no password)."""

    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True  # Enable ORM mode for SQLAlchemy models


class TokenPair(BaseModel):
    """Access and refresh token pair."""

    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"


class TokenRefreshRequest(BaseModel):
    """Request to refresh access token."""

    refresh_token: str


class TokenRevokeRequest(BaseModel):
    """Request to revoke a token (logout)."""

    token: str
