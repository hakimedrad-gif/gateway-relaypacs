# RelayPACS - Detailed Frontend Features & User Flow

## Document Information
- **Product**: RelayPACS Gateway Frontend
- **Technology**: React 19 + Vite PWA
- **Version**: 1.0
- **Last Updated**: 2026-01-14

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Screen-by-Screen Breakdown](#screen-by-screen-breakdown)
3. [User Journeys](#user-journeys)
4. [State Management](#state-management)
5. [Error Handling](#error-handling)
6. [Offline Behavior](#offline-behavior)
7. [PWA Features](#pwa-features)

---

## 1. Architecture Overview

### Technology Stack
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7.x
- **Routing**: React Router 7
- **Styling**: Tailwind CSS 3.x
- **Local Storage**: Dexie (IndexedDB wrapper)
- **HTTP Client**: Axios with interceptors
- **Charts**: Recharts
- **PWA**: Vite PWA Plugin + Workbox

### Application Structure
```
src/
├── pages/              # Route components (8 pages)
├── components/         # Reusable UI components
├── hooks/              # Custom React hooks
├── services/           # API and business logic
├── db/                 # IndexedDB schema (Dexie)
└── main.tsx            # App entry point with routing
```

### Route Structure
| Path | Component | Auth Required | Description |
|------|-----------|--------------|-------------|
| `/login` | Login | No | Authentication screen |
| `/` | UploadStudy | Yes | Main upload interface |
| `/upload-new` | SmartUploadWizard | Yes | Folder batch upload |
| `/metadata/:studyId` | MetadataConfirmation | Yes | Review before upload |
| `/progress/:uploadId` | UploadProgress | Yes | Real-time upload tracking |
| `/complete/:uploadId` | Completion | Yes | Success confirmation |
| `/dashboard` | Dashboard | Yes | Analytics overview |
| `/reports` | Reports | Yes | Report listing |
| `/notifications` | Notifications | Yes | Notification center |
| `/settings` | Settings | Yes | User preferences |

---

## 2. Screen-by-Screen Breakdown

### 2.1 Login Screen (`/login`)

**Purpose**: Authenticate users with JWT tokens and optional 2FA

**UI Components**:
- Username input field (pattern validation: alphanumeric, dash, underscore)
- Password input field with "Show/Hide" toggle
- TOTP code input (6 digits, shown only if 2FA enabled for user)
- "Log In" submit button
- Link to registration (if supported)

**User Interactions**:
1. User enters username + password
2. Clicks "Log In" → API call to `POST /auth/login`
3. If 2FA enabled for user:
   - TOTP input field appears
   - User enters 6-digit code
   - Re-submits login with TOTP code
4. On success:
   - Access token stored in memory
   - Refresh token stored in IndexedDB (encrypted)
   - Navigate to `/` (main upload screen)

**Validation**:
- Username: Required, 3-50 chars
- Password: Required, min 12 chars
- TOTP: Required if enabled, exactly 6 digits

**Error Scenarios**:
- Invalid credentials → "Invalid username or password"
- Incorrect TOTP → "Invalid authentication code"
- Account locked → "Too many failed attempts, try again in 15 minutes"
- Network error → "Connection failed. Check your network."

**State Transitions**:
```
[Unauthenticated] → Enter credentials → [Validating]
    → Success → [Authenticated] → Navigate to /
    → 2FA Required → [Awaiting TOTP] → Re-submit → [Authenticated]
    → Failure → [Unauthenticated] (show error)
```

---

### 2.2 Upload Study Screen (`/`)

**Purpose**: Primary entry point for single-file or single-study uploads

**UI Components**:
- **File Selection Area**:
  - Drag-and-drop zone (accepts `.dcm`, `.dicom` files)
  - "Browse Files" button (native file picker)
  - Selected files list with remove option
- **Study Metadata Form**:
  - Patient Name (text input)
  - Study Date (date picker)
  - Modality (dropdown: CT, MRI, X-Ray, Ultrasound, PET, Other)
  - Age (optional, text input)
  - Gender (optional, dropdown: Male, Female, Other)
  - Service Level (dropdown: Routine, Emergency, STAT, Subspecialty)
  - Study Description (optional, textarea)
  - Clinical History (optional, textarea, max 500 chars)
- **Action Buttons**:
  - "Continue" (navigates to metadata confirmation)
  - "Clear All" (resets form and files)

**User Interactions**:
1. User drags DICOM files OR clicks "Browse Files"
2. Files added to selection (shown in list with file names and sizes)
3. If DICOM metadata extractable:
   - Auto-populate patient name, study date, modality from first file
   - User can override values
4. User fills remaining metadata fields
5. Clicks "Continue" → Files saved to IndexedDB
6. Navigate to `/metadata/:studyId` for confirmation

**Validation**:
- At least 1 file selected
- Patient name: Required
- Study date: Required, valid date format
- Modality: Required selection
- Service level: Required selection
- Total size: Must not exceed 2GB (configurable)

**Error Scenarios**:
- No files selected → "Please select at least one DICOM file"
- File too large → "File exceeds maximum size limit (2GB)"
- Invalid DICOM → "File does not appear to be valid DICOM format"
- Missing required fields → Highlight fields in red, show validation messages

**State Management**:
- Files stored in IndexedDB `studies` table with status="pending"
- Auto-save form data to IndexedDB every 2 seconds (draft recovery)
- Network status indicator shows online/offline state

---

### 2.3 Smart Upload Wizard (`/upload-new`)

**Purpose**: Batch folder upload with automatic file discovery

**UI Components**:
- **Step 1: Folder Selection**
  - "Select Folder" button (directory picker API)
  - Folder path display
  - File count preview
- **Step 2: File Discovery**
  - Scanning progress bar
  - Discovered DICOM files list
  - Total size calculation
  - Exclude/include individual files checkboxes
- **Step 3: Metadata Entry**
  - Group metadata form (same fields as single upload)
  - Batch apply to all files option
- **Step 4: Review & Confirm**
  - Summary of files, metadata, size
  - "Start Upload" button

**User Journey**:
1. User clicks "Select Folder"
2. System scans folder recursively for `.dcm` files
3. Displays discovered files in list (grouped by subfolder)
4. User optionally excludes unwanted files
5. User enters metadata (applied to all files in batch)
6. User confirms → Upload initiates
7. Navigate to `/progress/:uploadId`

**Advanced Features**:
- Metadata extraction from first DICOM file in folder
- Preview thumbnails for DICOM images (if extract available)
- Folder structure preserved in file IDs

**Progress Tracking**:
- Step indicator: 1 of 4, 2 of 4, etc.
- "Back" and "Next" buttons for navigation
- Current step highlighted in breadcrumb

---

### 2.4 Metadata Confirmation Screen (`/metadata/:studyId`)

**Purpose**: Review and confirm metadata before upload initiation

**UI Components**:
- **Study Summary Card**:
  - Patient name, study date, modality
  - File count and total size
  - Service level indicator (color-coded: STAT=red, Emergency=orange, Routine=blue)
- **File List Table**:
  - Columns: Filename, Size, Status
  - Preview icon (opens DICOM preview modal if supported)
- **Metadata Review Form**:
  - Editable fields (same as upload screen)
  - "Edit Metadata" button to unlock fields
- **Action Buttons**:
  - "Start Upload" (primary CTA)
  - "Cancel" (returns to upload screen, preserves draft in IndexedDB)

**User Interactions**:
1. User reviews auto-populated metadata
2. If corrections needed:
   - Click "Edit Metadata"
   - Update fields
   - Changes auto-save to IndexedDB
3. Click "Start Upload" → API call to `POST /upload/init`
4. On success:
   - Receive upload ID and token
   - Navigate to `/progress/:uploadId`

**Validation**:
- Final check: All required fields present
- Duplicate detection:
  - If backend returns 409 Conflict:
    - Show warning modal: "Similar study uploaded on [date]. Continue?"
    - Options: "Override & Upload" or "Cancel"

**Guard Route**:
- If `studyId` not found in IndexedDB → Redirect to `/`
- Prevents direct URL access without valid study

---

### 2.5 Upload Progress Screen (`/progress/:uploadId`)

**Purpose**: Real-time upload tracking with pause/resume controls

**UI Components**:
- **Progress Overview Card**:
  - Circular progress indicator (0-100%)
  - Uploaded / Total size (e.g., "450 MB / 1.2 GB")
  - Estimated time remaining
  - Upload speed (MB/s)
- **File-Level Progress**:
  - List of files with individual progress bars
  - Status icons:
    - ⏳ Queued (gray)
    - 📤 Uploading (blue, animated)
    - ✅ Complete (green)
    - ❌ Failed (red)
- **Controls**:
  - "Pause Upload" button (pauses chunk uploads)
  - "Resume Upload" button (restarts from last chunk)
  - "Cancel Upload" button (confirmation modal)
- **Activity Log** (collapsible):
  - Recent events: "Chunk 45/120 uploaded", "File 2 of 5 complete", etc.
  - Timestamp for each event

**Real-Time Updates**:
- Progress polling: GET `/upload/:uploadId/status` every 2 seconds
- Updates progress bar, file statuses, uploaded bytes
- Calculates upload speed from delta

**State Transitions**:
```
[Initializing] → API init success → [Uploading]
    → Chunk upload loop → Update progress
    → All chunks uploaded → [Processing]
    → Backend merge + PACS forward → [Complete]
    → Navigate to /complete/:uploadId
```

**Pause/Resume Logic**:
- Pause: Stop chunk upload loop, preserve session
- Resume: Query status for missing chunks, continue upload
- Session valid for 24 hours

**Error Handling**:
- Network disconnect: Auto-pause, show "Offline" banner, auto-resume when online
- Chunk upload failure: Retry 3 times with exponential backoff
- Server error (500): Pause upload, show error message, allow manual retry
- Session expired: Show "Session expired, please re-upload" modal

**Guard Route**:
- If `uploadId` not found in IndexedDB or API → Redirect to `/`

---

### 2.6 Completion Screen (`/complete/:uploadId`)

**Purpose**: Confirm successful upload and provide next actions

**UI Components**:
- **Success Icon**: Large green checkmark
- **Success Message**: "Upload Complete & Verified"
- **Summary**:
  - Patient name
  - Files uploaded count
  - Total size
  - Time taken
- **PACS Status**:
  - "✅ Successfully forwarded to PACS"
  - If partial success: "⚠️ Some files could not be forwarded"
- **Next Actions**:
  - "Upload Another Study" button (navigate to `/`)
  - "View Reports" button (navigate to `/reports`)
  - "Go to Dashboard" button (navigate to `/dashboard`)

**Data Cleanup**:
- Remove upload session from IndexedDB
- Mark study as "complete" in local DB
- Trigger background cleanup of temporary chunks

---

### 2.7 Dashboard Screen (`/dashboard`)

**Purpose**: Analytics overview for upload activity

**UI Components**:
- **Time Filter Tabs**:
  - 1W, 2W, 1M, 3M, 6M, ALL
  - Currently selected tab highlighted
- **Statistics Cards** (4 cards in grid):
  1. Total Uploads (count)
  2. Total Volume (GB)
  3. Success Rate (percentage)
  4. Average Upload Time (minutes)
- **Modality Distribution Chart**:
  - Pie chart showing CT, MRI, X-Ray, etc. percentages
  - Legend with color coding
- **Service Level Breakdown Chart**:
  - Bar chart: STAT, Emergency, Routine counts
- **Upload Trend Chart**:
  - Line chart: Daily upload volume over selected period
  - X-axis: Dates, Y-axis: Upload count

**User Interactions**:
1. User selects time period (default: 1M)
2. API call: `GET /upload/stats?period=1m`
3. Update all charts and cards with response data
4. Loading skeletons shown during API call

**Data Refresh**:
- Auto-refresh every 60 seconds (if page active)
- Manual refresh button (top-right corner)

**Export Feature**:
- "Export CSV" button
- Downloads: `GET /upload/stats/export?period=1m`
- Saves as `relaypacs_stats_1m.csv`

---

### 2.8 Reports Screen (`/reports`)

**Purpose**: List and manage radiology reports

**UI Components**:
- **Status Filter Tabs**:
  - All, Assigned, Pending, Ready, Additional Data Required
  - Unread count badges on tabs
- **Reports List** (table or card layout):
  - Columns:
    - Patient Name
    - Study Date
    - Modality
    - Status (color-coded badge)
    - Radiologist Name (if assigned)
    - Updated Date
  - Actions per row:
    - "View Details" (expand inline)
    - "Download PDF" (only if status=Ready)
- **Empty State**:
  - "No reports found" message
  - "Upload a study to get started" button

**User Interactions**:
1. User clicks status filter tab
2. API call: `GET /reports?status=ready&limit=50&offset=0`
3. Display filtered reports
4. User clicks "Download PDF":
   - API call: `GET /reports/:id/download`
   - Browser downloads PDF

**Real-Time Updates**:
- Server-Sent Events (SSE) connection for report status changes
- When notification received → Refetch reports list
- Badge update on status tabs

**Pagination**:
- Load 50 reports per page
- "Load More" button at bottom
- Infinite scroll (optional enhancement)

---

### 2.9 Notifications Screen (`/notifications`)

**Purpose**: Centralized notification center

**UI Components**:
- **Notification List**:
  - Each notification card:
    - Icon (color-coded by type)
    - Title
    - Message
    - Timestamp (relative: "2 hours ago")
    - Unread indicator (blue dot)
  - Click to mark as read
  - Swipe to dismiss (mobile)
- **Filter Options**:
  - All, Unread Only
- **Bulk Actions**:
  - "Mark All as Read" button
  - "Clear All" button (confirmation modal)

**Notification Types**:
1. **Upload Complete** (green): "Study 'CT Head' uploaded successfully"
2. **Upload Failed** (red): "Upload for 'MRI Spine' failed"
3. **Report Assigned** (blue): "Radiologist Dr. Smith assigned"
4. **Report Ready** (green): "Report for 'X-Ray Chest' is ready"
5. **Additional Data Required** (yellow): "More info needed for 'CT Abdomen'"

**Real-Time Delivery**:
- SSE connection to `/notifications/stream`
- New notifications appear at top of list
- Browser/system notification (if permission granted)
- App badge count updates

**User Interactions**:
1. User views notification list
2. Clicks notification → Mark as read
3. If notification has related entity:
   - Upload ID → Navigate to `/progress/:uploadId`
   - Report ID → Navigate to `/reports` (filtered to that report)

---

### 2.10 Settings Screen (`/settings`)

**Purpose**: User preferences and account management

**UI Sections**:

**1. Profile Information**:
- Username (read-only)
- Email (editable)
- Full Name (editable)
- Role (read-only)
- "Save Changes" button

**2. Security**:
- "Change Password" (opens modal)
- 2FA Toggle:
  - If disabled: "Enable 2FA" button → Shows QR code modal
  - If enabled: "Disable 2FA" button → Requires TOTP confirmation
- Active Sessions:
  - List of devices/browsers
  - "Revoke" button for each

**3. Upload Preferences**:
- Default Service Level (dropdown)
- Chunk Size (advanced, dropdown: 1MB, 2MB, 5MB, 10MB)
- Duplicate Detection (toggle, default ON)

**4. PWA Settings**:
- **Install App** button (if not installed):
  - Triggers browser install prompt
  - Shows success message on install
- **App Version**: Display version number
- **Storage Usage**: Shows IndexedDB size used
- **Clear Local Data** button (confirmation modal)

**5. Notifications**:
- Push Notifications toggle
- Browser permission status indicator
- Email Notifications toggle (future)

**User Interactions**:
- Edit profile → Auto-save on blur
- Change password:
  - Modal with: Current Password, New Password, Confirm New Password
  - Validation: New password meets strength requirements
  - API: `POST /auth/change-password`
- Enable 2FA:
  - Modal shows QR code
  - User scans with authenticator app (Google Authenticator, Authy)
  - Enter TOTP code to confirm
  - API: `POST /api/v1/totp/enable`

---

## 3. User Journeys

### Journey 1: Emergency Upload (Mobile)

**Scenario**: Dr. Sarah uploads stat CT scan from ED on her iPhone

**Steps**:
1. Open RelayPACS PWA from home screen (installed app)
2. Already authenticated (refresh token valid)
3. Navigate to `/` (Upload Study)
4. Tap "Browse Files" → Select CT DICOM files from Files app
5. Metadata auto-populated from DICOM tags
6. Override service level to "STAT"
7. Add clinical history: "Suspected stroke, onset 45 min ago"
8. Tap "Continue"
9. Review metadata on confirmation screen
10. Tap "Start Upload"
11. Upload progress screen shows real-time progress
12. Network briefly drops (hospital Wi-Fi handoff)
    - Upload auto-pauses
    - "Offline" banner appears
    - Connection restored, upload auto-resumes
13. Upload completes in 8 minutes
14. Success screen shows "Forwarded to PACS"
15. Notification received: "Report assigned to Dr. Patel"
16. Dr. Sarah returns to patient care

**Key Features Used**:
- Mobile PWA
- Offline resilience
- Auto-resume
- STAT prioritization
- Real-time notifications

---

### Journey 2: Batch Upload (Desktop)

**Scenario**: Mike uploads 30 MRI studies from radiology workstation

**Steps**:
1. Open RelayPACS in Chrome browser (desktop)
2. Log in with username/password + TOTP
3. Navigate to `/upload-new` (Smart Upload Wizard)
4. Click "Select Folder"
5. Choose folder: `C:\DICOM\MRI_Studies_2026-01-14\`
6. System scans folder, finds 30 subdirectories (one per patient)
7. Discovers 1,200 DICOM files, total size 18 GB
8. Mike reviews list, unchecks 2 incomplete studies
9. Enters batch metadata:
   - Modality: MRI
   - Service Level: Routine
10. Clicks "Start Upload"
11. Upload progress shows:
    - 28 studies uploading in parallel
    - Overall progress: 15% (2.7 GB / 18 GB)
    - Individual file status for each study
12. Mike minimizes browser, continues other work
13. 45 minutes later, notification: "All uploads complete"
14. Mike checks Dashboard:
    - Today's uploads: 28 studies
    - Success rate: 100%
    - Total volume: 18 GB
15. Exports CSV for QA records

**Key Features Used**:
- Folder batch upload
- Large file handling
- Background upload
- Dashboard analytics
- CSV export

---

### Journey 3: Report Retrieval (Mobile + Desktop)

**Scenario**: Dr. Sarah checks for completed report from earlier upload

**Steps**:
1. Receives push notification on iPhone: "Report ready for CT Head - John Doe"
2. Taps notification → Opens RelayPACS app
3. Navigates to Reports screen
4. Sees "Ready" badge next to study
5. Taps to expand report details:
   - Radiologist: Dr. Rajesh Patel
   - Findings: "No acute intracranial hemorrhage..."
6. Taps "Download PDF"
7. PDF downloads to Files app
8. Opens PDF in Preview app
9. Reviews report, makes clinical decision
10. Returns to ED to treat patient

**Key Features Used**:
- Push notifications
- Report listing
- PDF download
- Mobile workflow

---

## 4. State Management

### 4.1 Global State (React Context + Hooks)

**Authentication State** (`useAuth` hook):
```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  login: (username, password, totp?) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}
```

**Network State** (`useNetworkStatus` hook):
```typescript
interface NetworkState {
  isOnline: boolean;
  effectiveType: '2g' | '3g' | '4g' | 'unknown';
  downlink: number; // Mbps
}
```

### 4.2 Local Persistence (IndexedDB via Dexie)

**Schema**:
```typescript
db.version(1).stores({
  studies: '++id, uploadId, status, createdAt',
  chunks: '++id, uploadId, fileId, chunkIndex',
  settings: 'key, value',
  authTokens: 'type, token, expiresAt'
});
```

**Data Flow**:
1. User actions → Update React state
2. React state → Persist to IndexedDB (debounced)
3. Page reload → Restore from IndexedDB
4. Background sync → Synchronize with backend

---

## 5. Error Handling

### 5.1 Error Categories

**1. Network Errors**:
- Display: "Connection lost. Upload paused. Will resume automatically."
- Action: Auto-retry with exponential backoff
- UI: Orange banner with retry countdown

**2. Validation Errors**:
- Display: Inline field errors (red text below input)
- Action: Prevent form submission
- UI: Highlight invalid fields in red

**3. API Errors (4xx)**:
- 401 Unauthorized: Redirect to `/login`, show "Session expired"
- 403 Forbidden: Show "Access denied" modal
- 409 Conflict (duplicate): Show override confirmation modal
- 429 Rate Limit: Show "Too many requests, try again in X seconds"

**4. Server Errors (5xx)**:
- Display: "Server error occurred. Please try again."
- Action: Show retry button
- UI: Red banner with "Retry" CTA

**5. DICOM Processing Errors**:
- Invalid DICOM: "File is not valid DICOM format"
- Corrupted file: "File corrupted, please re-select"
- Missing metadata: "Required DICOM tags missing"

### 5.2 Error Recovery Strategies

**Automatic Recovery**:
- Network errors: Auto-retry 3 times, exponential backoff (2s, 4s, 8s)
- Token expiry: Auto-refresh using refresh token
- Chunk upload failure: Resume from last successful chunk

**Manual Recovery**:
- Show "Retry" button for user-initiated retry
- "Cancel" button to abort operation
- "Report Issue" link (opens email with error details)

---

## 6. Offline Behavior

### Service Worker Features

**Caching Strategy**:
1. **App Shell** (Cache First):
   - HTML, CSS, JS bundles
   - Fallback to network if cache miss
2. **API Responses** (Network First):
   - Try network, fallback to cache if offline
   - Cache responses for 5 minutes
3. **Static Assets** (Cache First):
   - Images, fonts, icons
   - Pre-cached during install

**Background Sync**:
- Queued uploads stored in IndexedDB
- When online: Service worker triggers upload
- User sees notification: "Queued upload completed"

**Offline Indicators**:
- Top banner: "You are offline. Some features unavailable."
- Upload button disabled with tooltip: "Connect to upload"
- Cached content badge: "Viewing cached data"

---

## 7. PWA Features

### 7.1 Install Prompt

**Trigger Conditions**:
- User visited site 2+ times
- User engaged for 30+ seconds
- Site served over HTTPS
- Valid manifest.json

**Install Flow**:
1. Custom prompt appears: "Install RelayPACS for faster access?"
2. User clicks "Install" → Browser install dialog
3. App icon added to home screen
4. Next launch opens in standalone mode (no browser UI)

### 7.2 Push Notifications

**Permission Request**:
- Shown on Settings screen
- "Enable Notifications" button
- Browser permission prompt
- Success: Subscribe to push service

**Notification Types**:
- Upload complete
- Report ready
- System alerts

**Notification Actions**:
- Tap notification → Open app to relevant screen
- Swipe to dismiss

### 7.3 App Badge

**Badge Count**:
- Shows unread notification count
- Updates via Background Sync API
- Clears when user opens Notifications screen

**Platform Support**:
- iOS/macOS: HomeScreen badge
- Android: App icon badge
- Desktop: Taskbar badge (Windows/macOS)

---

## 8. Accessibility Features

### WCAG 2.1 AA Compliance

**Keyboard Navigation**:
- All interactive elements focusable
- Logical tab order
- Skip navigation link
- Escape key closes modals

**Screen Reader Support**:
- ARIA labels on interactive elements
- ARIA live regions for status updates
- Semantic HTML (nav, main, article)

**Visual Accessibility**:
- Minimum 4.5:1 contrast ratio (text)
- Focus indicators visible
- No color-only information
- Resizable text up to 200%

**Touch Targets**:
- Minimum 44x44px tap targets (mobile)
- Adequate spacing between interactive elements

---

## 9. Performance Optimizations

### Code Splitting
- Lazy load routes with `React.lazy()`
- Suspense fallback with loading skeleton
- Reduces initial bundle size by 60%

### Caching
- API response caching (Redis backend)
- Static asset caching (Service Worker)
- IndexedDB query optimization

### Rendering
- Virtual scrolling for large lists (react-window)
- Debounced search inputs
- Memoized expensive computations

---

**Document Version**: 1.0
**Completeness**: All 10 screens documented
**Next**: UX Testing & Iteration
