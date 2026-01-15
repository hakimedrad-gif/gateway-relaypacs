# Hosting & Service Integration Plan

## Document Information
- **Product**: RelayPACS Gateway
- **Purpose**: Cloud deployment and external service strategy
- **Version**: 1.0
- **Last Updated**: 2026-01-14

---

## Table of Contents
1. [Hosting Options](#hosting-options)
2. [Cloud Services](#cloud-services)
3. [Third-Party Integrations](#third-party-integrations)
4. [Cost Analysis](#cost-analysis)
5. [Vendor Lock-In Mitigation](#vendor-lock-in-mitigation)

---

## Hosting Options

### Option 1: AWS (Recommended)

**Architecture**:
```
EKS (Kubernetes) → ECS Fargate (alternative)
RDS PostgreSQL → Aurora PostgreSQL Serverless v2
ElastiCache Redis → MemoryDB
S3 → S3 Intelligent-Tiering
CloudFront → CDN
Route 53 → DNS
ALB → Load Balancing
```

**Advantages**:
- ✅ Mature healthcare offerings (HIPAA BAA available)
- ✅ Global infrastructure (23 regions)
- ✅ Comprehensive managed services
- ✅ Strong disaster recovery options
- ✅ Cost optimization tools (Savings Plans, Spot Instances)

**Disadvantages**:
- ❌ Highest cost among major clouds
- ❌ Complex pricing model
- ❌ Vendor lock-in risk (Lambda, DynamoDB)

**Estimated Monthly Cost** (100 active users, 5K uploads/month):
- **Compute** (EKS): $150 (3×t3.medium nodes)
- **Database** (RDS): $120 (db.t3.medium)
- **Storage** (S3): $50 (500GB + requests)
- **Cache** (ElastiCache): $50 (cache.t3.micro)
- **CDN** (CloudFront): $30 (100GB transfer)
- **Misc** (ALB, Route53): $30
- **Total**: ~$430/month

---

### Option 2: Google Cloud Platform (GCP)

**Architecture**:
```
GKE (Kubernetes)
Cloud SQL PostgreSQL
Memorystore Redis
Cloud Storage
Cloud CDN
Cloud Load Balancing
```

**Advantages**:
- ✅ Best Kubernetes support (GKE is native)
- ✅ Superior data analytics (BigQuery integration)
- ✅ Simpler pricing than AWS
- ✅ Strong AI/ML offerings (Vertex AI)

**Disadvantages**:
- ❌ Smaller healthcare customer base
- ❌ Fewer regions than AWS (36 vs 23)
- ❌ Less mature enterprise support

**Estimated Monthly Cost** (same workload):
- **Compute** (GKE): $120
- **Database** (Cloud SQL): $100
- **Storage** (GCS): $45
- **Cache** (Memorystore): $45
- **CDN** (Cloud CDN): $25
- **LB**: $18
- **Total**: ~$353/month (18% cheaper than AWS)

---

### Option 3: Azure

**Architecture**:
```
AKS (Kubernetes)
Azure Database for PostgreSQL
Azure Cache for Redis
Azure Blob Storage
Azure CDN
Azure Front Door
```

**Advantages**:
- ✅ Best for hybrid cloud (Azure Arc)
- ✅ Strong Microsoft ecosystem integration (Active Directory)
- ✅ Healthcare cloud (Azure for Healthcare)

**Disadvantages**:
- ❌ Historically less developer-friendly
- ❌ More complex Azure CLI vs AWS CLI
- ❌ Fewer third-party integrations

**Estimated Monthly Cost**: ~$380/month (comparable to AWS)

---

### Option 4: On-Premises / Self-Hosted

**Use Case**: Hospitals with strict data sovereignty requirements

**Architecture**:
- Kubernetes (k3s or OpenShift)
- PostgreSQL (on VMs or bare metal)
- Redis (on VMs)
- MinIO (distributed mode)
- HAProxy (load balancing)

**Advantages**:
- ✅ Complete data control
- ✅ No egress fees
- ✅ Compliance with local regulations

**Disadvantages**:
- ❌ High upfront capital expenditure
- ❌ Operational burden (patches, backups, DR)
- ❌ Scaling complexity

**Estimated Cost**:
- **Hardware**: $20K (servers, networking)
- **Staff**: 1 FTE DevOps engineer ($120K/year)
- **Power/Cooling**: $500/month
- **Total 3-Year TCO**: $200K+ (vs $15K cloud)

**Recommendation**: Only for >10K users or regulatory mandates

---

## Cloud Services

### Managed Kubernetes

**AWS EKS**:
- **Control Plane**: $0.10/hour ($73/month)
- **Worker Nodes**: EC2 pricing (t3.medium = $30/month)
- **Pros**: Auto-scaling, managed upgrades
- **Cons**: Still requires node management

**GKE Autopilot**:
- **Pricing**: Pay only for pods (no node management)
- **Cost**: $0.04/vCPU/hour, $0.004/GB/hour
- **Pros**: Fully managed, no node tuning
- **Cons**: Less control over node types

**Recommendation**: GKE Autopilot for simplicity, EKS for advanced control

### Database

**AWS RDS PostgreSQL**:
- **Pricing**: $0.068/hour (db.t3.medium)
- **Backups**: Automated, 7-day retention free
- **Multi-AZ**: +100% cost for HA
- **Pros**: Automated patching, point-in-time recovery
- **Cons**: Limited configuration tunability

**Aurora PostgreSQL Serverless v2**:
- **Pricing**: $0.12/ACU/hour (auto-scales 0.5-128 ACUs)
- **Pros**: Instant scaling, pause when idle
- **Cons**: Newer service, higher cost at scale

**Google Cloud SQL**:
- **Pricing**: $0.057/hour (db-n1-standard-1, 10% cheaper)
- **Pros**: Easier management console
- **Cons**: Slower to add new PostgreSQL versions

**Recommendation**: RDS for production stability, Aurora Serverless for development environments

### Object Storage

**AWS S3**:
- **Standard**: $0.023/GB/month
- **Intelligent-Tiering**: Automatic cost optimization (no retrieval fee)
- **Glacier**: $0.004/GB/month (3-5 hour retrieval)
- **Pros**: 99.999999999% durability, lifecycle policies
- **Cons**: Complex pricing (requests, transfer)

**GCP Cloud Storage**:
- **Standard**: $0.020/GB/month (13% cheaper)
- **Nearline**: $0.010/GB/month (30-day minimum)
- **Coldline**: $0.004/GB/month (90-day minimum)
- **Pros**: Simpler pricing
- **Cons**: Fewer tiers than S3

**Recommendation**: S3 Intelligent-Tiering for automated cost savings

### Monitoring

**AWS CloudWatch**:
- **Metrics**: $0.30/metric/month
- **Logs**: $0.50/GB ingested
- **Alarms**: $0.10/alarm/month
- **Pros**: Native AWS integration
- **Cons**: Limited visualization, expensive at scale

**Grafana Cloud** (Third-Party):
- **Free Tier**: 10K metrics, 50GB logs
- **Paid**: $49/month (100K metrics, 100GB logs)
- **Pros**: Superior dashboards, community plugins
- **Cons**: Data egress from AWS to Grafana

**Datadog**:
- **Pricing**: $15/host/month + $0.10/GB logs
- **Pros**: APM, network monitoring, unified platform
- **Cons**: Expensive for large deployments

**Recommendation**: Prometheus (self-hosted) + Grafana Cloud (free tier) for MVP

---

## Third-Party Integrations

### Error Tracking

**Sentry**:
- **Free Tier**: 5K errors/month
- **Team Plan**: $26/month (50K errors)
- **Features**: Stack traces, source maps, release tracking
- **Integration**: Python SDK, JavaScript SDK
- **Alternatives**: Rollbar, Bugsnag

### Email Delivery

**SendGrid**:
- **Free Tier**: 100 emails/day
- **Essentials**: $19.95/month (50K emails)
- **Features**: Templates, analytics, bounce handling
- **Alternatives**: AWS SES ($0.10/1K emails), Mailgun

### SMS Notifications

**Twilio**:
- **Pricing**: $0.0079/SMS (US)
- **Features**: Programmable messaging, delivery tracking
- **Use Case**: Critical report notifications
- **Alternatives**: AWS SNS, Vonage

### Push Notifications

**Firebase Cloud Messaging (FCM)**:
- **Cost**: Free (unlimited)
- **Features**: iOS + Android support, topic subscriptions
- **Integration**: PWA notifications, native apps
- **Alternatives**: OneSignal, Pushwoosh

### Analytics

**Google Analytics 4**:
- **Cost**: Free (up to 10M events/month)
- **Features**: User journey tracking, conversion funnels
- **Privacy**: Configure to exclude PHI

**Mixpanel**:
- **Free Tier**: 100K events/month
- **Growth**: $25/month (1M events)
- **Features**: Cohort analysis, A/B testing

**Recommendation**: GA4 for product analytics, Mixpanel for power users

---

## Cost Analysis

### Projected Costs by User Scale

| Users | Uploads/Month | AWS Cost | GCP Cost | Azure Cost |
|-------|---------------|----------|----------|------------|
| **100** | 5K | $430 | $353 | $380 |
| **1K** | 50K | $1,200 | $980 | $1,050 |
| **10K** | 500K | $4,800 | $3,900 | $4,200 |
| **100K** | 5M | $28,000 | $22,500 | $24,500 |

**Assumptions**:
- 10 uploads/user/month
- 20MB average upload size
- 90-day data retention (then archive)
- 3-node Kubernetes cluster (scales to 10 nodes)

### Cost Optimization Strategies

**CO-1: Reserved Instances**
- Save 40-60% on compute by committing to 1-3 year terms
- Apply to: RDS, ElastiCache, EC2 (Kubernetes nodes)

**CO-2: S3 Lifecycle Policies**
- Move to Glacier after 90 days: 83% savings
- Delete after 7 years (medical record retention)

**CO-3: Auto-Scaling**
- Scale down to 1 node off-hours (nights, weekends)
- Save ~30% on compute

**CO-4: Spot Instances**
- Use for non-critical workloads (analytics jobs)
- Save up to 90%

**Estimated Savings**: 50% reduction ($430 → $215/month for 100 users)

---

## Vendor Lock-In Mitigation

### Cloud-Agnostic Technologies

| Component | Cloud-Agnostic Choice | AWS Proprietary | GCP Proprietary |
|-----------|----------------------|-----------------|-----------------|
| **Compute** | Kubernetes | ECS/Fargate | Cloud Run |
| **Database** | PostgreSQL (any host) | Aurora | Cloud Spanner |
| **Cache** | Redis (any host) | ElastiCache | Memorystore |
| **Storage** | S3  API (MinIO compat) | S3 native | GCS native |
| **Queue** | RabbitMQ, Kafka | SQS | Pub/Sub |
| **Secrets** | HashiCorp Vault | Secrets Manager | Secret Manager |

**Strategy**:
- ✅ Prioritize open-source, portable technologies
- ✅ Use cloud services via standard APIs (S3 API, PostgreSQL wire protocol)
- ✅ Infrastructure as Code (Terraform, not CloudFormation)
- ⚠️ Avoid proprietary services (Lambda, DynamoDB) for core logic

### Multi-Cloud Escape Plan

**If need to migrate AWS → GCP**:
1. **Database**: pg_dump → restore to Cloud SQL (4-hour downtime for 100GB)
2. **Object Storage**: s3cmd sync to GCS (background transfer, then cutover)
3. **Kubernetes**: Export manifests, apply to GKE (same YAML)
4. **DNS**: Update Route 53 → Cloud DNS (TTL cutover)

**Estimated Migration Time**: 1 week for 1K users, 1 month for 100K

---

## Deployment Recommendation

**MVP (0-1K users)**: GCP (lower cost, simpler)
**Growth (1K-10K users)**: AWS (HIPAA compliance, healthcare customers)
**Enterprise (10K+ users)**: AWS or multi-region hybrid

**Decision Criteria**:
- Customer requirements (existing AWS contracts?)
- Team expertise (hire experienced AWS/GCP engineers)
- Compliance (HIPAA BAA prioritizes AWS/Azure)
- Budget (GCP 20% cheaper at small scale)

---

**Document Status**: ✅ COMPLETE
**Maintained By**: CTO + DevOps Lead
**Review Frequency**: Annually or when cloud costs exceed budget by 20%
