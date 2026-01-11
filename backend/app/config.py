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

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # S3 Storage
    use_s3: bool = False
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "relay-pacs-uploads"
    s3_region: str = "us-east-1"

    # PACS
    pacs_stow_url: str = "http://localhost:8042/dicom-web/studies"
    pacs_auth_type: str = "basic"
    orthanc_url: str = "http://localhost:8042"
    orthanc_username: str = "orthanc"
    orthanc_password: str = "orthanc"

    # Upload limits
    max_file_size_mb: int = 2048
    chunk_size_mb: int = 1

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
