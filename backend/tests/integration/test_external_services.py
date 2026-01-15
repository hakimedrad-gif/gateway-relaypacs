import os

import boto3
import pytest
import requests
from app.config import get_settings

# Mark all tests in this module to be skipped unless LIVE_TESTS is true
pytestmark = pytest.mark.skipif(
    os.environ.get("LIVE_TESTS") != "true",
    reason="Live integration tests require LIVE_TESTS=true environment variable and running services",
)


class TestExternalServices:
    """
    Integration tests against real external services (MinIO, Orthanc, Redis).
    These tests verify that the application can communicate with these services
    when they are actually running.
    """

    def test_minio_connection(self):
        """Verify connection to MinIO/S3."""
        settings = get_settings()

        # Override S3 settings for this test if needed, or assume they are set in env
        # We need actual credentials here
        try:
            s3 = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint_url or "http://localhost:9000",
                aws_access_key_id=settings.s3_access_key or "minioadmin",
                aws_secret_access_key=settings.s3_secret_key or "minioadmin",
                region_name=settings.s3_region,
            )
            # List buckets to verify auth and connectivity
            response = s3.list_buckets()
            assert "Buckets" in response
        except Exception as e:
            pytest.fail(f"Failed to connect to MinIO: {e}")

    def test_pacs_connection(self):
        """Verify connection to Orthanc PACS."""
        settings = get_settings()
        base_url = settings.pacs_orthanc_url or "http://localhost:8042"

        try:
            # Simple health check or system info
            response = requests.get(
                f"{base_url}/system",
                auth=(settings.pacs_username, settings.pacs_password),
                timeout=5,
            )
            assert response.status_code == 200
            data = response.json()
            assert "Version" in data
        except Exception as e:
            pytest.fail(f"Failed to connect to PACS: {e}")

    def test_redis_connection(self):
        """Verify connection to Redis."""
        settings = get_settings()
        import redis

        try:
            # Synchronous client for testing
            r = redis.from_url(settings.redis_url or "redis://localhost:6379/0")
            assert r.ping() is True
        except Exception as e:
            pytest.fail(f"Failed to connect to Redis: {e}")
