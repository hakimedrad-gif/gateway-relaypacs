# RelayPACS Local Development Environment Setup

This guide explains how to set up and run RelayPACS for local development and testing.

## Prerequisites Installed

Before starting, ensure you have:
- ✅ Docker Desktop (or Docker Engine + Docker Compose)
- ✅ Git
- ✅ 8GB+ RAM available
- ✅ 20GB+ free disk space

## Quick Start (2 Minutes)

### 1. Start All Services

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway

# Start all Docker services
docker-compose up -d

# Watch logs (optional)
docker-compose logs -f
```

### 2. Initialize Database

```bash
# Run database migrations
docker-compose exec backend alembic upgrade head
```

### 3. Access the Application

Open your browser to:
- **Frontend (PWA)**: http://localhost:3002
- **Backend API Docs**: http://localhost:8003/docs
- **API Health Check**: http://localhost:8003/health

## Current Configuration (Local Development)

### Backend Services

Your backend is configured with these local development settings:

```bash
# Security (Development - NOT for production)
SECRET_KEY=dev-secret-key-CHANGE-IN-PRODUCTION-use-secrets-token-urlsafe
DEBUG=true

# Database
DATABASE_URL=postgresql+psycopg2://relaypacs:relaypacs@postgres:5432/relaypacs

# PACS Servers (Running in Docker)
ACTIVE_PACS=dcm4chee
DCM4CHEE_URL=http://dcm4chee:8080/dcm4chee-arc/aets/DCM4CHEE/rs
ORTHANC_URL=http://orthanc:8042

# Storage (MinIO in Docker)
USE_S3=true
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Cache (Redis in Docker)
REDIS_URL=redis://redis:6379

# CORS (Allow local frontend)
CORS_ORIGINS=["http://localhost:3002","http://10.10.20.50:3002","http://127.0.0.1:3002"]
```

### Frontend Configuration

```bash
# API Connection
VITE_API_URL=http://localhost:8003

# Features
VITE_ENABLE_2FA=true
VITE_ENABLE_ANALYTICS=true

# Development
VITE_DEBUG=true
```

## Development Workflow

### Starting Services

```bash
# Start all services in background
docker-compose up -d

# Or start with logs visible
docker-compose up
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Restarting After Code Changes

**Backend changes:**
```bash
# Backend has hot-reload enabled, just save your Python files
# Or restart manually:
docker-compose restart backend
```

**Frontend changes:**
```bash
# Frontend has Vite hot-reload, changes appear automatically
# Or rebuild:
docker-compose up -d --build frontend
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## Service Access

### All Available Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3002 | - |
| **Backend API** | http://localhost:8003/docs | - |
| **PostgreSQL** | localhost:5433 | relaypacs/relaypacs |
| **Redis** | localhost:6379 | no password |
| **MinIO Console** | http://localhost:9001 | minioadmin/minioadmin |
| **Orthanc** | http://localhost:8042 | orthanc/orthanc |
| **dcm4chee** | http://localhost:8081 | see dcm4chee docs |
| **Prometheus** | http://localhost:9090 | - |
| **Grafana** | http://localhost:3000 | admin/admin |

### Database Access

```bash
# Via Docker exec
docker exec -it geteway-postgres-1 psql -U relaypacs -d relaypacs

# Via local psql (if installed)
psql -h localhost -p 5433 -U relaypacs -d relaypacs

# Password: relaypacs
```

### Redis CLI

```bash
# Access Redis CLI
docker exec -it geteway-redis-1 redis-cli

# Test
> PING
PONG

# Monitor commands
> MONITOR
```

## Testing the Application

### 1. Create a Test User

```bash
docker-compose exec backend python << 'EOF'
from app.db.database import SessionLocal
from app.models.user import User
from app.auth.password import get_password_hash

try:
    db = SessionLocal()

    # Check if user exists
    existing = db.query(User).filter(User.username == 'testuser').first()
    if existing:
        print("Test user already exists: testuser/testpass")
    else:
        user = User(
            username='testuser',
            email='test@relaypacs.local',
            full_name='Test User',
            hashed_password=get_password_hash('testpass'),
            is_active=True,
            role='radiologist'
        )
        db.add(user)
        db.commit()
        print("✓ Test user created: testuser/testpass")
    db.close()
except Exception as e:
    print(f"Error: {e}")
EOF
```

### 2. Test Authentication

```bash
# Get authentication token
curl -X POST http://localhost:8003/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### 3. Test File Upload

```bash
# Save token from previous step
TOKEN="your-token-here"

# Upload a file
curl -X POST http://localhost:8003/api/v1/upload/test \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/test/file.dcm"
```

### 4. Access Frontend

1. Open http://localhost:3002
2. Login with testuser/testpass
3. Test upload workflow
4. Check reports dashboard

## Development Tools

### API Documentation

- **Swagger UI**: http://localhost:8003/docs
- **ReDoc**: http://localhost:8003/redoc
- **OpenAPI JSON**: http://localhost:8003/openapi.json

### Database Migrations

```bash
# Create a new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback one migration
docker-compose exec backend alembic downgrade -1

# Show current version
docker-compose exec backend alembic current

# Show migration history
docker-compose exec backend alembic history
```

### Running Tests

```bash
# Backend tests
docker-compose exec backend pytest

# With coverage
docker-compose exec backend pytest --cov=app --cov-report=html

# Specific test file
docker-compose exec backend pytest tests/test_auth.py

# Frontend tests
docker-compose exec frontend npm test

# E2E tests
docker-compose exec frontend npx playwright test
```

### Code Quality

```bash
# Backend linting
docker-compose exec backend ruff check .
docker-compose exec backend black --check .
docker-compose exec backend mypy app

# Frontend linting
docker-compose exec frontend npm run lint

# Format code
docker-compose exec backend black .
docker-compose exec backend ruff check --fix .
```

## Monitoring & Debugging

### Prometheus Metrics

Access http://localhost:9090 and try these queries:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Request duration
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Database connections
pg_stat_database_numbackends{datname="relaypacs"}

# Redis memory
redis_memory_used_bytes
```

### Grafana Dashboards

1. Open http://localhost:3000
2. Login: admin/admin
3. Navigate to Dashboards → RelayPACS Overview
4. View metrics in real-time

### Application Logs

```bash
# Backend logs with timestamps
docker-compose logs -f --timestamps backend

# Filter for errors
docker-compose logs backend | grep ERROR

# Export logs
docker-compose logs backend > backend-logs.txt
```

## Common Development Tasks

### Resetting the Database

```bash
# Stop services
docker-compose down

# Remove PostgreSQL volume
docker volume rm geteway_postgres_data

# Restart and migrate
docker-compose up -d postgres
sleep 5
docker-compose exec backend alembic upgrade head
```

### Clearing Redis Cache

```bash
docker exec geteway-redis-1 redis-cli FLUSHALL
```

### Resetting MinIO Storage

```bash
docker-compose down
docker volume rm geteway_minio_data
docker-compose up -d minio
```

### Complete Reset (Fresh Start)

```bash
# Stop all services and remove volumes
docker-compose down -v

# Remove all containers and images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build

# Run migrations
sleep 30
docker-compose exec backend alembic upgrade head
```

## Troubleshooting

### Services Won't Start

```bash
# Check what's running
docker-compose ps

# Check specific service logs
docker-compose logs backend
docker-compose logs postgres

# Restart problematic service
docker-compose restart backend

# Rebuild if needed
docker-compose up -d --build backend
```

### Port Already in Use

```bash
# Find what's using the port
sudo lsof -i :8003

# Kill the process
sudo kill -9 <PID>

# Or change port in docker-compose.yml
```

### Database Connection Errors

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker exec geteway-postgres-1 pg_isready -U relaypacs

# Restart PostgreSQL
docker-compose restart postgres
```

### Frontend Can't Connect to Backend

1. Check `VITE_API_URL` in `frontend/.env`
2. Verify CORS settings in `backend/.env`
3. Check backend is running: `curl http://localhost:8003/health`
4. Rebuild frontend: `docker-compose up -d --build frontend`

## Performance Tips

### Faster Docker Builds

```bash
# Use BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build with cache
docker-compose build --parallel
```

### Development Mode Hot Reload

Both frontend and backend have hot-reload enabled:
- **Backend**: Uvicorn watches Python files and reloads
- **Frontend**: Vite HMR updates instantly

Just save your files and changes appear automatically!

### Resource Limits

If Docker is slow, increase resources:
- Docker Desktop → Settings → Resources
- Recommended: 4 CPU cores, 8GB RAM

## Next Steps

1. **Start Developing**: Make changes to code and see them instantly
2. **Run Tests**: Ensure quality with `pytest` and `playwright`
3. **Use API Docs**: Explore endpoints at http://localhost:8003/docs
4. **Monitor**: Check Grafana at http://localhost:3000

## Additional Resources

- **PACS Integration**: `docs/pacs_integration_guide.md`
- **Architecture**: `docs/architecture.md`
- **Deployment**: `docs/deployment.md`
- **Monitoring**: `docs/monitoring.md`

---

**You're all set for local development! 🚀**

Any changes you make will be reflected immediately thanks to hot-reload. Happy coding!
