---
description: Implement Report Handling & Notification Features for Teleradiology PWA
---

# Feature Development: Report Handling & Notification System

## Overview

This workflow implements two major features for the RelayPACS teleradiology PWA:

**Feature A: Report Handling** - Sync with cloud PACS to view, download, print, and share radiology reports
**Feature B: Notification System** - Real-time status updates for uploads and report lifecycle events

**Prerequisites:**
- Backend running on port 8003
- Frontend running on port 3002
- Cloud PACS server (dcm4chee) accessible
- User authentication working

**Total Estimated Time:** 32 hours (4 days)

---

## Phase 1: Backend Data Models & Database (3 hours)

### 1. Install new Python dependencies

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
echo "reportlab==4.2.5" >> requirements.txt
echo "sse-starlette==2.2.1" >> requirements.txt
pip install reportlab==4.2.5 sse-starlette==2.2.1
```

### 2. Create report data models

Create `backend/app/models/report.py` with:
- `ReportStatus` enum (ASSIGNED, PENDING, READY, ADDITIONAL_DATA_REQUIRED)
- `Report` Pydantic model
- `NotificationType` enum
- `Notification` Pydantic model

### 3. Create reports database service

Create `backend/app/database/reports_db.py` with:
- SQLite database initialization
- CRUD methods for reports and notifications
- Schema creation on startup

### 4. Update config

Edit `backend/app/config.py`:
- Add `REPORTS_DB_PATH = "data/reports.db"`
- Add `PACS_POLL_INTERVAL_SECONDS = 60`

// turbo
### 5. Run database initialization test

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
python -c "from app.database.reports_db import ReportsDatabase; db = ReportsDatabase(); print('Database initialized successfully')"
```

---

## Phase 2: PACS Sync & Report Services (5 hours)

### 6. Extend PACS service

Edit `backend/app/pacs/service.py`:
- Add `query_study_reports()` method using QIDO-RS
- Add `retrieve_report_pdf()` method using WADO-RS

### 7. Create PACS sync background task

Create `backend/app/pacs/report_sync.py`:
- Async background task for polling PACS
- Query reports with status ASSIGNED/PENDING
- Update database on status changes
- Handle connection failures with exponential backoff

### 8. Create PDF generation service

Create `backend/app/reports/pdf_service.py`:
- `PDFGenerator` class using `reportlab`
- Template for radiology reports
- Support for DICOM SR parsing

// turbo
### 9. Test PDF generation

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
python -c "from app.reports.pdf_service import PDFGenerator; gen = PDFGenerator(); print('PDF service initialized')"
```

---

## Phase 3: Notification Infrastructure (4 hours)

### 10. Create notification service

Create `backend/app/notifications/service.py`:
- `NotificationService` class
- SSE connection management (user_id → asyncio.Queue mapping)
- `create_and_broadcast()` method
- `subscribe_sse()` method for SSE endpoint
- Heartbeat implementation (30s interval)

### 11. Trigger notifications on upload events

Edit `backend/app/upload/router.py` in `complete_upload()`:
- Create report record after PACS forwarding
- Trigger `UPLOAD_COMPLETE` notification
- Trigger `UPLOAD_FAILED` notification on errors

---

## Phase 4: Backend API Endpoints (3 hours)

### 12. Create report API router

Create `backend/app/reports/router.py` with endpoints:
- `GET /reports` - List reports with filtering
- `GET /reports/{report_id}` - Get specific report
- `GET /reports/upload/{upload_id}` - Get report by upload ID
- `GET /reports/{report_id}/download` - Download PDF
- `POST /reports/{report_id}/sync` - Manual PACS sync

### 13. Create notification API router

Create `backend/app/notifications/router.py` with endpoints:
- `GET /notifications` - List notifications
- `GET /notifications/stream` - SSE endpoint
- `PATCH /notifications/{id}/read` - Mark as read
- `PATCH /notifications/read-all` - Mark all as read

### 14. Update main app

Edit `backend/app/main.py`:
- Include reports router at `/reports`
- Include notifications router at `/notifications`
- Add startup event for report database initialization
- Add startup event to launch PACS sync background task
- Add shutdown event for SSE cleanup

// turbo
### 15. Start backend with new endpoints

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload &
sleep 5
curl http://localhost:8003/reports
```

---

## Phase 5: Frontend API Client (2 hours)

### 16. Update API types and client

Edit `frontend/src/services/api.ts`:
- Add TypeScript interfaces: `Report`, `Notification`, `NotificationType`, `ReportStatus`
- Add `reportApi` object with methods
- Add `notificationApi` object with methods
- Add `connectSSE()` method for EventSource connection

---

## Phase 6: Frontend Notification System (4 hours)

### 17. Create notification hook

Create `frontend/src/hooks/useNotifications.ts`:
- State management for notifications and unread count
- SSE connection lifecycle (connect, reconnect, cleanup)
- Toast display on new notifications
- Expose methods: `markAsRead()`, `markAllAsRead()`, `refresh()`

### 18. Create notification components

Create components:
- `frontend/src/components/notifications/NotificationBell.tsx` - Header icon with badge
- `frontend/src/components/notifications/NotificationDropdown.tsx` - Recent notifications dropdown
- `frontend/src/components/notifications/NotificationToast.tsx` - Real-time toast pop-ups

### 19. Create notifications page

Create `frontend/src/pages/Notifications.tsx`:
- Full notification history
- Filter tabs (All, Unread)
- Chronological list with infinite scroll

---

## Phase 7: Frontend Report Components (5 hours)

### 20. Create report components

Create components:
- `frontend/src/components/reports/ReportCard.tsx` - Individual report with actions
- `frontend/src/components/reports/ReportList.tsx` - List with filtering
- `frontend/src/components/reports/ReportViewer.tsx` - PDF viewer with iframe

### 21. Create report pages

Create pages:
- `frontend/src/pages/Reports.tsx` - Main reports page
- `frontend/src/pages/ReportDetail.tsx` - Report detail and viewer

### 22. Integrate into app

Edit `frontend/src/App.tsx`:
- Add routes: `/reports`, `/reports/:reportId`, `/notifications`
- Add `<NotificationBell>` to header
- Wrap app in notification context/provider

### 23. Update dashboard

Edit `frontend/src/pages/Dashboard.tsx`:
- Add "Recent Reports" section
- Add link to "View All Reports"
- Show unread notification count

---

## Phase 8: Offline Support (2 hours)

### 24. Add IndexedDB stores

Edit `frontend/src/db/index.ts`:
- Add `reports` store with indexes
- Add `notifications` store with indexes
- Implement sync logic: cache on fetch, display when offline
- Queue offline actions for sync

// turbo-all

---

## Phase 9: Backend Testing (3 hours)

### 25. Create report unit tests

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
pytest tests/test_reports.py -v
```

### 26. Create notification unit tests

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
pytest tests/test_notifications.py -v
```

### 27. Create report endpoint tests

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
pytest tests/test_report_endpoints.py -v
```

### 28. Create notification endpoint tests

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
pytest tests/test_notification_endpoints.py -v
```

### 29. Update upload integration tests

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
pytest tests/test_upload.py -v
```

### 30. Test PACS sync integration

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
pytest tests/test_report_pacs_sync.py -v
```

### 31. Test SSE connections

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
pytest tests/test_notification_sse.py -v
```

---

## Phase 10: Frontend Testing (3 hours)

### 32. Run component tests

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend
npm test -- ReportCard.test.tsx
npm test -- NotificationBell.test.tsx
npm test -- useNotifications.test.ts
```

### 33. Run all frontend tests

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend
npm test
```

---

## Phase 11: Manual Verification & E2E Testing (4 hours)

### 34. Test Scenario 1: Upload → Report → Download

1. Start services:
   ```bash
   cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
   uvicorn app.main:app --port 8003 --reload
   ```

   In new terminal:
   ```bash
   cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend
   npm run dev -- --host 0.0.0.0
   ```

2. Manual steps:
   - Login to app at http://localhost:3002
   - Upload DICOM study
   - Verify "Upload Complete" notification
   - Check Dashboard → Recent Reports
   - Navigate to Reports page
   - Click report → Download PDF
   - Test Print functionality
   - Test Share functionality (mobile)

### 35. Test Scenario 2: Real-time Notifications

1. Open DevTools → Network tab → Filter "EventSource"
2. Verify SSE connection to `/notifications/stream`
3. Trigger test notification (manual backend script)
4. Verify toast appears immediately
5. Verify bell badge updates
6. Test mark as read functionality

### 36. Test Scenario 3: Offline Support

1. Load Reports page
2. Enable DevTools → Network → Offline
3. Verify cached reports display
4. Test report detail view offline
5. Re-enable network
6. Verify SSE reconnects
7. Verify pending actions sync

### 37. Test Scenario 4: Mobile PWA

1. Open PWA on mobile device
2. Test responsive layouts
3. Test Web Share API
4. Test notification permissions
5. Test offline functionality

---

## Phase 12: Documentation & Deployment (2 hours)

### 38. Update API documentation

Edit `backend/README.md` or API docs to include:
- New report endpoints
- New notification endpoints
- SSE connection details

### 39. Update user documentation

Edit `README.md`:
- Add Report Handling feature description
- Add Notification System feature description
- Update feature list

### 40. Create deployment checklist

- [ ] Environment variables configured (PACS URLs, polling interval)
- [ ] Database migrations applied
- [ ] Frontend environment variables updated
- [ ] HTTPS enabled for Web Share API
- [ ] Notification permissions requested
- [ ] IndexedDB quota checked

---

## Verification Checklist

- [ ] All backend tests passing (20+ tests)
- [ ] All frontend tests passing
- [ ] Upload creates report record
- [ ] Upload triggers notification
- [ ] SSE connection established on login
- [ ] Real-time notifications delivered in <1s
- [ ] Reports display in list
- [ ] PDF download works
- [ ] Print functionality works
- [ ] Share API works on mobile
- [ ] Offline reports display from cache
- [ ] SSE reconnects after disconnect
- [ ] Notification badge updates correctly
- [ ] Mark as read functionality works
- [ ] Mobile responsive design verified
- [ ] No regressions in existing upload flow

---

## Rollback Plan

If issues arise:

1. **Database issues:**
   ```bash
   rm backend/data/reports.db
   # Restart backend to recreate schema
   ```

2. **SSE connection issues:**
   - Check CORS settings in `backend/app/main.py`
   - Verify EventSource polyfill for older browsers

3. **PACS sync issues:**
   - Disable background sync: Set `PACS_POLL_INTERVAL_SECONDS = 0`
   - Use manual sync endpoint instead

4. **Complete rollback:**
   ```bash
   git checkout main
   git reset --hard HEAD
   ```

---

## Success Criteria

✅ Users can view reports synced from PACS
✅ Users can download reports as PDF
✅ Users can print and share reports
✅ Users receive real-time notifications for status changes
✅ Notifications work offline and sync when online
✅ No performance regression in upload flow
✅ Mobile PWA functionality preserved
✅ All tests passing

---

## Notes

- Estimated timeline: 32 hours over 4 days
- Requires cloud PACS server configuration
- SSE preferred over WebSockets for PWA compatibility
- Web Share API requires HTTPS in production
- IndexedDB quota: Monitor and implement LRU eviction if needed
