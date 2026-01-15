# Infrastructure & DevOps

## Document Information
- **Product**: RelayPACS Gateway
- **Purpose**: Infrastructure architecture and operational procedures
- **Version**: 1.0
- **Last Updated**: 2026-01-14

---

## Table of Contents
1. [Infrastructure Overview](#infrastructure-overview)
2. [Environment Strategy](#environment-strategy)
3. [Networking & Security](#networking--security)
4. [Scalability & Availability](#scalability--availability)
5. [Monitoring & Logging](#monitoring--logging)
6. [Backup & Disaster Recovery](#backup--disaster-recovery)
7. [Operations Runbooks](#operations-runbooks)

---

## Infrastructure Overview

### Architecture Model
RelayPACS follows a **microservices-oriented containerized architecture** with the following characteristics:

- **Deployment Model**: Containerized services orchestrated via Docker Compose (development) with cloud-native Kubernetes readiness (production)
- **Hosting Strategy**: Cloud-agnostic design with preference for managed services
- **Network Architecture**: Internal service mesh with reverse proxy for external access
- **Data Persistence**: Hybrid storage combining relational database, object storage, and in-memory cache

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Compute** | Docker containers | Application isolation and portability |
| **Orchestration** | Docker Compose (dev), Kubernetes (prod) | Service lifecycle management |
| **Web Server** | Nginx | Reverse proxy, SSL termination, static file serving |
| **Application** | FastAPI (Python 3.12+), React 19 + Vite 7 | Backend API and frontend SPA |
| **Database** | PostgreSQL 16 | Relational data persistence |
| **Cache** | Redis 7 | Session storage, rate limiting, stats caching |
| **Object Storage** | MinIO (S3-compatible) | DICOM file chunks, merged studies |
| **PACS** | Orthanc 1.11+, dcm4chee-arc 5.34+ | Medical imaging archives |
| **Monitoring** | Prometheus + Grafana | Metrics collection and visualization |
| **Error Tracking** | Sentry | Application error monitoring |

### Infrastructure Diagram (Conceptual)

```mermaid
graph TB
    subgraph "External"
        USER[Mobile/Desktop Clients]
        PACS_EXT[External PACS Systems]
    end

    subgraph "Edge Layer"
        NGINX[Nginx Reverse Proxy<br/>SSL Termination]
    end

    subgraph "Application Layer"
        BACKEND[FastAPI Backend<br/>Python 3.12]
        FRONTEND[React PWA<br/>Vite Build]
    end

    subgraph "Data Layer"
        POSTGRES[(PostgreSQL 16<br/>Users, Uploads, Reports)]
        REDIS[(Redis 7<br/>Cache, Sessions)]
        MINIO[MinIO S3<br/>DICOM Files]
    end

    subgraph "Integration Layer"
        ORTHANC[Orthanc PACS]
        DCM4CHEE[dcm4chee-arc PACS]
    end

    subgraph "Observability"
        PROMETHEUS[Prometheus]
        GRAFANA[Grafana Dashboards]
        SENTRY[Sentry Error Tracking]
    end

    USER --> NGINX
    NGINX --> BACKEND
    NGINX --> FRONTEND

    BACKEND --> POSTGRES
    BACKEND --> REDIS
    BACKEND --> MINIO
    BACKEND --> ORTHANC
    BACKEND --> DCM4CHEE
    BACKEND --> SENTRY

    ORTHANC --> PACS_EXT
    DCM4CHEE --> PACS_EXT

    BACKEND --> PROMETHEUS
    PROMETHEUS --> GRAFANA
```

---

## Environment Strategy

### Environment Separation

RelayPACS maintains **four distinct environments** with progressive validation gates:

#### 1. Development (Local)
- **Purpose**: Individual developer workstations
- **Infrastructure**: Docker Compose on localhost
- **Data**: Synthetic test data, anonymized samples
- **Access**: Local only (127.0.0.1)
- **Refresh Strategy**: On-demand via `docker-compose up`

**Key Characteristics**:
- Hot reload enabled (Vite HMR, FastAPI auto-reload)
- Debug logging enabled
- No SSL (HTTP only)
- Volume mounts for live code changes

#### 2. Staging (Pre-Production)
- **Purpose**: Integration testing, UAT, demo environment
- **Infrastructure**: Kubernetes cluster (managed service recommended)
- **Data**: Sanitized production copy (weekly refresh)
- **Access**: VPN or IP allowlist
- **Refresh Strategy**: Automated deployment on `main` branch merge

**Key Characteristics**:
- Production-like configuration
- SSL enabled with self-signed or LetsEncrypt certs
- Monitoring enabled (Prometheus, Grafana)
- Performance testing allowed

#### 3. Production
- **Purpose**: Live user-facing environment
- **Infrastructure**: Kubernetes with auto-scaling
- **Data**: Live patient data (PHI)
- **Access**: Public internet (clinicians) + VPN (admins)
- **Refresh Strategy**: Blue-green or canary deployments

**Key Characteristics**:
- High availability (multi-AZ)
- SSL required (valid CA-signed certificates)
- Full observability stack
- Automated backups
- HIPAA-compliant logging

#### 4. Disaster Recovery (DR)
- **Purpose**: Standby environment for failover
- **Infrastructure**: Warm standby in alternate region
- **Data**: Replicated from production (1-hour lag max)
- **Access**: Activated only during DR event
- **Refresh Strategy**: Continuous replication

### Environment Variables

All environments use **12-factor app** principles for configuration:

**Critical Secrets** (must be unique per environment):
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DB_PASSWORD=<strong-random-password>

# Authentication
SECRET_KEY=<256-bit-random-key>
JWT_SECRET_KEY=<separate-256-bit-key>

# Storage
MINIO_ACCESS_KEY=<20-char-key>
MINIO_SECRET_KEY=<40-char-secret>

# PACS
ORTHANC_USERNAME=<orthanc-user>
ORTHANC_PASSWORD=<orthanc-pass>
DCM4CHEE_USERNAME=<dcm-user>
DCM4CHEE_PASSWORD=<dcm-pass>

# Monitoring
SENTRY_DSN=https://<key>@sentry.io/<project>
```

**Environment-Specific Configurations**:
```bash
# Development
DEBUG=true
LOG_LEVEL=DEBUG
CORS_ORIGINS=http://localhost:5173

# Production
DEBUG=false
LOG_LEVEL=INFO
CORS_ORIGINS=https://relaypacs.example.com
```

---

## Networking & Security

### Network Topology

```mermaid
graph LR
    subgraph "Public Zone"
        ALB[Application Load Balancer<br/>SSL Termination]
    end

    subgraph "DMZ"
        NGINX[Nginx Reverse Proxy<br/>WAF, Rate Limiting]
    end

    subgraph "Application Zone"
        BACKEND[Backend Services<br/>No Direct Internet]
        FRONTEND[Frontend Assets<br/>CDN-backed]
    end

    subgraph "Data Zone"
        DATABASE[(Database<br/>Private Subnet)]
        STORAGE[(Object Storage<br/>Private Access)]
    end

    ALB --> NGINX
    NGINX --> BACKEND
    NGINX --> FRONTEND
    BACKEND --> DATABASE
    BACKEND --> STORAGE
```

### Security Controls

#### 1. Network Security
- **Firewall Rules**:
  - Allow HTTPS (443) inbound from anywhere
  - Allow HTTP (80) inbound only for redirect to HTTPS
  - Deny all other inbound traffic
  - Outbound: Allow HTTPS (443) for PACS forwarding, API calls

- **Security Groups** (AWS) or Network Policies (Kubernetes):
  - Backend → PostgreSQL: port 5432
  - Backend → Redis: port 6379
  - Backend → MinIO: port 9000
  - Backend → PACS: ports 8042 (Orthanc), 8080 (dcm4chee)
  - No direct public access to data layer

#### 2. SSL/TLS Configuration
- **Certificate Management**: LetsEncrypt with auto-renewal (cert-manager on K8s)
- **TLS Version**: Minimum TLS 1.2, prefer TLS 1.3
- **Cipher Suites**: Strong ciphers only (ECDHE-RSA-AES256-GCM-SHA384, etc.)
- **HSTS**: Enabled with 1-year max-age

**Nginx SSL Config** (production):
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

#### 3. Application Security
- **Authentication**: JWT with RS256 signing
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: Implemented via slowapi + Redis
  - Login: 5 attempts/minute per IP
  - Upload init: 20/minute per user
  - API calls: 100/minute per user
- **Input Validation**: Pydantic models on all endpoints
- **SQL Injection Protection**: SQLAlchemy ORM with parameterized queries
- **XSS Protection**: React auto-escapes, Content-Security-Policy headers
- **CSRF Protection**: SameSite cookies, CORS restrictions

#### 4. Data Encryption
- **At Rest**:
  - PostgreSQL: Transparent Data Encryption (TDE) if supported by cloud provider
  - MinIO: Server-side encryption (SSE-S3 or SSE-KMS)
  - Redis: Encrypted volumes
- **In Transit**: TLS for all network communication
- **PHI Handling**: DICOM files contain patient identifiers; all storage encrypted

#### 5. Secrets Management
- **Development**: `.env` files (git-ignored)
- **Staging/Production**:
  - Kubernetes Secrets (encrypted at rest with KMS)
  - AWS Secrets Manager or HashiCorp Vault (recommended)
- **Rotation Policy**: Rotate database passwords quarterly, API keys annually

---

## Scalability & Availability

### Horizontal Scaling Strategy

#### Backend Services
- **Auto-Scaling Policy**:
  - Scale out: CPU >70% for 3 minutes
  - Scale in: CPU <30% for 10 minutes
  - Min replicas: 2 (production), 1 (staging)
  - Max replicas: 10 (production), 3 (staging)

**Kubernetes HPA Configuration**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: relaypacs-backend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

#### Frontend (Static Assets)
- **CDN Distribution**: CloudFront (AWS), Cloud CDN (GCP), or Cloudflare
- **Cache Policy**: Immutable assets (JS, CSS with hashes) cached for 1 year
- **Origin Failover**: Multi-region S3 bucket replication

#### Database (PostgreSQL)
- **Vertical Scaling**: Start with db.m5.large (2 vCPU, 8GB RAM), scale to db.m5.2xlarge if needed
- **Read Replicas**: 1-2 read replicas for analytics queries
- **Connection Pooling**: PgBouncer with 100 max connections

#### Redis
- **Cluster Mode**: Enabled for production (3 master nodes, 3 replicas)
- **Eviction Policy**: `allkeys-lru` for cache keys
- **Max Memory**: 4GB per node

#### Object Storage (MinIO/S3)
- **Infinite Horizontal Scale**: Object storage scales automatically
- **Performance**:
  - 3,500 PUT/COPY/POST/DELETE requests per second per prefix
  - 5,500 GET/HEAD requests per second per prefix
  - Use study-date prefix for distribution: `s3://bucket/2026/01/14/study-123/`

### High Availability Architecture

#### Multi-AZ Deployment (Production)

```mermaid
graph TB
    subgraph "Availability Zone 1"
        ALB1[Load Balancer]
        BACKEND1[Backend Pod 1]
        POSTGRES_PRIMARY[(PostgreSQL Primary)]
    end

    subgraph "Availability Zone 2"
        BACKEND2[Backend Pod 2]
        POSTGRES_STANDBY[(PostgreSQL Standby)]
    end

    subgraph "Availability Zone 3"
        BACKEND3[Backend Pod 3]
    end

    ALB1 --> BACKEND1
    ALB1 --> BACKEND2
    ALB1 --> BACKEND3

    BACKEND1 --> POSTGRES_PRIMARY
    BACKEND2 --> POSTGRES_PRIMARY
    BACKEND3 --> POSTGRES_PRIMARY

    POSTGRES_PRIMARY -.->|Async Replication| POSTGRES_STANDBY
```

**Failure Scenarios**:
- **Single pod failure**: Load balancer redistributes traffic to healthy pods
- **AZ failure**: Remaining 2 AZs handle traffic (degraded but operational)
- **Database primary failure**: Auto-failover to standby (30-60 second downtime)

#### Service Level Objectives (SLOs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Uptime** | 99.9% | 43 minutes downtime/month acceptable |
| **API Latency (P95)** | <500ms | Prometheus histogram |
| **API Latency (P99)** | <1s | Prometheus histogram |
| **Upload Success Rate** | >99% | Completed uploads / total uploads |
| **PACS Forwarding Success** | >98% | Successful forwards / total attempts |
| **Data Loss** | 0% | Zero tolerance for completed uploads |

---

## Monitoring & Logging

### Metrics Collection (Prometheus)

#### Application Metrics
Exposed via `/metrics` endpoint using `prometheus-fastapi-instrumentator`:

**Standard Metrics**:
- `http_requests_total`: Counter of HTTP requests by method, path, status
- `http_request_duration_seconds`: Histogram of request latencies
- `http_requests_in_progress`: Gauge of active requests

**Custom Metrics**:
```python
# Upload metrics
upload_init_total = Counter('upload_init_total', 'Total upload sessions initialized')
upload_complete_total = Counter('upload_complete_total', 'Total completed uploads', ['status'])
upload_duration_seconds = Histogram('upload_duration_seconds', 'Upload completion time')

# PACS metrics
pacs_forward_total = Counter('pacs_forward_total', 'PACS forwards', ['pacs_type', 'status'])
pacs_connectivity = Gauge('pacs_connectivity', 'PACS health check', ['pacs_type'])

# Business metrics
active_users = Gauge('active_users', 'Currently authenticated users')
```

#### Infrastructure Metrics
- **Node Exporter**: CPU, memory, disk, network per host
- **PostgreSQL Exporter**: Connection count, query duration, replication lag
- **Redis Exporter**: Hit rate, memory usage, evictions

**Prometheus Scrape Config**:
```yaml
scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:8000']
    scrape_interval: 15s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Visualization (Grafana)

**Pre-Built Dashboards**:

1. **RelayPACS Overview**:
   - Request rate (req/sec)
   - Error rate (%)
   - Latency (P50, P95, P99)
   - Upload success rate
   - Active users

2. **Infrastructure Health**:
   - CPU usage per pod
   - Memory usage per pod
   - Disk I/O
   - Network throughput

3. **Database Performance**:
   - Active connections
   - Query duration
   - Replication lag
   - Transaction rate

### Alerting Rules

**Critical Alerts** (PagerDuty integration):
```yaml
groups:
  - name: critical
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High 5xx error rate: {{ $value }}"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          summary: "PostgreSQL is down"

      - alert: PacsConnectivityLost
        expr: pacs_connectivity == 0
        for: 5m
        annotations:
          summary: "PACS {{ $labels.pacs_type }} unreachable"
```

### Centralized Logging

#### Log Aggregation Stack
- **Log Shipper**: Fluentd or Filebeat
- **Log Storage**: Elasticsearch or CloudWatch Logs
- **Log Visualization**: Kibana or CloudWatch Insights

**Log Levels**:
- **DEBUG**: Development only (verbose)
- **INFO**: Normal operations (upload started, completed)
- **WARNING**: Recoverable errors (retry succeeded)
- **ERROR**: Failures requiring attention (PACS unreachable)
- **CRITICAL**: System-level failures (database connection lost)

**Structured Logging Format** (JSON):
```json
{
  "timestamp": "2026-01-14T20:15:30.123Z",
  "level": "INFO",
  "service": "backend",
  "trace_id": "7f8a3d2e-1c4b-4a9f-8e3d-2f1a4b5c6d7e",
  "user_id": "user123",
  "upload_id": "upload456",
  "message": "Upload completed successfully",
  "latency_ms": 4523
}
```

**Log Retention**:
- **Development**: 7 days
- **Staging**: 30 days
- **Production**: 90 days (HIPAA compliance minimum)

### Error Tracking (Sentry)

**Integration Points**:
- **Backend**: Python SDK with FastAPI integration
- **Frontend**: JavaScript SDK with React error boundaries

**Error Context** (attached to all events):
- User ID (hashed for privacy)
- Session ID
- Request ID (trace ID)
- Environment (dev/staging/prod)
- Release version (git SHA)

**Alert Thresholds**:
- New error type: Immediate notification
- Error rate >10 events/minute: Immediate notification
- Error count >100 in 1 hour: Slack notification

---

## Backup & Disaster Recovery

### Backup Strategy

#### PostgreSQL Backups
- **Method**: Continuous archiving with WAL shipping
- **Schedule**:
  - Full backup: Daily at 2 AM UTC
  - Incremental (WAL): Every 5 minutes
- **Retention**:
  - Daily backups: 30 days
  - Weekly backups: 90 days
  - Monthly backups: 1 year
- **Storage**: S3 with versioning enabled, encrypted
- **Tool**: `pg_basebackup` + `pg_receivewal`

**Backup Verification**:
- Weekly restore test to staging environment
- Automated integrity checks (checksum validation)

#### Object Storage (DICOM Files)
- **Method**: S3 versioning + cross-region replication
- **Retention**: Objects never deleted (medical record retention laws)
- **Lifecycle Policy**:
  - Current version: Standard storage
  - After 90 days: Glacier Instant Retrieval
  - After 1 year: Glacier Deep Archive
- **Replication**: Asynchronous replication to DR region (15-minute lag max)

#### Redis (Session Data)
- **Method**: RDB snapshots + AOF logging
- **Schedule**: Snapshot every 6 hours, AOF every second
- **Retention**: Last 7 snapshots
- **Criticality**: Low (sessions can be recreated; cache is ephemeral)

### Disaster Recovery Planning

#### RTO & RPO Targets

| Component | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|-----------|-------------------------------|--------------------------------|
| **Backend Services** | 15 minutes | 0 (stateless) |
| **PostgreSQL** | 1 hour | 5 minutes (WAL interval) |
| **Object Storage** | 4 hours | 15 minutes (replication lag) |
| **Redis** | 30 minutes | 1 second (AOF) |

#### Disaster Scenarios & Procedures

**Scenario 1: Availability Zone Failure**
- **Impact**: Service degradation, no data loss
- **Actions**:
  1. Kubernetes auto-redistributes pods to healthy AZs
  2. Database auto-fails over to standby (if primary affected)
  3. Monitor performance; scale horizontally if needed
- **Recovery Time**: Automatic (1-2 minutes)

**Scenario 2: Region Failure**
- **Impact**: Complete outage, requires DR activation
- **Actions**:
  1. Activate DR Kubernetes cluster in alternate region
  2. Promote DR database to primary
  3. Update DNS to point to DR ALB
  4. Sync ObjectStorage from replicated bucket
  5. Notify users via status page
- **Recovery Time**: 4 hours (manual process)

**Scenario 3: Data Corruption**
- **Impact**: Limited to affected records
- **Actions**:
  1. Identify corruption scope (time range, table)
  2. Restore PostgreSQL to point-in-time before corruption
  3. Export affected data from backup
  4. Selectively merge into production
- **Recovery Time**: 2-8 hours (depends on data volume)

**Scenario 4: Ransomware / Security Breach**
- **Impact**: Potential data exfiltration, system compromise
- **Actions**:
  1. Isolate affected systems (network segmentation)
  2. Rotate all credentials and API keys
  3. Restore from backup to clean environment
  4. Forensic analysis
  5. Notify affected parties (HIPAA breach notification)
- **Recovery Time**: 24-72 hours

### DR Activation Checklist

**Prerequisites** (maintained continuously):
- [ ] DR infrastructure provisioned and idle
- [ ] Database replication <1 hour lag
- [ ] S3 replication <15 minutes lag
- [ ] DNS TTL set to 60 seconds for quick cutover

**Activation Steps**:
1. [ ] Declare disaster (decision by CTO)
2. [ ] Stop production database writes
3. [ ] Promote DR database to primary
4. [ ] Start DR Kubernetes services
5. [ ] Run smoke tests
6. [ ] Update DNS CNAME: `relaypacs.com` → DR ALB
7. [ ] Monitor for 1 hour
8. [ ] Communicate to users

---

## Operations Runbooks

### Routine Maintenance

#### Weekly Tasks
- [ ] Review Grafana dashboards for anomalies
- [ ] Check Sentry for new error types
- [ ] Verify backup completion (PostgreSQL, S3)
- [ ] Review capacity metrics (CPU, memory, disk trending)

#### Monthly Tasks
- [ ] Patch Docker base images (rebuild containers)
- [ ] Update Python/Node.js dependencies (security patches)
- [ ] Test DR restore procedure
- [ ] Review and rotate API keys (if >90 days old)
- [ ] Audit user access (remove inactive accounts)

#### Quarterly Tasks
- [ ] Full load test (simulate 5x normal traffic)
- [ ] Review and update SLOs based on real data
- [ ] Security audit (penetration test recommended)
- [ ] Rotate database passwords

### Incident Response Procedures

#### Severity Levels

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| **P1 (Critical)** | Complete outage, data loss | 15 minutes | Database down, all uploads failing |
| **P2 (High)** | Major feature broken | 1 hour | PACS forwarding failing, login broken |
| **P3 (Medium)** | Minor feature degraded | 4 hours | Slow dashboard loading, notifications delayed |
| **P4 (Low)** | Cosmetic issue | Next business day | Typo in UI, minor CSS bug |

#### Incident Response Workflow

1. **Detection**: Automated alert or user report
2. **Triage**: Assign severity, notify on-call engineer
3. **Diagnosis**: Check logs, metrics, recent deployments
4. **Mitigation**:
   - Rollback recent deployment (if applicable)
   - Scale resources (if capacity issue)
   - Failover to backup system (if infrastructure)
5. **Resolution**: Implement permanent fix
6. **Postmortem**: Within 48 hours for P1/P2

**Communication Templates**:
- Status page update: "We are investigating reports of slow upload performance."
- Incident resolved: "The issue has been resolved. All services are operational."

### Scaling Procedures

**Horizontal Scaling** (Add capacity):
```bash
# Increase backend replicas
kubectl scale deployment backend --replicas=5

# Verify pods running
kubectl get pods -l app=backend
```

**Vertical Scaling** (Database):
```bash
# Modify RDS instance class (AWS CLI)
aws rds modify-db-instance \
  --db-instance-identifier relaypacs-prod \
  --db-instance-class db.m5.2xlarge \
  --apply-immediately
```

**Pre-Scaling Checklist**:
- [ ] Notify team of maintenance window
- [ ] Take database snapshot
- [ ] Monitor for 1 hour post-scaling

---

## Compliance & Governance

### HIPAA Compliance

**Technical Safeguards** (45 CFR §164.312):
- [x] Access Control: RBAC with audit logging
- [x] Audit Controls: Centralized logging (90-day retention)
- [x] Integrity: Checksums on DICOM files, database TDE
- [x] Transmission Security: TLS 1.2+ for all network traffic

**Administrative Safeguards** (45 CFR §164.308):
- [x] Security Management: Quarterly risk assessments
- [x] Workforce Training: Annual HIPAA training required
- [x] Breach Notification: Procedure documented (notify within 60 days)

### Data Residency
- **US Deployments**: All data stored in US regions (HIPAA requirement)
- **International**: LocalData residency compliance per jurisdiction

---

**Document Status**: ✅ COMPLETE
**Maintained By**: DevOps Team
**Review Frequency**: Quarterly or after major infrastructure changes
