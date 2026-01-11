# Product Brief

## Product Name (Working)
**RelayPACS** – Mobile DICOM Ingestion Node

## One‑Sentence Pitch
A mobile‑first PWA that securely uploads imaging studies from any device—even offline—directly into a cloud PACS.

## Problem Statement
Radiology studies captured outside the core hospital network (remote clinics, mobile imaging units, referrals, low‑infrastructure settings) struggle to enter PACS systems reliably. Existing solutions require VPNs, PACS workstations, stable connectivity, or complex software installations. This results in delays, data loss, and manual workflows.

## Target Users
### Primary
- Remote / rural clinics
- Telemedicine providers
- Mobile imaging services

### Secondary
- Radiologists receiving external studies
- NGOs and humanitarian medical teams

## Key Use Cases
1. Upload DICOM studies from a mobile phone or tablet
2. Upload ZIP/folder-based studies from PCs
3. Upload JPEG/PNG referral images with clinical notes
4. Queue uploads offline and resume automatically

## Value Proposition
- Zero-install (PWA)
- Offline-first reliability
- PACS-native delivery (DICOMweb)
- Minimal training required

## Differentiation
- True offline upload queue
- Mobile-first UX (single primary action)
- No PACS replacement or viewer overhead
- Designed for low-bandwidth environments

## Product Scope
### In Scope (MVP)
- Upload DICOM, ZIP, folder, JPEG/PNG
- Basic metadata preview
- Clinical impression field
- Progress, retry, resumable uploads
- Secure forwarding to cloud PACS

### Out of Scope
- DICOM viewing
- Study querying/search
- PACS storage or reporting
- AI analysis

## UX Principles
- One primary action per screen
- Progressive disclosure
- Human-readable error messages
- Status transparency

## Technical Summary
### Frontend
- React + Vite PWA
- Workbox background sync
- IndexedDB (Dexie)
- File system + camera access

### Backend
- Upload proxy (FastAPI or Fastify)
- DICOM validation (pydicom)
- DICOMweb STOW-RS forwarding
- Temporary object storage

## Security & Compliance
- HTTPS everywhere
- JWT-based auth
- Short-lived upload tokens
- Auto-delete temp files

## Success Metrics
- Upload success rate
- Time to first successful upload
- Offline queue completion rate
- Mean retries per study

## Roadmap (High Level)
- Phase 1: Core upload + PACS forwarding
- Phase 2: QR session onboarding, study completeness checks
- Phase 3: Enterprise hardening and analytics

## Strategic Fit
RelayPACS acts as the missing ingestion layer between decentralized imaging capture and centralized PACS infrastructure, enabling scale without disruption.
