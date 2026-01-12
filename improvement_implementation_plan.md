# RelayPACS Feature Improvement Implementation Plan

## Goal: Iterative Refinement of Existing Features

Based on the comprehensive codebase review, this plan outlines **backward-compatible improvements** to the RelayPACS PWA's core features: authentication, study upload, metadata confirmation, and analytics dashboard.

**Guiding Principles**:
- No regressions: all existing functionality must continue to work
- Incremental delivery: improvements can be shipped independently
- Feature flags: risky changes protected by runtime flags
- Data migration: existing sessions/studies remain compatible

---

## User Review Required

> [!IMPORTANT]
> **Prioritization Decision Needed**
>
> This plan contains **6 improvement themes** with varying complexity and risk. Please review and indicate:
> 1. Which themes are **must-have** vs **nice-to-have**?
> 2. Do you prefer **incremental delivery** (1-2 themes at a time) or **comprehensive release** (all themes together)?
> 3. Are there specific **user pain points** not addressed here?

> [!WARNING]
> **Breaking Changes**
>
> The following improvements require careful migration:
> - **Security Hardening**: Moving from TEST_USERS dict to real database will invalidate existing mock accounts
> - **Data Validation**: Adding required fields may block existing incomplete studies in the upload queue
>
> Mitigation strategies are provided in each component section below.

> [!CAUTION]
> **Performance Impact**
>
> Some improvements may temporarily increase bundle size or initial load time:
> - Chart library for trend visualization (~50KB gzipped)
> - WebSocket client for real-time updates (~20KB)
>
> Code splitting and lazy loading strategies are included to minimize impact.

---

## Proposed Changes

### Theme 1: Security Hardening 🔒

> **Priority**: P1 (Critical)
> **Estimated Effort**: 3-4 days
> **Risk Level**: High (requires database migration)

#### [MODIFY] Backend Authentication System

##### [`backend/app/auth/router.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/auth/router.py)

**Changes**:
- Replace `TEST_USERS` dict with database queries
- Add password hashing using `passlib` + `bcrypt`
- Implement password strength validation (min 8 chars, complexity rules)
- Add rate limiting to login endpoint (5 attempts per 15 min)

**Migration Strategy**:
- Create user table with hashed passwords
- Seed database with existing TEST_USERS (re-hashed)
- Add migration script to preserve test accounts

##### [`backend/app/auth/dependencies.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/auth/dependencies.py)

**Changes**:
- Update token validation to check database for user existence
- Add token refresh mechanism (15min access token, 7-day refresh token)
- Implement secure token revocation (logout invalidates token)

##### [`backend/app/auth/utils.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/auth/utils.py)

**Changes**:
- Add `hash_password()` and `verify_password()` functions
- Implement token refresh logic
- Add audit logging for auth events

##### [NEW] [`backend/app/models/user.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/models/user.py)

**Purpose**: User data model with Pydantic validation

**Contents**:
```python
class User(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    hashed_password: str
    full_name: str | None
    role: str  # clinician, radiographer, radiologist, admin
    clinic_id: UUID | None
    is_active: bool = True
    created_at: datetime
```

##### [NEW] [`backend/app/db/`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/db/) (directory)

**Purpose**: Database connection and ORM setup (SQLAlchemy)

**Files**:
- `database.py`: Database connection and session management
- `models.py`: SQLAlchemy ORM models (User, UploadSession, UploadStats)
- `migrations/`: Alembic migration scripts

---

#### [MODIFY] Frontend Token Storage

##### [`frontend/src/hooks/useAuth.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/hooks/useAuth.tsx)

**Changes**:
- Move token from `localStorage` to `sessionStorage` (reduces XSS risk)
- Add token expiration check before API calls
- Implement automatic token refresh
- Add logout functionality that clears all local data

##### [`frontend/src/services/api.ts`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/services/api.ts)

**Changes**:
- Add request interceptor for automatic token refresh
- Add response interceptor for 401 handling (redirect to login)

---

#### [MODIFY] Login UI Enhancements

##### [`frontend/src/pages/Login.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/pages/Login.tsx)

**Changes**:
- Add password strength meter on registration
- Add email format validation
- Add ARIA labels to all interactive elements
- Show "password requirements" tooltip
- Add "Forgot Password?" link placeholder

---

### Theme 2: Enhanced Analytics Dashboard 📊

> **Priority**: P2 (High)
> **Estimated Effort**: 2-3 days
> **Risk Level**: Low (additive changes only)

#### [MODIFY] Dashboard with Trend Visualization

##### [`frontend/src/pages/Dashboard.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/pages/Dashboard.tsx)

**Changes**:
- Add time-series chart showing upload volume over time (using Recharts library)
- Make modality/service level cards clickable (drill-down to study list)
- Add CSV export button (downloads stats as spreadsheet)
- Add custom date range picker (replaces limited preset buttons)
- Implement WebSocket connection for real-time updates (replace 30s polling)

**Dependencies to Add**:
- `recharts`: Lightweight chart library (~50KB)
- `date-fns`: Date manipulation for custom ranges

##### [NEW] [`frontend/src/components/TrendChart.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/components/TrendChart.tsx)

**Purpose**: Reusable time-series chart component

**Props**:
- `data`: Array of {date, count} objects
- `metric`: "uploads" | "modality" | "service_level"
- `period`: Time aggregation (day/week/month)

##### [NEW] [`frontend/src/components/StudyListModal.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/components/StudyListModal.tsx)

**Purpose**: Drill-down modal showing filtered study list

**Triggered by**: Clicking modality or service level card

**Features**:
- Paginated list of studies
- Filter by date range, status
- "View Details" link to navigate to study

---

#### [MODIFY] Backend Stats API

##### [`backend/app/upload/router.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/upload/router.py) - getStats endpoint

**Changes**:
- Add `granularity` query param (day/week/month aggregation)
- Add `group_by` query param (modality/service_level/user/clinic)
- Return time-series data in addition to aggregate totals
- Add caching layer (Redis or in-memory) for frequently accessed stats

##### [NEW] [`backend/app/upload/stats_cache.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/upload/stats_cache.py)

**Purpose**: Caching layer for statistics to reduce DB load

**Strategy**:
- Cache stats for fixed periods (last 1h, 24h, 7d, 30d)
- Invalidate cache on new upload completion
- TTL-based expiration (5 min for recent, 1 hour for historical)

---

#### [NEW] WebSocket Support

##### [`backend/app/websocket/`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/websocket/) (directory)

**Files**:
- `router.py`: WebSocket endpoint for real-time stats
- `manager.py`: Connection manager (handle subscribe/unsubscribe)

##### [`frontend/src/services/websocket.ts`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/services/websocket.ts)

**Purpose**: WebSocket client for real-time dashboard updates

**Events**:
- `stats:update` - New upload completed, stats changed
- `connection:status` - WebSocket connection state

---

### Theme 3: Data Validation & DICOM Parsing ✅

> **Priority**: P2 (High)
> **Estimated Effort**: 2 days
> **Risk Level**: Medium (may block existing incomplete studies)

#### [MODIFY] Metadata Confirmation with Validation

##### [`frontend/src/pages/MetadataConfirmation.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/pages/MetadataConfirmation.tsx)

**Changes**:
- **Required fields**: Age, Gender, Clinical History (show red asterisks)
- **Age format validation**: Regex for "##Y" or date picker (calculate age from DOB)
- **Character limits**: Clinical History (500 chars), Additional Notes (200 chars)
- ** Character counters**: Show remaining characters
- **Submit button disabled** until required fields valid
- **Field help text**: Tooltips explaining what each field expects

**Migration Strategy**:
- Existing studies without these fields shown warning banner "Complete required fields before upload"
- Auto-save continues to work (validation only on Submit)

##### [`frontend/src/pages/UploadStudy.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/pages/UploadStudy.tsx)

**Changes**:
- **Real DICOM parsing**: Extract patient name, birth date, study date from first .dcm file
- **File preview**: Show list of selected files with size/type
- **Large file warning**: Show alert if total size > 500MB
- **DICOM validation**: Check for required tags before allowing upload

##### [NEW] [`frontend/src/services/dicomParser.ts`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/services/dicomParser.ts)

**Purpose**: Client-side DICOM parsing using `dicomParser` library

**Functions**:
- `parseDicomFile(file: File): Promise<DicomMetadata>`
- `validateDicomTags(metadata): ValidationResult`
- `extractThumbnail(file: File): Promise<ImageData>` (future enhancement)

**Dependencies to Add**:
- `dicom-parser`: 20KB DICOM parser

---

#### [MODIFY] Backend DICOM Validation

##### [`backend/app/dicom/service.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/dicom/service.py)

**Changes**:
- Add `validate_dicom_study()` function (checks for required tags)
- Enforce validation on upload completion (reject if missing patient name, etc.)
- Return detailed validation errors to frontend

---

### Theme 4: UX Polish & Accessibility 🎨

> **Priority**: P3 (Medium)
> **Estimated Effort**: 1-2 days
> **Risk Level**: Low (visual/UX only)

#### [MODIFY] Upload Progress Indicators

##### [`frontend/src/pages/UploadProgress.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/pages/UploadProgress.tsx)

**Changes**:
- Add granular progress: "Uploading file 3 of 12... 45% complete"
- Show current upload speed (MB/s) and ETA
- Add pause/resume button (leverages existing resume logic)
- Show thumbnail preview of current file (if DICOM)

##### [`frontend/src/pages/UploadStudy.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/pages/UploadStudy.tsx)

**Changes**:
- Add help tooltips for Modality/Service Level options
  - Example: "Emergency: 2-4 hour turnaround" vs "Stat: <1 hour"
- Add loading skeleton while DICOM parsing
- Persist user's last-selected modality/service level to localStorage

---

#### [MODIFY] Accessibility Improvements

**Global Changes** (all pages):
- Add focus indicators (blue outline) to all interactive elements
- Ensure minimum 4.5:1 color contrast (WCAG AA)
- Add skip-to-content link for keyboard users
- Test with screen reader (NVDA/JAWS)

##### [`frontend/src/components/Layout.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/components/Layout.tsx)

**Changes**:
- Add ARIA landmark roles (`<nav>`, `<main>`, `<aside>`)
- Add descriptive `aria-label` to buttons without text
- Implement keyboard navigation for sidebar

---

### Theme 5: Quality Assurance 🧪

> **Priority**: P2 (High)
> **Estimated Effort**: 2-3 days
> **Risk Level**: Low (testing infrastructure)

#### [NEW] Frontend Test Suite

##### [`frontend/src/pages/__tests__/Login.test.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/pages/__tests__/Login.test.tsx)

**Tests**:
- Login form submission with valid credentials
- Registration form with password strength validation
- Error handling for 401, network failures
- Offline mode banner display

##### [`frontend/src/pages/__tests__/MetadataConfirmation.test.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/pages/__tests__/MetadataConfirmation.test.tsx)

**Tests**:
- Required field validation
- Auto-save debouncing
- Age format validation
- Submit button disabled state

##### [`frontend/src/services/__tests__/uploadManager.test.ts`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/services/__tests__/uploadManager.test.ts)

**Expand existing test**:
- Add test for resume after network failure
- Test concurrent chunk uploads
- Test PHI cleanup after upload

**Testing Framework**:
- `vitest` + `@testing-library/react` (already used in project)
- `msw` for API mocking

---

#### [MODIFY] Backend Test Coverage

##### [`backend/tests/test_auth.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/tests/test_auth.py)

**Expand**:
- Test password hashing on registration
- Test token refresh flow
- Test rate limiting (5 failed logins)

##### [`backend/tests/test_stats.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/tests/test_stats.py)

**Expand**:
- Test time-series aggregation (day/week/month)
- Test caching layer (verify cache hits/misses)
- Test concurrent stats queries

##### [NEW] [`backend/tests/test_dicom_validation.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/tests/test_dicom_validation.py)

**Tests**:
- Validate DICOM file with required tags
- Reject DICOM file missing patient name
- Handle corrupted DICOM file gracefully

---

#### [NEW] Error Boundary

##### [`frontend/src/components/ErrorBoundary.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/components/ErrorBoundary.tsx)

**Purpose**: Catch React errors and display user-friendly fallback

**Features**:
- Show "Something went wrong" message with refresh button
- Log errors to console (or external service in production)
- Wrap entire app in `App.tsx`

---

### Theme 6: Performance Optimization ⚡

> **Priority**: P3 (Medium)
> **Estimated Effort**: 1 day
> **Risk Level**: Low (optimization only)

#### [MODIFY] Code Splitting

##### [`frontend/src/App.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/App.tsx)

**Changes**:
- Lazy load Dashboard page (heavy charts)
- Lazy load MetadataConfirmation page
- Show loading spinner during code split load

**Implementation**:
```tsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MetadataConfirmation = lazy(() => import('./pages/MetadataConfirmation'));
```

---

#### [MODIFY] Image Optimization

##### [`frontend/src/pages/Dashboard.tsx`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/pages/Dashboard.tsx)

**Changes**:
- Replace inline SVG icons with icon font or SVG sprites
- Use `React.memo` to prevent unnecessary re-renders of chart components

---

#### [MODIFY] Parallel Chunk Upload

##### [`frontend/src/services/uploadManager.ts`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/services/uploadManager.ts)

**Changes**:
- Upload 2-4 chunks in parallel (configurable)
- Implement retry logic with exponential backoff
- Add bandwidth throttling option (for mobile networks)

---

## Verification Plan

### Automated Tests

#### Backend Tests

**Command**:
```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
pytest tests/ -v --cov=app --cov-report=term-missing
```

**Expected Coverage**: >80% for modified files

**Tests to Run**:
1. `test_auth.py` - All existing auth tests + new password hashing tests
2. `test_upload.py`, `test_upload_integration.py` - Upload flow regression tests
3. `test_stats.py` - Stats aggregation + caching tests
4. `test_dicom_validation.py` (NEW) - DICOM validation logic
5. `test_hardening.py` - Security validation tests

**Success Criteria**:
- All tests pass
- No regression in upload resumability (`test_resumability.py`)
- No regression in PACS integration (`test_pacs.py`)

---

#### Frontend Tests

**Command**:
```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend
npm run test -- --coverage
```

**Expected Coverage**: >70% for pages/, >80% for services/

**Tests to Run**:
1. `uploadManager.test.ts` (existing) - Upload manager unit tests
2. `Login.test.tsx` (NEW) - Login form validation
3. `MetadataConfirmation.test.tsx` (NEW) - Metadata validation

**Success Criteria**:
- All tests pass
- Upload manager tests validate resume logic
- Metadata tests validate required field enforcement

---

### Manual Verification

#### Test Scenario 1: Authentication Flow

**Prerequisites**: Backend running with database migrations applied

**Steps**:
1. Navigate to `/login`
2. Click "Sign Up" tab
3. Enter username: `testuser-new`, email: `test@example.com`, password: `weak`
4. **Expected**: Password strength error shown (min 8 chars, requires complexity)
5. Enter strong password: `SecurePass123!`
6. **Expected**: Registration succeeds, redirected to dashboard
7. Logout (add logout button if missing)
8. Login with `testuser-new` / `SecurePass123!`
9. **Expected**: Login succeeds, token stored in sessionStorage

**Pass Criteria**:
- Weak passwords rejected
- Strong passwords accepted
- Login works with new account
- Token in sessionStorage (not localStorage)

---

#### Test Scenario 2: Upload with Validation

**Prerequisites**: Logged in, have test DICOM file

**Steps**:
1. Navigate to `/upload`
2. Select Modality: CT, Service Level: Emergency
3. Upload test DICOM file (e.g., `test_data/MOHAMED AHMED (2)/*.dcm`)
4. **Expected**: File preview shown, patient name extracted from DICOM
5. Click "Confirm & Upload"
6. Navigate to `/metadata/{studyId}`
7. **Expected**: Age, Gender, Clinical History marked as required (red asterisk)
8. Leave fields empty, click "Confirm & Upload"
9. **Expected**: Submit button disabled or error shown
10. Fill Age: `45Y`, Gender: M, Clinical History: `Chest pain`
11. **Expected**: Submit button enabled
12. Click "Confirm & Upload"
13. **Expected**: Upload progresses, shows file X of Y, percentage, ETA

**Pass Criteria**:
- DICOM parsing works (patient name extracted)
- Required field validation prevents submission
- Valid submission proceeds to upload
- Progress indicators show granular feedback

---

#### Test Scenario 3: Dashboard Analytics

**Prerequisites**: At least 5-10 completed uploads with varied modalities/service levels

**Steps**:
1. Navigate to `/dashboard`
2. **Expected**: See total studies, success rate, modality breakdown, service level triage
3. Click on a modality bar (e.g., "CT-scan")
4. **Expected**: Modal opens showing list of CT studies
5. Close modal, click "Export CSV" button
6. **Expected**: CSV file downloads with stats data
7. Change time period to "1W"
8. **Expected**: Stats refresh to show last week only
9. Open browser DevTools → Network tab
10. **Expected**: WebSocket connection established (if WebSocket implemented)
11. In another browser tab, complete a new upload
12. **Expected**: Dashboard auto-updates without manual refresh

**Pass Criteria**:
- Drill-down modal works
- CSV export contains correct data
- Time period filtering works
- Real-time updates work (if WebSocket enabled)

---

#### Test Scenario 4: Accessibility Check

**Prerequisites**: Browser with keyboard navigation, screen reader optional

**Steps**:
1. Navigate to `/login` using only keyboard (Tab key)
2. **Expected**: All form fields, buttons reachable with Tab
3. **Expected**: Focus indicators visible (blue outline)
4. Use screen reader (NVDA/JAWS) to read form labels
5. **Expected**: Labels announced correctly
6. Navigate to `/upload`
7. **Expected**: Modality/Service Level dropdowns have ARIA labels
8. **Expected**: Help tooltips readable with screen reader

**Pass Criteria**:
- Full keyboard navigation
- Visible focus indicators
- Screen reader can read all content

---

### Regression Testing

**Critical Regression Tests** (must pass before shipping):

1. **Offline Upload**: Disconnect network, select files, confirm metadata **→** Study saved to IndexedDB
2. **Resume Upload**: Start upload, kill browser mid-upload, reopen **→** Upload resumes from last chunk
3. **PACS Integration**: Complete upload **→** Study successfully sent to PACS (dcm4che/Orthanc)
4. **S3 Storage**: Complete upload **→** Files stored in MinIO S3 bucket
5. **Chunk Idempotency**: Re-upload same chunk **→** Backend returns 204 No Content (no duplicate)

**Commands**:
```bash
# Backend regression suite
pytest tests/test_upload_integration.py tests/test_resumability.py tests/test_pacs.py -v

# Frontend regression test (if exists)
npm run test -- uploadManager.test.ts
```

---

## Migration & Rollout Strategy

### Database Migration

**Phase 1** (Week 1): Setup infrastructure
1. Add SQLAlchemy + Alembic to `requirements.txt`
2. Create initial migration: User table
3. Seed database with TEST_USERS (hashed passwords)
4. Deploy to staging, validate

**Phase 2** (Week 2): Feature flag rollout
5. Add `USE_DATABASE_AUTH` feature flag (default: False)
6. Deploy with flag OFF, monitor stability
7. Enable flag for 10% of users, monitor errors
8. Gradually increase to 100%

### Backward Compatibility

**Existing Sessions**:
- Uploads in progress continue to use existing token-based auth
- New uploads use new validation rules
- Migration script checks for incomplete studies, shows admin warning

**API Versioning**:
- Keep `/upload/init` API backward compatible
- Add `/v2/upload/init` for enhanced validation (optional until migration complete)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Database migration breaks existing auth | Medium | High | Feature flag, canary deployment |
| Required fields block existing studies | Medium | Medium | Admin tool to bulk-complete metadata |
| Chart library increases bundle size | High | Low | Code splitting, lazy load |
| WebSocket connection unstable | Medium | Low | Fallback to 30s polling |
| DICOM parsing fails on edge cases | Medium | Medium | Graceful fallback to manual entry |

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Security Hardening (Theme 1) | 3-4 days | None |
| Data Validation (Theme 3) | 2 days | Theme 1 (database) |
| Enhanced Analytics (Theme 2) | 2-3 days | None (parallel) |
| UX Polish (Theme 4) | 1-2 days | Theme 3 (validation UI) |
| Quality Assurance (Theme 5) | 2-3 days | All themes (tests for each) |
| Performance (Theme 6) | 1 day | None (parallel) |

**Total**: 11-15 days (if sequential), 8-10 days (if parallelized)

**Recommended Approach**:
- **Sprint 1** (1 week): Themes 1 + 3 (Security + Validation) – Foundational
- **Sprint 2** (1 week): Themes 2 + 4 (Analytics + UX) – User-facing
- **Sprint 3** (3-4 days): Themes 5 + 6 (QA + Performance) – Hardening

---

*Implementation plan ready for user review. Please provide feedback on priorities, scope, and timeline.*
