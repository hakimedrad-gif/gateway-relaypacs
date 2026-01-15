# RelayPACS - Product Requirements Document (PRD)

## Document Information
- **Product**: RelayPACS Gateway (MVP)
- **Version**: 1.0
- **Status**: Implementation Complete
- **Last Updated**: 2026-01-14
- **Owner**: Product Management
- **Stakeholders**: Clinical Operations, Engineering, Radiology Services

---

## 1. Goals & Success Metrics

### 1.1 Primary Goals

**G1: Enable Reliable DICOM Uploads from Unreliable Networks**
- **Metric**: Upload success rate ≥99% for studies ≤2GB
- **Target**: Successful transmission over connections with ≥50% packet loss

**G2: Reduce Time from Imaging to Radiologist Review**
- **Metric**: Median time from upload initiation to PACS availability
- **Target**: <15 minutes (down from 60+ minutes via traditional methods)

**G3: Expand Mobile Access to Teleradiology**
- **Metric**: Percentage of uploads originating from mobile devices
- **Target**: ≥40% of uploads from smartphones/tablets

**G4: Minimize Data Loss and Re-acquisition**
- **Metric**: Rate of failed uploads requiring manual intervention
- **Target**: <1% of total upload attempts

### 1.2 Success Metrics

| Category | Metric | Target | Measurement Method |
|----------|---------|--------|-------------------|
| **Reliability** | Upload completion rate | ≥99% | Backend analytics endpoint |
| **Performance** | P95 upload time (500MB study) | <10 min | Prometheus metrics |
| **Availability** | API uptime | 99.9% | Uptime monitoring |
| **User Adoption** | Daily active uploaders | 50+ users | Authentication logs |
| **Clinical Impact** | STAT study turnaround | <5 min | Report timestamps |
| **Network Resilience** | Success rate (3G networks) | ≥95% | E2E test simulations |

### 1.3 Non-Goals (Out of Scope for MVP)

- Full DICOM viewer functionality (read-only preview only)
- Report authoring/editing by radiologists
- Direct patient portal access
- AI/ML-based image analysis
- Multi-language internationalization

---

## 2. User Personas

### Persona 1: Dr. Sarah Chen - Emergency Physician

**Demographics**
- Role: Emergency Department Physician
- Location: Rural hospital, 2 hours from tertiary care center
- Experience: 8 years clinical, limited IT proficiency
- Devices: iPhone 14, hospital desktop workstation

**Goals**
- Get urgent CT/MRI interpretations for stroke/trauma patients
- Minimize time to treatment decisions
- Avoid unnecessary patient transfers

**Pain Points**
- Hospital Wi-Fi frequently drops during uploads
- Previous system required re-starting failed uploads
- Uncertainty whether radiologist received the study

**Usage Pattern**
- 2-5 uploads per shift (mostly evenings/nights)
- Primarily STAT and Emergency service levels
- Uses mobile device 70% of time (bedside, ED hallways)

**Key Requirements**
- One-tap resume after network drops
- Clear visual confirmation of successful transmission
- Mobile-optimized interface for quick uploads

---

### Persona 2: Mike Torres - Lead Radiologic Technologist

**Demographics**
- Role: Chief MRI Technologist
- Location: Community imaging center (15-bed facility)
- Experience: 12 years imaging, moderate IT skills
- Devices: Windows workstation at MRI console

**Goals**
- Batch upload all daily studies to central PACS by end of shift
- Ensure complete metadata for billing/reporting
- Track upload success for quality assurance

**Pain Points**
- Large study sizes (500MB-2GB) timeout on slow DSL connection
- Cannot monitor progress of overnight uploads
- Missing metadata causes study rejections

**Usage Pattern**
- 20-40 uploads per day (bulk operations)
- Mixture of routine and STAT priorities
- Desktop-only workflows with folder-batch uploads

**Key Requirements**
- Folder-level batch upload capability
- Dashboard showing daily upload statistics
- Metadata validation before upload initiation

---

### Persona 3: Dr. Rajesh Patel - Teleradiologist

**Demographics**
- Role: Contracted Radiologist (multi-facility coverage)
- Location: Home-based reading workstation + on-call mobile
- Experience: 15 years radiology, high IT proficiency
- Devices: MacBook Pro, iPad Pro

**Goals**
- Receive complete studies with clinical context
- Provide timely reports to ordering physicians
- Maintain quality metrics for contracted facilities

**Pain Points**
- Incomplete uploads arrive without clinical history
- No notification when priority studies available
- Difficult to track which studies need urgent attention

**Usage Pattern**
- Receives 30-50 studies daily across 6 facilities
- Monitors mobile app for STAT notifications
- Expects overnight routine studies queued for morning review

**Key Requirements**
- Report status tracking (assigned/pending/ready)
- Push notifications for STAT study arrivals
- Clinical history integrated with study metadata

---

### Persona 4: Lisa Nguyen - IT Systems Administrator

**Demographics**
- Role: Healthcare IT Manager
- Location: Regional health system IT department
- Experience: 10 years health IT infrastructure
- Devices: Multi-monitor admin workstation

**Goals**
- Maintain 99.9% system uptime across all facilities
- Monitor storage utilization and forecast capacity
- Troubleshoot upload failures proactively

**Pain Points**
- Lack of visibility into upload success rates by facility
- No alerting when PACS connectivity fails
- Manual log analysis for troubleshooting

**Usage Pattern**
- Monitors dashboards continuously during business hours
- Responds to on-call alerts for system issues
- Monthly capacity planning reviews

**Key Requirements**
- Prometheus/Grafana dashboards for all metrics
- Alerting for failed uploads and PACS connectivity
- Export capabilities for compliance reporting

---

## 3. Functional Requirements

### 3.1 Authentication & User Management

**FR-AUTH-01: User Registration**
- System SHALL support user registration with username, email, password, and role
- Password MUST meet complexity requirements: ≥12 chars, uppercase, lowercase, digit, special char
- Roles MUST include: Clinician, Radiographer, Radiologist, Admin

**FR-AUTH-02: Secure Login**
- System SHALL authenticate users via JWT access tokens (60-min expiry)
- System SHALL issue refresh tokens (7-day expiry) for session persistence
- System MAY support TOTP-based 2FA for enhanced security

**FR-AUTH-03: Password Management**
- System SHALL hash passwords using bcrypt (cost factor 12)
- System SHALL enforce password strength validation on client and server
- "Show Password" toggle MUST be available for user convenience

### 3.2 DICOM Upload Workflow

**FR-UPLOAD-01: Session Initialization**
- User SHALL initiate upload by providing:
  - Study metadata (patient name, study date, modality, service level)
  - Total file count and size
  - Optional clinical history
- System SHALL validate upload size against configured maximum (default: 2GB)
- System SHALL generate unique upload ID and session token
- System SHALL detect potential duplicate studies and warn user

**FR-UPLOAD-02: Chunked File Transfer**
- System SHALL split files into configurable chunks (default: 1MB)
- Client SHALL upload chunks via PUT requests with chunk index and file ID
- System SHALL compute and validate MD5 checksums for each chunk
- System SHALL support idempotent chunk uploads (re-upload returns success)

**FR-UPLOAD-03: Resume Capability**
- System SHALL persist upload session state to survive client crashes
- Client SHALL query upload status to identify missing chunks
- Client SHALL resume upload from last successful chunk
- Session SHALL remain valid for 24 hours from initiation

**FR-UPLOAD-04: Upload Completion**
- Client SHALL signal completion when all chunks uploaded
- System SHALL merge chunks into complete DICOM files
- System SHALL extract and validate DICOM metadata using pydicom
- System SHALL forward files to configured PACS via STOW-RS
- System SHALL create report record and send notification

**FR-UPLOAD-05: Duplicate Detection**
- System SHALL hash uploads using patient name + study date + modality
- System SHALL check for duplicate uploads within last 30 days
- System SHALL return HTTP 409 Conflict with details if duplicate found
- User MAY override with `force_upload=true` flag

### 3.3 Upload Analytics & Monitoring

**FR-ANALYTICS-01: Statistics Dashboard**
- System SHALL display aggregate statistics:
  - Total uploads (count, volume in GB)
  - Success rate percentage
  - Modality distribution (CT, MRI, X-Ray, etc.)
  - Service level breakdown (STAT, Emergency, Routine)
- Dashboard SHALL support time-based filtering: 1W, 2W, 1M, 3M, 6M, ALL

**FR-ANALYTICS-02: Trend Visualization**
- System SHALL provide time-series charts for:
  - Daily upload volume (last 7/30 days)
  - Success vs. failure rates
  - Modality distribution over time
- Charts SHALL use Recharts library for responsive rendering

**FR-ANALYTICS-03: Data Export**
- Admin users SHALL export statistics as CSV files
- Export SHALL include date range, modality, service level, and outcomes
- Export filenames SHALL include period identifier (e.g., `relaypacs_stats_1m.csv`)

### 3.4 Report Management

**FR-REPORT-01: Report Status Tracking**
- System SHALL create report records upon successful PACS upload
- Report statuses SHALL include:
  - `assigned`: Study sent to PACS, awaiting radiologist
  - `pending`: Radiologist in progress
  - `ready`: Report completed and available
  - `additional_data_required`: More info needed
- System SHALL link reports to original upload sessions

**FR-REPORT-02: Report Listing & Filtering**
- User SHALL view all reports for their uploaded studies
- Reports SHALL be filterable by status
- Reports SHALL include upload date, study description, radiologist name

**FR-REPORT-03: Report Retrieval**
- User SHALL download completed reports as PDF files
- System SHALL generate PDFs using ReportLab library
- Downloads SHALL only succeed for reports in `ready` status

**FR-REPORT-04: PACS Synchronization**
- System SHALL poll PACS servers every 5 minutes for report updates
- System SHALL update local report status from PACS metadata
- System SHALL trigger notifications when status changes to `ready`

### 3.5 Notifications

**FR-NOTIF-01: Notification Types**
- System SHALL support notification types:
  - `upload_complete`: Study successfully sent to PACS
  - `upload_failed`: Upload processing encountered errors
  - `report_assigned`: Radiologist assigned to study
  - `report_ready`: Interpretation available for download
  - `additional_data_required`: More clinical info needed

**FR-NOTIF-02: Real-Time Delivery**
- System SHALL push notifications via Server-Sent Events (SSE)
- Client SHALL maintain persistent connection for live updates
- Notifications SHALL appear in mobile app badge and notification center

**FR-NOTIF-03: Notification Management**
- User SHALL view all notifications in dedicated page
- User SHALL mark notifications as read/unread
- Unread count SHALL display in navigation badge

### 3.6 Progressive Web App Features

**FR-PWA-01: Offline Support**
- Service worker SHALL cache app shell (HTML, CSS, JS)
- Client SHALL function in offline mode for:
  - Viewing upload history (from IndexedDB)
  - Queueing uploads for later transmission
  - Browsing reports (cached)
- Background sync SHALL retry queued uploads when connectivity restored

**FR-PWA-02: Installability**
- App SHALL meet PWA manifest requirements (icons, name, theme color)
- App SHALL prompt user to "Add to Home Screen"
- Installed app SHALL launch in standalone mode (no browser chrome)

**FR-PWA-03: Network Status Indicator**
- App SHALL display online/offline status in UI
- App SHALL warn user before attempting upload in offline state
- App SHALL show reconnection in progress during network recovery

### 3.7 Settings & Configuration

**FR-SETTINGS-01: User Preferences**
- User SHALL view/edit profile information (email, full name)
- User SHALL configure 2FA (enable/disable TOTP)
- User SHALL export personal data (GDPR compliance)

**FR-SETTINGS-02: Upload Preferences**
- User SHALL set default service level for uploads
- User SHALL configure chunk size (advanced users)
- User SHALL enable/disable duplicate warnings

---

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-PERF-01: API Response Times**
- P50 latency for metadata endpoints: <200ms
- P95 latency for chunk uploads: <500ms
- P99 latency for analytics queries: <2s

**NFR-PERF-02: Upload Throughput**
- System SHALL sustain 100 concurrent chunk uploads
- System SHALL process 50GB of uploads per hour per instance
- Chunk upload SHALL saturate available network bandwidth

**NFR-PERF-03: Scalability**
- API SHALL be stateless to enable horizontal scaling
- System SHALL support 500+ concurrent user sessions
- Database connection pooling SHALL prevent exhaustion

### 4.2 Security

**NFR-SEC-01: Data Encryption**
- All API traffic SHALL use HTTPS/TLS 1.2+ in production
- S3 storage SHALL encrypt data at rest
- JWT tokens SHALL use RS256 signing

**NFR-SEC-02: Access Control**
- Users SHALL only access their own uploads and reports
- Admin users SHALL access all data for support purposes
- API SHALL enforce role-based access control (RBAC)

**NFR-SEC-03: Rate Limiting**
- Login endpoint: 5 attempts per minute per IP
- Upload init: 20 requests per minute per user
- Chunk upload: 2000 requests per minute per user
- Analytics: 10 requests per minute per user

**NFR-SEC-04: Input Validation**
- All API inputs SHALL be validated via Pydantic schemas
- File uploads SHALL validate DICOM format before PACS forwarding
- Upload size SHALL be validated against configured limits

### 4.3 Reliability

**NFR-REL-01: Data Integrity**
- Chunk uploads SHALL validate MD5 checksums
- Merged files SHALL match original file size
- DICOM files SHALL pass pydicom conformance checks

**NFR-REL-02: Error Handling**
- API SHALL return structured error responses with codes
- Client SHALL retry failed requests with exponential backoff
- System SHALL log all errors to Sentry for monitoring

**NFR-REL-03: Availability**
- API SHALL target 99.9% uptime (SLA)
- Database SHALL use connection pooling and health checks
- PACS connectivity failures SHALL not block uploads (queue for retry)

### 4.4 Usability

**NFR-UX-01: Mobile Responsiveness**
- UI SHALL be optimized for viewports 320px-2560px wide
- Touch targets SHALL be ≥44px for mobile accessibility
- Forms SHALL use native mobile input types (email, tel, etc.)

**NFR-UX-02: Accessibility**
- App SHALL meet WCAG 2.1 AA standards
- Keyboard navigation SHALL support all workflows
- Screen reader compatibility SHALL be tested with NVDA/VoiceOver

**NFR-UX-03: Loading States**
- All async operations SHALL show loading indicators
- Large data fetches SHALL use skeleton screens
- Upload progress SHALL update in real-time

### 4.5 Observability

**NFR-OBS-01: Metrics**
- All API endpoints SHALL expose Prometheus metrics
- Metrics SHALL include request count, latency, error rate
- Custom metrics: upload success rate, PACS connectivity

**NFR-OBS-02: Logging**
- Application SHALL log to stdout in JSON format
- Logs SHALL include request ID, user ID, timestamp
- Error logs SHALL include stack traces

**NFR-OBS-03: Monitoring**
- Grafana dashboards SHALL visualize key metrics
- Alerts SHALL trigger for:
  - API error rate >1%
  - Upload success rate <95%
  - PACS connectivity failure >5 min

---

## 5. Constraints & Assumptions

### 5.1 Technical Constraints

**C-TECH-01: Browser Compatibility**
- MUST support: Chrome 90+, Safari 14+, Edge 90+, Firefox 88+
- MAY degrade gracefully on older browsers (no offline support)

**C-TECH-02: Network Environment**
- MUST function over 3G connections (≥1 Mbps)
- SHOULD optimize for 4G/5G (≥10 Mbps)
- MUST handle high-latency satellite connections (500ms+ RTT)

**C-TECH-03: File Size Limits**
- Maximum upload size: 2GB per session (configurable)
- Maximum chunk size: 10MB
- Minimum chunk size: 512KB (network efficiency)

**C-TECH-04: PACS Compatibility**
- MUST integrate with Orthanc and dcm4chee-arc
- MUST use DICOMweb STOW-RS for uploads
- MAY support DICOM C-STORE in future versions

### 5.2 Business Constraints

**C-BIZ-01: Regulatory Compliance**
- MUST comply with HIPAA security and privacy rules (US deployments)
- MUST support audit logging for compliance (GDPR, HITECH)
- SHOULD implement data retention policies

**C-BIZ-02: Deployment Model**
- MUST support self-hosted deployment (Docker Compose)
- SHOULD support cloud deployment (AWS, GCP, Azure)
- MUST NOT require vendor-hosted SaaS (customer data sovereignty)

**C-BIZ-03: Licensing**
- Open-source dependencies MUST use permissive licenses
- No GPL/AGPL components in production stack

### 5.3 Assumptions

**A-01: User Environment**
- Users have stable authentication credentials
- Clinical staff trained on basic PWA concepts (install, offline mode)
- IT administrators familiar with Docker/container deployments

**A-02: Network Infrastructure**
- Facilities have outbound internet access (no air-gapped deployments)
- Firewalls allow HTTPS on port 443
- DNS resolution available for API endpoints

**A-03: PACS Configuration**
- Target PACS servers support DICOMweb STOW-RS
- PACS credentials secured in environment variables
- PACS has sufficient storage for incoming studies

**A-04: Clinical Workflow**
- Ordering physician already entered study metadata in modality
- Radiographers review metadata for completeness before upload
- Radiologists access PACS directly for interpretation (not via RelayPACS)

---

## 6. Dependencies

### 6.1 External Services

| Dependency | Purpose | Criticality | Mitigation |
|------------|---------|-------------|------------|
| PACS Server (Orthanc/dcm4chee) | Final study archive | **Critical** | Queue uploads, retry on reconnect |
| PostgreSQL Database | Persistent data storage | **Critical** | Connection pooling, automated backups |
| MinIO/S3 Storage | Temporary chunk storage | **Critical** | Local filesystem fallback |
| Redis Cache | Performance optimization | High | Degrade gracefully without caching |
| Sentry Error Tracking | Observability | Medium | Log to file if unavailable |

### 6.2 Third-Party Libraries

**Frontend**
- React 19, React Router 7: UI framework and navigation
- Dexie: IndexedDB abstraction for offline storage
- Axios: HTTP client with retry logic
- Recharts: Analytics visualization

**Backend**
- FastAPI: API framework with OpenAPI docs
- SQLAlchemy: ORM for database access
- pydicom: DICOM file parsing and validation
- Boto3: S3-compatible storage client
- Prometheus FastAPI Instrumentator: Metrics collection

### 6.3 Infrastructure Dependencies

- Docker 20.10+ for containerization
- Docker Compose 2.0+ for orchestration
- At least 4GB RAM per backend instance
- 50GB storage per 1000 uploads (temporary chunks)

---

## 7. Out of Scope (Deferred to Future Versions)

### 7.1 Not Included in MVP

**Advanced DICOM Features**
- Full DICOM viewer with MPR/3D rendering
- DICOM anonymization/de-identification tools
- Study comparison side-by-side viewers
- Burned-in annotation editing

**Clinical Workflow Extensions**
- Order entry integration (HL7/FHIR)
- RIS (Radiology Information System) bidirectional sync
- Workflow orchestration (assign radiologists automatically)
- CPT code assignment for billing

**Advanced Reporting**
- Structured reporting templates
- Voice-to-text report dictation
- Report versioning and amendments
- Peer review workflows

**Enterprise Features**
- Multi-tenancy for shared hosting
- Organization-level dashboards
- Usage-based billing/metering
- SSO integration (SAML, OAuth)

### 7.2 Explicitly Rejected

- **Mobile Native Apps**: PWA provides sufficient functionality
- **Patient Portal**: Security and regulatory complexity out of scope
- **AI Diagnosis**: Requires FDA approval and specialized ML infrastructure
- **PACS Replacement**: RelayPACS complements, does not replace PACS

---

## 8. Acceptance Criteria

MVP is considered complete when:

1. ✅ User can register, login, and logout with 2FA support
2. ✅ User can upload DICOM studies with resume after network failure
3. ✅ Uploaded studies forward successfully to Orthanc and dcm4chee PACS
4. ✅ Dashboard displays upload statistics with time-based filtering
5. ✅ Users receive notifications for upload completion and report availability
6. ✅ App installs as PWA and functions offline for cached content
7. ✅ Admin can export analytics as CSV
8. ✅ System maintains 99% upload success rate in E2E tests
9. ✅ API documentation available via Swagger/ReDoc
10. ✅ Prometheus metrics endpoint exposes key performance indicators

---

**Document Status**: ✅ COMPLETE
**Approval**: Product Management, Engineering Lead, Clinical Stakeholders
**Next Review**: Post-MVP feedback collection
