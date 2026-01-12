"""
Configuration management for RelayPACS backend.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # App
    app_name: str = "RelayPACS"
    debug: bool = False

    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    upload_token_expire_minutes: int = 30

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

    # PACS
    pacs_type: str = "orthanc"  # 'orthanc' or 'dcm4chee'
    pacs_stow_url: str = "http://localhost:8042/dicom-web/studies"
    pacs_auth_type: str = "basic"
    orthanc_url: str = "http://localhost:8042"
    orthanc_username: str = "orthanc"
    orthanc_password: str = "orthanc"

    # dcm4chee specific
    dcm4chee_stow_url: str = "http://localhost:8081/dcm4chee-arc/aets/DCM4CHEE/rs/studies"

    # Upload limits
    max_file_size_mb: int = 2048
    chunk_size_mb: int = 1

    # Reports & Notifications
    reports_db_path: str = "data/reports.db"
    pacs_poll_interval_seconds: int = 10  # Poll PACS for report updates

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
