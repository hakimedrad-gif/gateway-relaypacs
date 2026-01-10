# RelayPACS – Engineering Hardening Pack

This document delivers the next three execution artifacts:
2. Reference Implementation Skeleton
3. STRIDE‑Lite Threat Model
4. PACS Vendor Compatibility Matrix

---

## 2. Reference Implementation Skeleton

### Backend – FastAPI (Upload Node)

**Folder Structure**
```
backend/
 ├── app/
 │   ├── main.py
 │   ├── auth/
 │   ├── upload/
 │   ├── dicom/
 │   ├── pacs/
 │   ├── storage/
 │   └── models/
 ├── requirements.txt
 └── Dockerfile
```

**Key Responsibilities**
- auth/: JWT + upload-token issuance
- upload/: init, chunk, complete endpoints
- dicom/: validation, JPEG→SC wrapping
- pacs/: STOW‑RS + Orthanc adapters
- storage/: S3‑compatible temp storage

**main.py (conceptual)**
- Mount auth middleware
- Register upload router
- Health endpoint

---

### Frontend – React PWA

**Folder Structure**
```
frontend/
 ├── src/
 │   ├── app/
 │   ├── components/
 │   ├── pages/
 │   ├── services/
 │   ├── db/
 │   ├── sw/
 │   └── utils/
 ├── public/
 └── vite.config.ts
```

**Key Modules**
- db/: Dexie schema + queries
- sw/: Workbox background sync
- services/: API client + upload manager
- pages/: Upload, Metadata, Progress

**Upload Manager Responsibilities**
- File chunking
- Resume logic
- Retry & backoff
- State persistence

---

## 3. STRIDE‑Lite Threat Model

### Assets
- DICOM files
- Study metadata
- Upload tokens

---

### Threats & Mitigations

**Spoofing**
- Risk: Unauthorized uploads
- Mitigation: JWT + scoped upload tokens

**Tampering**
- Risk: Modified chunks
- Mitigation: Chunk checksum validation

**Repudiation**
- Risk: Disputed uploads
- Mitigation: Timestamped audit logs

**Information Disclosure**
- Risk: PHI leakage
- Mitigation: HTTPS, no frontend persistence post-upload

**Denial of Service**
- Risk: Large upload abuse
- Mitigation: Rate limiting, size caps

**Elevation of Privilege**
- Risk: Token reuse
- Mitigation: Single-use, short TTL tokens

---

### Residual Risk (MVP-Acceptable)
- No client-side encryption by default
- Relies on PACS compliance post-ingestion

---

## 4. PACS Vendor Compatibility Matrix

### DICOMweb‑Native (Preferred)

| PACS | STOW‑RS | Notes |
|----|----|----|
| Google Cloud Healthcare | Yes | Full support |
| AWS HealthImaging | Yes | Strict auth |
| Azure DICOM | Yes | OAuth required |
| Sectra | Yes | Vendor config |

---

### Orthanc / Gateway‑Based

| PACS | Method | Notes |
|----|----|----|
| Orthanc | REST API | Ideal fallback |
| dcm4chee | DICOMweb | Mature |
| Legacy PACS | C‑STORE | Requires gateway |

---

### Known Interop Pitfalls
- SOP Instance UID collisions
- Strict content‑type enforcement
- Multipart boundary quirks

---

## Deployment Guidance

**Recommended MVP Stack**
- Backend: FastAPI + Uvicorn
- Storage: MinIO / S3
- PACS Testbed: Orthanc
- Frontend: Vercel / Netlify

---

## End State
With this document, RelayPACS is now hardened from a security, interoperability, and implementation standpoint—ready for real-world pilot deployments.

