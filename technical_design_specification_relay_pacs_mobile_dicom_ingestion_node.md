# Technical Design Specification (TDS)

## 1. Purpose
This document provides a detailed technical design for **RelayPACS**, a mobile-first Progressive Web Application (PWA) and backend upload node that securely ingests imaging studies and forwards them to a cloud PACS. It is intended for software engineers, architects, and technical reviewers responsible for implementation and deployment.

---

## 2. Design Goals

### Primary Goals
- Reliable ingestion of DICOM and non-DICOM imaging studies
- Offline-first operation with zero data loss
- PACS-native forwarding via standards (DICOMweb)
- Minimal infrastructure and operational complexity

### Non-Goals
- Image viewing or diagnostic interpretation
- Long-term image storage
- PACS querying or management

---

## 3. System Overview

### High-Level Components
1. Client PWA (React)
2. Service Worker (offline + sync)
3. Upload Backend (API + proxy)
4. Temporary Object Storage
5. External PACS (DICOMweb / Gateway)

The system acts as a **stateless ingestion pipe**, with only transient handling of PHI.

---

## 4. Architecture

### 4.1 Logical Architecture

**Client Layer**
- React PWA
- IndexedDB for offline persistence
- Workbox-powered service worker

**Backend Layer**
- Upload API
- DICOM validation and normalization
- PACS forwarding adapters

**Integration Layer**
- DICOMweb STOW-RS
- Orthanc REST / DICOM C-STORE gateway

---

### 4.2 Deployment Architecture

- Frontend: CDN-hosted static PWA
- Backend: Containerized API service
- Storage: S3-compatible temporary bucket
- PACS: External system (cloud or on-prem)

All components communicate over HTTPS.

---

## 5. Frontend Design

### 5.1 Technology Stack
- React + TypeScript
- Vite build system
- Workbox (PWA + background sync)
- Dexie.js (IndexedDB)

---

### 5.2 State Management

- Local UI state (React state)
- Persistent upload state (IndexedDB)
- Upload Manager as a dedicated service module

---

### 5.3 Offline & Sync Strategy

- Files and metadata stored in IndexedDB
- Upload intent recorded even when offline
- Service worker registers background sync
- Upload resumes automatically when network returns

---

### 5.4 File Intake & Processing

- Accepts: DICOM, ZIP, folder, JPEG, PNG
- ZIP unpacked client-side
- JPEG/PNG wrapped into Secondary Capture DICOM
- Metadata extracted prior to upload

---

## 6. Backend Design

### 6.1 Technology Stack
- FastAPI (Python)
- pydicom
- dicomweb-client
- Uvicorn ASGI server

---

### 6.2 API Layer

Key endpoints:
- /auth/login
- /upload/init
- /upload/{id}/chunk
- /upload/{id}/complete
- /upload/{id}/status

All endpoints require authentication.

---

### 6.3 Upload Session Handling

- Upload sessions are short-lived
- Each session has:
  - Unique upload ID
  - Scoped upload token
  - Chunk size configuration

Chunk uploads are idempotent.

---

### 6.4 Temporary Storage

- Files stored only during upload
- Automatic cleanup after completion or timeout
- No long-term PHI retention

---

## 7. DICOM Processing & PACS Forwarding

### 7.1 Validation
- Verify valid DICOM headers
- Ensure consistent Study Instance UID
- Reject unsupported SOP classes

---

### 7.2 STOW-RS Forwarding

- Multipart/related requests
- application/dicom content type
- Study-level submission

---

### 7.3 Fallback Gateway

- Orthanc REST API integration
- Optional C-STORE forwarding

---

## 8. Security Design

### 8.1 Authentication & Authorization
- JWT-based authentication
- Short-lived, scoped upload tokens

---

### 8.2 Transport Security
- HTTPS everywhere
- Secure headers

---

### 8.3 Data Protection
- No frontend persistence after completion
- Backend auto-deletion of temporary files
- Optional client-side encryption (future)

---

## 9. Reliability & Error Handling

### Failure Scenarios
- Network loss
- Partial upload
- PACS timeout

### Mitigations
- Chunking & resume
- Retry with exponential backoff
- Explicit user feedback

---

## 10. Observability

- Structured backend logs
- Upload lifecycle events
- Error classification

No PHI included in logs.

---

## 11. Performance Considerations

- Adaptive chunk size based on network
- Memory-efficient streaming
- Support for >1GB studies

---

## 12. Compliance Considerations

### HIPAA / GDPR (MVP)
- Data minimization
- Purpose limitation
- Automatic deletion

RelayPACS is positioned as a **non-diagnostic, non-storage** component.

---

## 13. Deployment & Environments

### Environments
- Development
- Staging
- Production

### CI/CD
- Automated build and tests
- Container image scanning

---

## 14. Risks & Tradeoffs

| Area | Tradeoff |
|----|----|
| Client-side unzip | CPU usage on low-end devices |
| No viewer | Reduced user validation |
| Temporary storage | Requires strict cleanup |

---

## 15. Future Extensions

- Client-side encryption
- Study completeness checks
- Enterprise audit exports
- Multi-PACS routing

---

## 16. Conclusion

This technical design specifies a robust, standards-compliant, and pragmatically scoped ingestion system optimized for real-world clinical environments, particularly those with unreliable connectivity and limited infrastructure.
