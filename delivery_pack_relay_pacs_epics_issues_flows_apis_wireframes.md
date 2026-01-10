# RelayPACS – Delivery Pack

This document converts the PRD into **execution-ready artifacts** in the following order:
1. GitHub Epics & Issues
2. Core Sequence Diagrams (textual)
3. DICOMweb STOW-RS Flow Definition
4. Mobile-First Wireframes (screen-by-screen)

---

## 1. GitHub Epics & Issues

### EPIC 1: Project Foundation & DevOps
**Goal:** Establish a production-ready baseline.

- [ ] Repo initialization (frontend + backend)
- [ ] Monorepo or split-repo decision
- [ ] CI pipeline (lint, test, build)
- [ ] Environment configuration (dev/stage/prod)
- [ ] Secrets management

---

### EPIC 2: Authentication & Security
**Goal:** Secure all upload operations.

- [ ] JWT/OAuth2 auth service
- [ ] Short-lived upload tokens
- [ ] Token scope per upload session
- [ ] Backend auth middleware
- [ ] HTTPS enforcement

---

### EPIC 3: Frontend PWA Shell
**Goal:** Mobile-first offline-capable UI.

- [ ] React + Vite setup
- [ ] PWA manifest + icons
- [ ] Workbox service worker
- [ ] Background sync configuration
- [ ] File system + camera permissions

---

### EPIC 4: File Intake & Detection
**Goal:** Accept all supported input types.

- [ ] Single DICOM upload
- [ ] Multi-file DICOM upload
- [ ] Folder upload (recursive scan)
- [ ] ZIP client-side unpack
- [ ] JPEG/PNG intake
- [ ] File-type auto-detection logic

---

### EPIC 5: Metadata Extraction
**Goal:** Extract and preview essential study data.

- [ ] Parse DICOM headers (Cornerstone/pydicom)
- [ ] Extract patient name, study date, modality
- [ ] Metadata preview UI
- [ ] Editable study description
- [ ] Clinical impression text field

---

### EPIC 6: Offline Queue & Resumable Uploads
**Goal:** Zero-loss uploads under poor connectivity.

- [ ] IndexedDB schema (Dexie)
- [ ] Persist studies + files
- [ ] Chunking strategy
- [ ] Resume from last chunk
- [ ] Retry with exponential backoff
- [ ] Background sync trigger

---

### EPIC 7: Backend Upload Node
**Goal:** Act as a DICOM-safe proxy.

- [ ] Upload session initialization endpoint
- [ ] Chunk upload endpoint
- [ ] Upload completion endpoint
- [ ] Temp object storage integration
- [ ] Idempotent upload handling

---

### EPIC 8: PACS Forwarding
**Goal:** Deliver studies into PACS reliably.

- [ ] DICOM validation
- [ ] STOW-RS implementation
- [ ] Orthanc REST fallback
- [ ] PACS response handling
- [ ] Success/failure normalization

---

### EPIC 9: Status, Errors & Logging
**Goal:** Transparency and debuggability.

- [ ] Upload status endpoint
- [ ] Human-readable error mapping
- [ ] Frontend progress UI
- [ ] Backend structured logging

---

### EPIC 10: QA & Acceptance
**Goal:** MVP readiness.

- [ ] Offline → online upload test
- [ ] Large study test (>1GB)
- [ ] Network interruption simulation
- [ ] PACS receipt verification

---

## 2. Core Sequence Diagrams (Textual)

### A. Online Upload Flow
1. User authenticates
2. User selects files
3. Frontend extracts metadata
4. Upload session initialized
5. Files chunked & uploaded
6. Backend validates DICOM
7. Backend forwards via STOW-RS
8. PACS confirms receipt
9. Frontend shows success

### B. Offline Upload Flow
1. User selects files offline
2. Metadata + files stored in IndexedDB
3. User submits study
4. Service worker registers sync
5. Network restored
6. Upload resumes automatically
7. Completion notification shown

---

## 3. DICOMweb STOW-RS Flow Definition

### Preconditions
- Valid auth token
- PACS STOW endpoint configured

### Steps
1. Backend assembles multipart/related request
2. Each DICOM instance included as application/dicom
3. POST to /studies endpoint
4. Parse PACS response
5. Map response to success/partial/failure

### Failure Handling
- Retry on 5xx
- Abort on 4xx
- Surface partial success explicitly

---

## 4. Mobile-First Wireframes (Text Description)

### Screen 1: Upload Study
- Primary CTA: “Upload Study”
- Secondary: Camera / File Picker
- Status badge (Online / Offline)

---

### Screen 2: Confirm Metadata
- Patient Name (read-only)
- Study Date (read-only)
- Modality (read-only)
- Study Description (editable)
- Clinical Impression (text area)
- CTA: “Confirm & Upload”

---

### Screen 3: Upload Progress
- Per-study progress bar
- Percentage + ETA
- Status: Uploading / Queued / Failed / Complete
- Auto-retry indicator

---

### Screen 4: Completion
- Success confirmation
- PACS receipt ID (if available)
- Option: Upload another study

---

## End State
At the end of this delivery pack, RelayPACS is fully decomposed into buildable work units, with clear technical flows and UX definitions suitable for immediate implementation.

