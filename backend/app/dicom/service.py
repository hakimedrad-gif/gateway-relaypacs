from pathlib import Path

import pydicom

from app.models.upload import StudyMetadata


class DICOMService:
    """Service for handling DICOM file operations and metadata extraction"""

    def extract_metadata(self, file_path: Path | str, safe_only: bool = True) -> StudyMetadata:
        """
        Extract study-level metadata from a DICOM file.
        Returns a StudyMetadata model.

        If safe_only=True, identifying PHI (PatientName) is replaced with "REDACTED".
        """
        try:
            # Optimize: Stop reading before pixel data to speed up metadata extraction
            ds = pydicom.dcmread(str(file_path), stop_before_pixels=True)

            # Extract fields reliably
            patient_name = str(getattr(ds, "PatientName", "Unknown"))
            if safe_only:
                patient_name = "REDACTED"

            modality = str(getattr(ds, "Modality", "Unknown"))
            study_date = str(getattr(ds, "StudyDate", "Unknown"))
            study_description = str(getattr(ds, "StudyDescription", ""))

            return StudyMetadata(
                patient_name=patient_name,
                modality=modality,
                study_date=study_date,
                study_description=study_description,
            )
        except Exception as e:
            # Avoid logging the full path if it contains PHI
            raise ValueError(f"Failed to parse DICOM: {str(e)[:100]}") from e


# Singleton instance
dicom_service = DICOMService()
