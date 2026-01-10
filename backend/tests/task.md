# TDD Tasks for RelayPACS

## Current Focus: Feature Implementation

- [x] Fix test import issues and environment setup
- [x] Run existing tests to establish baseline (19/19 passing ✅)
- [x] Fix deprecation warnings (warnings: 10 → 4 for app code)
- [x] Write and pass new tests for chunk upload edge cases
- [x] Write and pass unit tests for Storage Service
- [x] Write and pass unit tests for DICOM metadata extraction
- [x] Write and pass integration test for upload completion and merging
- [x] Implement and verify DICOM validation during completion
- [/] Write new tests for missing functionality
  - [ ] Test session expiration logic (Auto-cleanup of old sessions)
  - [ ] Test S3 storage implementation (Boto3 mocking)
  - [ ] Test PACS forwarding integration (Mocking Orthanc STOW-RS)
- [ ] Implement code to pass new tests
