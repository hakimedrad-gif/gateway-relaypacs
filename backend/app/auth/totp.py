import base64
import io

import pyotp
import qrcode

from app.config import get_settings


class TOTPService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.issuer_name = self.settings.app_name

    def generate_secret(self) -> str:
        """Generate a random base32 secret."""
        return str(pyotp.random_base32())

    def get_provisioning_uri(self, secret: str, username: str) -> str:
        """Get the provisioning URI for the QR code."""
        return str(
            pyotp.totp.TOTP(secret).provisioning_uri(name=username, issuer_name=self.issuer_name)
        )

    def generate_qr_code(self, uri: str) -> str:
        """Generate QR code as base64 string."""
        img = qrcode.make(uri)
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"

    def verify_totp(self, secret: str, code: str) -> bool:
        """Verify the provided TOTP code."""
        if not secret:
            return False
        totp = pyotp.TOTP(secret)
        return bool(totp.verify(code))


totp_service = TOTPService()
