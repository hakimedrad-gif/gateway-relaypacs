from pathlib import Path

import pydicom
import requests
from dicomweb_client.api import DICOMwebClient

from app.config import get_settings

settings = get_settings()


class PACSService:
    """Service to handle forwarding DICOM files to a PACS via DICOMweb (STOW-RS)"""

    def __init__(self) -> None:
        # Initialize DICOMweb client using a session for auth
        session = requests.Session()

        if settings.pacs_type == "dcm4chee":
            # dcm4chee usually uses its own stow url
            stow_url = settings.dcm4chee_stow_url
            # dcm4chee might have different auth, but for now we'll assume none or similar
        else:
            stow_url = settings.pacs_stow_url
            if settings.orthanc_username and settings.orthanc_password:
                session.auth = requests.auth.HTTPBasicAuth(
                    settings.orthanc_username, settings.orthanc_password
                )

        # The URL in config might be the full STOW URL,
        base_url = stow_url.replace("/studies", "")

        self.client = DICOMwebClient(url=base_url, session=session)

    def forward_files(self, file_paths: list[Path | str]) -> str:
        """
        Forward a list of DICOM files to PACS using STOW-RS.
        Returns a receipt/transaction ID.
        """
        datasets = []
        for path in file_paths:
            ds = pydicom.dcmread(str(path))
            datasets.append(ds)

        if not datasets:
            raise ValueError("No datasets to forward")

        try:
            # Store instances via DICOMweb (STOW-RS)
            # dicomweb-client handles the multipart encoding
            self.client.store_instances(datasets=datasets)
            return "STOW-SUCCESS-" + str(len(datasets))

        except Exception as e:
            print(f"STOW-RS failed, attempting Orthanc REST fallback: {e}")
            # Fallback to Orthanc native REST API
            return self._forward_via_orthanc_rest(file_paths)

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
