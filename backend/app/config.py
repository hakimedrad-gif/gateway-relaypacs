"""
Configuration management for RelayPACS backend.
"""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # App
    app_name: str = "RelayPACS"
    debug: bool = False

    # Security - REQUIRED from environment
    secret_key: str  # Must be set in .env file
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    upload_token_expire_minutes: int = 30
    
    # DICOM Identity (Client Node AET)
    ae_title: str = "RELAYPACS"

    # Database
    database_url: str = (
        "sqlite:///./relaypacs.db"  # Default to SQLite, override with postgres://... in production
    )

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8003

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3002",
        "http://10.10.20.50:3002",
        "http://localhost:3000",
    ]

    # S3 Storage
    use_s3: bool = False
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "relay-pacs-uploads"
    s3_region: str = "us-east-1"

    # PACS - Orthanc
    orthanc_url: str = "http://localhost:8042"
    orthanc_wado_url: str = "http://localhost:8042/dicom-web"
    orthanc_username: str = "orthanc"
    orthanc_password: str = "orthanc"

    # PACS - dcm4che
    dcm4chee_url: str = "http://localhost:8081/dcm4chee-arc/aets/DCM4CHEE/rs"
    dcm4chee_wado_url: str = "http://localhost:8081/dcm4chee-arc/aets/DCM4CHEE/rs"
    
    # Active PACS Selection
    active_pacs: str = "dcm4chee"  # 'orthanc', 'dcm4chee', or 'both' (future)
    pacs_poll_interval_seconds: int = 10

    # Upload limits
    max_file_size_mb: int = 2048
    chunk_size_mb: int = 1

    # Caching (Redis)
    redis_url: str | None = "redis://localhost:6379"

    # Reports & Notifications
    reports_db_path: str = "data/reports.db"
    pacs_poll_interval_seconds: int = 10  # Poll PACS for report updates

    # Error Monitoring (Sentry)
    sentry_dsn: str | None = None  # Set to enable Sentry
    sentry_environment: str = "development"
    sentry_traces_sample_rate: float = 0.1

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """
        Validate SECRET_KEY is secure and not using default/insecure values.
        
        This prevents catastrophic authentication bypass if deployed with
        the default development secret key.
        """
        # List of known insecure values
        insecure_values = [
            "dev-secret-key-change-in-production",
            "change-me",
            "secret",
            "password",
            "admin",
            "",
        ]
        
        # Check for known insecure values (case-insensitive)
        if v.lower() in [val.lower() for val in insecure_values]:
            raise ValueError(
                f"SECRET_KEY is set to an insecure default value: '{v}'. "
                "You MUST generate a secure random secret key before deployment. "
                "Run: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
        
        # Enforce minimum length
        if len(v) < 32:
            raise ValueError(
                f"SECRET_KEY must be at least 32 characters long (current: {len(v)}). "
                "Generate a secure key with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
        
        return v


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
