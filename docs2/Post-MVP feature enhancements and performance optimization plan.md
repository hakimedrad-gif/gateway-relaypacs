# Post-MVP Feature Enhancements and Performance Optimization Plan

## Document Information
- **Product**: RelayPACS Gateway
- **Purpose**: Future growth and optimization roadmap
- **Version**: 1.0
- **Last Updated**: 2026-01-14

---

## Table of Contents
1. [Feature Enhancement Roadmap](#feature-enhancement-roadmap)
2. [Performance Bottleneck Analysis](#performance-bottleneck-analysis)
3. [Scalability Improvements](#scalability-improvements)
4. [Technical Refactoring](#technical-refactoring)

---

## Feature Enhancement Roadmap

### Phase 1: Enhanced Upload Experience (Q1 2027)

**FE-1.1: Advanced Batch Upload Wizard**
- **Description**: Improved multi-folder upload with study grouping
- **User Value**: Radiographers can upload entire clinic's dailyworkload in one session
- **Implementation**:
  - Recursive folder scanning with progress indicator
  - Automatic patient grouping via DICOM StudyInstanceUID
  - Per-patient metadata override
- **Effort**: 8 points (2 weeks)

**FE-1.2: Upload Templates**
- **Description**: Save frequently used metadata as templates
- **User Value**: Reduces repetitive data entry for common exam types
- **Implementation**:
  - Template CRUD in Settings
  - Template selection dropdown on Upload screen
  - Auto-fill from template
- **Effort**: 5 points (1 week)

**FE-1.3: Drag-and-Drop Study Organization**
- **Description**: Visual interface to organize files into studies
- **User Value**: Correct accidental multi-patient mixtures
- **Implementation**:
  - Card-based UI with drag between study containers
  - Metadata inheritance from first file
- **Effort**: 8 points (2 weeks)

### Phase 2: Advanced Analytics (Q2 2027)

**FE-2.1: Facility-Level Dashboards**
- **Description**: Multi-tenant analytics for hospital administrators
- **User Value**: Compare upload volumes across departments/sites
- **Implementation**:
  - Facility grouping in User model
  - Aggregation queries by facility_id
  - Drill-down charts (facility → user → uploads)
- **Effort**: 13 points (3 weeks)

**FE-2.2: Predictive Upload Volume Forecasting**
- **Description**: ML-based upload volume predictions
- **User Value**: IT can plan capacity based on trends
- **Implementation**:
  - Time-series model (Prophet or ARIMA)
  - Train on historical data (6+ months)
  - Weekly forecast dashboard
- **Effort**: 13 points (3 weeks)

**FE-2.3: Custom Report Builder**
- **Description**: User-defined analytics reports
- **User Value**: QA managers create custom compliance reports
- **Implementation**:
  - Report template designer (drag-drop metrics)
  - Scheduled email delivery (weekly/monthly)
  - PDF/Excel export
- **Effort**: 13 points (3 weeks)

### Phase 3: Collaboration Features (Q3 2027)

**FE-3.1: Report Comments/Annotations**
- **Description**: Clinicians can comment on reports, radiologists respond
- **User Value**: Collaborative care coordination
- **Implementation**:
  - Comments table (report_id FK, user_id, text, timestamp)
  - SSE push for new comments
  - Email notifications
- **Effort**: 8 points (2 weeks)

**FE-3.2: Case Consults**
- **Description**: Request second opinion from specialist radiologist
- **User Value**: Complex cases get expert review
- **Implementation**:
  - "Request Consult" button on reports
  - Consult assignment workflow
  - Addendum PDF generation
- **Effort**: 13 points (3 weeks)

**FE-3.3: Teaching File Library**
- **Description**: Save interesting cases for educational purposes
- **User Value**: Residency training, continuing education
- **Implementation**:
  - "Add to Teaching File" option (anonymizes patient data)
  - Search by modality, diagnosis, difficulty
  - Protected access (requires teaching role)
- **Effort**: 13 points (3 weeks)

### Phase 4: Mobile Applications (Q4 2027)

**FE-4.1: Native iOS App (React Native)**
- **Description**: Dedicated iPhone/iPad app
- **User Value**: Better mobile UX, App Store presence
- **Implementation**:
  - React Native shared codebase (90% code reuse)
  - Native camera integration for photos
  - iOS-specific design (SF Symbols, haptics)
- **Effort**: 21 points (5 weeks)

**FE-4.2: Native Android App (React Native)**
- **Description**: Dedicated Android app
- **User Value**: Larger market share (Android 70% globally in healthcare)
- **Implementation**:
  - Share base with iOS app
  - Material Design 3 theming
  - Android-specific features (widgets, shortcuts)
- **Effort**: 13 points (3 weeks, after iOS)

---

## Performance Bottleneck Analysis

### Current Performance Baseline

| Metric | Current | Target (Post-Optimization) |
|--------|---------|---------------------------|
| **API Latency (P95)** | 480ms | 200ms |
| **Dashboard Load Time** | 2.1s | 0.8s |
| **Upload Throughput** | 50 concurrent | 200 concurrent |
| **Database Query Time (Analytics)** | 800ms | 100ms |

### Identified Bottlenecks

**B-1: N+1 Query Problem in Reports API**
- **Symptom**: `/reports` endpoint takes 1.5s for 50 reports
- **Root Cause**: Lazy loading user and upload relationships
- **Impact**: Poor user experience, high DB load
- **Mitigation**: Use `joinedload` for eager loading

**B-2: Non-Indexed Analytics Queries**
- **Symptom**: Stats calculation takes 3s for 10K uploads
- **Root Cause**: Missing composite index on (created_at, modality, status)
- **Impact**: Slow dashboard, Redis cache misses
- **Mitigation**: Add index, materialize hourly stats

**B-3: Large SSE Connection Pool**
- **Symptom**: Memory usage spikes with >500 connected clients
- **Root Cause**: Each SSE connection holds open socket
- **Impact**: Increased memory, connection limit reached
- **Mitigation**: Implement Redis Pub/Sub for SSE broadcasting

**B-4: Unoptimized Frontend Bundle**
- **Symptom**: Initial page load 3.2s on 3G network
- **Root Cause**: 1.2MB JavaScript bundle
- **Impact**: Poor mobile UX, high bounce rate
- **Mitigation**: Code splitting, tree-shaking, lazy imports

---

## Scalability Improvements

### SI-1: Horizontal Backend Scaling

**Current Limitation**: Single backend pod handles all traffic

**Proposed Architecture**:
nodes
- Scale backend to 5-10 replicas (Kubernetes HPA)
- Stateless design (session in Redis, not memory)
- Sticky sessions for SSE (Nginx `ip_hash`)

**Implementation Steps**:
1. Extract in-memory session manager → Redis
2. Configure Kubernetes HPA (CPU >70% → scale out)
3. Add load balancing with health checks
4. Test failover (kill pod, verify traffic redistribution)

**Expected Improvement**: 10x request capacity (500 → 5000 req/sec)

### SI-2: Database Read Replicas

**Current Limitation**: Single PostgreSQL instance handles all reads + writes

**Proposed Architecture**:
- 1 primary (writes), 2 read replicas
- Route analytics queries to replicas
- Use SQLAlchemy's `bind` parameter for read/write split

**Implementation Steps**:
1. Set up PostgreSQL streaming replication
2. Update connection pool to include replica URLs
3. Modify analytics repository to use read replica
4. Monitor replication lag (<1 second acceptable)

**Expected Improvement**: 3x read throughput, reduced primary load

### SI-3: CDN for Static Assets

**Current Limitation**: Nginx serves frontend assets, limited by single origin

**Proposed Architecture**:
- CloudFront (AWS) or Cloud CDN (GCP) distribution
- Gzip + Brotli compression
- Cache immutable assets for 1 year

**Implementation Steps**:
1. Build frontend with hashed filenames (Vite default)
2. Upload build artifacts to S3
3. Create CloudFront distribution pointing to S3
4. Update `index.html` to reference CDN URLs
5. Set cache headers: `Cache-Control: public, max-age=31536000, immutable`

**Expected Improvement**: 10x faster global load times, 90% origin offload

### SI-4: Object Storage Optimization

**Current Limitation**: All chunks stored in single MinIO bucket

**Proposed Architecture**:
- Partition by date: `s3://bucket/2027/01/14/upload-123/`
- Lifecycle policies:
  - Standard storage for 90 days
  - Glacier Instant Retrieval for 90-365 days
  - Glacier Deep Archive for >1 year
- Cross-region replication for DR

**Implementation Steps**:
1. Update S3 key structure in storage service
2. Define lifecycle policy in CloudFormation/Terraform
3. Enable versioning for audit trail
4. Set up replication rule to DR region

**Expected Improvement**: 70% storage cost reduction after 1 year

---

## Technical Refactoring

### TR-1: Microservices Decomposition (Optional)

**Current**: Modular monolith
**Future**: Decompose into independent services

**Proposed Microservices**:
1. **Auth Service**: User management, JWT issuing
2. **Upload Service**: Session management, chunk handling
3. **PACS Gateway**: DICOMweb integration, retry logic
4. **Analytics Service**: Stats aggregation, reporting
5. **Notification Service**: SSE, push notifications, email

**Benefits**:
- Independent scaling (e.g., scale upload service 10x, auth 2x)
- Technology diversity (use Go for upload service performance)
- Fault isolation (PACS down doesn't affect uploads)

**Risks**:
- Increased operational complexity
- Network latency between services
- Distributed transaction challenges

**Decision**: Defer until >100K users or clear need

### TR-2: Event-Driven Architecture

**Current**: Synchronous API calls
**Future**: Event streaming with Kafka/RabbitMQ

**Event Types**:
- `upload.initiated`
- `upload.chunk_received`
- `upload.completed`
- `report.status_changed`
- `notification.created`

**Benefits**:
- Decoupled services
- Replay events for debugging
- Enable real-time analytics stream

**Implementation**:
```python
# Producer (upload service)
event = {
    "type": "upload.completed",
    "upload_id": upload_id,
    "user_id": user_id,
    "timestamp": datetime.utcnow().isoformat()
}
producer.send("upload-events", event)

# Consumer (notification service)
@consumer("upload-events")
async def handle_upload_completed(event):
    notification = create_notification(event)
    await broadcast_via_sse(notification)
```

### TR-3: GraphQL API (Alternative to REST)

**Current**: RESTful API with OpenAPI
**Future**: GraphQL for flexible querying

**Benefits for Clients**:
- Single request for complex data (no over-fetching)
- Client-defined response shape
- Real-time subscriptions (replace SSE)

**Example Query**:
```graphql
query GetUserDashboard {
  currentUser {
    id
    uploads(status: COMPLETED, limit: 10) {
      id
      metadata { patientName, studyDate }
      report {
        status
        pdfUrl
      }
    }
    notifications(unread: true) {
      id
      type
      message
    }
  }
}
```

**Decision**: Research spike (2 weeks), then decide based on client needs

---

## Prioritization Matrix

| Enhancement | User Value | Effort | Priority |
|-------------|------------|--------|----------|
| Advanced Batch Upload | High | Medium | **P0** |
| Facility-Level Dashboards | High | High | **P0** |
| Database Read Replicas | Medium | Medium | **P0** |
| CDN Static Assets | Medium | Low | **P1** |
| Report Comments | High | Medium | **P1** |
| Native Mobile Apps | Very High | Very High | **P1** |
| Microservices Decomposition | Low | Very High | **P2** |
| GraphQL API | Medium | High | **P2** |

---

**Document Status**: ✅ COMPLETE
**Maintained By**: Product & Engineering Leadership
**Review Frequency**: Quarterly roadmap planning
