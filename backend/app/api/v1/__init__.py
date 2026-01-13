"""API v1 router combining all versioned endpoints."""

from fastapi import APIRouter

from app.auth.logout import router as logout_router
from app.auth.refresh import router as refresh_router
from app.auth.router import router as auth_router
from app.notifications.router import router as notifications_router
from app.reports.router import router as reports_router
from app.upload.router import router as upload_router

# Create the v1 API router
api_router = APIRouter()

# Include all sub-routers with their prefixes
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(refresh_router, prefix="/auth", tags=["auth"])
api_router.include_router(logout_router, prefix="/auth", tags=["auth"])
api_router.include_router(upload_router, prefix="/upload", tags=["upload"])
api_router.include_router(reports_router, prefix="/reports", tags=["reports"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])

from app.api.v1.totp import router as totp_router
api_router.include_router(totp_router, prefix="/auth/2fa", tags=["2fa"])
