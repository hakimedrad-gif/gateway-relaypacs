# RelayPACS User Manual

Welcome to the RelayPACS Gateway! This tool allows you to securely upload medical imaging studies (DICOM) and track your upload history via an analytics dashboard.

## 1. Getting Started

### Registration
1.  Navigate to the login page (e.g., `http://10.10.20.50:3002`).
2.  Click **"Don't have an account? Sign up"**.
3.  Enter your details:
    *   **Full Name**: Your display name.
    *   **Email**: Your professional email address.
    *   **Password**: Must contain at least 8 characters. *Tip: Use the "Eye" icon to check your password.*
    *   **Role**: Select your role (e.g., Physician, Radiologist).
    *   **Security Key**: Use the provided organization key (e.g., `RelayPacs2024!`).
4.  Click **Sign Up**. You will be automatically logged in.

### Login
1.  Enter your registered **Username** and **Password**.
2.  Click **Sign In** to access the main application.

---

## 2. Uploading a Study

Once logged in, you will land on the Upload Request page.

### Step 1: Study Information
*   **Modality**: Select the type of scan (e.g., CT, MRI, X-Ray/CR).
*   **Service Level**: Choose the priority:
    *   **Routine**: Standard processing.
    *   **Stat**: Urgent.
    *   **Emergency**: Critical/Life-threatening (highest priority).

### Step 2: Select Files
*   Click the **Upload Area** or drag-and-drop your DICOM (`.dcm`) files.
*   The system will scan the files and valid DICOMs will be listed.

### Step 3: Clinical Metadata (New)
*   Review the patient information extracted from the file headers.
*   **Fill in the missing fields**:
    *   **Patient Age**: e.g., "45Y".
    *   **Gender**: Male (M) / Female (F).
    *   **Clinical History**: Provide brief clinical context (e.g., "History of trauma, rule out fracture").
*   Click **Confirm & Start Upload**.

### Step 4: Monitoring Progress
*   A progress bar will show the status of the upload.
*   **Do not close the tab** until the upload is marked as "Complete".

---

## 3. Analytics Dashboard

Click **Dashboard** in the navigation menu to view your activity.

### Key Metrics
*   **Total Uploads**: Number of studies you have uploaded.
*   **Success Rate**: Percentage of uploads that completed successfully.
*   **Failed Uploads**: Count of any interrupted or failed attempts.

### Visualizations
*   **Modality Volume**: See which modalities you upload most frequently.
*   **Service Level Breakdown**: View the distribution of urgent vs. routine cases.

### Time Filtering
Use the buttons at the top right to filter the data:
*   **1W**: Past 7 Days
*   **2W**: Past 14 Days
*   **1M / 3M / 6M**: Past Months
*   **ALL**: All-time history

> **Note**: The dashboard does not update automatically in real-time. Click the "Refresh" icon or change a filter to load the latest numbers.
