import pytest
from app.middleware.security import SecurityHeadersMiddleware
from fastapi import FastAPI
from starlette.testclient import TestClient


@pytest.fixture
def app():
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)

    @app.get("/test")
    async def test_route():
        return {"status": "ok"}

    return app


@pytest.fixture
def client(app):
    return TestClient(app)


def test_security_headers_present(client):
    """Test that all specified security headers are present in response."""
    response = client.get("/test")
    assert response.status_code == 200

    headers = response.headers
    assert headers["X-Content-Type-Options"] == "nosniff"
    assert headers["X-Frame-Options"] == "DENY"
    assert headers["X-XSS-Protection"] == "1; mode=block"
    assert "Content-Security-Policy" in headers
    assert headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "Permissions-Policy" in headers


def test_csp_policy_content(client):
    """Test that Content-Security-Policy has expected values."""
    response = client.get("/test")
    csp = response.headers["Content-Security-Policy"]

    assert "default-src 'self'" in csp
    assert "frame-ancestors 'none'" in csp
    assert "img-src 'self' data: blob:" in csp


def test_permissions_policy_content(client):
    """Test that Permissions-Policy restricts sensitive features."""
    response = client.get("/test")
    policy = response.headers["Permissions-Policy"]

    assert "geolocation=()" in policy
    assert "camera=()" in policy


def test_hsts_header_not_present_by_default(client):
    """Test HSTS is disabled by default (configured for production)."""
    response = client.get("/test")
    assert "Strict-Transport-Security" not in response.headers
