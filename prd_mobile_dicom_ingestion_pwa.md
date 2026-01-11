# Product Requirements Document (PRD)

## 1. Overview

### Product Name
RelayPACS (working title)

### Objective
Provide a lightweight, mobile‑first, offline‑capable ingestion node that securely uploads imaging studies into a cloud PACS.

### Non‑Goals
- Replace PACS
- Provide diagnostic viewing
- Store studies long‑term

---

## 2. User Personas

### Remote Clinic Technician
- Limited IT skills
- Unstable connectivity
- Needs fast, reliable upload

### Radiologist / Clinician
- Receives external studies
- Needs metadata + clinical notes

---

## 3. Functional Requirements

### 3.1 Authentication
- JWT or OAuth2
- Short-lived upload tokens
- Token scoped per upload session

### 3.2 Upload Inputs
- Single DICOM (.dcm)
- Multiple DICOM files
- Folder upload
- ZIP archive
- RAR archive (backend unpack)
- JPEG / PNG images

### 3.3 Metadata Handling
- Auto-detect patient name, study date, modality
- Display metadata preview
- Allow study name confirmation
- Clinical impression free-text field

### 3.4 Offline Queue
- Persist studies in IndexedDB
- Queue uploads when offline
- Resume automatically on connectivity
- Retry with exponential backoff

### 3.5 Upload Mechanics
- Chunked uploads
- Resumable sessions
- Progress indicator per study
- Pause / resume support

### 3.6 PACS Forwarding
- Primary: DICOMweb STOW-RS
- Fallback: Orthanc REST API
- Validate DICOM prior to forwarding

### 3.7 Status & Feedback
- Upload status endpoint
- Human-readable error messages
- Confirmation on successful PACS receipt

---

## 4. Non-Functional Requirements

### Performance
- Support low-bandwidth (<1 Mbps)
- Handle large studies (>1 GB)

### Reliability
- No data loss on refresh or crash
- Idempotent uploads

### Security
- HTTPS only
- No frontend persistent PHI after completion
- Auto-delete temp backend files

### Compliance (MVP)
- HIPAA-aligned architecture
- No long-term PHI storage

---

## 5. UX Requirements

### Design Principles
- Mobile-first
- Single primary CTA
- Minimal text input

### Screens
1. Upload Study
2. Metadata Confirmation
3. Upload Progress / Status

---

## 6. Technical Architecture

### Frontend
- React + Vite
- Workbox (background sync)
- IndexedDB via Dexie
- Cornerstone (metadata only)

### Backend
- FastAPI or Fastify
- pydicom
- dicomweb-client
- S3-compatible temp storage

---

## 7. Data Models (High Level)

### Study
- id
- files[]
- extractedMetadata
- clinicalNotes
- status
- retryCount

---

## 8. API Endpoints

- POST /auth/login
- POST /upload/init
- PUT /upload/chunk
- POST /upload/complete
- GET /upload/status

---

## 9. Error Handling

- Invalid DICOM
- Incomplete study
- Network interruption
- PACS timeout

Errors must be user-readable and actionable.

---

## 10. Analytics & Logging

- Upload success/failure
- Retry counts
- Network conditions

---

## 11. MVP Acceptance Criteria

- Upload study from mobile offline → online
- Successful PACS receipt via DICOMweb
- No data loss on refresh
- Auth required for all uploads

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|----|----|
| Network instability | Offline queue + retries |
| PACS incompatibility | Orthanc fallback |
| Large files | Chunked uploads |

---

## 13. Future Enhancements

- QR-based upload sessions
- Study completeness validation
- Client-side encryption
- Enterprise audit logging

---

## 14. Release Plan

Phase 1 (2–3 weeks):
- Core upload
- Offline support
- PACS forwarding
- Basic security

Phase 2:
- UX refinements
- Differentiation features

---

## 15. Open Questions
- Supported PACS vendors at launch
- JPEG → SC DICOM default behavior
- Max upload size limits
