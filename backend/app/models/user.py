"""Pydantic models for User API contracts."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema with common fields."""

    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$")
    email: EmailStr
    full_name: str | None = None
    role: str = Field(default="clinician", pattern="^(clinician|radiographer|radiologist|admin)$")


class UserCreate(UserBase):
    """Schema for user registration."""

    password: str = Field(..., min_length=8, max_length=128)


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
