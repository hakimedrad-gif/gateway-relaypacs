# RelayPACS User Guide

## Document Information
- **Product**: RelayPACS Gateway
- **Audience**: Clinicians, Radiographers, Radiologists
- **Purpose**: End-user operational guidance
- **Version**: 1.0
- **Last Updated**: 2026-01-14

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Uploading Studies](#uploading-studies)
3. [Viewing Reports](#viewing-reports)
4. [Managing Notifications](#managing-notifications)
5. [Account Settings](#account-settings)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Creating Your Account

1. Navigate to RelayPACS login page
2. Click **"Create Account"**
3. Fill in:
   - Username (unique, 3-50 characters)
   - Email address
   - Password (minimum 12 characters, include uppercase, lowercase, number, special char)
   - Full name
4. Click **"Register"**
5. Check your email for verification link
6. Log in with your credentials

### Installing the App (Mobile/Desktop)

**On Mobile** (iOS/Android):
1. Open RelayPACS in your browser
2. Look for **"Install App"** banner at bottom of screen
3. Tap **"Install"**
4. App icon added to home screen

**On Desktop**:
1. Open RelayPACS in Chrome/Edge
2. Click install icon (➕) in address bar
3. Click **"Install"**
4. App opens in standalone window

---

## Uploading Studies

### Single File Upload

**Step 1: Select File**
1. Log in to RelayPACS
2. You'll automatically land on **Upload Study** screen
3. Click **"Browse Files"** or drag DICOM file(s) into drop zone
4. Selected files appear in list with size

**Step 2: Review Metadata**
- Patient Name, Study Date, and Modality are **auto-filled** from DICOM tags
- Edit if incorrect
- Select **Service Level**:
  - **STAT**: Life-threatening emergency (read within 1 hour)
  - **Emergency**: Urgent, not life-threatening (read within 4 hours)
  - **Routine**: Normal priority (read within 24 hours)
  - **Subspecialty**: Requires specialist review
- Add **Clinical History** (optional, helps radiologist)

**Step 3: Confirm & Upload**
1. Click **"Continue"**
2. Review summary
3. Click **"Start Upload"**
4. Progress screen shows real-time status
5. When complete, you'll see **"Upload Complete"** with Report ID

### Batch Upload (Multiple Patients)

1. Click **"Batch Upload"** button
2. Click **"Select Folder"** to choose directory with DICOM files
3. System scans for all `.dcm` files
4. Review discovered studies (grouped by patient automatically)
5. Uncheck any files you don't want to upload
6. Enter metadata for each study
7. Click **"Upload All"**

### Resuming Failed Uploads

**If your upload is interrupted** (network drops, app closes):
1. Reopen RelayPACS
2. Go to **Upload Progress** screen (or Dashboard → "Pending Uploads")
3. Your upload automatically resumes from where it stopped
4. No need to re-upload completed chunks

**Offline Uploads**:
- If you're offline, uploads are queued
- When back online, they automatically start
- You'll get a notification when complete

---

## Viewing Reports

### Finding Your Reports

1. Click **"Reports"** in navigation menu
2. See list of all your uploaded studies
3. Filter by status:
   - **Assigned**: Radiologist assigned, not yet read
   - **Pending**: Being interpreted
   - **Ready**: Report available for download
   - **Additional Data Required**: Radiologist needs more info

### Downloading Report PDFs

1. Find report with **"Ready"** status
2. Click **"Download PDF"** button
3. PDF opens in new tab or downloads (depends on browser)
4. Save to your device

### Understanding Report Statuses

| Status | Meaning | What To Do |
|--------|---------|------------|
| **Assigned** | Radiologist has been assigned | Wait for reading |
| **Pending** | Radiologist is reviewing images | Wait (check back in a few hours) |
| **Ready** | Interpretation complete | Download PDF, take clinical action |
| **Additional Data Required** | Need more patient history or images | Check notifications, provide requested info |

---

## Managing Notifications

### Types of Notifications

- **Upload Complete**: Your study was successfully sent to PACS
- **Upload Failed**: There was a problem (click for details)
- **Report Assigned**: A radiologist is assigned to your study
- **Report Ready**: Interpretation available for download
- **Additional Data Required**: Radiologist needs more information

### Enabling Browser Notifications

1. When prompted, click **"Allow Notifications"**
2. You'll receive desktop/mobile alerts even when app is closed
3. To disable: Go to **Settings** → **Notifications** → Toggle off

### Viewing Notification History

1. Click **bell icon** (🔔) in top navigation
2. See list of all notifications
3. Unread notifications in **bold**
4. Click notification to navigate to related item (upload or report)
5. Click **"Mark as Read"** to clear

---

## Account Settings

### Changing Your Password

1. Go to **Settings** (gear icon)
2. Click **"Change Password"**
3. Enter:
   - Current password
   - New password (12+ chars)
   - Confirm new password
4. Click **"Save"**
5. You'll be logged out; log back in with new password

### Enabling Two-Factor Authentication (2FA)

**Why enable 2FA?** Adds extra layer of security to your account.

**Steps**:
1. Go to **Settings** → **Security**
2. Click **"Enable 2FA"**
3. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
4. Enter 6-digit code from app to confirm
5. Next login will require code from app

### Setting Upload Preferences

1. Go to **Settings** → **Upload Preferences**
2. Set **Default Service Level** (saves you time on future uploads)
3. Adjust **Chunk Size** (only if you have technical issues)

---

## Troubleshooting

### Upload Issues

**Problem: Upload stuck at 0%**
- **Solution**: Check your internet connection. If offline, upload will queue and auto-resume when online.

**Problem: "Duplicate upload detected"**
- **Meaning**: You've already uploaded this study in the last 30 days
- **Solution**: Click **"View Original Upload"** to see existing report. If you need to re-upload, contact support.

**Problem: "File too large"**
- **Meaning**: Total upload exceeds 2GB limit
- **Solution**: Remove some files, or split into multiple uploads

### Login Issues

**Problem: "Invalid username or password"**
- **Solution**: Double-check credentials. Use **"Show Password"** toggle to verify. If forgotten, click **"Forgot Password"**

**Problem: 2FA code not working**
- **Solution**: Ensure your phone's time is accurate (TOTP codes are time-sensitive). If still failing, contact support to reset 2FA.

### Performance Issues

**Problem: Slow dashboard loading**
- **Solution**: Try refreshing the page. Clear browser cache (Settings → Privacy → Clear browsing data)

**Problem: App won't install**
- **Solution**: Update your browser to latest version. PWA requires modern browser (Chrome 90+, Safari 14+, Firefox 90+)

### Getting Help

**Email Support**: support@relaypacs.com
**Phone**: 1-800-RELAY-PACS
**Live Chat**: Available Mon-Fri 8 AM - 6 PM EST (click chat icon in bottom-right)

---

## Best Practices

### For Clinicians

1. **Use correct service level**: Don't mark everything as STAT; saves radiologist time for true emergencies
2. **Provide clinical history**: Helps radiologist give more relevant interpretation
3. **Check notifications daily**: Don't miss critical report updates
4. **Download reports promptly**: Keep local copies for patient records

### For Radiographers

1. **Use batch upload** for efficient multi-patient workflow
2. **Verify patient name** matches ordering system
3. **Enable 2FA** to protect patient data
4. **Queue uploads before shift end**: Let app upload overnight if needed

### For Radiologists

1. **Review "Additional Data Required"** studies first
2. **Use filters** to prioritize by service level (STAT → Emergency → Routine)
3. **Download reports** after signing to review formatting

---

**Document Status**: ✅ COMPLETE
**Version**: 1.0
**Last Updated**: 2026-01-14
