from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.auth.logout import router as logout_router
from app.auth.refresh import router as refresh_router
from app.auth.router import router as auth_router
from app.config import get_settings
from app.limiter import limiter
from app.notifications.router import router as notifications_router
from app.reports.router import router as reports_router
from app.upload.router import router as upload_router

settings = get_settings()

app = FastAPI(
    title="RelayPACS API",
    description="Mobile-first DICOM ingestion node for teleradiology",
    version="0.1.0",
)

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
    }


app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(refresh_router, prefix="/auth", tags=["auth"])  # Add refresh endpoint
app.include_router(logout_router, prefix="/auth", tags=["auth"])  # Add logout endpoint
app.include_router(upload_router, prefix="/upload", tags=["upload"])
app.include_router(reports_router, prefix="/reports", tags=["reports"])
app.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
