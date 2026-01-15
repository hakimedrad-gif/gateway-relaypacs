# RelayPACS - Development Stories

## Document Information
- **Product**: RelayPACS Gateway
- **Purpose**: Engineering execution stories for implementation
- **Version**: 1.0
- **Last Updated**: 2026-01-14

---

## Story Format

Each dev story includes:
- **Objective**: Technical goal
- **Scope**: What needs to be built
- **Dependencies**: Prerequisites
- **Definition of Done**: Testable completion criteria
- **Estimated Complexity**: T-shirt sizing (XS, S, M, L, XL)

---

## Frontend Development Stories

### DEV-FE-01: Implement Authentication Flow

**Objective**: Build login screen with JWT token management and optional 2FA

**Scope**:
- Create `Login.tsx` component with username/password form
- Implement "Show Password" toggle
- Add TOTP input field (conditional render)
- Create `useAuth` hook for authentication state
- Store access token in memory, refresh token in IndexedDB
- Implement token refresh logic with Axios interceptors
- Add route guards for authenticated routes

**Dependencies**:
- Backend `/auth/login` endpoint
- Backend `/auth/refresh` endpoint
- Dexie database schema for token storage

**Definition of Done**:
- [ ] User can log in with username + password
- [ ] 2FA flow works if enabled for user
- [ ] Access token auto-refreshes before expiry
- [ ] Unauthenticated users redirect to `/login`
- [ ] Unit tests for authentication logic (90% coverage)
- [ ] E2E test for login flow (Playwright)

**Complexity**: L

---

### DEV-FE-02: Build Upload Study Screen

**Objective**: Create main upload interface with file selection and metadata entry

**Scope**:
- Create `UploadStudy.tsx` with drag-and-drop file zone
- Implement file selection with native picker
- Build metadata form (patient name, study date, modality, service level, etc.)
- Extract DICOM metadata from selected files (pydicom-like lib or backend call)
- Auto-populate form fields from DICOM tags
- Persist form data to IndexedDB for draft recovery
- Navigate to MetadataConfirmation on "Continue"

**Dependencies**:
- Dexie `studies` table schema
- File API for drag-and-drop
- Backend endpoint for DICOM metadata extraction (optional)

**Definition of Done**:
- [ ] Drag-and-drop works for .dcm files
- [ ] Browse button opens file picker
- [ ] Metadata auto-populates from DICOM tags
- [ ] Form validates required fields
- [ ] Draft saved to IndexedDB every 2 seconds
- [ ] Unit tests for metadata extraction (80% coverage)
- [ ] E2E test  for file selection and form submission

**Complexity**: L

---

### DEV-FE-03: Implement Upload Progress Screen

**Objective**: Real-time upload tracking with pause/resume functionality

**Scope**:
- Create `UploadProgress.tsx` with circular progress indicator
- Poll `GET /upload/:uploadId/status` every 2 seconds
- Display uploaded/total bytes, progress %, upload speed
- Show file-level progress with status icons
- Implement "Pause" and "Resume" buttons
- Display activity log of recent events
- Handle auto-pause on network disconnect
- Navigate to `/complete/:uploadId` on success

**Dependencies**:
- Upload session API endpoints
- `useNetworkStatus` hook for connectivity detection
- Axios for API polling

**Definition of Done**:
- [ ] Progress updates in real-time
- [ ] Pause/resume buttons functional
- [ ] Auto-pause/resume on network changes
- [ ] Upload speed calculated accurately
- [ ] Activity log shows timestamped events
- [ ] E2E test for pause/resume flow
- [ ] Network resilience test (simulated disconnect)

**Complexity**: XL

---

### DEV-FE-04: Create Dashboard with Analytics Charts

**Objective**: Build analytics dashboard with time-filtered statistics and visualizations

**Scope**:
- Create `Dashboard.tsx` with 4 metric cards
- Implement time filter tabs (1W, 2W, 1M, 3M, 6M, ALL)
- Integrate Recharts for modality pie chart, service level bar chart, trend line chart
- Fetch data from `GET /upload/stats?period=:period`
- Implement manual refresh and auto-refresh (60s)
- Add CSV export button

**Dependencies**:
- Backend `/upload/stats` endpoint
- Backend `/upload/stats/export` endpoint
- Recharts library

**Definition of Done**:
- [ ] Dashboard displays 4 metric cards
- [ ] Clicking time filter updates all charts
- [ ] Charts animate smoothly on data change
- [ ] CSV export downloads file
- [ ] Auto-refresh works (tested with clock mock)
- [ ] Responsive layout (mobile/tablet/desktop)
- [ ] Unit tests for data transformations (90% coverage)

**Complexity**: L

---

### DEV-FE-05: Build Reports Management Screen

**Objective**: Display report list with filtering and PDF download

**Scope**:
- Create `Reports.tsx` with reports table
- Implement status filter tabs (All, Assigned, Pending, Ready, etc.)
- Fetch reports from `GET /reports?status=:status`
- Add "Download PDF" button (`GET /reports/:id/download`)
- Implement Server-Sent Events for real-time report updates
- Show unread badge counts on filter tabs
- Add pagination (50 reports per page)

**Dependencies**:
- Backend `/reports` endpoints
- EventSource API for SSE
- Report status update notifications

**Definition of Done**:
- [ ] Reports listed with correct columns
- [ ] Status filtering works
- [ ] PDF download functional
- [ ] SSE connection updates list in real-time
- [ ] Unread badges update dynamically
- [ ] E2E test for filtering and download
- [ ] SSE reconnection logic tested

**Complexity**: M

---

### DEV-FE-06: Implement Notifications System

**Objective**: Build notification center with real-time delivery

**Scope**:
- Create `Notifications.tsx` with notification list
- Establish SSE connection to `/notifications/stream`
- Display notifications with icons, titles, messages, timestamps
- Implement mark as read/unread functionality
- Add  browser notification permission request
- Show notification badge count in navigation
- Implement click-to-navigate (notification → related screen)

**Dependencies**:
- Backend `/notifications` endpoints
- Notification API for browser notifications
- SSE for push delivery

**Definition of Done**:
- [ ] Notification list displays correctly
- [ ] SSE connection receives new notifications
- [ ] Browser notifications appear (with permission)
- [ ] Badge count updates on new notification
- [ ] Mark as read/unread works
- [ ] E2E test for notification flow
- [ ] Notification permission handling tested

**Complexity**: M

---

### DEV-FE-07: Build Settings Screen

**Objective**: User preferences and account management interface

**Scope**:
- Create `Settings.tsx` with profile, security, preferences sections
- Implement password change modal
- Build 2FA enable/disable flow with QR code
- Add upload preferences (default service level, chunk size)
- Show PWA install status and storage usage
- Implement data export functionality

**Dependencies**:
- Backend `/api/v1/totp/enable` endpoint
- Backend profile update endpoints
- QRCode library for 2FA QR

**Definition of Done**:
- [ ] Profile edits save successfully
- [ ] Password change validates and updates
- [ ] 2FA QR code scannable and functional
- [ ] Upload preferences persist
- [ ] PWA install button works
- [ ] Data export downloads JSON
- [ ] Unit tests for validation logic (85% coverage)

**Complexity**: L

---

### DEV-FE-08: Implement PWA Features

**Objective**: Configure PWA manifest, service worker, and offline capabilities

**Scope**:
- Configure `vite-plugin-pwa` with manifest
- Create service worker with caching strategies
- Implement background sync for queued uploads
- Add offline indicators (banner, disabled buttons)
- Build install prompt UI
- Configure app badge for notification count
- Set up push notification subscription

**Dependencies**:
- Vite PWA plugin
- Workbox for service worker
- Push notification backend support

**Definition of Done**:
- [ ] App installable on iOS/Android/Desktop
- [ ] Service worker caches app shell
- [ ] Offline mode shows appropriate UI
- [ ] Background sync uploads queued items
- [ ] Install prompt appears correctly
- [ ] App badge shows unread count
- [ ] Lighthouse PWA score >90

**Complexity**: XL

---

## Backend Development Stories

### DEV-BE-01: Implement JWT Authentication

**Objective**: Secure user authentication with JWT access and refresh tokens

**Scope**:
- Create `/auth/register` endpoint (UserCreate schema)
- Create `/auth/login` endpoint (return TokenPair)
- Implement JWT signing with RS256 (python-jose)
- Create `/auth/refresh` endpoint (refresh token → new access token)
- Create `/auth/logout` endpoint (revoke refresh token)
- Add `get_current_user` dependency for route protection
- Implement password hashing with bcrypt (cost factor 12)

**Dependencies**:
- FastAPI, python-jose, passlib
- PostgreSQL User table (via Alembic migration)
- Secret key management (environment variable)

**Definition of Done**:
- [ ] Registration validates password strength
- [ ] Login returns access + refresh tokens
- [ ] Protected routes require valid access token
- [ ] Refresh token generates new access token
- [ ] Logout revokes refresh token
- [ ] Unit tests for auth flows (95% coverage)
- [ ] Integration test for token expiry

**Complexity**: M

---

### DEV-BE-02: Build Chunked Upload Engine

**Objective**: Implement resumable chunked upload with session management

**Scope**:
- Create `/upload/init` endpoint (UploadInitRequest → UploadInitResponse)
- Generate unique upload ID and session token
- Create in-memory session manager with Redis backing (optional)
- Create `/upload/:id/chunk` endpoint (binary body → ChunkUploadResponse)
- Validate chunk MD5 checksums
- Store chunks in MinIO/S3 or local filesystem
- Implement `/upload/:id/status` endpoint (return UploadStatusResponse)
- Track uploaded chunks per file
- Create `/upload/:id/complete` endpoint (merge chunks, validate DICOM)

**Dependencies**:
- FastAPI, aiofiles, Boto3 (S3 client)
- pydicom for DICOM validation
- MinIO or S3-compatible storage

**Definition of Done**:
- [ ] Upload session creation works
- [ ] Chunks upload and persist correctly
- [ ] MD5 validation prevents corruption
- [ ] Status endpoint returns accurate progress
- [ ] Complete endpoint merges chunks successfully
- [ ] DICOM validation rejects invalid files
- [ ] Unit tests for chunk logic (90% coverage)
- [ ] Integration test for full upload flow

**Complexity**: XL

---

### DEV-BE-03: Implement PACS Forwarding

**Objective**: Forward merged DICOM files to PACS via STOW-RS

**Scope**:
- Create PACS service abstraction (Orthanc, dcm4chee)
- Implement STOW-RS upload via `dicomweb_client`
- Support multipart/related content-type
- Add PACS health checks
- Implement retry logic with exponential backoff
- Return PACS receipt ID on success
- Queue failed uploads for later retry

**Dependencies**:
- dicomweb-client library
- Orthanc/dcm4chee PACS servers
- PACS URLs and credentials (environment variables)

**Definition of Done**:
- [ ] Files forward to Orthanc successfully
- [ ] Files forward to dcm4chee successfully
- [ ] Both PACS receive same files (if active_pacs=both)
- [ ] Receipt ID stored in database
- [ ] Retry logic tested (simulated PACS failure)
- [ ] Queue persistence for failed uploads
- [ ] Integration test with test PACS server

**Complexity**: L

---

### DEV-BE-04: Build Analytics Engine

**Objective**: Aggregate and expose upload statistics

**Scope**:
- Create in-memory stats manager with persistence
- Track uploads by modality, service level, date
- Implement `/upload/stats?period=:period` endpoint
- Support time filters: 1w, 2w, 1m, 3m, 6m, all
- Calculate metrics: total uploads, volume, success rate
- Generate modality distribution, service level breakdown
- Implement `/upload/stats/export` for CSV download
- Cache stats in Redis (60s TTL)

**Dependencies**:
- Redis for caching
- PostgreSQL for upload records
- CSV generation library

**Definition of Done**:
- [ ] Stats endpoint returns correct data
- [ ] Time filtering accurate
- [ ] CSV export downloads correctly
- [ ] Redis caching reduces DB load (tested with metrics)
- [ ] Stats update in real-time on new uploads
- [ ] Unit tests for aggregation logic (90% coverage)

**Complexity**: M

---

### DEV-BE-05: Implement Report Management

**Objective**: Create report lifecycle with PACS sync

**Scope**:
- Define Report and Notification data models (Pydantic)
- Create PostgreSQL tables via Alembic migration
- Implement `/reports` endpoints (list, get, download)
- Build PDF generation with ReportLab
- Create PACS sync service (poll every 5 minutes)
- Update report statuses from PACS metadata
- Trigger notifications on status changes

**Dependencies**:
- PostgreSQL (reports table)
- ReportLab for PDF
- APScheduler for background polling
- PACS WADO-RS/QIDO-RS for metadata retrieval

**Definition of Done**:
- [ ] Reports table schema created
- [ ] CRUD endpoints functional
- [ ] PDF generation works
- [ ] PACS sync updates statuses
- [ ] Notifications triggered correctly
- [ ] Unit tests for report logic (85% coverage)
- [ ] Integration test for sync service

**Complexity**: L

---

### DEV-BE-06: Build Notification System

**Objective**: Real-time push notifications via Server-Sent Events

**Scope**:
- Create `/notifications` endpoints (list, mark read, delete)
- Implement `/notifications/stream` SSE endpoint
- Build notification service with broadcast capability
- Store notifications in PostgreSQL
- Link notifications to uploads and reports
- Support notification types: upload_complete, upload_failed, report_assigned, report_ready
- Implement unread count calculation

**Dependencies**:
- sse-starlette library
- PostgreSQL (notifications table)
- FastAPI background tasks

**Definition of Done**:
- [ ] SSE stream established successfully
- [ ] Notifications broadcast to connected clients
- [ ] Persisted notifications queryable
- [ ] Unread count accurate
- [ ] Connection resilient (auto-reconnect on drop)
- [ ] Unit tests for notification service (90% coverage)
- [ ] Integration test for SSE flow

**Complexity**: M

---

### DEV-BE-07: Implement 2FA with TOTP

**Objective**: Add optional two-factor authentication

**Scope**:
- Create `/api/v1/totp/enable` endpoint
- Generate TOTP secret with pyotp
- Return QR code data for authenticator app enrollment
- Validate TOTP codes on login (if 2FA enabled)
- Create `/api/v1/totp/disable` endpoint (requires TOTP)
- Store TOTP secret encrypted in database
- Update User model with `totp_secret` and `totp_enabled` fields

**Dependencies**:
- pyotp library
- qrcode library
- PostgreSQL User table migration

**Definition of Done**:
- [ ] TOTP secret generation works
- [ ] QR code scannable by Google Authenticator
- [ ] Login validates TOTP if enabled
- [ ] Disable flow requires valid TOTP
- [ ] TOTP secret encrypted at rest
- [ ] Unit tests for TOTP logic (95% coverage)
- [ ] Integration test for full 2FA flow

**Complexity**: M

---

### DEV-BE-08: Add Duplicate Detection

**Objective**: Prevent accidental re-upload of existing studies

**Scope**:
- Hash uploads using SHA-256 of patient name + study date + modality
- Store hash in `StudyUpload` table
- Query for duplicates within last 30 days on `/upload/init`
- Return HTTP 409 Conflict if duplicate found
- Include original upload date in error response
- Allow override with `force_upload=true` flag

**Dependencies**:
- PostgreSQL `StudyUpload` table with `study_hash` column
- Alembic migration for schema change

**Definition of Done**:
- [ ] Duplicate detection identifies existing uploads
- [ ] 409 Conflict returned with details
- [ ] Force upload bypasses duplicate check
- [ ] 30-day lookback period enforced
- [ ] Unit tests for hashing logic (90% coverage)
- [ ] Integration test for duplicate scenarios

**Complexity**: S

---

## Infrastructure & DevOps Stories

### DEV-INFRA-01: Set Up Docker Compose

**Objective**: Multi-container orchestration for dev environment

**Scope**:
- Create `docker-compose.yml` with services: backend, frontend, postgres, redis, minio, orthanc, dcm4chee
- Configure health checks for all services
- Set up volume persistence
- Define Docker networks
- Create Dockerfiles for backend and frontend
- Document startup and teardown procedures

**Dependencies**:
- Docker 20.10+
- Docker Compose 2.0+

**Definition of Done**:
- [ ] All services start with `docker-compose up`
- [ ] Health checks pass for critical services
- [ ] Data persists across restarts
- [ ] Frontend connects to backend correctly
- [ ] Backend connects to all dependencies
- [ ] Documentation in README.md

**Complexity**: M

---

### DEV-INFRA-02: Configure Prometheus Metrics

**Objective**: Expose metrics for monitoring and alerting

**Scope**:
- Integrate `prometheus-fastapi-instrumentator`
- Expose `/metrics` endpoint
- Add custom metrics: upload_success_rate, pacs_connectivity, chunk_upload_duration
- Set up Prometheus server in Docker Compose
- Configure scrape jobs for backend, postgres-exporter, redis-exporter

**Dependencies**:
- Prometheus FastAPI Instrumentator
- Prometheus server
- PostgreSQL and Redis exporters

**Definition of Done**:
- [ ] `/metrics` endpoint returns Prometheus format
- [ ] Custom metrics collected correctly
- [ ] Prometheus scrapes backend successfully
- [ ] Metrics visible in Prometheus UI
- [ ] Database and Redis metrics available

**Complexity**: S

---

### DEV-INFRA-03: Set Up Grafana Dashboards

**Objective**: Visualize system metrics in Grafana

**Scope**:
- Add Grafana service to Docker Compose
- Create "RelayPACS Overview" dashboard
- Add panels for: API latency (P50/P95/P99), upload volume, success rate, PACS connectivity
- Configure Prometheus as data source
- Export dashboard JSON for version control
- Set up alerting rules (>1% error rate, >5min PACS downtime)

**Dependencies**:
- Grafana server
- Prometheus as data source

**Definition of Done**:
- [ ] Grafana accessible at localhost:3000
- [ ] Dashboard displays all key metrics
- [ ] Alerts trigger on threshold violations
- [ ] Dashboard exported to `monitoring/grafana/dashboards/`
- [ ] Documentation for adding custom panels

**Complexity**: M

---

### DEV-INFRA-04: Implement Database Migrations

**Objective**: Version-controlled schema changes with Alembic

**Scope**:
- Initialize Alembic in backend
- Create initial migration for User, StudyUpload, Report, Notification tables
- Add migration for TOTP fields (User table)
- Add migration for duplicate detection (StudyUpload hash)
- Configure auto-upgrade on container startup
- Document migration creation and rollback procedures

**Dependencies**:
- Alembic library
- PostgreSQL database
- SQLAlchemy models

**Definition of Done**:
- [ ] Alembic configured correctly
- [ ] Initial migration creates all tables
- [ ] Upgrade command runs successfully
- [ ] Downgrade command tested
- [ ] Migrations run on container startup
- [ ] Documentation in `docs/postgresql_migration.md`

**Complexity**: S

---

### DEV-INFRA-05: Add Background Scheduler

**Objective**: Automated cleanup and sync tasks

**Scope**:
- Integrate APScheduler
- Create cleanup job (orphaned uploads, expired sessions)
- Schedule cleanup for daily 2 AM
- Create PACS sync job (report status updates)
- Schedule sync for every 5 minutes
- Add scheduler lifecycle hooks (startup/shutdown)
- Log scheduler activity

**Dependencies**:
- APScheduler library
- FastAPI lifespan context

**Definition of Done**:
- [ ] Scheduler starts on app startup
- [ ] Cleanup job runs daily
- [ ] PACS sync job runs every 5 minutes
- [ ] Scheduler shuts down gracefully
- [ ] Jobs logged with timestamps
- [ ] Unit tests for job logic (80% coverage)

**Complexity**: M

---

### DEV-INFRA-06: Configure Sentry Error Tracking

**Objective**: Automatic error monitoring and alerting

**Scope**:
- Integrate Sentry SDK for backend and frontend
- Configure DSN via environment variable
- Set up source maps for frontend stack traces
- Configure error sampling rate
- Add custom context (user ID, upload ID)
- Test error capture and  reporting

**Dependencies**:
- Sentry account and DSN
- sentry-sdk (backend), @sentry/react (frontend)

**Definition of Done**:
- [ ] Sentry initialized on app startup
- [ ] Backend errors captured in Sentry
- [ ] Frontend errors captured with source maps
- [ ] Custom context attached to errors
- [ ] Error notifications sent (email/Slack)
- [ ] Documentation for Sentry setup

**Complexity**: S

---

## API Development Stories

### DEV-API-01: Version API Endpoints

**Objective**: Implement versioned API with backward compatibility

**Scope**:
- Create `/api/v1` router
- Move all endpoints under v1 prefix
- Maintain legacy routes for backward compatibility
- Tag legacy routes in OpenAPI docs
- Document versioning strategy

**Dependencies**:
- FastAPI router organization

**Definition of Done**:
- [ ] All endpoints accessible via `/api/v1/`
- [ ] Legacy routes still functional
- [ ] OpenAPI docs show version info
- [ ] Deprecation warnings on legacy routes
- [ ] Documentation in `docs/architecture.md`

**Complexity**: XS

---

### DEV-API-02: Add Rate Limiting

**Objective**: Prevent abuse with endpoint-specific rate limits

**Scope**:
- Integrate slowapi middleware
- Configure limits per endpoint:
  - Login: 5/min per IP
  - Upload init: 20/min per user
  - Chunk upload: 2000/min per user
  - Analytics: 10/min per user
- Return HTTP 429 with Retry-After header
- Add rate limit exemptions for admin users

**Dependencies**:
- slowapi library
- Redis for rate limit storage

**Definition of Done**:
- [ ] Rate limits enforce correctly
- [ ] 429 responses include Retry-After
- [ ] Limits configurable via environment
- [ ] Admin users exempted
- [ ] Unit tests for rate limit logic
- [ ] Integration test for limit enforcement

**Complexity**: S

---

### DEV-API-03: Implement API Documentation

**Objective**: Comprehensive API docs with examples

**Scope**:
- Configure FastAPI OpenAPI generation
- Add descriptions to all endpoints
- Provide request/response examples
- Document error codes and meanings
- Enable Swagger UI at `/docs`
- Enable ReDoc at `/redoc`

**Dependencies**:
- FastAPI built-in OpenAPI support

**Definition of Done**:
- [ ] Swagger UI accessible and functional
- [ ] ReDoc UI accessible
- [ ] All endpoints documented
- [ ] Examples provided for complex requests
- [ ] Error codes listed
- [ ] OpenAPI JSON downloadable at `/openapi.json`

**Complexity**: XS

---

## Testing Stories

### DEV-TEST-01: Backend Unit Tests

**Objective**: Achieve 90%+ code coverage for backend

**Scope**:
- Write pytest tests for all service modules
- Test authentication flows
- Test upload session management
- Test PACS integration (mocked)
- Test analytics calculations
- Use fixtures for database setup
- Mock external dependencies (S3, Redis, PACS)

**Dependencies**:
- pytest, pytest-asyncio, pytest-cov, httpx

**Definition of Done**:
- [ ] >90% code coverage (pytest-cov)
- [ ] All critical paths tested
- [ ] Edge cases covered
- [ ] Tests run in CI pipeline
- [ ] Test documentation in README

**Complexity**: XL

---

### DEV-TEST-02: Frontend Unit Tests

**Objective**: Test React components and hooks

**Scope**:
- Write Vitest tests for components
- Test authentication hook
- Test upload manager service
- Test form validation logic
- Mock API calls with MSW (Mock Service Worker)
- Test error handling

**Dependencies**:
- Vitest, @testing-library/react, MSW

**Definition of Done**:
- [ ] >80% code coverage
- [ ] All hooks tested
- [ ] Critical components tested
- [ ] Mock API stable
- [ ] Tests run in CI

**Complexity**: L

---

### DEV-TEST-03: E2E Tests with Playwright

**Objective**: Automated end-to-end testing of critical user flows

**Scope**:
- Set up Playwright test environment
- Write E2E tests:
  - Login flow (with/without 2FA)
  - File upload flow
  - Upload resume after network drop
  - Dashboard analytics view
  - Report download
  - Notification receipt
- Run tests in CI pipeline

**Dependencies**:
- Playwright, test database, test PACS server

**Definition of Done**:
- [ ] All critical flows covered
- [ ] Tests pass consistently
- [ ] Network resilience tested (simulated disconnect)
- [ ] Tests run in headless mode (CI)
- [ ] Test artifacts (screenshots, videos) saved on failure

**Complexity**: XL

---

**Document Version**: 1.0
**Total Dev Stories**: 29 stories across Frontend, Backend, Infrastructure, API, Testing
**Implementation Status**: ✅ All stories completed (MVP delivered)
**Next**: Post-MVP feature enhancements and performance optimization
