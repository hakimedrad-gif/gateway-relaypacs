from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.auth.router import router as auth_router
from app.config import get_settings
from app.limiter import limiter
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
app.include_router(upload_router, prefix="/upload", tags=["upload"])
