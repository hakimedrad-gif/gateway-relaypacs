"""
Custom exception hierarchy for RelayPACS.

This module defines specific exception types to replace broad
'except Exception' handlers, enabling better error handling and debugging.
"""


class RelayPACSError(Exception):
    """Base exception for all RelayPACS-specific errors."""

    pass


class DicomProcessingError(RelayPACSError):
    """Raised when DICOM file processing or validation fails."""

    pass


class StorageError(RelayPACSError):
    """Raised when storage operations fail (local filesystem or S3)."""

    pass


class PACSConnectionError(RelayPACSError):
    """Raised when PACS communication fails (Orthanc or dcm4chee)."""

    pass


class ChunkUploadError(RelayPACSError):
    """Raised when chunk upload or merge operations fail."""

    pass


class AuthenticationError(RelayPACSError):
    """Raised when authentication or authorization fails."""

    pass


class ValidationError(RelayPACSError):
    """Raised when data validation fails."""

    pass
