# RelayPACS Complete PACS Integration Guide

This guide provides step-by-step instructions to configure your RelayPACS PWA for full integration with PACS servers (dcm4che and Orthanc), database, and all backend/frontend services.

## Prerequisites

- Docker and Docker Compose installed
- Python 3.11+ (for backend)
- Node.js 18+ (for frontend)
- At least 8GB RAM available
- 50GB disk space

## Quick Start (5 Minutes)

### 1. Create Environment Configuration Files

**Backend Configuration:**
```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway
cp backend/.env.example backend/.env
```

**Frontend Configuration:**
```bash
cp frontend/.env.example frontend/.env
```

### 2. Start All Services

```bash
# Start all Docker services
docker-compose up -d

# Wait for services to be ready (~30 seconds)
sleep 30

# Verify all services are running
docker-compose ps
```

### 3. Run Database Migrations

```bash
# Run Alembic migrations
docker-compose exec backend alembic upgrade head
```

### 4. Access the Application

- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:8003/docs
- **Orthanc**: http://localhost:8042 (username: orthanc, password: orthanc)
- **dcm4chee**: http://localhost:8081/dcm4chee-arc/ui2
- **MinIO**: http://localhost:9001 (username: minioadmin, password: minioadmin)
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (username: admin, password: admin)

---

## Detailed Configuration

### Backend Environment Variables (`backend/.env`)

The backend `.env` file is already configured for local development. Here are the key settings:

#### Security Settings
```bash
# Generate a secure secret key for production:
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Then update in .env:
SECRET_KEY=your-generated-secret-key-here
```

#### PACS Server Configuration

**Option 1: Use dcm4chee (Recommended for Production)**
```bash
ACTIVE_PACS=dcm4chee
DCM4CHEE_URL=http://dcm4chee:8080/dcm4chee-arc/aets/DCM4CHEE/rs
DCM4CHEE_WADO_URL=http://dcm4chee:8080/dcm4chee-arc/aets/DCM4CHEE/rs
```

**Option 2: Use Orthanc (Simpler, Good for Development)**
```bash
ACTIVE_PACS=orthanc
ORTHANC_URL=http://orthanc:8042
ORTHANC_WADO_URL=http://orthanc:8042/dicom-web
ORTHANC_USERNAME=orthanc
ORTHANC_PASSWORD=orthanc
```

**Option 3: Use Both (Dual PACS Setup)**
```bash
ACTIVE_PACS=both
# Configure both URLs above
```

#### Database Configuration
```bash
# PostgreSQL (Production - Already configured in docker-compose)
DATABASE_URL=postgresql+psycopg2://relaypacs:relaypacs@postgres:5432/relaypacs

# For SQLite (Development only, not recommended):
# DATABASE_URL=sqlite:///./relaypacs.db
```

#### Storage Configuration
```bash
# MinIO (S3-compatible storage)
USE_S3=true
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=relay-pacs-uploads
```

#### Redis Configuration
```bash
# Redis for caching and background tasks
REDIS_URL=redis://redis:6379
```

#### CORS Configuration
```bash
# Allow frontend to connect (add your IP addresses)
CORS_ORIGINS=["http://localhost:3002","http://10.10.20.50:3002","http://127.0.0.1:3002"]
```

### Frontend Environment Variables (`frontend/.env`)

```bash
# Backend API URL
VITE_API_URL=http://localhost:8003

# Optional: Sentry for error monitoring
VITE_SENTRY_DSN=

# Application settings
VITE_APP_NAME=RelayPACS
VITE_ENABLE_2FA=true
VITE_MAX_FILE_SIZE_MB=2048
```

---

## Service Integration Details

### 1. PostgreSQL Database

**Configuration in `docker-compose.yml`:**
- Port: 5433 (external) → 5432 (internal)
- Database: relaypacs
- Username: relaypacs
- Password: relaypacs

**Accessing the database:**
```bash
# Via Docker
docker exec -it geteway-postgres-1 psql -U relaypacs -d relaypacs

# Via local psql (if installed)
psql -h localhost -p 5433 -U relaypacs -d relaypacs
```

**Running migrations:**
```bash
# Upgrade to latest
docker-compose exec backend alembic upgrade head

# Create new migration
docker-compose exec backend alembic revision -m "description"

# Downgrade one version
docker-compose exec backend alembic downgrade -1
```

### 2. Orthanc PACS Server

**Configuration:**
- REST API: http://localhost:8042
- DICOM Port: 4242
- Default credentials: orthanc/orthanc

**Testing Orthanc connection:**
```bash
curl -u orthanc:orthanc http://localhost:8042/system
```

**Send DICOM study to Orthanc:**
```bash
# Using storescu from dcm4che toolkit
docker exec dcm4che_toolkit storescu -c ORTHANC@orthanc:4242 /path/to/dicom/files/*
```

### 3. dcm4che PACS Server

**Configuration:**
- Web UI: http://localhost:8081/dcm4chee-arc/ui2
- REST API: http://localhost:8081/dcm4chee-arc/aets/DCM4CHEE/rs
- DICOM Port: 11113

**Accessing dcm4che:**
1. Open http://localhost:8081/dcm4chee-arc/ui2
2. Login with default credentials (see dcm4che documentation)
3. Configure AE Title for RelayPACS

**Testing dcm4chee connection:**
```bash
curl http://localhost:8081/dcm4chee-arc/aets/DCM4CHEE/rs/studies
```

### 4. MinIO (S3 Storage)

**Configuration:**
- Console: http://localhost:9001
- API: http://localhost:9000
- Credentials: minioadmin/minioadmin

**Accessing MinIO Console:**
1. Open http://localhost:9001
2. Login with minioadmin/minioadmin
3. Create bucket: `relay-pacs-uploads` (auto-created by backend)

**Testing S3 connection:**
```bash
curl http://localhost:9000/minio/health/live
```

### 5. Redis Cache

**Configuration:**
- Port: 6379
- No authentication (development)

**Testing Redis:**
```bash
docker exec geteway-redis-1 redis-cli ping
# Should return: PONG

# Monitor Redis commands
docker exec geteway-redis-1 redis-cli monitor
```

### 6. Monitoring Stack

**Prometheus:**
- URL: http://localhost:9090
- Targets: Backend, PostgreSQL, Redis

**Grafana:**
- URL: http://localhost:3000
- Default: admin/admin
- Pre-configured dashboard: RelayPACS Overview

---

## Network Configuration

### Docker Network Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network (bridge)                  │
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ Frontend │───▶│ Backend  │───▶│PostgreSQL│             │
│  │  :3002   │    │  :8003   │    │  :5432   │             │
│  └──────────┘    └────┬─────┘    └──────────┘             │
│                       │                                     │
│                       ├─────▶┌──────────┐                  │
│                       │      │  Redis   │                  │
│                       │      │  :6379   │                  │
│                       │      └──────────┘                  │
│                       │                                     │
│                       ├─────▶┌──────────┐                  │
│                       │      │  MinIO   │                  │
│                       │      │  :9000   │                  │
│                       │      └──────────┘                  │
│                       │                                     │
│                       ├─────▶┌──────────┐                  │
│                       │      │ Orthanc  │                  │
│                       │      │  :8042   │                  │
│                       │      │  :4242   │                  │
│                       │      └──────────┘                  │
│                       │                                     │
│                       └─────▶┌──────────┐                  │
│                              │dcm4chee  │                  │
│                              │  :8080   │                  │
│                              │  :11112  │                  │
│                              └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Port Mappings

| Service | Internal Port | External Port | Protocol |
|---------|--------------|---------------|----------|
| Frontend | 80 | 3002 | HTTP |
| Backend API | 8003 | 8003 | HTTP |
| PostgreSQL | 5432 | 5433 | TCP |
| Redis | 6379 | 6379 | TCP |
| MinIO API | 9000 | 9000 | HTTP |
| MinIO Console | 9001 | 9001 | HTTP |
| Orthanc REST | 8042 | 8042 | HTTP |
| Orthanc DICOM | 4242 | 4242 | DICOM |
| dcm4chee REST | 8080 | 8081 | HTTP |
| dcm4chee DICOM | 11112 | 11113 | DICOM |
| Prometheus | 9090 | 9090 | HTTP |
| Grafana | 3000 | 3000 | HTTP |

---

## Testing the Complete Integration

### 1. Health Checks

```bash
# Backend health
curl http://localhost:8003/health

# Check all service dependencies
curl http://localhost:8003/api/v1/health/dependencies
```

### 2. Test DICOM Upload Flow

```bash
# 1. Get authentication token
TOKEN=$(curl -X POST http://localhost:8003/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}' \
  | jq -r '.access_token')

# 2. Upload DICOM file
curl -X POST http://localhost:8003/api/v1/upload/dicom \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/dicom/file.dcm"

# 3. Check upload status
curl http://localhost:8003/api/v1/uploads \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Test PACS Integration

```bash
# Query studies from active PACS
curl http://localhost:8003/api/v1/pacs/studies \
  -H "Authorization: Bearer $TOKEN"

# Retrieve specific study
curl http://localhost:8003/api/v1/pacs/studies/{study_instance_uid} \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Test Caching

```bash
# Check Redis cache status
docker exec geteway-backend-1 python -c "
from app.cache.service import CacheService
import asyncio

async def test():
    cache = CacheService()
    await cache.connect()
    await cache.set('test', 'value', expire=60)
    result = await cache.get('test')
    print(f'Cache test: {result}')

asyncio.run(test())
"
```

---

## Common Issues & Troubleshooting

### Issue: Services fail to start

**Solution:**
```bash
# Check logs
docker-compose logs backend
docker-compose logs postgres

# Restart specific service
docker-compose restart backend

# Rebuild if needed
docker-compose up -d --build backend
```

### Issue: Database connection errors

**Solution:**
```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker exec geteway-postgres-1 psql -U relaypacs -d relaypacs -c "SELECT 1"
```

### Issue: PACS connection timeout

**Solution:**
```bash
# For Orthanc
docker exec geteway-backend-1 curl http://orthanc:8042/system

# For dcm4chee
docker exec geteway-backend-1 curl http://dcm4chee:8080/dcm4chee-arc/aets/DCM4CHEE/rs/studies

# Check PACS logs
docker-compose logs orthanc
docker-compose logs dcm4chee
```

### Issue: Frontend can't connect to backend

**Solution:**
1. Verify `VITE_API_URL` in `frontend/.env` is correct
2. Check CORS settings in `backend/.env`
3. Rebuild frontend: `docker-compose up -d --build frontend`

### Issue: MinIO connection errors

**Solution:**
```bash
# Check MinIO status
curl http://localhost:9000/minio/health/live

# Verify bucket exists
docker exec geteway-backend-1 python -c "
import boto3
s3 = boto3.client('s3',
    endpoint_url='http://minio:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin')
print(s3.list_buckets())
"
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] **Security**
  - [ ] Generate and set secure `SECRET_KEY`
  - [ ] Change all default passwords (PostgreSQL, MinIO, Grafana)
  - [ ] Configure Sentry DSN for error monitoring
  - [ ] Enable HTTPS/TLS (use `deployment/nginx-ssl.conf`)
  - [ ] Restrict CORS origins to production domains only

- [ ] **Database**
  - [ ] Migrate to PostgreSQL if using SQLite
  - [ ] Configure database backups (use `scripts/backup.sh`)
  - [ ] Set up automated backup schedule

- [ ] **PACS**
  - [ ] Configure production PACS server URLs
  - [ ] Set up proper DICOM AE titles
  - [ ] Test DICOM C-STORE and WADO-RS connectivity

- [ ] **Storage**
  - [ ] Use production S3 or configure S3-compatible storage
  - [ ] Set up storage lifecycle policies
  - [ ] Configure backup and disaster recovery

- [ ] **Monitoring**
  - [ ] Configure Prometheus alerting
  - [ ] Set up Grafana dashboards
  - [ ] Configure log aggregation

- [ ] **Performance**
  - [ ] Enable Redis caching
  - [ ] Configure database connection pooling
  - [ ] Set up CDN for frontend assets

---

## Maintenance Commands

### Backup

```bash
# Full backup (database + volumes + config)
./scripts/backup.sh production

# Database only
docker exec geteway-postgres-1 pg_dump -U relaypacs relaypacs > backup.sql
```

### Restore

```bash
# Full restore
./scripts/restore.sh backups/production_20260113_050000

# Database only
docker exec -i geteway-postgres-1 psql -U relaypacs relaypacs < backup.sql
```

### Update

```bash
# Pull latest images
git pull origin dev
docker-compose pull

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec backend alembic upgrade head
```

### Logs

```bash
# View all logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

---

## API Documentation

Once the backend is running, comprehensive API documentation is available at:

- **Swagger UI**: http://localhost:8003/docs
- **ReDoc**: http://localhost:8003/redoc
- **OpenAPI JSON**: http://localhost:8003/openapi.json

---

## Support & Resources

- **Architecture**: See `docs/architecture.md`
- **Deployment**: See `docs/deployment.md`
- **Monitoring**: See `docs/monitoring.md`
- **Migration**: See `docs/postgresql_migration.md`

For issues or questions, check the logs and troubleshooting section above.
