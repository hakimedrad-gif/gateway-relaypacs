from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user
from app.auth.totp import totp_service
from app.db.database import get_db
from app.db.models import User
from pydantic import BaseModel

router = APIRouter()

class TOTPSetupResponse(BaseModel):
    secret: str
    qr_code: str
    provisioning_uri: str

class TOTPVerifyRequest(BaseModel):
    code: str
    secret: str

@router.post("/setup", response_model=TOTPSetupResponse)
async def setup_totp(
    current_user: dict[str, Any] = Depends(get_current_user)
) -> TOTPSetupResponse:
    """
    Generate a new TOTP secret and QR code for the user.
    Does not enable 2FA until verified.
    """
    secret = totp_service.generate_secret()
    uri = totp_service.get_provisioning_uri(secret, current_user["sub"])
    qr_code = totp_service.generate_qr_code(uri)
    
    return TOTPSetupResponse(
        secret=secret,
        qr_code=qr_code,
        provisioning_uri=uri
    )

@router.post("/enable")
async def enable_totp(
    payload: TOTPVerifyRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict[str, bool]:
    """
    Verify the code and enable 2FA for the user.
    """
    # Verify code with the secret provided (stateless setup until saved)
    # Alternatively, we could save secret temporarily, but passing it back is simpler for stateless
    if not totp_service.verify_totp(payload.secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid authentication code"
        )
    
    # Update user
    user = db.query(User).filter(User.username == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.totp_secret = payload.secret
    user.totp_enabled = True
    db.commit()
    
    return {"success": True, "enabled": True}

@router.post("/disable")
async def disable_totp(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict[str, bool]:
    """Disable 2FA for the user."""
    user = db.query(User).filter(User.username == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.totp_secret = None
    user.totp_enabled = False
    db.commit()
    
    return {"success": True, "enabled": False}
