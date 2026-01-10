from typing import List
from pathlib import Path
import pydicom
from dicomweb_client.api import DICOMwebClient
from app.config import get_settings

settings = get_settings()

class PACSService:
    """Service to handle forwarding DICOM files to a PACS via DICOMweb (STOW-RS)"""
    
    def __init__(self):
        # Initialize DICOMweb client using a session for auth
        import requests
        session = requests.Session()
        if settings.orthanc_username and settings.orthanc_password:
            session.auth = requests.auth.HTTPBasicAuth(settings.orthanc_username, settings.orthanc_password)
            
        # The URL in config might be the full STOW URL, 
        base_url = settings.pacs_stow_url.replace("/studies", "")
        
        self.client = DICOMwebClient(url=base_url, session=session)

    def forward_files(self, file_paths: List[Path | str]) -> str:
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
            
        # Store instances
        # dicomweb-client handles the multipart encoding
        response = self.client.store_instances(datasets=datasets)
        
        # In a real PACS, we'd extract a transaction UID or similar
        # For Orthanc, it returns metadata about what was stored.
        return "STOW-SUCCESS-" + str(len(datasets))

# Singleton instance
pacs_service = PACSService()
