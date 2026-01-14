"""Basic DICOM parsing utilities."""

from pathlib import Path
from typing import Any

import pydicom


def parse_dicom_file(file_path: Path | str) -> dict[str, Any]:
    """
    Parse a DICOM file and extract basic metadata.

    Args:
        file_path: Path to DICOM file

    Returns:
        Dictionary with extracted metadata
    """
    try:
        ds = pydicom.dcmread(file_path, stop_before_pixels=True)

        return {
            "patient_name": str(ds.get("PatientName", "Unknown")),
            "patient_id": str(ds.get("PatientID", "")),
            "study_date": str(ds.get("StudyDate", "")),
            "modality": str(ds.get("Modality", "")),
            "study_description": str(ds.get("StudyDescription", "")),
            "series_description": str(ds.get("SeriesDescription", "")),
            "institution_name": str(ds.get("InstitutionName", "")),
            "manufacturer": str(ds.get("Manufacturer", "")),
            "rows": int(ds.get("Rows", 0)),
            "columns": int(ds.get("Columns", 0)),
            "sop_class_uid": str(ds.get("SOPClassUID", "")),
        }
    except Exception as e:
        return {"error": f"Failed to parse DICOM: {e!s}"}


def validate_dicom_file(file_path: Path | str) -> tuple[bool, str]:
    """
    Validate if a file is a valid DICOM file.

    Args:
        file_path: Path to file

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        pydicom.dcmread(file_path, stop_before_pixels=True)
        return True, ""
    except Exception as e:
        return False, str(e)


def get_dicom_preview_data(file_path: Path | str) -> dict[str, Any] | None:
    """
    Get preview data for a DICOM file (first frame if multi-frame).

    Args:
        file_path: Path to DICOM file

    Returns:
        Dictionary with preview information
    """
    try:
        ds = pydicom.dcmread(file_path)

        preview = {
            "has_pixels": hasattr(ds, "pixel_array"),
            "rows": int(ds.get("Rows", 0)),
            "columns": int(ds.get("Columns", 0)),
            "number_of_frames": int(ds.get("NumberOfFrames", 1)),
        }

        if hasattr(ds, "pixel_array"):
            # Note: Not including actual pixel data, just metadata
            preview["pixel_data_available"] = True

        return preview
    except Exception:
        return None


def anonymize_dicom(file_path: Path | str, output_path: Path | str | None = None) -> Path:
    """
    Anonymize a DICOM file by removing or replacing identifying information.

    Args:
        file_path: Path to DICOM file
        output_path: Path to save anonymized file. If None, saves to <file_path>.anon

    Returns:
        Path to anonymized file
    """
    ds = pydicom.dcmread(file_path)

    # Basic anonymization: Remove or replace PHI
    ds.PatientName = "ANONYMOUS"
    ds.PatientID = "ANON" + ds.PatientID[-4:] if hasattr(ds, "PatientID") else "ANON"
    ds.PatientBirthDate = ""
    ds.PatientAddress = ""
    ds.PatientTelephoneNumbers = ""
    ds.InstitutionName = "ANONYMOUS HOSPITAL"
    ds.InstitutionAddress = ""
    ds.InstitutionalDepartmentName = ""
    ds.ReferringPhysicianName = ""
    ds.PerformingPhysicianName = ""
    ds.OperatorsName = ""

    # Remove any private tags
    ds.remove_private_tags()

    if not output_path:
        output_path = Path(str(file_path) + ".anon")
    else:
        output_path = Path(output_path)

    ds.save_as(str(output_path))
    return output_path
