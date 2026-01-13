from pathlib import Path

import pydicom
import requests
from dicomweb_client.api import DICOMwebClient

from app.config import get_settings

settings = get_settings()


class PACSService:
    """Service to handle forwarding DICOM files to a PACS via DICOMweb (STOW-RS)"""

    def __init__(self) -> None:
        self.orthanc_client: DICOMwebClient | None = None
        self.dcm4chee_client: DICOMwebClient | None = None
        self._init_clients()

    def _init_clients(self) -> None:
        """Initialize DICOMweb clients for both PACS if configured"""
        
        # Initialize Orthanc Client
        if settings.orthanc_url:
            session = requests.Session()
            if settings.orthanc_username and settings.orthanc_password:
                session.auth = requests.auth.HTTPBasicAuth(
                    settings.orthanc_username, settings.orthanc_password
                )
            base_url = settings.orthanc_wado_url.rstrip("/")
            self.orthanc_client = DICOMwebClient(url=base_url, session=session)

        # Initialize dcm4che Client
        if settings.dcm4chee_url:
            session = requests.Session()
            # Add dcm4che auth here if needed in future
            base_url = settings.dcm4chee_url.rstrip("/")
            self.dcm4chee_client = DICOMwebClient(url=base_url, session=session)

    def get_active_client(self) -> DICOMwebClient:
        """Get the client for the currently active PACS"""
        if settings.active_pacs == "dcm4chee":
            if not self.dcm4chee_client:
                raise RuntimeError("dcm4che client not initialized (check URL config)")
            return self.dcm4chee_client
        elif settings.active_pacs == "orthanc":
            if not self.orthanc_client:
                raise RuntimeError("Orthanc client not initialized (check URL config)")
            return self.orthanc_client
        else:
            # Fallback or default
            if self.dcm4chee_client:
                return self.dcm4chee_client
            if self.orthanc_client:
                return self.orthanc_client
            raise RuntimeError("No PACS clients available")

    def forward_files(self, file_paths: list[Path | str]) -> str:
        """
        Forward a list of DICOM files to the ACTIVE PACS using STOW-RS.
        Returns a receipt/transaction ID.
        """
        datasets = []
        for path in file_paths:
            ds = pydicom.dcmread(str(path))
            datasets.append(ds)

        if not datasets:
            raise ValueError("No datasets to forward")

        client = self.get_active_client()
        pacs_name = settings.active_pacs

        try:
            # Store instances via DICOMweb (STOW-RS)
            client.store_instances(datasets=datasets)
            return f"STOW-SUCCESS-{pacs_name}-{len(datasets)}"

        except Exception as e:
            print(f"STOW-RS to {pacs_name} failed: {e}")
            
            # If Orthanc is active (or even if not), we might want to try Orthanc REST fallback
            # But only if targeting Orthanc? Or always as a backup?
            # For now, replicate legacy behavior: fallback to Orthanc REST if explicit STOW fails
            # but usually Orthanc REST is only for Orthanc.
            
            if pacs_name == "orthanc" or settings.active_pacs == "orthanc":
                 return self._forward_via_orthanc_rest(file_paths)
            
            raise e

    def _forward_via_orthanc_rest(self, file_paths: list[Path | str]) -> str:
        """Fallback: Upload to Orthanc via native REST API (POST /instances)"""

        success_count = 0
        errors = []

        auth = None
        if settings.orthanc_username and settings.orthanc_password:
            auth = (settings.orthanc_username, settings.orthanc_password)

        url = f"{settings.orthanc_url}/instances"

        for path in file_paths:
            try:
                with open(path, "rb") as f:
                    content = f.read()

                resp = requests.post(url, data=content, auth=auth, timeout=30)
                resp.raise_for_status()
                success_count += 1
            except Exception as e:
                errors.append(str(e))
                print(f"Orthanc REST upload failed for {path}: {e}")

        if success_count == 0 and errors:
            raise RuntimeError(f"All fallback uploads failed: {errors}")

        if success_count < len(file_paths):
            return f"PARTIAL-FALLBACK-SUCCESS-{success_count}/{len(file_paths)}"

        return f"FALLBACK-SUCCESS-{success_count}"


# Singleton instance
pacs_service = PACSService()
