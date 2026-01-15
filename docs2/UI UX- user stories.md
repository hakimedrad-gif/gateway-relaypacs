# RelayPACS - UI/UX User Stories

## Document Information
- **Product**: RelayPACS Gateway
- **Purpose**: User-centric story definition for UI/UX implementation
- **Version**: 1.0
- **Last Updated**: 2026-01-14

---

## Story Format

Each user story follows the standard format:

**As a** [persona]
**I want** [goal]
**So that** [benefit/motivation]

**Acceptance Criteria**: Specific, testable conditions for "done"
**UX Considerations**: Design patterns, interactions, accessibility
**Edge Cases**: Boundary conditions and error scenarios

---

## Authentication & Onboarding

### US-1.1: User Login

**As a** Clinician
**I want** to log in to RelayPACS with my username and password
**So that** I can securely access the upload system

**Acceptance Criteria**:
- [ ] Username field accepts alphanumeric, dash, underscore (3-50 chars)
- [ ] Password field shows masked text by default
- [ ] "Show Password" toggle reveals password text
- [ ] "Log In" button initiates authentication
- [ ] Invalid credentials show error: "Invalid username or password"
- [ ] Successful login navigates to Upload Study screen
- [ ] Access token stored in memory (not localStorage)
- [ ] Refresh token stored securely in IndexedDB

**UX Considerations**:
- Use autofocus on username field
- Show password requirements on hover
- Disabled submit button until form valid
- Loading spinner during API call
- Error message in red above form

**Edge Cases**:
- Network timeout → "Connection failed. Check your network."
- Account locked → "Too many failed attempts, try again in 15 minutes"
- Empty form submission → Inline validation errors
- Caps Lock indicator on password field

---

### US-1.2: Two-Factor Authentication

**As a** Radiologist with 2FA enabled
**I want** to enter my TOTP code after password
**So that** my account has enhanced security

**Acceptance Criteria**:
- [ ] After successful password validation, TOTP input appears
- [ ] TOTP field accepts exactly 6 digits
- [ ] Field auto-submits on 6th digit entry
- [ ] Invalid code shows: "Invalid authentication code"
- [ ] "Resend Code" option not applicable (TOTP is time-based)
- [ ] Successful 2FA completes login flow

**UX Considerations**:
- Numeric keyboard on mobile devices
- Auto-focus TOTP field when it appears
- Show countdown timer (30s TOTP validity)
- Large, easy-to-tap input boxes (mobile)

**Edge Cases**:
- Expired TOTP → "Code expired, generate new code"
- Clock skew → Accept ±1 time window
- Too many invalid attempts → Lock account

---

### US-1.3: Enable 2FA

**As a** Clinician concerned about security
**I want** to enable two-factor authentication
**So that** my account is better protected

**Acceptance Criteria**:
- [ ] Settings screen shows "Enable 2FA" button
- [ ] Click opens modal with QR code
- [ ] QR code scannable by Google Authenticator, Authy
- [ ] Manual secret key shown as alternative
- [ ] User enters first TOTP code to confirm setup
- [ ] Success message: "2FA enabled successfully"
- [ ] Button changes to "Disable 2FA"

**UX Considerations**:
- Large QR code (300x300px)
- Copy button for manual secret key
- Step-by-step instructions in modal
- Test TOTP before confirming
- Show list of compatible authenticator apps

**Edge Cases**:
- Failed to generate QR → Show manual secret only
- User closes modal before confirming → 2FA not enabled
- Invalid first TOTP → "Code incorrect, try again"

---

## Upload Workflows

### US-2.1: Select DICOM Files

**As a** Clinician
**I want** to easily select DICOM files for upload
**So that** I can send studies to the PACS quickly

**Acceptance Criteria**:
- [ ] Drag-and-drop zone accepts `.dcm` and `.dicom` files
- [ ] "Browse Files" button opens native file picker
- [ ] Selected files appear in list with name and size
- [ ] Each file has "Remove" (X) button
- [ ] Total size calculated and displayed
- [ ] Maximum 2GB total size enforced
- [ ] File list persists if user navigates away (draft save)

**UX Considerations**:
- Drag-over visual feedback (border highlight)
- File icons for differentiation
- Size formatted as MB/GB for readability
- Empty state shows upload icon + instructions
- Responsive grid layout for file list

**Edge Cases**:
- Non-DICOM file dropped → "File must be .dcm or .dicom format"
- Exceeds 2GB → "Total size exceeds 2GB limit. Remove files."
- Duplicate file → Warn user, allow or reject
- Zero files selected → Disable "Continue" button

---

### US-2.2: Enter Study Metadata

**As a** Radiographer
**I want** metadata auto-populated from DICOM tags
**So that** I don't have to manually enter known information

**Acceptance Criteria**:
- [ ] Patient Name auto-filled from first DICOM file's PatientName tag
- [ ] Study Date extracted from StudyDate tag
- [ ] Modality extracted from Modality tag
- [ ] Fields editable if auto-population incorrect
- [ ] Service Level defaults to "Routine"
- [ ] Clinical History is optional textarea (500 char max)
- [ ] Character count shown for Clinical History

**UX Considerations**:
- Show "Auto-filled" badge on populated fields
- Dropdown for Modality (CT, MRI, X-Ray, Ultrasound, PET, Other)
- Color-coded Service Level options (STAT=red, Emergency=orange)
- Tooltip explaining each service level
- Real-time validation on blur

**Edge Cases**:
- DICOM tags missing → Fields remain empty, user must fill
- Multiple patients in files → Warn user, reject upload
- Invalid date format → Validation error
- Special characters in patient name → Sanitize for security

---

### US-2.3: Resume Failed Upload

**As a** Clinician with unstable Wi-Fi
**I want** uploads to automatically resume after network failure
**So that** I don't lose progress or have to re-upload

**Acceptance Criteria**:
- [ ] Network disconnect detected automatically
- [ ] Upload pauses, shows "Offline" banner
- [ ] No user action required to resume
- [ ] When online, upload auto-resumes from last chunk
- [ ] Progress bar shows correct percentage throughout
- [ ] User can manually "Pause" or "Resume"
- [ ] Session valid for 24 hours

**UX Considerations**:
- Orange banner for offline state
- Green banner when reconnected
- "Paused" vs "Uploading" status indicator
- Estimated time updates dynamically
- Confetti animation on successful completion (mobile)

**Edge Cases**:
- Session expired during offline → "Session expired, re-upload required"
- Chunk corruption → Re-upload failed chunk (3 retries)
- Backend unavailable → Queue for retry, notify user
- Airplane mode → Immediate pause, resume on re-enable

---

### US-2.4: Batch Folder Upload (Smart Wizard)

**As a** Radiographer
**I want** to upload an entire folder of studies at once
**So that** I can efficiently send multiple patients' imaging

**Acceptance Criteria**:
- [ ] "Select Folder" button opens directory picker
- [ ] System scans recursively for `.dcm` files
- [ ] Progress bar during scan
- [ ] Discovered files shown in tree structure
- [ ] User can exclude individual files via checkboxes
- [ ] Batch metadata applies to all selected files
- [ ] Final confirmation shows total count and size
- [ ] "Start Upload" initiates parallel uploads

**UX Considerations**:
- Tree view with expand/collapse for subfolders
- File count badge on each folder node
- Breadcrumb navigation for deep folders
- Step indicator: 1 of 4, 2 of 4, etc.
- "Select All" / "Deselect All" buttons

**Edge Cases**:
- Empty folder → "No DICOM files found"
- Mixed file types → Only .dcm/.dicom selected
- Very large folder (10,000+ files) → Warn about time
- Metadata varies between files → Prompt for resolution

---

## Analytics & Reporting

### US-3.1: View Upload Dashboard

**As a** System Administrator
**I want** to see aggregate upload statistics
**So that** I can monitor system utilization

**Acceptance Criteria**:
- [ ] Dashboard shows 4 metric cards: Total Uploads, Volume, Success Rate, Avg Time
- [ ] Time filter tabs: 1W, 2W, 1M, 3M, 6M, ALL
- [ ] Clicking tab refreshes all metrics
- [ ] Modality pie chart updates with selected period
- [ ] Service level bar chart shows proportions
- [ ] Trend line chart displays daily volumes
- [ ] Manual refresh button available
- [ ] Auto-refresh every 60 seconds

**UX Considerations**:
- Skeleton loaders during data fetch
- Smooth chart animations (Recharts)
- Responsive grid layout for cards
- Color palette: blue (success), red (failure), amber (partial)
- Interactive chart tooltips

**Edge Cases**:
- No data for period → "No uploads found for this period"
- API error → Show error message, retry button
- Very large datasets → Paginate or aggregate
- Chart render failure → Fallback to table view

---

### US-3.2: Export Statistics as CSV

**As a** Quality Assurance Manager
**I want** to export upload statistics as CSV
**So that** I can analyze data in Excel or include in reports

**Acceptance Criteria**:
- [ ] "Export CSV" button visible on Dashboard
- [ ] Click triggers download of `relaypacs_stats_{period}.csv`
- [ ] CSV includes: Date, Modality, Service Level, Success Rate
- [ ] Filename includes current time filter (e.g., `1m`, `6m`)
- [ ] Download starts immediately (no page reload)
- [ ] Success toast notification appears

**UX Considerations**:
- Icon button or text button (user testing)
- Download icon (arrow-down)
- Toast: "CSV exported successfully"
- Fast export (<2s for 10,000 records)

**Edge Cases**:
- No data to export → Disable button, show tooltip
- Large dataset → Show progress indicator
- Browser blocks download → Instruct user to allow
- API timeout → Retry logic with user feedback

---

## Reports & Notifications

### US-4.1: View Report List

**As a** Clinician
**I want** to see all reports for my uploaded studies
**So that** I can track radiologist interpretations

**Acceptance Criteria**:
- [ ] Reports listed in table: Patient Name, Study Date, Modality, Status, Radiologist, Updated Date
- [ ] Status badges color-coded: Assigned (blue), Pending (yellow), Ready (green), Additional Data Required (orange)
- [ ] Filter tabs: All, Assigned, Pending, Ready, Additional Data Required
- [ ] Clicking tab filters list
- [ ] Each row has "View Details" and "Download PDF" (if Ready)
- [ ] Pagination: 50 reports per page
- [ ] "Load More" button at bottom

**UX Considerations**:
- Responsive table (cards on mobile)
- Sticky header on scroll
- Sort by date (newest first)
- Empty state for no reports
- Loading skeleton for each row

**Edge Cases**:
- Zero reports → "No reports found. Upload a study to get started."
- API error → "Failed to load reports. Retry?"
- PDF not ready → Disable "Download PDF", show tooltip
- Very long patient names → Truncate with ellipsis

---

### US-4.2: Download Report PDF

**As a** Clinician
**I want** to download completed radiology reports as PDFs
**So that** I can review findings and make treatment decisions

**Acceptance Criteria**:
- [ ] "Download PDF" button only enabled when status = "Ready"
- [ ] Click triggers download of `report_{reportId}.pdf`
- [ ] PDF opens in new tab or downloads (browser default)
- [ ] Toast notification: "Report downloaded"
- [ ] PDF includes: Patient info, study details, radiologist findings
- [ ] PDF formatted professionally (header, footer, logo)

**UX Considerations**:
- Icon: download or PDF symbol
- Secondary button style (not primary)
- Disable button during download
- Check PDF size before download (warn if >10MB)

**Edge Cases**:
- PDF generation fails → "Failed to generate PDF. Try again."
- Corrupted PDF → Re-generate backend-side
- Slow download → Show progress bar
- Browser blocks popup → Instruct user to allow

---

### US-4.3: Receive Real-Time Notifications

**As a** Clinician
**I want** to receive instant notifications when reports are ready
**So that** I can respond quickly to urgent patient needs

**Acceptance Criteria**:
- [ ] Browser notification appears when report status changes to "Ready"
- [ ] Notification shows: Title "Report Ready", Message "Report for [Patient] is ready"
- [ ] Clicking notification opens app to Reports screen
- [ ] In-app notification badge shows unread count
- [ ] Notification appears in Notifications screen list
- [ ] Permission request shown on first visit

**UX Considerations**:
- Native browser notification (chrome, safari style)
- Sound alert (optional, user preference)
- Badge on browser tab and app icon
- Group notifications (>5 = "5+ new reports")
- Mark as read when clicked

**Edge Cases**:
- User denies permission → In-app notifications only
- Browser closed → Desktop notification still works (PWA)
- Multiple notifications → Stack or latest only
- Network offline → Queue, show when online

---

## Settings & Preferences

### US-5.1: Change Password

**As a** Radiographer
**I want** to change my password from the settings screen
**So that** I can maintain account security

**Acceptance Criteria**:
- [ ] "Change Password" button opens modal
- [ ] Modal has 3 fields: Current Password, New Password, Confirm New Password
- [ ] New password must meet strength requirements (shown)
- [ ] "Show Password" toggle for each field
- [ ] "Save Changes" button validates and submits
- [ ] Success: "Password updated successfully", modal closes
- [ ] Failure: Show specific error (e.g., "Current password incorrect")

**UX Considerations**:
- Password strength meter (weak/medium/strong)
- Real-time validation on New Password field
- Must match confirmation field
- Clear error messages
- Close modal on outside click (with confirmation if unsaved)

**Edge Cases**:
- Current password wrong → "Current password incorrect"
- New password same as old → "New password must be different"
- Network error → "Failed to update. Try again."
- Session expires during change → Re-authenticate

---

### US-5.2: Configure Upload Preferences

**As a** Radiographer who primarily uploads Routine studies
**I want** to set "Routine" as my default service level
**So that** I don't have to select it every time

**Acceptance Criteria**:
- [ ] Settings screen has "Upload Preferences" section
- [ ] Default Service Level dropdown (Routine, Emergency, STAT, Subspecialty)
- [ ] Selection auto-saves on change
- [ ] Toast confirmation: "Preference saved"
-  [ ] Default applies to new upload forms
- [ ] User can still override per-upload

**UX Considerations**:
- Auto-save (no "Save" button needed)
- Subtle animation on save
- Tooltip explaining each preference
- Reset to defaults button

**Edge Cases**:
- API save fails → Revert UI, show error
- Conflicting preferences → Show warning
- Invalid selection → Validation prevents submission

---

## Progressive Web App

### US-6.1: Install PWA

**As a** Clinician
**I want** to install RelayPACS as an app on my phone
**So that** I can access it quickly without opening a browser

**Acceptance Criteria**:
- [ ] Custom install prompt appears after 2 visits or 30s engagement
- [ ] Prompt shows: "Install RelayPACS for faster access?"
- [ ] "Install" button triggers browser install dialog
- [ ] "Not Now" dismisses prompt (reappears after 7 days)
- [ ] Success: App icon added to home screen
- [ ] Next launch opens in standalone mode (no browser UI)
- [ ] Settings shows "App Installed" status

**UX Considerations**:
- Modal or banner (A/B test)
- App icon preview in prompt
- Benefits list: "Faster access, offline support, notifications"
- Device-specific wording (iOS: "Add to Home Screen")

**Edge Cases**:
- Browser doesn't support PWA → No prompt shown
- User dismisses 3 times → Stop showing
- Already installed → Hide install prompt
- iOS Safari → Custom instructions (no native prompt)

---

### US-6.2: Work Offline

**As a** Clinician in a remote area
**I want** to use RelayPACS even when offline
**So that** I can review past uploads and queue new ones

**Acceptance Criteria**:
- [ ] Offline mode indicated by banner: "You are offline"
- [ ] View upload history (cached in IndexedDB)
- [ ] View Reports screen (cached data)
- [ ] Cannot initiate new uploads (button disabled)
- [ ] Queued uploads show "Pending - will upload when online"
- [ ] When back online, banner: "Connected - uploading queued items"
- [ ] Background sync uploads queue automatically

**UX Considerations**:
- Clear offline indicator (orange banner)
- Cached data badge: "Viewing cached data from [time]"
- Disable interactive elements gracefully
- Progress indicator for background sync

**Edge Cases**:
- Very long offline period → Alert user data may be stale
- Queue too large → Warn about bandwidth on reconnect
- Partial sync failure → Show which items failed
- App updated while offline → Prompt to reload

---

## Accessibility

### US-7.1: Navigate with Keyboard

**As a** User with motor impairments
**I want** to navigate the entire app using only my keyboard
**So that** I can use RelayPACS without a mouse

**Acceptance Criteria**:
- [ ] All interactive elements focusable with Tab
- [ ] Logical tab order (top-to-bottom, left-to-right)
- [ ] Focus indicator visible (outline or highlight)
- [ ] Escape key closes modals
- [ ] Enter key submits forms
- [ ] Arrow keys navigate dropdowns and radio groups
- [ ] Skip navigation link at top

**UX Considerations**:
- High-contrast focus indicator (3px blue border)
- Avoid keyboard traps
- Focus management on route change
- Custom focus styles for buttons, links, inputs

**Edge Cases**:
- Tab into modal → Focus trapped in modal
- Tab out of dropdown → Dropdown closes
- Rapid Tab presses → No skipped elements

---

### US-7.2: Use Screen Reader

**As a** Blind user
**I want** all UI elements properly labeled for my screen reader
**So that** I can navigate and use RelayPACS independently

**Acceptance Criteria**:
- [ ] All images have alt text
- [ ] All form inputs have associated labels
- [ ] ARIA labels on icon buttons
- [ ] ARIA live regions for dynamic updates (upload progress)
- [ ] Semantic HTML (nav, main, article, aside)
- [ ] Headings in logical hierarchy (h1 > h2 > h3)

**UX Considerations**:
- Test with NVDA (Windows) and VoiceOver (macOS/iOS)
- Descriptive link text (avoid "click here")
- Status announcements for async actions
- Avoid auto-playing media

**Edge Cases**:
- Complex charts → Provide data table alternative
- Drag-and-drop → Keyboard alternative available
- Carousel → Screen reader navigation support

---

**Document Version**: 1.0
**Total Stories**: 23 user stories across 7 themes
**Coverage**: All major features and critical user journeys
**Next**: Engineering dev stories for implementation
