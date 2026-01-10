from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(
    title="RelayPACS API",
    description="Mobile-first DICOM ingestion node for teleradiology",
    version="0.1.0",
)

# CORS middleware for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return JSONResponse(
        status_code=200,
        content={"status": "healthy", "service": "relay-pacs-api"},
    )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "RelayPACS API",
        "version": "0.1.0",
        "docs": "/docs",
    }


from app.auth.router import router as auth_router
from app.upload.router import router as upload_router

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(upload_router, prefix="/upload", tags=["upload"])
