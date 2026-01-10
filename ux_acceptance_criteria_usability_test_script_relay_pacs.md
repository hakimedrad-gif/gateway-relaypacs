# UX Acceptance Criteria & Usability Test Script

This document provides:
2. UX Acceptance Criteria (Given / When / Then)
4. Usability Test Script for pilot validation

It is intended for QA, frontend engineers, product owners, and usability testers.

---

## Part A: UX Acceptance Criteria

### Screen 1: Home / Upload Screen

**AC-1: Primary Action Visibility**
- Given the user opens the app
- When the home screen loads
- Then a single primary CTA labeled "Upload Study" is immediately visible without scrolling

**AC-2: Offline Awareness**
- Given the device has no network connection
- When the home screen loads
- Then an "Offline" indicator is visible and understandable

**AC-3: Safe Navigation**
- Given the user navigates away and returns to the app
- When the app resumes
- Then no selected or queued data is lost

---

### Screen 2: File Selection & Detection

**AC-4: File Type Auto-Detection**
- Given the user selects files or a folder
- When files are processed
- Then the system correctly detects DICOM, ZIP, folder, or image inputs

**AC-5: Invalid Input Handling**
- Given the user selects an unsupported file
- When detection completes
- Then a clear error message explains the issue and next steps

---

### Screen 3: Metadata Confirmation

**AC-6: Metadata Preview**
- Given valid DICOM files are selected
- When the metadata screen loads
- Then patient name, study date, and modality are displayed read-only

**AC-7: Editable Clinical Notes**
- Given the metadata screen is displayed
- When the user enters clinical impression text
- Then the text is saved and persists across app refresh

**AC-8: Confirmation Gate**
- Given metadata is displayed
- When the user taps "Confirm & Upload"
- Then no further metadata editing is possible

---

### Screen 4: Upload Progress

**AC-9: Progress Visibility**
- Given an upload is in progress
- When chunks are uploaded
- Then progress is displayed as percentage and status text

**AC-10: Offline Interruption**
- Given an upload is in progress
- When network connectivity is lost
- Then the upload transitions to "Queued" without error

**AC-11: Resume Behavior**
- Given an upload is queued
- When network connectivity returns
- Then the upload resumes automatically without user action

---

### Screen 5: Completion

**AC-12: Successful Completion Feedback**
- Given the PACS confirms receipt
- When the upload completes
- Then a success confirmation is displayed

**AC-13: No PHI Persistence**
- Given upload completion
- When the user returns to the home screen
- Then no patient-identifying data is visible

---

### Global UX Criteria

**AC-14: Error Language**
- Given any error occurs
- When an error message is shown
- Then it uses plain language and explains what happens next

**AC-15: Touch Accessibility**
- Given any interactive element
- When rendered on mobile
- Then the touch target is at least 44px

---

## Part B: Usability Test Script (Pilot)

### 1. Test Objectives

- Validate task completion without training
- Validate offline confidence and trust
- Identify confusion points under time pressure

---

### 2. Participant Profile

- Clinic technician OR clinician
- Minimal PACS or IT training
- Uses smartphone daily

Recommended sample size: 5–8 participants

---

### 3. Test Environment

- Android phone or tablet
- One test with stable network
- One test with simulated network loss

---

### 4. Scenario 1: Basic Upload (Online)

**Task:** Upload a small DICOM study

**Steps:**
1. Open app
2. Upload study
3. Confirm metadata
4. Complete upload

**Success Criteria:**
- User completes task without guidance
- No confusion about next step
- Completion within 60 seconds

---

### 5. Scenario 2: Offline Upload

**Task:** Queue a study while offline

**Steps:**
1. Disable network
2. Upload study
3. Observe system behavior
4. Re-enable network

**Success Criteria:**
- User understands upload is queued
- Upload resumes automatically
- No fear of data loss

---

### 6. Scenario 3: Error Recovery

**Task:** Handle a failed upload

**Steps:**
1. Interrupt network mid-upload
2. Observe error messaging

**Success Criteria:**
- User understands what happened
- User does not attempt manual retry unnecessarily

---

### 7. Metrics to Capture

- Time to task completion
- Number of errors
- Number of clarifying questions
- User confidence rating (1–5)

---

### 8. Post-Test Interview Questions

- Was any step confusing?
- Did you ever worry data was lost?
- What would you change?

---

## Conclusion

These acceptance criteria and usability test scripts ensure RelayPACS meets clinical usability expectations, supports QA automation, and de-risks real-world pilot deployments in low-infrastructure settings.

