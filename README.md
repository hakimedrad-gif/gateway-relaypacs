# RelayPACS Gateway (MVP)

RelayPACS is a lightweight Teleradiology Gateway designed for reliable, resumed DICOM uploads and basic study triaging. This project consists of a FastAPI backend and a React/Vite frontend (PWA).

## 🚀 Key Features

- **Chunked, Resumable Uploads**: Handle large DICOM files reliably over unstable networks.
- **Clinical Metadata & Triage**: Capture Modality, Service Level (Stat/Emergency/Routine), and clinical history.
- **Analytics Dashboard**: Real-time monitoring of upload volumes, success rates, and modality distribution with time-based filtering.
- **Secure Authentication**: JWT-based auth with "Show Password" toggle for better UX.
- **Permanent Mapping**: Configured for stable dev environments (Backend: 8003, Frontend: 3002).

## 🛠️ Tech Stack

- **Backend**: Python 3.12+, FastAPI, SQLite (Analytics), Boto3 (Storage abstraction).
- **Frontend**: TypeScript, React, Vite, Tailwind CSS, Dexie (IndexedDB).

## 📋 Prerequisites

- **Python**: 3.12 or higher
- **Node.js**: 18+
- **npm**: 9+

## ⚙️ Configuration & Ports

The application is configured to run on specific ports to ensure stability in development environments.

| Service  | Host      | Port | URL                          |
| :------- | :-------- | :--- | :--------------------------- |
| Backend  | `0.0.0.0` | 8003 | `http://localhost:8003`      |
| Frontend | `0.0.0.0` | 3002 | `http://localhost:3002`      |

> **Note**: These ports are hardcoded in `.env` files and `vite.config.ts`.

## 📦 Installation & Setup

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
# (Already configured in the repository, but ensure variables match)
# API_PORT=8003
# CORS_ORIGINS=["http://localhost:3002", "http://10.10.20.50:3002"]
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
# (Already configured)
# VITE_API_URL=http://10.10.20.50:8003
```

## ▶️ Running the Application

### Start Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --port 8003 --host 0.0.0.0 --reload
```

### Start Frontend
```bash
cd frontend
npm run dev -- --host 0.0.0.0
```
*Access the application at [http://localhost:3002](http://localhost:3002)*

## 🧪 Testing

### Backend Tests
```bash
cd backend
# Run all tests
pytest

# Run statistics unit tests
pytest tests/test_stats.py

# Run full integration tests
pytest tests/test_feature_integration.py
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📊 Analytics & Data

- **Filtering**: The Dashboard supports filtering by 1W, 2W, 1M, 3M, 6M, and ALL periods.

## 📡 API Reference

### Authentication
- `POST /auth/register`: Create a new user account.
- `POST /auth/login`: Authenticate and receive a JWT access token.

### Upload Workflow
- `POST /upload/init`: Initialize a resumable upload session.
  - **Body**: `study_metadata` (Modality, Service Level, Patient Info), `clinical_history`.
- `PUT /upload/{upload_id}/chunk`: Upload a binary file chunk.
  - **Params**: `chunk_index`, `file_id`.
- `GET /upload/{upload_id}/status`: Check upload progress and identifying missing chunks.
- `POST /upload/{upload_id}/complete`: Finalize the upload session and trigger processing.

### Analytics
- `GET /upload/stats`: Retrieve aggregated platform statistics.
  - **Query Param**: `period` (Optional). Values: `1w`, `2w`, `1m`, `3m`, `6m`, `all`.
