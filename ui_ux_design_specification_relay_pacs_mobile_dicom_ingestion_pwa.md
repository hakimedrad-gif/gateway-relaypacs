# UI/UX Design Specification

## 1. Purpose
This document defines the complete **UI/UX design specification** for RelayPACS, ensuring a consistent, intuitive, mobile-first user experience optimized for clinical, low-infrastructure, and high-stress environments. It is intended for designers, frontend engineers, and product reviewers.

---

## 2. UX Design Principles

### 2.1 Mobile-First, Not Mobile-Adapted
- Designed for phones and tablets first
- Desktop is a scaled-up version, not a separate UX

### 2.2 One Primary Action per Screen
- Prevents cognitive overload
- Reduces user error under time pressure

### 2.3 Offline Is a First-Class State
- Offline is visible, understandable, and safe
- Users never fear losing data

### 2.4 Clinical Safety & Clarity
- No ambiguous states
- Clear confirmation before irreversible actions
- Human-readable errors

---

## 3. Target Devices & Environments

- Smartphones (Android priority)
- Tablets (clinic shared devices)
- Low-end laptops / PCs
- Variable lighting, gloves, noisy environments

Design must tolerate:
- One-handed use
- Intermittent connectivity
- Non-technical users

---

## 4. Global UI Foundations

### 4.1 Layout
- Single-column layout
- Thumb-reachable primary CTA
- Sticky bottom action bar (mobile)

### 4.2 Typography
- Sans-serif, high legibility
- Large base font size (≥16px)
- Clear hierarchy (H1, H2, body)

### 4.3 Color & Contrast
- WCAG AA minimum contrast
- Status colors used sparingly:
  - Green: success
  - Yellow: queued / warning
  - Red: failed

Color is never the only status indicator.

---

## 5. Navigation Model

### 5.1 Navigation Philosophy
- No deep navigation
- Linear task flow
- Back navigation always safe

### 5.2 Navigation Elements
- Top app bar (logo + status)
- No hamburger menu in MVP
- Optional settings behind icon

---

## 6. Core User Flows

### 6.1 Primary Flow: Upload Study

**Steps:**
1. Launch app
2. Tap "Upload Study"
3. Select files / capture images
4. Confirm metadata
5. Upload / queue
6. Confirmation

This flow must complete in under 60 seconds for small studies.

---

### 6.2 Offline Flow

- Offline badge visible at all times
- Upload CTA becomes "Queue Upload"
- Clear reassurance: "Will upload when connected"

---

## 7. Screen-by-Screen Specifications

### 7.1 Home / Upload Screen

**Purpose:** Entry point

**Components:**
- Primary CTA: Upload Study
- Secondary CTA: Capture Image (optional)
- Network status indicator
- Minimal branding

**UX Notes:**
- No list of past uploads in MVP
- Zero clutter

---

### 7.2 File Selection & Detection

**Behavior:**
- Auto-detect file type (DICOM, ZIP, folder, image)
- Immediate feedback on selection

**Errors:**
- Unsupported file type
- Empty folder / invalid ZIP

---

### 7.3 Metadata Confirmation Screen

**Purpose:** Safety checkpoint

**Read-Only Fields:**
- Patient Name
- Study Date
- Modality

**Editable Fields:**
- Study Description
- Clinical Impression (free text)

**Primary CTA:** Confirm & Upload

**UX Notes:**
- No deep DICOM tag editing
- Tooltips for non-obvious fields

---

### 7.4 Upload Progress Screen

**Components:**
- Progress bar (per study)
- Percentage + uploaded size
- Status text (Uploading / Queued / Retrying)

**Behavior:**
- Survives refresh and app close
- Auto-resume

---

### 7.5 Completion Screen

**Purpose:** Closure & trust

**Elements:**
- Success confirmation
- PACS receipt ID (if available)
- CTA: Upload Another Study

---

### 7.6 Error States

**Design Rules:**
- Plain language
- Explain what happened
- Explain what will happen next

**Examples:**
- "Network lost — upload will resume automatically"
- "Study incomplete — some images missing"

---

## 8. Offline & Sync UX

### Indicators
- Persistent offline badge
- Queued upload count

### User Control
- No manual retry required
- Optional cancel queued upload

---

## 9. Accessibility

- WCAG 2.1 AA compliance target
- Touch targets ≥44px
- Screen reader labels
- Avoid color-only indicators

---

## 10. Internationalization & Localization

- Text externalized
- Support for non-Latin scripts
- Date/time localized

---

## 11. Security & Privacy UX

- Auth state always visible
- No PHI displayed after completion (upload-only mode)
- Session timeout warnings

---

## 12. UX Anti-Patterns to Avoid

- Multi-step wizards
- Dense tables
- Modal-heavy flows
- Hidden offline behavior

---

## 13. Design Handoff Requirements

### To Engineering
- Component specs
- Interaction states
- Error copy

### To QA
- UX acceptance criteria
- Offline test cases

---

## 14. UX Success Metrics

- Time to complete upload
- Upload abandonment rate
- Error recovery rate
- Offline queue completion rate

---

## 15. Future UX Enhancements

- Upload history view
- QR-based auto-configuration
- Study completeness warnings
- Dark mode

---

## 16. Conclusion

This UI/UX specification prioritizes reliability, clarity, and speed in clinical contexts. By aggressively minimizing cognitive load and treating offline operation as a core feature, RelayPACS delivers a user experience unmatched by traditional PACS ingestion tools.
