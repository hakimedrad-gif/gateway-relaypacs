from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.auth.logout import router as logout_router
from app.auth.refresh import router as refresh_router
from app.auth.router import router as auth_router
from app.config import get_settings
from app.limiter import limiter
from app.middleware.security import SecurityHeadersMiddleware
from app.notifications.router import router as notifications_router
from app.reports.router import router as reports_router
from app.upload.router import router as upload_router

settings = get_settings()

# Initialize Sentry for error monitoring (if configured)
if settings.sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        send_default_pii=False,  # Don't send PII by default
    )
    print(f"✓ Sentry initialized for {settings.sentry_environment} environment")

app = FastAPI(
    title="RelayPACS API",
    description="Mobile-first DICOM ingestion node for teleradiology",
    version="0.1.0",
)

# Security headers middleware (add first for all responses)
app.add_middleware(SecurityHeadersMiddleware)

# GZip compression for large responses (>1KB)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS middleware for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1", "*"]  # In prod, restrict this
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.on_event("startup")
async def startup_event():
    """Initialize services on app startup."""
    # Initialize reports database
    from app.reports.pacs_sync import pacs_sync_service

    print("✓ Reports database initialized")

    # Start PACS sync service
    await pacs_sync_service.start()
    print("✓ PACS Report Sync Service started")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on app shutdown."""
    from app.reports.pacs_sync import pacs_sync_service

    # Stop PACS sync service
    await pacs_sync_service.stop()
    print("✓ PACS Report Sync Service stopped")

    print("✓ Shutting down gracefully")


@app.get("/health")
async def health_check() -> JSONResponse:
    """Health check endpoint"""
    return JSONResponse(
        status_code=200,
        content={"status": "healthy", "service": "relay-pacs-api"},
    )


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint"""
    return {
        "message": "RelayPACS API",
        "version": "0.1.0",
        "docs": "/docs",
        "api_v1": "/api/v1",
    }


# Versioned API (v1) - Primary API
from app.api.v1 import api_router as v1_router

app.include_router(v1_router, prefix="/api/v1")

# Legacy routes (for backward compatibility - will be deprecated)
# These maintain existing paths during transition
app.include_router(auth_router, prefix="/auth", tags=["auth", "legacy"])
app.include_router(refresh_router, prefix="/auth", tags=["auth", "legacy"])
app.include_router(logout_router, prefix="/auth", tags=["auth", "legacy"])
app.include_router(upload_router, prefix="/upload", tags=["upload", "legacy"])
app.include_router(reports_router, prefix="/reports", tags=["reports", "legacy"])
app.include_router(notifications_router, prefix="/notifications", tags=["notifications", "legacy"])

# Initialize Prometheus metrics endpoint
# This exposes /metrics for Prometheus to scrape
Instrumentator().instrument(app).expose(app)

print("✓ RelayPACS backend started successfully")
print(f"  API docs: http://{settings.api_host}:{settings.api_port}/docs")
print(f"  Metrics: http://{settings.api_host}:{settings.api_port}/metrics")
