# RelayPACS Gateway

[![Status](https://img.shields.io/badge/status-production--ready-success.svg)](#)
[![Tech](https://img.shields.io/badge/tech-FastAPI%20|%20React%20|%20DICOM-blue.svg)](#)

RelayPACS Gateway is a mission-critical medical imaging bridge designed for teleradiology workflows. It enables resilient DICOM study ingestion from remote or mobile clinical environments, providing seamless synchronization with enterprise PACS systems.

## 🚀 Key Features

- **Resilient DICOM Ingestion**: Mobile-first PWA with offline queueing and background synchronization via Service Workers.
- **Enterprise Integration**: Seamless forwarding to PACS servers (Orthanc, dcm4chee) using DICOMweb STOW-RS.
- **Secure by Design**: HIPAA-compliant handling with JWT/TOTP authentication and centralized Redis-based token revocation.
- **Automated DICOM Tools**: High-performance metadata extraction and validation using `pydicom` and `dcm4che`.
- **Real-time Monitoring**: Integrated SSE notification system and Prometheus/Grafana service instrumentation.

## 🏗️ Architecture

The system follows a microservices-oriented monolithic pattern, prioritizing operational simplicity while ensuring modular scalability.

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS (PWA enabled).
- **Backend API**: FastAPI (Python 3.12), SQLAlchemy 2.0.
- **Data Layers**: PostgreSQL 16 (Persistence), Redis 7 (Caching), MinIO (Object Storage).
- **Middleware**: Custom security headers, CORS, and GZip compression.

## 🛠️ Getting Started

### Prerequisites

- **Docker** 26.0+
- **Docker Compose** 2.27+
- **Python** 3.12+ (for local development)

### Quick Start

1. **Initialize Environment**:
   ```bash
   cp backend/.env.production.example .env
   ```
   *Note: Ensure `SECRET_KEY` and `POSTGRES_PASSWORD` are set with secure values.*

2. **Launch Services**:
   ```bash
   docker-compose up --build
   ```

3. **Access Application**:
   - Frontend: `http://localhost:3000`
   - API Docs: `http://localhost:8000/docs`
   - PACS (Orthanc): `http://localhost:8042`

## 📖 Documentation

Detailed technical guides are available in the `docs2/` directory:
- [System Architecture](docs2/system%20and%20component%20architecture.md)
- [Technical Design](docs2/technical%20design%20specification.md)
- [PACS Integration Guide](docs2/Pacs%20integration%20setting%20guide.md)
- [User Guide](docs2/user%20guide%20document.md)

## 🛡️ Security & Compliance

RelayPACS Gateway implements several production-grade security measures:
- **Centralized Revocation**: Immediate token invalidation via Redis.
- **Secrets Management**: No hardcoded credentials in Docker or source code.
- **Secure Headers**: Strict HSTS and CSP policies implemented in middleware.

## ⚖️ License

RelayPACS is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
