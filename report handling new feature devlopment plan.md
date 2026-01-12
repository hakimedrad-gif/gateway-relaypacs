# Implementation Plan: Report Handling & Notification Features

## Overview

This plan details the implementation of two critical features for the RelayPACS teleradiology PWA:

**Feature A: Report Handling** - Enable users to sync, view, download, print, and share radiology reports from the cloud PACS server.

**Feature B: Notification System** - Provide real-time notifications for upload status changes and report lifecycle events (assigned, pending, ready, additional data required).

### Background Context

RelayPACS currently supports:
- Chunked, resumable DICOM uploads to cloud PACS (dcm4chee/Orthanc)
- Upload session tracking with status (pending, uploading, processing, complete, failed)
- FastAPI backend with JWT authentication
- React PWA frontend with IndexedDB for offline support

**Missing capabilities:**
- No report retrieval or viewing functionality
- No notification system for status updates
- No bidirectional sync with PACS for report status changes

---

## User Review Required

> [!IMPORTANT]
> **PACS Integration Approach**
>
> The implementation assumes the cloud PACS server (dcm4chee) supports:
> 1. **Report retrieval via QIDO-RS/WADO-RS** (DICOMweb standard)
> 2. **Webhook or polling mechanism** for report status updates
>
> **Question for User:** Does your cloud PACS server expose webhooks for report status changes, or should we implement polling? What is the expected report format (PDF, DICOM SR, or custom format)?

> [!WARNING]
> **Real-time Communication Technology**
>
> Two options for real-time notifications:
> 1. **WebSockets** - Full bidirectional communication, requires persistent connection
> 2. **Server-Sent Events (SSE)** - Unidirectional server-to-client, simpler, better for PWA
>
> **Recommendation:** Use SSE for better PWA compatibility and simpler implementation. Confirm if this meets your requirements.

> [!CAUTION]
> **Mobile Share API Limitations**
>
> The Web Share API (for forwarding reports to messaging apps) has limitations:
> - Only works in secure contexts (HTTPS)
> - Requires user gesture (button click)
> - Not supported in all browsers (primarily mobile)
>
> We'll implement progressive enhancement with fallback to copy/download.

---

## Proposed Changes

### Backend Components

#### 1. Data Models

##### [NEW] [backend/app/models/report.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/models/report.py)

**Purpose:** Define report and notification data models

**Changes:**
- Create `ReportStatus` enum: `ASSIGNED`, `PENDING`, `READY`, `ADDITIONAL_DATA_REQUIRED`
- Create `Report` Pydantic model with fields:
  - `id: UUID`
  - `upload_id: UUID` (links to upload session)
  - `study_instance_uid: str` (DICOM identifier)
  - `status: ReportStatus`
  - `radiologist_name: str | None`
  - `report_url: str | None` (PDF location)
  - `created_at: datetime`
  - `updated_at: datetime`
- Create `NotificationType` enum: `UPLOAD_COMPLETE`, `UPLOAD_FAILED`, `REPORT_ASSIGNED`, `REPORT_READY`, `ADDITIONAL_DATA_REQUIRED`
- Create `Notification` Pydantic model with fields:
  - `id: UUID`
  - `user_id: str`
  - `notification_type: NotificationType`
  - `title: str`
  - `message: str`
  - `related_upload_id: UUID | None`
  - `related_report_id: UUID | None`
  - `is_read: bool = False`
  - `created_at: datetime`

---

#### 2. Database Layer

##### [MODIFY] [backend/app/config.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/config.py)

**Purpose:** Add database connection for reports and notifications

**Changes:**
- Add SQLite database path for reports: `REPORTS_DB_PATH = "data/reports.db"`
- Add configuration for PACS polling interval: `PACS_POLL_INTERVAL_SECONDS = 60`

##### [NEW] [backend/app/database/reports_db.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/database/reports_db.py)

**Purpose:** SQLite database service for reports and notifications

**Changes:**
- Create `ReportsDatabase` class with methods:
  - `create_report(report: Report) -> Report`
  - `get_report_by_id(report_id: UUID) -> Report | None`
  - `get_reports_by_user(user_id: str) -> list[Report]`
  - `get_report_by_upload_id(upload_id: UUID) -> Report | None`
  - `update_report_status(report_id: UUID, status: ReportStatus, report_url: str | None) -> Report`
  - `create_notification(notification: Notification) -> Notification`
  - `get_user_notifications(user_id: str, limit: int = 50) -> list[Notification]`
  - `mark_notification_read(notification_id: UUID) -> None`
  - `get_unread_count(user_id: str) -> int`
- Initialize database schema on startup with tables: `reports`, `notifications`

---

#### 3. PACS Sync Service

##### [MODIFY] [backend/app/pacs/service.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/pacs/service.py)

**Purpose:** Add report retrieval and sync capabilities

**Changes:**
- Add method `query_study_reports(study_instance_uid: str) -> list[dict]` using QIDO-RS
- Add method `retrieve_report_pdf(report_url: str) -> bytes` using WADO-RS
- Add background polling service `poll_report_updates()` that:
  - Queries PACS for pending reports every `PACS_POLL_INTERVAL_SECONDS`
  - Updates local database when status changes
  - Triggers notifications

##### [NEW] [backend/app/pacs/report_sync.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/pacs/report_sync.py)

**Purpose:** Background task for continuous PACS synchronization

**Changes:**
- Implement async background task using `asyncio`
- Query all reports with status `ASSIGNED` or `PENDING`
- Check PACS for status updates via QIDO-RS
- Update database and trigger notifications on changes
- Handle connection failures gracefully with exponential backoff

---

#### 4. PDF Generation Service

##### [NEW] [backend/app/reports/pdf_service.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/reports/pdf_service.py)

**Purpose:** Generate PDF reports from DICOM SR or custom data

**Changes:**
- Install `reportlab` dependency
- Create `PDFGenerator` class with method `generate_report_pdf(report_data: dict) -> bytes`
- Implement template with:
  - Patient demographics
  - Study information
  - Report findings
  - Radiologist signature
- Handle both DICOM SR parsing and custom report formats

##### [MODIFY] [backend/requirements.txt](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/requirements.txt)

**Changes:**
- Add `reportlab==4.2.5` for PDF generation
- Add `python-sse-starlette==2.2.1` for SSE support

---

#### 5. Notification Service

##### [NEW] [backend/app/notifications/service.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/notifications/service.py)

**Purpose:** Centralized notification creation and broadcasting

**Changes:**
- Create `NotificationService` class with methods:
  - `create_and_broadcast(user_id: str, notification_type: NotificationType, title: str, message: str, upload_id: UUID | None, report_id: UUID | None) -> Notification`
  - `subscribe_sse(user_id: str) -> EventSourceResponse` (SSE connection handler)
  - `broadcast_to_user(user_id: str, notification: Notification)` (send via SSE)
- Maintain active SSE connections in memory (dict mapping user_id to asyncio.Queue)
- Implement heartbeat (every 30s) to keep connections alive

---

#### 6. API Endpoints

##### [NEW] [backend/app/reports/router.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/reports/router.py)

**Purpose:** RESTful API for report management

**Endpoints:**
- `GET /reports` - List all reports for authenticated user
  - Query params: `status` (optional filter), `limit`, `offset`
  - Response: `list[Report]`
- `GET /reports/{report_id}` - Get specific report details
  - Response: `Report`
- `GET /reports/upload/{upload_id}` - Get report for specific upload
  - Response: `Report | None`
- `GET /reports/{report_id}/download` - Download report as PDF
  - Response: PDF file (application/pdf)
  - Headers: `Content-Disposition: attachment; filename="report_{report_id}.pdf"`
- `POST /reports/{report_id}/sync` - Manually trigger PACS sync for a report
  - Response: `Report` (updated status)

##### [NEW] [backend/app/notifications/router.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/notifications/router.py)

**Purpose:** API for notifications and SSE

**Endpoints:**
- `GET /notifications` - List user notifications
  - Query params: `limit=50`, `offset=0`, `unread_only=false`
  - Response: `{ notifications: list[Notification], unread_count: int }`
- `PATCH /notifications/{notification_id}/read` - Mark notification as read
  - Response: `{ success: bool }`
- `PATCH /notifications/read-all` - Mark all notifications as read
  - Response: `{ count: int }`
- `GET /notifications/stream` - SSE endpoint for real-time notifications
  - Response: SSE event stream
  - Event format: `{ type: "notification", data: Notification }`

##### [MODIFY] [backend/app/main.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/main.py)

**Changes:**
- Import and include `reports_router` at `/reports`
- Import and include `notifications_router` at `/notifications`
- Add startup event to initialize report database
- Add startup event to launch background PACS sync task
- Add shutdown event to close SSE connections gracefully

---

#### 7. Event Triggers

##### [MODIFY] [backend/app/upload/router.py](file:///home/desktop/Teleradiology/geteway/backend/app/upload/router.py)

**Purpose:** Trigger notifications on upload events

**Changes in `complete_upload` function:**
- After successful PACS forwarding, create initial `Report` record with status `ASSIGNED`
- Trigger `UPLOAD_COMPLETE` notification
- On upload failure, trigger `UPLOAD_FAILED` notification

**Changes needed:**
- Import `reports_db` and `notification_service`
- After line ~190 (PACS forwarding success):
  ```python
  # Create report record
  report = reports_db.create_report(Report(
      upload_id=upload_id,
      study_instance_uid=study_uid,  # extract from DICOM
      status=ReportStatus.ASSIGNED
  ))

  # Notify user
  await notification_service.create_and_broadcast(
      user_id=token["sub"],
      notification_type=NotificationType.UPLOAD_COMPLETE,
      title="Upload Complete",
      message=f"Study {metadata.patient_name} uploaded successfully",
      upload_id=upload_id,
      report_id=report.id
  )
  ```

---

### Frontend Components

#### 8. API Client Extensions

##### [MODIFY] [frontend/src/services/api.ts](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/services/api.ts)

**Purpose:** Add API methods for reports and notifications

**Changes:**
- Add TypeScript interfaces: `Report`, `Notification`, `NotificationType`, `ReportStatus`
- Add `reportApi` object with methods:
  - `listReports(status?: string): Promise<Report[]>`
  - `getReport(reportId: string): Promise<Report>`
  - `getReportByUpload(uploadId: string): Promise<Report | null>`
  - `downloadReport(reportId: string): Promise<Blob>`
  - `syncReport(reportId: string): Promise<Report>`
- Add `notificationApi` object with methods:
  - `listNotifications(unreadOnly?: boolean): Promise<{ notifications: Notification[], unread_count: number }>`
  - `markAsRead(notificationId: string): Promise<void>`
  - `markAllAsRead(): Promise<void>`
  - `connectSSE(onNotification: (n: Notification) => void): EventSource`

---

#### 9. SSE Connection Hook

##### [NEW] [frontend/src/hooks/useNotifications.ts](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/hooks/useNotifications.ts)

**Purpose:** React hook for managing notification state and SSE connection

**Features:**
- Maintain local state: `notifications: Notification[]`, `unreadCount: number`
- Connect to SSE on mount (when authenticated)
- Handle incoming notifications via SSE
- Display toast on new notification
- Reconnect on connection loss (exponential backoff)
- Cleanup on unmount
- Expose methods: `markAsRead(id)`, `markAllAsRead()`, `refresh()`

---

#### 10. Report Components

##### [NEW] [frontend/src/components/reports/ReportCard.tsx](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/components/reports/ReportCard.tsx)

**Purpose:** Display individual report with actions

**Features:**
- Show report status badge (color-coded)
- Display patient name, study date, modality
- Show radiologist name (if available)
- Action buttons:
  - **View** - Navigate to report detail page
  - **Download** - Download PDF, show progress
  - **Print** - Open browser print dialog for PDF
  - **Share** - Use Web Share API (if available), fallback to copy link
- Responsive grid/list layout

##### [NEW] [frontend/src/components/reports/ReportList.tsx](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/components/reports/ReportList.tsx)

**Purpose:** List all reports with filtering

**Features:**
- Fetch reports from API on mount
- Filter tabs: All, Pending, Ready, Additional Data Required
- Sort by date (newest first)
- Empty state when no reports
- Loading skeleton during fetch
- Pull-to-refresh on mobile
- Infinite scroll for pagination

##### [NEW] [frontend/src/components/reports/ReportViewer.tsx](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/components/reports/ReportViewer.tsx)

**Purpose:** Full-screen PDF viewer

**Features:**
- Embed PDF using `<iframe>` with PDF blob URL
- Fallback to download button if embed fails
- Loading spinner while fetching PDF
- Error handling for failed downloads

---

#### 11. Notification Components

##### [NEW] [frontend/src/components/notifications/NotificationBell.tsx](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/components/notifications/NotificationBell.tsx)

**Purpose:** Header icon with unread count badge

**Features:**
- Bell icon with animated badge (red dot with count)
- Click to toggle dropdown
- Badge animates on new notification
- Accessible (ARIA labels, keyboard navigation)

##### [NEW] [frontend/src/components/notifications/NotificationDropdown.tsx](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/components/notifications/NotificationDropdown.tsx)

**Purpose:** Dropdown list of recent notifications

**Features:**
- Show 5 most recent notifications
- Each item shows icon (based on type), title, message, time ago
- Click notification to mark as read and navigate to related page
- "Mark all as read" button
- "View all" link to full notification page
- Auto-close on outside click

##### [NEW] [frontend/src/components/notifications/NotificationToast.tsx](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/components/notifications/NotificationToast.tsx)

**Purpose:** Pop-up toast for real-time notifications

**Features:**
- Slide in from top-right
- Auto-dismiss after 5 seconds
- Dismiss on click/swipe
- Queue multiple toasts (max 3 visible)
- Different colors based on notification type
- Sound notification (optional, user preference)

---

#### 12. Pages

##### [NEW] [frontend/src/pages/Reports.tsx](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/pages/Reports.tsx)

**Purpose:** Main reports page

**Layout:**
- Page header with title "My Reports"
- Filter/search bar
- `<ReportList>` component
- Responsive: Grid on desktop, list on mobile

##### [NEW] [frontend/src/pages/ReportDetail.tsx](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/pages/ReportDetail.tsx)

**Purpose:** Individual report detail and viewer

**Layout:**
- Report metadata (patient, date, status, radiologist)
- `<ReportViewer>` component
- Action buttons (download, print, share)
- Back button to reports list

##### [NEW] [frontend/src/pages/Notifications.tsx](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/pages/Notifications.tsx)

**Purpose:** Full notification history

**Layout:**
- Page header with "Notifications"
- Filter tabs: All, Unread
- Chronological list (grouped by date)
- Infinite scroll
- Empty state

##### [MODIFY] [frontend/src/App.tsx](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/App.tsx)

**Changes:**
- Add routes: `/reports`, `/reports/:reportId`, `/notifications`
- Integrate `<NotificationBell>` in app header (when authenticated)
- Wrap app in `<NotificationProvider>` context

##### [MODIFY] [frontend/src/pages/Dashboard.tsx](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/pages/Dashboard.tsx)

**Changes:**
- Add "Recent Reports" section showing 3 most recent reports
- Add quick link to "View All Reports"
- Show unread notification count in stats

---

#### 13. Offline Support

##### [MODIFY] [frontend/src/db/index.ts](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/db/index.ts)

**Purpose:** Add IndexedDB stores for reports and notifications

**Changes:**
- Add `reports` store with indexes: `uploadId`, `status`, `created_at`
- Add `notifications` store with indexes: `userId`, `is_read`, `created_at`
- Sync reports to IndexedDB after fetching from API
- Display cached reports when offline
- Queue notification read actions when offline, sync when online

---

## Verification Plan

### Automated Tests

#### Backend Unit Tests

##### [NEW] [backend/tests/test_reports.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/tests/test_reports.py)

**Test coverage:**
- `test_create_report()` - Create report record
- `test_get_report_by_id()` - Retrieve report
- `test_get_reports_by_user()` - List user reports
- `test_update_report_status()` - Update status
- `test_report_status_enum()` - Validate enum values

**Run command:**
```bash
cd backend
pytest tests/test_reports.py -v
```

##### [NEW] [backend/tests/test_notifications.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/tests/test_notifications.py)

**Test coverage:**
- `test_create_notification()` - Create notification
- `test_get_user_notifications()` - List notifications
- `test_mark_notification_read()` - Mark as read
- `test_get_unread_count()` - Count unread
- `test_notification_filtering()` - Filter by type/status

**Run command:**
```bash
cd backend
pytest tests/test_notifications.py -v
```

##### [NEW] [backend/tests/test_report_endpoints.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/tests/test_report_endpoints.py)

**Test coverage:**
- `test_list_reports_authorized()` - GET /reports with auth
- `test_list_reports_unauthorized()` - GET /reports without auth (401)
- `test_get_report_by_id()` - GET /reports/{id}
- `test_download_report_pdf()` - GET /reports/{id}/download
- `test_get_report_by_upload_id()` - GET /reports/upload/{upload_id}

**Run command:**
```bash
cd backend
pytest tests/test_report_endpoints.py -v
```

##### [NEW] [backend/tests/test_notification_endpoints.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/tests/test_notification_endpoints.py)

**Test coverage:**
- `test_list_notifications()` - GET /notifications
- `test_mark_notification_read()` - PATCH /notifications/{id}/read
- `test_mark_all_read()` - PATCH /notifications/read-all
- `test_sse_connection()` - GET /notifications/stream (SSE)

**Run command:**
```bash
cd backend
pytest tests/test_notification_endpoints.py -v
```

##### [MODIFY] [backend/tests/test_upload.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/tests/test_upload.py)

**Add test coverage:**
- `test_upload_complete_creates_report()` - Verify report created after upload
- `test_upload_complete_triggers_notification()` - Verify notification sent

**Run command:**
```bash
cd backend
pytest tests/test_upload.py::test_upload_complete_creates_report -v
pytest tests/test_upload.py::test_upload_complete_triggers_notification -v
```

---

#### Frontend Component Tests

##### [NEW] [frontend/src/components/reports/ReportCard.test.tsx](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/components/reports/ReportCard.test.tsx)

**Test coverage:**
- Render report card with data
- Status badge displays correctly
- Download button triggers API call
- Share button shows Web Share API (if supported)

**Run command:**
```bash
cd frontend
npm test -- ReportCard.test.tsx
```

##### [NEW] [frontend/src/components/notifications/NotificationBell.test.tsx](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/components/notifications/NotificationBell.test.tsx)

**Test coverage:**
- Badge shows unread count
- Dropdown toggles on click
- Notifications marked as read on click

**Run command:**
```bash
cd frontend
npm test -- NotificationBell.test.tsx
```

##### [NEW] [frontend/src/hooks/useNotifications.test.ts](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/hooks/useNotifications.test.ts)

**Test coverage:**
- SSE connection established on mount
- New notification updates state
- Toast displayed on new notification
- Reconnection on disconnect

**Run command:**
```bash
cd frontend
npm test -- useNotifications.test.ts
```

---

#### Integration Tests

##### [NEW] [backend/tests/test_report_pacs_sync.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/tests/test_report_pacs_sync.py)

**Test coverage:**
- Mock PACS QIDO-RS response
- Verify report status updated from PACS
- Verify notification triggered on status change
- Test polling interval and retry logic

**Run command:**
```bash
cd backend
pytest tests/test_report_pacs_sync.py -v
```

##### [NEW] [backend/tests/test_notification_sse.py](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/tests/test_notification_sse.py)

**Test coverage:**
- Connect multiple SSE clients
- Broadcast notification to specific user
- Verify heartbeat messages sent
- Test connection cleanup on disconnect

**Run command:**
```bash
cd backend
pytest tests/test_notification_sse.py -v
```

---

### Manual Verification

#### Test Scenario 1: Upload → Report Ready → Download

**Prerequisites:**
- Backend running: `cd backend && uvicorn app.main:app --port 8003 --reload`
- Frontend running: `cd frontend && npm run dev`
- User logged in

**Steps:**
1. Navigate to Upload page
2. Upload a DICOM study (use `test_data/` samples)
3. Complete upload and verify "Upload Complete" notification appears
4. Navigate to Dashboard → Recent Reports section
5. Verify report appears with status "ASSIGNED" or "PENDING"
6. (Optional) Manually update report status in database to "READY"
   ```bash
   sqlite3 backend/data/reports.db
   UPDATE reports SET status='READY', report_url='test_report.pdf' WHERE id='<report_id>';
   ```
7. Verify notification appears: "Report Ready"
8. Navigate to Reports page → Click report
9. Click "Download" button
10. Verify PDF downloads successfully
11. Click "Print" button → Verify browser print dialog opens
12. (Mobile) Click "Share" button → Verify native share sheet appears

**Expected Result:** All steps complete without errors, notifications appear in real-time

---

#### Test Scenario 2: Real-time Notification via SSE

**Prerequisites:**
- Backend running with SSE endpoint active
- Frontend with SSE connection established

**Steps:**
1. Open browser DevTools → Network tab → Filter "EventSource"
2. Verify SSE connection established to `/notifications/stream`
3. Trigger notification manually using backend script:
   ```python
   # backend/trigger_test_notification.py
   import requests
   response = requests.post(
       "http://localhost:8003/internal/test-notification",
       json={"user_id": "test@example.com", "message": "Test notification"}
   )
   ```
4. Verify notification toast appears in frontend immediately
5. Verify notification bell badge updates
6. Open notification dropdown → Verify new notification appears
7. Click notification → Verify marked as read
8. Verify badge count decrements

**Expected Result:** Notification delivered in <1 second, UI updates correctly

---

#### Test Scenario 3: Offline Report Access

**Prerequisites:**
- Reports previously cached in IndexedDB
- Network disabled (Chrome DevTools → Network → Offline)

**Steps:**
1. Navigate to Reports page while offline
2. Verify cached reports display
3. Click on a cached report
4. Verify report details display (from IndexedDB)
5. Attempt to download PDF → Verify offline message appears
6. Re-enable network
7. Verify app reconnects SSE
8. Verify pending actions (e.g., mark as read) sync to server

**Expected Result:** Graceful offline handling, no crashes, successful sync on reconnect

---

#### Test Scenario 4: Mobile PWA Testing

**Prerequisites:**
- PWA installed on mobile device (Android/iOS)
- Notifications permission granted

**Steps:**
1. Open PWA on mobile
2. Upload a study
3. Lock device and wait for report status change
4. Verify push notification appears on lock screen (if implemented)
5. Open notification → Verify app opens to report page
6. Test Web Share API: Share report to WhatsApp/email
7. Verify responsive layout on different screen sizes

**Expected Result:** Mobile-specific features work correctly

---

## Risk Analysis & Mitigations

### Risk 1: PACS Compatibility
**Issue:** Cloud PACS may not support DICOMweb or report retrieval
**Mitigation:** Implement adapter pattern for multiple PACS types, fallback to manual sync

### Risk 2: SSE Connection Drops
**Issue:** Mobile browsers may close SSE connections to save battery
**Mitigation:** Implement exponential backoff reconnection, fallback to periodic polling

### Risk 3: PDF Generation Performance
**Issue:** Large reports may cause slow PDF generation
**Mitigation:** Implement async background PDF generation with status polling, cache generated PDFs

### Risk 4: Notification Overload
**Issue:** Users may be overwhelmed with notifications
**Mitigation:** Implement notification preferences (mute, frequency), batch notifications

### Risk 5: IndexedDB Quota Exceeded
**Issue:** Storing many reports offline may exceed storage quota
**Mitigation:** Implement LRU cache eviction, limit offline storage to most recent 50 reports

---

## Dependencies

**New Python Packages:**
- `reportlab==4.2.5` - PDF generation
- `sse-starlette==2.2.1` - SSE support for FastAPI

**No new frontend dependencies** (using native browser APIs)

---

## Timeline Estimate

- **Phase 1 (Backend Data Models):** 2 hours
- **Phase 2 (PACS Sync Service):** 4 hours
- **Phase 3 (Report API Endpoints):** 3 hours
- **Phase 4 (Notification System + SSE):** 5 hours
- **Phase 5 (Frontend Components):** 8 hours
- **Phase 6 (Testing):** 6 hours
- **Phase 7 (Integration & Polish):** 4 hours

**Total: ~32 hours** (4 days of focused development)
