# Sprint Planning & Implementation Plan

## 1. Purpose
This document defines a **comprehensive sprint planning and implementation plan** for delivering the RelayPACS MVP. It translates all prior product, UX, and technical specifications into an executable delivery roadmap suitable for a small, senior team.

**Target Outcome:** A pilot-ready, offline-capable DICOM ingestion PWA integrated with a cloud PACS.

---

## 2. Delivery Assumptions

### Team Composition (Lean)
- 1 Full‑stack / Backend Engineer (FastAPI, DICOM)
- 1 Frontend Engineer (React, PWA)
- 1 Product/QA Owner (can be part-time)

### Sprint Model
- Sprint length: **1 week**
- Total duration: **3 sprints (3 weeks)**
- Daily async standups
- End-of-sprint demo + acceptance review

---

## 3. Sprint Objectives Overview

| Sprint | Goal |
|------|------|
| Sprint 0 | Environment & foundations |
| Sprint 1 | Core upload & metadata flow |
| Sprint 2 | Offline, resumable uploads |
| Sprint 3 | PACS integration & hardening |

---

## 4. Sprint 0 – Foundations (3–4 days)

### Objectives
- Establish development baseline
- De-risk tooling and infrastructure

### Backend Tasks
- Repo initialization
- FastAPI skeleton
- Auth scaffolding (JWT)
- Health endpoint
- CI pipeline setup

### Frontend Tasks
- React + Vite setup
- PWA manifest
- Service worker registration
- Base layout + routing

### Deliverables
- Running frontend + backend
- CI passing
- Deployment to dev environment

---

## 5. Sprint 1 – Core Upload Flow

### Objectives
- End-to-end online upload (happy path)

### Backend Tasks
- /upload/init endpoint
- Chunk upload endpoint
- Temp storage integration
- Basic DICOM validation

### Frontend Tasks
- Upload Study screen
- File selection & detection
- Metadata extraction & preview
- Upload progress UI (online only)

### QA / Acceptance
- Upload small DICOM study online
- Metadata correctly displayed
- Progress visible

---

## 6. Sprint 2 – Offline & Resumable Uploads

### Objectives
- Zero data loss under network failure

### Backend Tasks
- Idempotent chunk handling
- Upload resume logic
- Upload status endpoint

### Frontend Tasks
- IndexedDB schema (Dexie)
- Upload queue persistence
- Background sync implementation
- Offline indicators

### QA / Acceptance
- Upload queued offline
- Auto-resume on reconnect
- App refresh does not lose state

---

## 7. Sprint 3 – PACS Integration & Hardening

### Objectives
- Production‑grade ingestion

### Backend Tasks
- STOW‑RS forwarding
- Orthanc fallback adapter
- PACS response normalization
- Temp file cleanup job

### Frontend Tasks
- Completion screen
- Error states & copy
- Upload-only (no PHI) mode

### QA / Acceptance
- Successful PACS receipt
- Partial failure surfaced
- No PHI visible post-upload

---

## 8. Cross‑Sprint Implementation Tracks

### Security
- HTTPS enforcement
- Token TTL validation
- Rate limiting

### Observability
- Structured logs
- Upload lifecycle events

### UX Quality
- Acceptance criteria verification
- Touch target checks
- Error language review

---

## 9. Definition of Done (Global)

A feature is considered done when:
- Acceptance criteria pass
- Offline behavior validated (if applicable)
- No PHI persists after completion
- Errors are human-readable

---

## 10. Risk Management

| Risk | Mitigation |
|----|----|
| DICOM variability | Test with Orthanc |
| Network instability | Aggressive offline testing |
| Scope creep | Strict PRD adherence |

---

## 11. Pilot Readiness Checklist

- End-to-end upload tested
- Offline recovery validated
- PACS integration confirmed
- Basic audit logs enabled
- UX usability test passed

---

## 12. Post‑MVP Hardening (Not in Sprints)

- Client-side encryption
- QR-based session onboarding
- Upload analytics dashboard

---

## 13. Implementation Timeline (Visual)

Week 1: Foundations + Core Upload
Week 2: Offline & Resilience
Week 3: PACS Integration + Pilot

---

## 14. Conclusion

This sprint plan provides a **realistic, disciplined path** to delivering RelayPACS as a pilot-ready healthcare ingestion system within three weeks, balancing speed with reliability, security, and usability.

