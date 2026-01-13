# Prometheus/Grafana Monitoring Setup Guide

## Overview

RelayPACS now includes comprehensive monitoring using Prometheus (metrics collection) and Grafana (visualization).

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│                 │      │                  │      │                 │
│  RelayPACS      │─────▶│   Prometheus     │─────▶│    Grafana      │
│  Backend        │      │   (Port 9090)    │      │   (Port 3000)   │
│  /metrics       │      │                  │      │                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                    ┌────▼────┐       ┌─────▼──────┐
                    │PostgreSQL│       │   Redis    │
                    │ Exporter │       │  Exporter  │
                    │ (9187)   │       │  (9121)    │
                    └──────────┘       └────────────┘
```

## Services

### Prometheus
- **URL:** http://localhost:9090
- **Purpose:** Metrics collection and time-series database
- **Scrape Interval:** 15 seconds (backend: 10s)
- **Data Retention:** 15 days (configurable)

### Grafana
- **URL:** http://localhost:3000
- **Default Credentials:**
  - Username: `admin`
  - Password: `admin` (change on first login!)
- **Dashboards:** Pre-configured RelayPACS overview dashboard

### Metrics Exporters
- **postgres-exporter:** PostgreSQL database metrics (port 9187)
- **redis-exporter:** Redis cache metrics (port 9121)

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start all services including monitoring
docker-compose up -d

# Or start only monitoring services
docker-compose up -d prometheus grafana postgres-exporter redis-exporter
```

### 2. Access Dashboards

**Prometheus:**
```bash
# Open Prometheus UI
open http://localhost:9090

# Query examples:
# - http_requests_total
# - http_request_duration_seconds
# - pg_stat_database_numbackends
```

**Grafana:**
```bash
# Open Grafana
open http://localhost:3000

# Login with admin/admin
# Navigate to Dashboards → RelayPACS Overview
```

### 3. Verify Metrics

```bash
# Check backend metrics endpoint
curl http://localhost:8003/metrics

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check if Grafana datasource is working
curl -u admin:admin http://localhost:3000/api/datasources
```

## Available Metrics

### Backend (FastAPI) Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method, endpoint, status |
| `http_request_duration_seconds` | Histogram | Request latency distribution |
| `http_request_size_bytes` | Summary | Request payload sizes |
| `http_response_size_bytes` | Summary | Response payload sizes |

### Database Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `pg_stat_database_numbackends` | Gauge | Number of active connections |
| `pg_stat_database_xact_commit` | Counter | Committed transactions |
| `pg_stat_database_xact_rollback` | Counter | Rolled back transactions |
| `pg_stat_database_blks_read` | Counter | Disk blocks read |
| `pg_stat_database_blks_hit` | Counter | Disk blocks found in cache |
| `pg_database_size_bytes` | Gauge | Database size in bytes |

### Redis Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `redis_memory_used_bytes` | Gauge | Memory used by Redis |
| `redis_connected_clients` | Gauge | Number of client connections |
| `redis_commands_processed_total` | Counter | Total commands processed |
| `redis_keyspace_hits_total` | Counter | Cache hits |
| `redis_keyspace_misses_total` | Counter | Cache misses |

## Grafana Dashboards

### Pre-configured Dashboard: RelayPACS Overview

Panels included:
1. **API Request Rate** - Requests per second by endpoint
2. **API Response Time (p95)** - 95th percentile latency
3. **Database Connections** - Active PostgreSQL connections
4. **Redis Memory Usage** - Cache memory consumption

### Creating Custom Dashboards

1. Navigate to Dashboards → New → New Dashboard
2. Add Panel → Select Prometheus datasource
3. Write PromQL query (examples below)
4. Configure visualization (Time series, Gauge, Table, etc.)
5. Save dashboard

**Example PromQL Queries:**

```promql
# Request rate by endpoint
rate(http_requests_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Cache hit ratio
rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))

# Database query rate
rate(pg_stat_database_xact_commit[5m])

# Error rate (HTTP 5xx)
rate(http_requests_total{status=~"5.."}[5m])
```

## Alerting (Optional)

### Configure Alertmanager

1. Create `monitoring/prometheus/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  receiver: 'email'

receivers:
  - name: 'email'
    email_configs:
      - to: 'alerts@yourdomain.com'
        from: 'prometheus@yourdomain.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_password: 'app-password'
```

2. Create alert rules in `monitoring/prometheus/alerts/relaypacs.yml`:

```yaml
groups:
  - name: relaypacs
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} requests/sec"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency"
          description: "95th percentile latency is {{ $value }}s"
```

3. Update docker-compose.yml to add Alertmanager service

## Production Recommendations

### Security

1. **Change Grafana admin password:**
   ```bash
   # In docker-compose.yml, set:
   - GF_SECURITY_ADMIN_PASSWORD=STRONG_PASSWORD_HERE
   ```

2. **Enable authentication for Prometheus:**
   - Use reverse proxy (Nginx) with basic auth
   - Or use Grafana as proxy (Settings → Data Sources → Prometheus → Auth)

3. **Restrict network access:**
   - Bind to localhost only: `127.0.0.1:9090`
   - Use firewall rules to limit access

### Performance

1. **Adjust scrape intervals:**
   - Reduce to 30s or 60s for high-traffic systems
   - Balance between granularity and storage

2. **Configure retention:**
   ```yaml
   # In prometheus.yml
   storage:
     tsdb:
       retention.time: 30d  # Keep 30 days of data
       retention.size: 50GB  # Or limit by size
   ```

3. **Enable compression:**
   - Prometheus automatically compresses old data
   - Monitor disk usage: `du -sh /var/lib/docker/volumes/geteway_prometheus_data`

### High Availability

For production, consider:
- Running multiple Prometheus instances
- Using Thanos or Cortex for long-term storage
- Setting up Grafana HA with shared database

## Troubleshooting

### Prometheus not scraping targets

```bash
# Check Prometheus targets status
curl http://localhost:9090/api/v1/targets | jq

# Check Prometheus logs
docker logs prometheus

# Verify backend metrics are exposed
curl http://localhost:8003/metrics
```

### Grafana can't connect to Prometheus

```bash
# Test connectivity from Grafana container
docker exec grafana curl http://prometheus:9090/api/v1/query?query=up

# Check Grafana logs
docker logs grafana
```

### Missing metrics

```bash
# List all available metrics
curl http://localhost:8003/metrics | grep "^# TYPE"

# Check if exporter is running
docker ps | grep exporter

# Verify exporter metrics
curl http://localhost:9187/metrics  # PostgreSQL
curl http://localhost:9121/metrics  # Redis
```

## Useful Commands

```bash
# Restart monitoring stack
docker-compose restart prometheus grafana

# View logs
docker-compose logs -f prometheus grafana

# Backup Grafana dashboards
docker exec grafana grafana-cli admin export-dashboard \
  --homepath=/usr/share/grafana relaypacs-overview

# Import custom dashboard
curl -X POST http://admin:admin@localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @custom-dashboard.json
```

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)

## Support

If you encounter issues:
1. Check logs: `docker-compose logs prometheus grafana`
2. Verify configuration files in `monitoring/` directory
3. Review Prometheus targets: http://localhost:9090/targets
4. Check service status: `docker-compose ps`
