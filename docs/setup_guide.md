# RelayPACS System Setup & Administration Guide

This guide describes how to deploy, configure, and manage the RelayPACS Gateway in both development and production-like Docker environments.

## 1. Environment Requirements

### Hardware / VM
- **CPU**: 2+ vCPUs recommended
- **RAM**: 4GB+ (Docker stack can be memory intensive with Orthanc/MinIO)
- **Disk**: 20GB+ free space (for Docker images and DICOM storage)
- **OS**: Linux (Ubuntu 20.04/22.04 recommended), macOS, or Windows with WSL2

### Software Dependencies
- **Docker**: v20.10+
- **Docker Compose**: v2.20+
- **Python**: 3.12+ (for local dev)
- **Node.js**: 18+ (for local dev)

---

## 2. Docker Deployment (Recommended)

The easiest way to run the full stack (Gateway + PACS + Storage) is via Docker Compose.

### Quick Start
```bash
# Clean previous builds
docker-compose down --rmi all --volumes

# Build and Start
docker-compose up -d --build
```

### Port Mappings
| Service | Internal Port | Host Port | URL |
| `backend` | 8003 | **8003** | `http://localhost:8003` |
| `frontend` | 80 | **3002** | `http://localhost:3002` |
| `minio` | 9001 | **9001** | `http://localhost:9001` |
| `orthanc` | 8042 | **8045** | `http://localhost:8045` |

> **Note**: Orthanc is mapped to host port **8045** to avoid conflicts with common services on 8042.

### Credential Reference

**Orthanc PACS**
- **Username**: `orthanc`
- **Password**: `orthanc`

**MinIO Storage**
- **Username**: `minioadmin`
- **Password**: `minioadmin`

---

## 3. Local Development Setup

For active development, run the services natively.

### Backend (FastAPI)
1. **Navigate**: `cd backend`
2. **Virtual Env**: `python3 -m venv venv && source venv/bin/activate`
3. **Install**: `pip install -r requirements.txt`
4. **Run**: `uvicorn app.main:app --port 8003 --host 0.0.0.0 --reload`
5. **Docs**: `http://localhost:8003/docs`

### Frontend (React/Vite)
1. **Navigate**: `cd frontend`
2. **Install**: `npm install`
3. **Run**: `npm run dev -- --host 0.0.0.0`
4. **Access**: `http://localhost:3002`

---

## 4. Troubleshooting

**Common Issues:**

1.  **Port Conflicts**:
    *   *Error*: `Bind for 0.0.0.0:4242 failed: port is already allocated`
    *   *Fix*: Edit `docker-compose.yml` to map to a different host port (e.g., `4245:4242`).

2.  **CORS Errors**:
    *   Ensure `backend/.env` (or Docker env vars) includes the frontend origin: `CORS_ORIGINS=["http://localhost:3002"]`.

3.  **Storage Connectivity**:
    *   If uploads fail, check MinIO health at `http://localhost:9001`. Ensure `S3_ENDPOINT` in backend config matches the container name or accessible URL.
