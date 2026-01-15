# RelayPACS Product Brief

## Product Overview

RelayPACS is a mobile-first Progressive Web Application (PWA) designed to serve as a lightweight teleradiology gateway for secure DICOM medical imaging uploads. It enables clinicians and radiographers at remote healthcare facilities to reliably transmit medical imaging studies from unstable network environments to centralized PACS (Picture Archiving and Communication System) servers for radiological interpretation.

**Product Category**: Healthcare IT - Teleradiology Infrastructure
**Deployment Model**: Self-hosted, containerized cloud/on-premise deployment
**Platform**: Cross-platform PWA (iOS, Android, Desktop browsers)

---

## Problem Statement

Healthcare providers in remote or resource-constrained facilities face significant challenges when transmitting large DICOM imaging studies for radiological review:

### Core Challenges
1. **Network Unreliability**: Unstable mobile/Wi-Fi connections cause upload failures and data loss
2. **Large File Sizes**: Medical imaging studies (CT, MRI, X-Ray) range from hundreds of MB to multiple GB
3. **Clinical Urgency**: Emergency cases require immediate transmission without retry delays
4. **Technical Complexity**: Traditional PACS integration requires specialized IT infrastructure
5. **Limited Accessibility**: Desktop-only DICOM tools don't support mobile clinical workflows

Without a reliable upload mechanism, remote facilities experience:
- Delayed diagnoses and treatment decisions
- Increased patient transfer costs
- Data loss requiring study re-acquisition (patient re-radiation)
- Inefficient radiologist workflows

---

## Target Users

### Primary Users

**1. Clinicians (Emergency/Primary Care Physicians)**
- **Need**: Upload imaging studies from patient Point-of-Care for urgent interpretation
- **Environment**: Mobile devices, remote clinics, ambulances
- **Priority**: Speed, reliability, minimal technical knowledge required

**2. Radiographers/Technologists**
- **Need**: Reliable transmission of acquired imaging studies from modality workstations
- **Environment**: Hospital radiology departments, mobile imaging units
- **Priority**: Bulk upload capabilities, quality assurance, audit trails

**3. Radiologists**
- **Need**: Receive studies with complete metadata and clinical context for interpretation
- **Environment**: Reading workstations, on-call mobile devices
- **Priority**: Study completeness, proper routing, report delivery

### Secondary Users

**4. System Administrators**
- **Need**: Monitor upload success rates, system health, storage utilization
- **Environment**: IT operations centers
- **Priority**: Observability, troubleshooting, resource management

---

## Core Value Proposition

**"Reliable DICOM uploads from anywhere, on any device, over any network"**

RelayPACS transforms unreliable networks into reliable medical data transmission channels by:

1. **Guaranteeing Delivery**: Chunked, resumable uploads that survive network interruptions
2. **Enabling Mobility**: Mobile-first PWA works offline and installs like a native app
3. **Simplifying Integration**: Single gateway replaces complex DICOM networking rules
4. **Accelerating Care**: Real-time upload progress and status notifications reduce wait times
5. **Supporting Scale**: Cloud-native architecture handles facility growth without infrastructure changes

---

## Key Capabilities

### 1. Resilient Upload Engine
- **Chunked resumable uploads** with automatic retry and recovery
- **Duplicate detection** prevents re-uploads of existing studies
- **Offline queueing** stores uploads locally until network available
- **Integrity validation** with MD5 checksums and DICOM conformance checks

### 2. Clinical Workflow Integration
- **Metadata capture**: Modality, service level (STAT/Routine), clinical history
- **Service-level routing**: Priority-based PACS forwarding for emergency cases
- **Upload analytics**: Dashboard showing volume, success rates, modality distribution
- **Report notifications**: Real-time alerts when radiologist completes interpretation

### 3. Enterprise PACS Connectivity
- **Multi-PACS support**: Simultaneous forwarding to Orthanc and dcm4chee archives
- **DICOMweb standards**: STOW-RS for secure HTTP-based transmission
- **Configurable routing**: Rules-based study distribution to specialized reading centers
- **Sync engine**: Bidirectional report status synchronization from PACS

### 4. Security & Compliance
- **Authentication**: JWT-based access control with optional 2FA (TOTP)
- **Encrypted transmission**: HTTPS/TLS for all uploads
- **Role-based access**: Clinician, Radiographer, Radiologist, Admin permissions
- **Audit logging**: Complete traceability of uploads and access patterns

### 5. Progressive Web App Features
- **Offline-first architecture**: Service workers cache app for zero-connectivity operation
- **Install prompts**: Add to home screen for native app experience
- **Push notifications**: Background report delivery even when app closed
- **Responsive design**: Optimized for smartphones, tablets, and desktops

---

## High-Level Technical Architecture

### Frontend Layer
- **React 19** single-page application with **Vite** build system
- **Dexie (IndexedDB)** for local file persistence and offline queue management
- **Service Worker** for offline capabilities and background sync
- **Tailwind CSS** for responsive, mobile-first UI design

### Backend Layer
- **FastAPI (Python 3.12+)** REST API with async request handling
- **PostgreSQL** for persistent storage of upload metadata and reports
- **Redis** for caching frequently accessed data and rate limiting
- **MinIO (S3-compatible)** for temporary chunked file storage

### Integration Layer
- **pydicom** for DICOM metadata extraction and validation
- **DICOMweb client** for STOW-RS compliant PACS transmission
- **Orthanc** and **dcm4chee-arc** as target PACS systems
- **Prometheus/Grafana** for system observability and alerting

### Deployment
- **Docker Compose** orchestration for local/development environments
- **Containerized services** for portable cloud/on-premise deployment
- **Horizontal scaling** via stateless API design and external state stores

---

## Success Metrics

- **Upload Reliability**: >99% successful study transmission rate
- **Time to Radiologist**: <15 minutes from upload initiation to PACS availability
- **User Adoption**: 80% of remote facilities using mobile devices for uploads
- **Network Resilience**: Successful upload completion over connections with 50%+ packet loss
- **System Availability**: 99.9% uptime for upload ingestion service

---

## Strategic Positioning

RelayPACS serves as the **edge ingestion layer** in a teleradiology ecosystem:

- **Complements** existing PACS infrastructure (does not replace)
- **Bridges** mobile/remote clinicians to centralized reading workflows
- **Enables** new care delivery models (mobile stroke units, disaster response, rural outreach)
- **Scales** from single-facility pilot to national teleradiology networks

---

**Document Version**: 1.0
**Last Updated**: 2026-01-14
**Classification**: Product Strategy
