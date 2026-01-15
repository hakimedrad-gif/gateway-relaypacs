# RelayPACS Local Development - Quick Reference

## 🚀 Quick Start Commands

### Start All Services
```bash
docker-compose up -d
```

### Check Service Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Stop Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart
```

### Clean Slate (Remove Volumes)
```bash
docker-compose down -v
```

---

## 🔗 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend (PWA)** | http://localhost:3002 | - |
| **Backend API Docs** | http://localhost:8003/docs | - |
| **Grafana** | http://localhost:3000 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin |
| **Orthanc PACS** | http://localhost:8045 | orthanc / orthanc |
| **PostgreSQL** | localhost:5433 | relaypacs / relaypacs |
| **Redis** | localhost:6379 | (no auth) |

---

## 🔍 Verification

### Run Full Infrastructure Check
```bash
./scripts/verify_local_infrastructure.sh
```

### Check Database
```bash
docker-compose exec postgres psql -U relaypacs -d relaypacs -c "\dt"
```

### Check Redis
```bash
docker-compose exec redis redis-cli ping
```

### Check MinIO
```bash
curl http://localhost:9000/minio/health/live
```

### Check Backend Health
```bash
curl http://localhost:8003/health
```

### Check Prometheus Targets
```bash
curl http://localhost:9090/api/v1/targets
```

---

## 🛠️ Development Workflow

### Backend Development (Hot Reload)
1. Edit files in `backend/`
2. FastAPI automatically reloads
3. Check logs: `docker-compose logs -f backend`

### Frontend Development (Vite HMR)
```bash
cd frontend
npm run dev
# Access at http://localhost:5173 with hot module replacement
```

### Database Migrations
```bash
# Access database shell
docker-compose exec postgres psql -U relaypacs -d relaypacs

# Run migrations (if using Alembic)
docker-compose exec backend alembic upgrade head
```

### Testing
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

---

## 📊 Monitoring

### View Metrics
```bash
# Backend metrics
curl http://localhost:8003/metrics

# Prometheus query (example: request count)
curl 'http://localhost:9090/api/v1/query?query=http_requests_total'
```

### Grafana Dashboards
1. Go to http://localhost:3000
2. Login: admin / admin
3. Navigate to Dashboards
4. Import or create custom dashboards

---

## 🔧 Troubleshooting

### Port Conflicts
```bash
# Check what's using ports
sudo netstat -tuln | grep -E '(3002|8003|5433|6379|9000)'

# Kill process on port (example: 8003)
sudo kill $(sudo lsof -t -i:8003)
```

### Container Won't Start
```bash
# View logs
docker-compose logs <service-name>

# Rebuild container
docker-compose build <service-name>
docker-compose up -d <service-name>
```

### Database Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
sleep 5
docker-compose up -d backend
```

### Clear Docker Cache
```bash
# Remove unused containers, volumes, images
docker system prune -a --volumes
```

---

## 📝 Environment Variables

### Backend (.env)
```bash
SECRET_KEY=dev-secret-key-change-in-production
DATABASE_URL=postgresql+psycopg2://relaypacs:relaypacs@postgres:5432/relaypacs
REDIS_URL=redis://redis:6379
S3_ENDPOINT=http://minio:9000
ORTHANC_URL=http://orthanc:8042
DEBUG=true
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8003
```

---

## 🔐 Security Notes (Development)

- ✅ **SECRET_KEY:** Using dev key (acceptable for local)
- ✅ **Passwords:** Default passwords (acceptable for local)
- ✅ **CORS:** Configured for localhost
- ⚠️ **Production:** Generate secure keys and passwords before deploying

Generate secure SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 📦 Backup & Restore (Development)

### Backup Database
```bash
docker-compose exec postgres pg_dump -U relaypacs relaypacs > backup.sql
```

### Restore Database
```bash
cat backup.sql | docker-compose exec -T postgres psql -U relaypacs -d relaypacs
```

### Export MinIO Data
```bash
docker-compose exec minio mc mirror local/relay-pacs-uploads ./backup
```

---

## 🎯 Common Tasks

### Add Python Package
```bash
cd backend
pip install <package>
pip freeze > requirements.txt
docker-compose build backend
docker-compose up -d backend
```

### Add npm Package
```bash
cd frontend
npm install <package>
docker-compose build frontend
docker-compose up -d frontend
```

### View Database
```bash
docker-compose exec postgres psql -U relaypacs -d relaypacs
```

### Clear Redis Cache
```bash
docker-compose exec redis redis-cli FLUSHALL
```

### Reset Everything
```bash
docker-compose down -v
docker-compose up -d
```

---

## 📚 Documentation

- **Infrastructure & DevOps:** `docs2/Infrastructure & DevOps.md`
- **API Documentation:** http://localhost:8003/docs (when backend running)
- **Verification Script:** `scripts/verify_local_infrastructure.sh`

---

## ✅ Setup Verification Checklist

Before starting development, verify:

- [ ] `docker-compose ps` shows all services running
- [ ] Backend API accessible: http://localhost:8003/docs
- [ ] Frontend accessible: http://localhost:3002
- [ ] Grafana accessible: http://localhost:3000
- [ ] Prometheus showing all targets UP: http://localhost:9090/targets
- [ ] MinIO console accessible: http://localhost:9001
- [ ] No errors in `docker-compose logs`

---

**Status:** Infrastructure is properly configured and ready for development! 🚀
