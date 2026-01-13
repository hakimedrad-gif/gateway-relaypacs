# RelayPACS Deployment Guide

## Prerequisites

- Docker 24.0+ and Docker Compose 2.20+
- 4GB RAM minimum (8GB recommended)
- 20GB disk space for application and data
- SSL certificate (for production)

## Quick Start (Development)

```bash
# Clone repository
git clone <repository-url>
cd geteway

# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps
```

Services will be available at:
- Frontend: http://localhost:3002
- Backend API: http://localhost:8003
- API Docs: http://localhost:8003/docs

## Production Deployment

### 1. Environment Configuration

Create a `.env` file in the project root:

```bash
# Security - GENERATE UNIQUE VALUES!
SECRET_KEY=<run: python -c "import secrets; print(secrets.token_urlsafe(32)">

# Database
DATABASE_URL=postgresql+psycopg2://relaypacs:STRONG_PASSWORD@postgres:5432/relaypacs

# S3 Storage
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minio_production_key
S3_SECRET_KEY=STRONG_S3_SECRET

# PACS
PACS_TYPE=dcm4chee
DCM4CHEE_STOW_URL=http://dcm4chee:8080/dcm4chee-arc/aets/DCM4CHEE/rs/studies

# Error Monitoring
SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_ENVIRONMENT=production
```

### 2. SSL/TLS Configuration

Create Nginx SSL configuration (`deployment/nginx-ssl.conf`):

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://backend:8003/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # For large DICOM uploads
        client_max_body_size 100M;
        proxy_read_timeout 300s;
    }
}
```

### 3. Database Initialization

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Wait for healthy status
docker-compose exec postgres pg_isready -U relaypacs

# Run migrations
cd backend
source venv/bin/activate
DATABASE_URL=postgresql+psycopg2://relaypacs:password@localhost:5433/relaypacs \
  alembic upgrade head
```

### 4. Start Services

```bash
# Production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify all services
docker-compose ps
```

## Backup Procedures

### Database Backup

```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups

# PostgreSQL backup
docker-compose exec -T postgres pg_dump -U relaypacs relaypacs | \
  gzip > ${BACKUP_DIR}/relaypacs_${DATE}.sql.gz

# Retain last 7 days
find ${BACKUP_DIR} -name "relaypacs_*.sql.gz" -mtime +7 -delete

echo "Backup completed: relaypacs_${DATE}.sql.gz"
```

### Restore Procedure

```bash
#!/bin/bash
# scripts/restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh <backup_file.sql.gz>"
    exit 1
fi

# Restore database
gunzip -c $BACKUP_FILE | \
  docker-compose exec -T postgres psql -U relaypacs relaypacs

echo "Restore completed from: $BACKUP_FILE"
```

## Health Checks

| Endpoint | Expected Response |
|----------|-------------------|
| `GET /health` | `{"status": "healthy"}` |
| `GET /api/v1/auth/login` | `405 Method Not Allowed` |
| `docker-compose ps` | All services "Up (healthy)" |

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
sudo lsof -i :8003
# Kill the process or change the port in docker-compose.yml
```

**Database connection failed:**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection
docker-compose exec backend python -c "from app.db.database import engine; print(engine.url)"
```

**PACS connection issues:**
```bash
# Test Orthanc connectivity
curl http://localhost:8042/system

# Test dcm4chee
curl http://localhost:8081/dcm4chee-arc/ui2
```

### Log Access

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## Scaling Considerations

For high-volume deployments:

1. **Database**: Use managed PostgreSQL (AWS RDS, Azure Database)
2. **Storage**: Use cloud S3 instead of local MinIO
3. **Load Balancing**: Deploy multiple backend instances behind nginx
4. **Caching**: Add Redis for session and query caching
5. **CDN**: Serve frontend from CDN for global distribution
