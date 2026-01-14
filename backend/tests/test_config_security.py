"""Tests for configuration security validations (P0-1)."""

import pytest
from app.config import Settings
from pydantic import ValidationError


class TestSecretKeyValidation:
    """Test SECRET_KEY security validation."""

    def test_secret_key_rejects_dev_default(self):
        """Test that development default key is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            Settings(secret_key="dev-secret-key-change-in-production")

        assert "insecure default value" in str(exc_info.value).lower()

    def test_secret_key_rejects_common_weak_values(self):
        """Test that common weak values are rejected."""
        weak_keys = ["change-me", "secret", "password", "admin", ""]

        for weak_key in weak_keys:
            with pytest.raises(ValidationError) as exc_info:
                Settings(secret_key=weak_key)

            assert "insecure" in str(exc_info.value).lower()

    def test_secret_key_enforces_minimum_length(self):
        """Test that keys shorter than 32 characters are rejected."""
        short_key = "short_key_123"  # Only 13 characters

        with pytest.raises(ValidationError) as exc_info:
            Settings(secret_key=short_key)

        error_msg = str(exc_info.value).lower()
        assert "32 characters" in error_msg or "at least" in error_msg

    def test_secret_key_accepts_secure_value(self):
        """Test that a properly generated secure key is accepted."""
        import secrets

        secure_key = secrets.token_urlsafe(32)  # 43+ characters

        # Should not raise
        settings = Settings(secret_key=secure_key)
        assert settings.secret_key == secure_key

    def test_secret_key_case_insensitive_check(self):
        """Test that insecure value check is case-insensitive."""
        with pytest.raises(ValidationError):
            Settings(secret_key="PASSWORD")  # Uppercase should also be rejected

        with pytest.raises(ValidationError):
            Settings(secret_key="Admin")  # Mixed case should also be rejected

    def test_secret_key_exactly_32_chars_accepted(self):
        """Test that exactly 32-character key is accepted."""
        key_32_chars = "a" * 32

        settings = Settings(secret_key=key_32_chars)
        assert len(settings.secret_key) == 32

    def test_secret_key_error_message_helpful(self):
        """Test that error message includes generation command."""
        with pytest.raises(ValidationError) as exc_info:
            Settings(secret_key="weak")

        error_msg = str(exc_info.value)
        assert "secrets.token_urlsafe" in error_msg or "generate" in error_msg.lower()
