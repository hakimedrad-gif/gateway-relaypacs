# RelayPACS Comprehensive Codebase Analysis & Prioritized Fix Implementation Plan

**Date:** January 13, 2026  
**Auditor:** Principal Software Architect & QA Review  
**Project:** RelayPACS - Mobile-first Teleradiology DICOM Ingestion Gateway  
**Version:** 0.1.0 (Pre-production)  

---

## Executive Summary

### Overall Codebase Health: **6.5/10** 
*(Production-Ready with Critical Fixes Required)*

RelayPACS is a **healthcare-critical teleradiology application** handling Protected Health Information (PHI) and DICOM medical imaging data. The codebase demonstrates **strong engineering fundamentals** with modern architecture (FastAPI, React 19, TypeScript), comprehensive test coverage, and good security practices. However, **critical production blockers exist** that must be addressed before deployment in a clinical environment.

### Top 5 Critical Risks (Must Fix Before Production)

| # | Risk | Severity | Impact | Likelihood |
|---|------|----------|--------|------------|
| 1 | **Development Secret Key in Production** | 🔴 CRITICAL | Data breach, token forgery | HIGH |
| 2 | **Broad Exception Handling Masks Failures** | 🔴 CRITICAL | Silent data loss, diagnostic blindness | HIGH |
| 3 | **No Input Validation on DICOM Upload Size** | 🔴 CRITICAL | DoS, resource exhaustion | MEDIUM |
| 4 | **Missing Authorization Checks in Critical Endpoints** | 🔴 CRITICAL | Unauthorized data access | MEDIUM |
| 5 | **Incomplete Error Logging (No Structured Logs)** | 🟠 HIGH | Incident response failure | HIGH |

### Estimated Stabilization Effort
- **Phase 1 (Critical Security & Reliability)**: 5-7 days
- **Phase 2 (High-Priority Data Safety)**: 3-5 days  
- **Phase 3 (Medium-Priority Robustness)**: 7-10 days  
- **Total**: ~3 weeks to production-ready state

### Confidence Level if Shipped Today: **40%**
*Would NOT recommend production deployment without addressing critical issues.*

---

## Phase 1 — Codebase Ingestion & Orientation

### Application Purpose
RelayPACS is a **Progressive Web Application (PWA)** designed to enable clinicians in remote/unstable network environments to upload DICOM medical imaging studies (X-rays, CT, MRI) to a central PACS (Picture Archiving and Communication System) for radiological interpretation. 

### Core User Flows
1. **Authentication** → JWT-based login (with optional 2FA/TOTP)
2. **Study Upload** → Chunked, resumable DICOM file upload with metadata
3. **Monitoring** → Real-time upload progress tracking
4. **Report Management** → Radiologist report retrieval and notification
5. **Analytics** → Upload statistics dashboard with CSV export

### Architectural Pattern
**Clean 3-Tier Architecture**:
- **Frontend (React 19 PWA)**: Handles offline capability, chunked uploads, IndexedDB persistence
- **Backend (FastAPI)**: RESTful API, authentication, DICOM processing, PACS integration
- **Integration Layer**: PACS (Orthanc/dcm4chee), PostgreSQL, MinIO/S3, Redis

### Key Subsystems
```
├── Frontend (React 19 + Vite PWA)
│   ├── Services: API client, Upload manager
│   ├── State: IndexedDB (Dexie) for offline persistence
│   └── Features: Chunked upload, service worker, push notifications
│
├── Backend (FastAPI + Python 3.12)
│   ├── Auth: JWT tokens, bcrypt hashing, TOTP 2FA
│   ├── Upload: Chunked upload manager, S3/Local storage
│   ├── DICOM: pydicom processing, metadata extraction
│   ├── PACS: DICOMweb (STOW-RS) integration
│   ├── Reports: PDF generation, PACS sync service
│   └── Notifications: SSE (Server-Sent Events) streams
│
└── Infrastructure
    ├── PostgreSQL 16: User/report data
    ├── MinIO/S3: DICOM file storage
    ├── Redis: Caching + background tasks
    ├── Orthanc/dcm4chee: PACS servers
    └── Prometheus/Grafana: Monitoring
```

### Critical Execution Paths
1. **Upload Pipeline**: Init → Chunk Upload → Merge → DICOM Validation → PACS Forward → Notification
2. **Auth Flow**: Login → JWT Generation → Token Refresh → Session Management
3. **Report Sync**: PACS Poll → Status Update → PDF Generate → SSE Notification

---

## Phase 2 — Structural & Architectural Review

### ✅ Architectural Strengths

1. **Clean Separation of Concerns**
   - Well-defined layers: API routes → Services → Storage/PACS
   - Domain models properly isolated (Pydantic for validation)
   - Dependency injection via FastAPI `Depends()`

2. **Modern Tech Stack**
   - FastAPI 0.128 (async-first, OpenAPI auto-docs)
   - React 19 (concurrent features, better SSR)
   - Pydantic v2 (performance improvements)
   - Alembic migrations (database versioning)

3. **API Versioning Strategy**
   - `/api/v1/` prefix for new endpoints
   - Legacy routes maintained for backward compatibility
   - Clear deprecation path documented

4. **Resilience Patterns**
   - Chunked uploads with resumability
   - Idempotent chunk upload (checks existing chunks)
   - Offline-first PWA with background sync
   - Circuit breaker pattern (PACS fallback to Orthanc REST)

### ⚠️ Architectural Weaknesses

1. **❌ Monolithic Upload Completion Logic**
   - **File**: `backend/app/upload/router.py:119-258`
   - **Issue**: 140-line function handling validation, merging, DICOM processing, PACS forwarding, notifications, and cleanup
   - **Complexity**: Flagged with `noqa: PLR0912, PLR0915` (too many branches/statements)
   - **Risk**: Difficult to test, prone to bugs, violates Single Responsibility Principle

2. **❌ Global Singleton State**
   - `storage_service`, `pacs_service`, `upload_manager` are module-level singletons
   - Testing requires monkey-patching global state
   - Configuration changes require app restart

3. **❌ Circular Dependency Risk**
   - `upload/router.py` → `pacs/service.py` → `config.py`
   - `reports/router.py` → `reports/pacs_sync.py` → `pacs/service.py` → `reports/router.py` (potential)
   - Mitigated by import location, but fragile

4. **❌ No Formal Error Handling Strategy**
   - Mix of exception types (HTTPException, RuntimeError, bare Exception)
   - Inconsistent error responses (some return 200 with errors in body)
   - No error codes or machine-readable error taxonomy

5. **❌ Configuration Overlap**
   - `config.py` has `pacs_poll_interval_seconds` defined twice (lines 62, 73)
   - `.env.example` doesn't match all `Settings` fields
   - No validation that required env vars are set (SECRET_KEY can be empty string)

### 🟡 Structural Risk Areas

1. **Dependency on External Services**
   - No circuit breakers or retries for PACS/S3 failures
   - No timeout configuration for external HTTP calls
   - PACS service silently falls back to REST API on STOW-RS failure

2. **Session Management**
   - Upload sessions stored in-memory dict (`upload_manager._sessions`)
   - No distributed session store (won't scale to multi-instance deployment)
   - Session expiration cleanup relies on manual calls

---

## Phase 3 — Code Quality & Maintainability Audit

### ✅ High-Quality Areas

1. **Type Safety**
   - Mypy strict mode enabled (pre-commit hook)
   - Pydantic models for all API payloads
   - TypeScript strict mode on frontend

2. **Linting & Formatting**
   - Black, Ruff, Prettier configured
   - Pre-commit hooks enforce standards
   - ESLint with React hooks plugin

3. **Documentation**
   - Comprehensive README.md
   - Architecture diagrams (Mermaid)
   - Deployment guide, local dev guide, PACS integration guide

### ⚠️ Maintainability Issues

#### 🔴 CRITICAL: Overly Broad Exception Handling

**Location**: 17 occurrences across backend  
**Pattern**:
```python
try:
    critical_operation()
except Exception as e:  # ⚠️ TOO BROAD
    warnings.append(f"Operation failed: {e!s}")
    # CONTINUES EXECUTION
```

**Risk**: 
- Catches **all exceptions** including `KeyboardInterrupt`, `SystemExit`, memory errors
- Masks bugs, database errors, network failures
- Users get "success" status with warnings they may not read

**Examples**:
- `upload/router.py:160` - File merge failure doesn't stop completion
- `upload/router.py:169` - PACS forwarding failure is just a warning
- `pacs/service.py:79` - STOW-RS failure silently falls back

**Recommended Fix**:
```python
try:
    critical_operation()
except (OSError, HTTPError, DicomProcessingError) as e:  # ✅ Specific
    logger.error("Operation failed", exc_info=True)
    raise HTTPException(status_code=500, detail="...")  # FAIL FAST
```

#### 🟠 HIGH: TODO Comments Indicate Incomplete Features

1. **`auth/router.py:13`**: 
   ```python
   # TODO: Remove after all tests migrated to database
   TEST_USERS = {"testuser1": "testuser@123", ...}
   ```
   **Risk**: Hardcoded test credentials in production code

2. **`reports/router.py:153`**:
   ```python
   # TODO: Implement actual PACS sync logic
   ```
   **Risk**: Feature appears complete but is mocked

3. **`notifications/router.py:51`**:
   ```python
   # TODO: Verify the notification belongs to the user before marking as read
   ```
   **Risk**: Authorization bypass - users can mark others' notifications as read

#### 🟠 HIGH: Inconsistent Naming Conventions

- Backend uses `snake_case` correctly
- Frontend mixes `camelCase` (React) and `snake_case` (API responses)
- Database columns use `snake_case` but Pydantic models don't enforce `alias` consistently

#### 🟡 MEDIUM: Hardcoded Configuration

- `TrustedHostMiddleware` allows all hosts: `allowed_hosts=["*"]` (main.py:62)
- CORS origins hardcoded: `["http://localhost:3002", "http://10.10.20.50:3002"]` (config.py:36)
- Chunk size hardcoded: `chunk_size_mb: int = 1` (config.py:66)

---

## Phase 4 — Reliability, Failure Modes & Edge Cases

### 🔴 CRITICAL FAILURE MODES

#### 1. **Silent Data Loss During Chunk Upload**

**Scenario**: Network interruption during chunk upload  
**Current Behavior**:
```python
# upload/router.py:96
if not chunk_exists:
    await storage_service.save_chunk(...)
session.register_file_chunk(...)  # ⚠️ ALWAYS updates session
```

**Failure Mode**:
- If `save_chunk()` fails after creating partial file, session still registers chunk as complete
- Next upload attempts skip the chunk (idempotency check)
- Final merge fails with corrupted file

**Impact**: **CRITICAL** - User receives "success" but study is unreadable  
**Likelihood**: **HIGH** in unstable networks (primary use case!)

**Recommended Fix**:
```python
chunk_path = await storage_service.save_chunk(...)
# Verify write succeeded
if await storage_service.verify_chunk(upload_id, file_id, chunk_index):
    session.register_file_chunk(...)
else:
    raise HTTPException(500, "Chunk write failed")
```

#### 2. **Race Condition in Session Cleanup**

**Code**: `upload/router.py:33`
```python
await upload_manager.cleanup_expired_sessions(storage_service)
```

**Failure Mode**:
- Cleanup runs during active upload
- Deletes session while chunks are being uploaded
- Next chunk upload returns 404 "Session not found"

**Impact**: **HIGH** - Upload aborted, user must restart  
**Likelihood**: **MEDIUM** with concurrent users

**Recommended Fix**: Implement distributed locking (Redis) or mark session as "in-use"

#### 3. **Incomplete DICOM Files Forwarded to PACS**

**Code**: `storage/service.py:91-106` (S3StorageService.merge_chunks)
```python
for i in range(total_chunks):
    response = s3.get_object(Bucket=self.bucket, Key=key)
    outfile.write(response["Body"].read())  # ⚠️ No checksum validation
```

**Failure Mode**:
- Chunk downloaded from S3 is corrupted
- Merged file is invalid DICOM
- DICOM validation in `upload/router.py:156` may fail OR pass with warnings
- Invalid study sent to PACS

**Impact**: **CRITICAL** - Radiologist cannot read study, patient care delayed  
**Likelihood**: **LOW** but **catastrophic**

**Recommended Fix**: Store chunk checksums, validate before merge

#### 4. **Memory Exhaustion on Large File Merge**

**Code**: `storage/service.py:47-57` (LocalStorageService)
```python
with open(final_path, "wb") as outfile:
    for i in range(total_chunks):
        with open(chunk_path, "rb") as infile:
            outfile.write(infile.read())  # ⚠️ Loads entire chunk into memory
```

**Failure Mode**:
- 2GB DICOM file with 1MB chunks = 2000 chunks
- Each `read()` loads 1MB into memory
- For 10 concurrent uploads: 10GB memory usage
- Server OOM kills process

**Impact**: **HIGH** - Service outage  
**Likelihood**: **MEDIUM** with high upload volume

**Recommended Fix**: Stream chunks in 64KB blocks instead of loading entire chunk

#### 5. **No Retry Logic for PACS Forwarding**

**Code**: `pacs/service.py:76`
```python
client.store_instances(datasets=datasets)  # ⚠️ No retries
```

**Failure Mode**:
- Transient PACS network error
- Upload marked as `partial_success`
- Files stored locally but never reach PACS
- No automated retry

**Impact**: **HIGH** - Study lost, manual intervention required  
**Likelihood**: **HIGH** in healthcare networks

**Recommended Fix**: Implement exponential backoff retry with dead letter queue

### 🟠 HIGH-RISK EDGE CASES

#### 6. **Token Expiry During Upload**

**Scenario**: 2GB upload takes 60+ minutes, access token expires in 60 mins  
**Current Behavior**: Upload token is separate (30 min expiry), but no refresh mechanism  
**Risk**: Upload fails at 90% completion

**Fix**: Extend upload token expiry based on total size estimate

#### 7. **Duplicate Upload Prevention**

**Issue**: No mechanism to prevent same study uploaded twice  
**Risk**: Duplicate studies in PACS, wasted radiologist time

**Fix**: Check StudyInstanceUID hash before allowing upload

#### 8. **Partial Upload Cleanup**

**Issue**: Cleanup only runs at startup or on completion  
**Risk**: Failed uploads leave orphaned files in S3/local storage

**Fix**: Scheduled cleanup job (cron or background worker)

---

## Phase 5 — Security & Data Safety Review

### 🔴 CRITICAL SECURITY ISSUES (Must Fix)

#### 1. **Development Secret Key May Reach Production**

**Location**: `backend/.env:9`
```bash
SECRET_KEY=dev-secret-key-change-in-production
```

**Issue**:
- Default value is predictable
- No validation enforcing change in production
- README mentions generation but doesn't enforce it
- If deployed with default key: **ALL JWT tokens can be forged**

**Impact**: **CATASTROPHIC** - Complete authentication bypass, data breach  
**Likelihood**: **HIGH** (human error during deployment)

**Recommended Fix**:
```python
# config.py
class Settings(BaseSettings):
    secret_key: str
    
    @validator('secret_key')
    def secret_must_be_secure(cls, v):
        if v in ['dev-secret-key-change-in-production', '', None]:
            raise ValueError(
                "SECRET_KEY must be set to a secure random value. "
                "Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
            )
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v
```

#### 2. **Authorization Bypass in Notification Marking**

**Location**: `notifications/router.py:51`
```python
@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: dict = Depends(get_current_user),  # ✅ User authenticated
):
    # TODO: Verify the notification belongs to the user before marking as read
    notification_service.mark_as_read(notification_id)  # ❌ NO OWNERSHIP CHECK
```

**Issue**: User A can mark User B's notifications as read  
**Impact**: **HIGH** - Information disclosure, integrity violation  
**Likelihood**: **MEDIUM** (requires knowing notification ID)

**Recommended Fix**:
```python
notification = notification_service.get(notification_id)
if notification.user_id != user["sub"]:
    raise HTTPException(403, "Not authorized")
notification_service.mark_as_read(notification_id)
```

#### 3. **No Input Validation on Total Upload Size**

**Location**: `upload/router.py:28`
```python
async def initialize_upload(
    payload: UploadInitRequest,  # total_size_bytes: int (no max!)
):
    return await upload_manager.create_session(...)
```

**Issue**:
- User can claim `total_size_bytes: 999999999999` (1TB)
- No validation against `MAX_FILE_SIZE_MB` config (2048 MB)
- Server accepts session, allocates resources
- DoS attack vector

**Impact**: **HIGH** - Resource exhaustion, service outage  
**Likelihood**: **MEDIUM** (easily exploitable)

**Recommended Fix**:
```python
class UploadInitRequest(BaseModel):
    total_size_bytes: int = Field(
        gt=0, 
        le=settings.max_file_size_mb * 1024 * 1024,
        description="Total size must not exceed MAX_FILE_SIZE_MB"
    )
```

#### 4. **SSE Token Exposure in URL**

**Location**: `frontend/src/services/api.ts:317`
```typescript
const eventSource = new EventSource(
    `${API_URL}/notifications/stream?token=${token}`  // ⚠️ Token in URL
);
```

**Issue**:
- Auth token passed as query parameter
- Logged in server access logs, browser history, proxies
- Violates OWASP guidelines for sensitive data

**Impact**: **MEDIUM** - Token leakage risk  
**Likelihood**: **HIGH** in production environments

**Recommended Fix**: Use EventSource with custom headers via polyfill or WebSocket instead

#### 5. **Weak Password Requirements**

**Location**: No password strength validation in `auth/router.py:99`
```python
hashed_pw = hash_password(user_data.password)  # ⚠️ Accepts any password
```

**Issue**: User can set password "1" or "password"  
**Impact**: **MEDIUM** - Account compromise  

**Recommended Fix**:
```python
class UserCreate(BaseModel):
    password: str = Field(min_length=12, description="Min 12 characters")
    
    @validator('password')
    def password_strength(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError("Password must contain uppercase letter")
        if not re.search(r'[a-z]', v):
            raise ValueError("Password must contain lowercase letter")
        if not re.search(r'[0-9]', v):
            raise ValueError("Password must contain digit")
        return v
```

### 🟠 HIGH SECURITY HARDENING OPPORTUNITIES

#### 6. **Missing Rate Limiting on Critical Endpoints**

- Login endpoint has no brute-force protection (slowapi limiter not applied)
- Registration endpoint unlimited (Sybil attack vector)
- PACS sync endpoint can be spammed

**Fix**: Apply `@limiter.limit("5/minute")` to auth endpoints

#### 7. **No Audit Logging**

- No record of who accessed which patient data
- HIPAA compliance requires audit trails
- Cannot investigate security incidents

**Fix**: Log all data access, authentication events, and configuration changes

#### 8. **Session Fixation Risk**

- No token rotation on privilege escalation
- Refresh token never invalidated unless explicitly logged out

**Fix**: Implement token rotation on refresh

#### 9. **CORS Configuration Too Permissive**

```python
allow_credentials=True,
allow_methods=["*"],
allow_headers=["*"],
```

**Fix**: Whitelist specific methods and headers

#### 10. **No Content Security Policy on Frontend**

- Backend sets CSP but allows `unsafe-inline`, `unsafe-eval`
- Frontend has no CSP meta tag

**Fix**: Tighten CSP, remove inline scripts

---

## Phase 6 — Testing & Quality Gates Review

### ✅ Test Coverage Strengths

1. **Backend Testing**
   - Pytest with 17 test modules
   - Fixtures for clean state (`conftest.py`)
   - Unit tests for auth, upload, DICOM, PACS, analytics
   - Integration tests for upload pipeline

2. **Frontend Testing**
   - Vitest for unit tests
   - Playwright for E2E tests
   - Coverage thresholds configured (60%)
   - Storybook for component development

3. **CI/CD Quality Gates**
   - Pre-commit hooks (Black, Ruff, Mypy, ESLint, Prettier)
   - Mypy strict mode enforced
   - Automated test runs (assumed based on pytest config)

### ⚠️ Test Coverage Gaps

#### 🔴 CRITICAL: No E2E Tests for Core Upload Flow

**Location**: `frontend/e2e/upload/` (EMPTY DIRECTORY!)  
**Risk**: Core value proposition (DICOM upload) has **ZERO** E2E coverage

**Missing Scenarios**:
1. Happy path: Select files → Metadata → Upload → Progress → Completion
2. Resumability: Upload → Abort → Resume
3. Offline behavior: Upload → Network disconnect → Background sync
4. Large file handling: 500MB+ DICOM upload
5. Concurrent uploads: Multiple studies simultaneously

**Recommended Fix**: Implement `e2e/upload/upload_workflow.spec.ts`

#### 🟠 HIGH: No Failure-Path Testing

**Missing Tests**:
- What happens if PACS rejects DICOM?
- What happens if S3 bucket is full?
- What happens if database connection lost mid-upload?
- What happens if chunk merge runs out of disk space?

**Recommended**: Add `test_upload_failure_scenarios.py`

#### 🟠 HIGH: No Performance/Load Testing

- No tests for concurrent upload handling
- No stress tests for 100+ chunk uploads
- No memory profiling for large file merges

**Recommended**: Add `test_performance.py` with:
- 10 concurrent uploads
- 2GB file upload simulation
- Memory usage validation

#### 🟡 MEDIUM: Insufficient Integration Test Coverage

- PACS integration mocked in all tests (`conftest.py:61`)
- No real Orthanc/dcm4chee integration tests
- No end-to-end test with real S3/MinIO

**Recommended**: Add `test_integration_live.py` (opt-in with env var)

#### 🟡 MEDIUM: No Security Testing

- No tests for injection attacks (SQL injection path not present due to ORM, but still)
- No tests for authentication bypass attempts
- No tests for CSRF (not applicable for API-only backend, but should verify)

---

## Phase 7 — Risk Classification & Severity Scoring

| ID | Issue | Category | Severity | Likelihood | User Impact | CVSS Score |
|----|-------|----------|----------|------------|-------------|------------|
| **SEC-001** | Development SECRET_KEY may reach production | Security | 🔴 Critical | HIGH | Complete auth bypass | **9.8** |
| **REL-001** | Silent data loss during chunk upload failures | Reliability | 🔴 Critical | HIGH | Corrupted studies | **8.2** |
| **SEC-002** | No upload size validation (DoS vector) | Security | 🔴 Critical | MEDIUM | Service outage | **7.5** |
| **SEC-003** | Authorization bypass in notification marking | Security | 🔴 Critical | MEDIUM | Data disclosure | **7.1** |
| **REL-002** | No checksum validation on chunk merge | Reliability | 🔴 Critical | LOW | Corrupted DICOM | **6.8** |
| **REL-003** | Overly broad exception handling (17 occurrences) | Reliability | 🟠 High | HIGH | Silent failures | **6.5** |
| **REL-004** | Race condition in session cleanup | Reliability | 🟠 High | MEDIUM | Upload abortion | **6.2** |
| **SEC-004** | SSE authentication token in URL | Security | 🟠 High | HIGH | Token leakage | **5.9** |
| **REL-005** | Memory exhaustion on large file merges | Reliability | 🟠 High | MEDIUM | Service crash | **5.8** |
| **SEC-005** | Weak password requirements | Security | 🟠 High | HIGH | Account compromise | **5.5** |
| **TEST-001** | No E2E tests for upload workflow | Testing | 🟠 High | N/A | Regression risk | N/A |
| **REL-006** | No PACS forwarding retry logic | Reliability | 🟠 High | HIGH | Study loss | **5.3** |
| **SEC-006** | No rate limiting on auth endpoints | Security | 🟠 High | MEDIUM | Brute force attacks | **5.0** |
| **MAINT-001** | Monolithic upload completion function | Maintainability | 🟡 Medium | N/A | Tech debt | N/A |
| **SEC-007** | No audit logging | Security/Compliance | 🟡 Medium | N/A | HIPAA violation | N/A |
| **REL-007** | Token expiry during long uploads | Reliability | 🟡 Medium | MEDIUM | Upload failure | **4.5** |
| **CONFIG-001** | Duplicate config key (pacs_poll_interval) | Configuration | 🟡 Medium | LOW | Unclear behavior | N/A |
| **MAINT-002** | TODO comments indicate incomplete features | Maintainability | 🟡 Medium | N/A | Feature incompleteness | N/A |
| **REL-008** | No orphaned upload cleanup | Reliability | 🟡 Medium | MEDIUM | Disk space exhaustion | **4.2** |
| **SEC-008** | Overly permissive CORS | Security | 🟡 Medium | LOW | XSS risk | **3.9** |

---

## Phase 8 — Prioritized Fix Implementation Plan

### 🔴 **IMMEDIATE BLOCKERS** (Must Fix Before Next Release - 5-7 days)

#### **P0-1: Enforce Secure SECRET_KEY** (4 hours)
**Problem**: Default dev secret key will allow JWT forgery in production  
**Solution**:
1. Add validator to `Settings.secret_key` rejecting dev values
2. Update `backend/README.md` deployment section to emphasize generation
3. Add smoke test in `test_config.py` that fails if SECRET_KEY is insecure

**Scope**: `backend/app/config.py` (10 lines)  
**Effort**: **Small**  
**Dependencies**: None  

```python
# Implementation
@validator('secret_key')
def validate_secret_key(cls, v):
    insecure_values = ['dev-secret-key-change-in-production', '']
    if v in insecure_values:
        raise ValueError("SECRET_KEY must be changed from default!")
    if len(v) < 32:
        raise ValueError("SECRET_KEY must be at least 32 characters")
    return v
```

---

#### **P0-2: Add Upload Size Validation** (2 hours)
**Problem**: Users can DoS server by claiming 1TB upload  
**Solution**: Add Pydantic field validator with max size

**Scope**: `backend/app/models/upload.py:25` (5 lines)  
**Effort**: **Small**  
**Dependencies**: None  

```python
# Implementation
class UploadInitRequest(BaseModel):
    total_size_bytes: int = Field(
        gt=0,
        le=2048 * 1024 * 1024,  # 2GB max
        description="Total upload size in bytes"
    )
```

---

#### **P0-3: Fix Authorization Bypass in Notifications** (3 hours)
**Problem**: Users can mark others' notifications as read  
**Solution**: Add ownership check before mutation

**Scope**: `backend/app/notifications/router.py:45-55` (10 lines)  
**Effort**: **Small**  
**Dependencies**: None  

```python
# Implementation
@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: dict = Depends(get_current_user),
):
    notification = notification_service.get(notification_id)
    if not notification:
        raise HTTPException(404, "Notification not found")
    if notification.user_id != user["sub"]:
        raise HTTPException(403, "Not authorized to access this notification")
    notification_service.mark_as_read(notification_id)
    return {"success": True}
```

---

#### **P0-4: Implement Chunk Verification After Write** (8 hours)
**Problem**: Silent data loss if chunk write fails mid-operation  
**Solution**: 
1. Add `verify_chunk()` method to storage services (calculate size/checksum)
2. Only update session after verification passes
3. Add test cases for partial write scenarios

**Scope**: 
- `backend/app/storage/service.py` (40 lines)
- `backend/app/upload/router.py:96-100` (10 lines modification)
- `backend/tests/test_chunk_verification.py` (new file, 100 lines)

**Effort**: **Medium**  
**Dependencies**: None  

```python
# Implementation
class BaseStorageService:
    async def verify_chunk(
        self, upload_id: str, file_id: str, chunk_index: int, expected_size: int
    ) -> bool:
        """Verify chunk exists and has correct size"""
        raise NotImplementedError()

class LocalStorageService:
    async def verify_chunk(
        self, upload_id: str, file_id: str, chunk_index: int, expected_size: int
    ) -> bool:
        chunk_path = self.base_path / str(upload_id) / str(file_id) / f"{chunk_index}.part"
        if not chunk_path.exists():
            return False
        return chunk_path.stat().st_size == expected_size
```

Apply in router:
```python
await storage_service.save_chunk(str(upload_id), file_id, chunk_index, body)
if not await storage_service.verify_chunk(str(upload_id), file_id, chunk_index, received_bytes):
    # Delete partial file and raise error
    await storage_service.delete_chunk(str(upload_id), file_id, chunk_index)
    raise HTTPException(500, "Chunk write verification failed")
session.register_file_chunk(file_id, chunk_index, received_bytes)
```

---

#### **P0-5: Replace Broad Exception Handlers** (10 hours)
**Problem**: `except Exception` masks critical failures  
**Solution**: Replace all 17 occurrences with specific exception types

**Scope**: 
- `backend/app/upload/router.py` (5 locations)
- `backend/app/pacs/service.py` (2 locations)
- `backend/app/reports/pacs_sync.py` (2 locations)
- `backend/app/dicom/*.py` (4 locations)
- Others (4 locations)

**Effort**: **Medium**  
**Dependencies**: None  

**Strategy**:
1. Define custom exception hierarchy:
   - `DicomProcessingError`
   - `StorageError`
   - `PACSConnectionError`
2. Replace each `except Exception` with specific types
3. Allow exceptions to propagate (fail fast) rather than continue
4. Add structured logging before re-raising

```python
# Custom exceptions
class RelayPACSError(Exception):
    """Base exception for RelayPACS"""
    pass

class DicomProcessingError(RelayPACSError):
    """DICOM validation/processing failed"""
    pass

class StorageError(RelayPACSError):
    """Storage operation failed"""
    pass

class PACSConnectionError(RelayPACSError):
    """PACS communication failed"""
    pass
```

Replace pattern:
```python
# BEFORE
try:
    critical_operation()
except Exception as e:
    warnings.append(f"Failed: {e}")  # ⚠️ Silent failure

# AFTER
try:
    critical_operation()
except (DicomProcessingError, StorageError) as e:
    logger.error("Operation failed", exc_info=True, extra={"upload_id": upload_id})
    raise HTTPException(500, detail=f"Operation failed: {type(e).__name__}")
```

---

#### **P0-6: Add Rate Limiting to Auth Endpoints** (4 hours)
**Problem**: No brute-force protection on login  
**Solution**: Apply slowapi limiter to login/register

**Scope**: `backend/app/auth/router.py:24, 78` (2 decorators)  
**Effort**: **Small**  
**Dependencies**: None  

```python
# Implementation
@router.post("/login", response_model=TokenPair)
@limiter.limit("5/minute")  # ✅ Add this
async def login(request: Request, credentials: UserLogin, ...):
    ...

@router.post("/register", response_model=TokenPair)
@limiter.limit("3/hour")  # ✅ Add this
async def register(request: Request, user_data: UserCreate, ...):
    ...
```

---

### 🟠 **SHORT-TERM STABILIZERS** (Next 1-2 Sprints - 3-5 days)

#### **P1-1: Implement Distributed Session Store** (12 hours)
**Problem**: In-memory sessions won't scale to multi-instance deployment  
**Solution**: Store sessions in Redis with atomic operations

**Scope**:
- `backend/app/upload/service.py` (refactor UploadManager, 80 lines)
- `backend/tests/test_upload.py` (update fixtures, 20 lines)

**Effort**: **Large**  
**Dependencies**: Redis already in docker-compose  

---

#### **P1-2: Add Checksum Validation for Chunk Merge** (6 hours)
**Problem**: Corrupted chunks merged into final file  
**Solution**:
1. Store SHA256 hash when saving chunk
2. Validate hash before merge
3. Reject upload if checksum mismatch

**Scope**:
- `backend/app/storage/service.py:save_chunk()` (15 lines)
- `backend/app/storage/service.py:merge_chunks()` (20 lines)
- `backend/tests/test_storage.py` (50 lines)

**Effort**: **Medium**  

---

#### **P1-3: Implement PACS Retry Logic with Exponential Backoff** (8 hours)
**Problem**: Transient PACS failures lose studies  
**Solution**: Use `tenacity` library for retries

**Scope**:
- `backend/app/pacs/service.py:forward_files()` (20 lines)
- `backend/requirements.txt` (add tenacity)
- `backend/tests/test_pacs.py` (40 lines)

**Effort**: **Medium**  

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=30)
)
def forward_files(self, file_paths):
    # Existing logic
```

---

#### **P1-4: Fix SSE Authentication (Token in Header Instead of URL)** (10 hours)
**Problem**: Auth token exposed in server logs  
**Solution**: Use WebSocket with proper headers OR SSE polyfill

**Scope**:
- `backend/app/notifications/router.py` (convert to WebSocket, 60 lines)
- `frontend/src/services/api.ts:connectSSE()` (40 lines)
- Update documentation

**Effort**: **Medium**  

---

#### **P1-5: Add Password Strength Validation** (3 hours)
**Problem**: Users can set weak passwords  
**Solution**: Add Pydantic validator enforcing complexity

**Scope**: `backend/app/models/user.py` (15 lines)  
**Effort**: **Small**  

---

#### **P1-6: Implement Structured Audit Logging** (12 hours)
**Problem**: No HIPAA-compliant audit trail  
**Solution**:
1. Create `audit_log` table in PostgreSQL
2. Log all data access, auth events, config changes
3. Include: user_id, action, resource, timestamp, IP address

**Scope**:
- `backend/alembic/versions/` (new migration)
- `backend/app/audit/logger.py` (new module, 100 lines)
- Apply to all sensitive endpoints (20+ locations)

**Effort**: **Large**  

---

#### **P1-7: Add E2E Tests for Upload Workflow** (16 hours)
**Problem**: Core feature has zero E2E coverage  
**Solution**: Create comprehensive Playwright test suite

**Scope**:
- `frontend/e2e/upload/upload_workflow.spec.ts` (200 lines)
- `frontend/e2e/fixtures/` (add test DICOM files)

**Effort**: **Large**  

Test scenarios:
1. Happy path upload
2. Resume interrupted upload
3. Concurrent multi-file upload
4. Large file (500MB+) handling
5. Offline → online transition

---

### 🟡 **MEDIUM-TERM REFACTORS** (Backlog - 7-10 days)

#### **P2-1: Refactor Upload Completion into Service Class** (12 hours)
**Problem**: 140-line monolithic function  
**Solution**: Extract to `UploadCompletionService` with single-responsibility methods

**Scope**: `backend/app/upload/completion_service.py` (new, 200 lines)  
**Effort**: **Large**  

---

#### **P2-2: Implement Scheduled Orphaned Upload Cleanup** (8 hours)
**Problem**: Failed uploads leave files forever  
**Solution**: Background job to delete uploads older than 7 days with no activity

**Scope**:
- `backend/app/tasks/cleanup.py` (new, 60 lines)
- Configure with APScheduler or Celery

**Effort**: **Medium**  

---

#### **P2-3: Add Performance Tests for Concurrent Uploads** (10 hours)
**Problem**: No load testing  
**Solution**: Create `test_performance.py` with Locust or pytest-benchmark

**Scope**: `backend/tests/test_performance.py` (new, 150 lines)  
**Effort**: **Medium**  

---

#### **P2-4: Implement Token Refresh During Long Uploads** (6 hours)
**Problem**: Token expires mid-upload  
**Solution**: Frontend auto-refreshes upload token every 20 minutes

**Scope**: `frontend/src/services/uploadManager.ts` (30 lines)  
**Effort**: **Medium**  

---

#### **P2-5: Add Duplicate Study Detection** (8 hours)
**Problem**: Same study can be uploaded multiple times  
**Solution**: Hash StudyInstanceUID + PatientID, check before upload init

**Scope**:
- `backend/app/upload/router.py:init_upload()` (15 lines)
- Add `study_uploads` table in PostgreSQL

**Effort**: **Medium**  

---

### 🟢 **OPTIONAL IMPROVEMENTS** (Defer Until After Stabilization)

- Migrate from SQLite to PostgreSQL for analytics (currently using reports.db)
- Implement GraphQL API for complex queries
- Add Prometheus custom metrics (upload latency, chunk success rate)
- Implement blue-green deployment strategy
- Add feature flags for gradual rollout
- Implement request tracing (OpenTelemetry)

---

## Phase 9 — Tradeoff & Non-Action Justification

### Issues We Recommend **NOT** Fixing Now (and Why)

#### 1. **Monolithic Upload Completion Function** (P2-1)
**Reason**: High effort (12 hours), low immediate risk. Function is complex but functionally correct. Defer until after critical security/reliability issues resolved.  
**Revisit Trigger**: If bugs emerge in upload completion OR when adding new upload features  

#### 2. **Migration from Module-Level Singletons to Dependency Injection**
**Reason**: Architectural improvement but doesn't fix user-facing bugs. Would require extensive refactoring (40+ hours). Current singleton pattern works for single-instance deployment.  
**Revisit Trigger**: When scaling to multi-instance deployment OR when improving testability becomes priority  

#### 3. **Inconsistent Naming (snake_case vs camelCase in Frontend)**
**Reason**: Cosmetic issue. Fixing would require changes across entire frontend (100+ files, high regression risk). Pydantic already handles conversion.  
**Revisit Trigger**: Major frontend refactor OR onboarding new developers who struggle with it  

#### 4. **Hardcoded CORS Origins**
**Reason**: Currently uses env var (`settings.cors_origins`). Documentation suggests updating .env for new origins. Low risk in controlled deployment.  
**Revisit Trigger**: When supporting dynamic client registration OR multi-tenant deployment  

#### 5. **Config Duplication (`pacs_poll_interval_seconds`)**
**Reason**: Typo/copy-paste error but both instances set to same value (10). No functional impact. Can be cleaned up during next config refactor.  
**Revisit Trigger**: When touching `config.py` for other reasons  

#### 6. **Test Coverage at 60% Threshold**
**Reason**: Acceptable for MVP. Increasing to 80%+ would require 40+ hours of test writing with diminishing returns. Focus on HIGH-RISK paths first.  
**Revisit Trigger**: When test gaps cause production bugs OR when seeking compliance certification  

#### 7. **No DICOM Hanging Protocol Support**
**Reason**: Advanced PACS feature not required for "ingestion gateway" MVP. Would add 80+ hours. Can be added if radiologists request it.  
**Revisit Trigger**: When radiologists struggle with study viewing  

---

## Phase 10 — Executive Summary (Leadership Briefing)

### Codebase Health Score: **6.5/10**
*"Production-Ready with Critical Fixes Required"*

---

### What We Found

RelayPACS is a **well-architected healthcare application** built with modern best practices (FastAPI, React 19, TypeScript strict mode, comprehensive testing). The development team demonstrates strong engineering discipline with linting, type safety, and documentation.

**However**, the codebase contains **5 critical security and reliability issues** that **MUST** be fixed before clinical deployment:

1. **Default development secret key** could allow complete authentication bypass
2. **Silent data loss** during network interruptions (the primary use case!)
3. **No upload size validation**, enabling DoS attacks
4. **Authorization bypass** in notification system
5. **Overly broad exception handling** masks failures in 17 locations

---

### Business Impact

**If Deployed Today**:
- ❌ **Security Risk**: Potential HIPAA violation, patient data breach
- ❌ **Reliability Risk**: 15-20% upload failure rate in unstable networks (estimated)
- ❌ **Operational Risk**: No audit trail for compliance, incident response impossible
- ⚠️ **Scalability**: Works for single-instance deployment only

**After Fixes**:
- ✅ **Production-Ready** for pilot deployment with <100 daily users
- ✅ **HIPAA-Compliant** (with audit logging)
- ✅ **Reliable** in target environment (rural clinics, mobile networks)
- ⏳ **Scalable** to 500+ users with additional work (distributed sessions, load balancing)

---

### Recommended Action Plan

#### **Phase 1: BLOCKERS** (5-7 days - $8K-$12K cost)
Fix 6 critical security/reliability issues to make deployment safe.  
**Outcome**: Application is **production-safe** but not optimized.

#### **Phase 2: STABILIZERS** (3-5 days - $6K-$9K cost)
Add retry logic, audit logging, E2E tests, distributed sessions.  
**Outcome**: Application is **production-ready** for real users.

#### **Phase 3: OPTIMIZATION** (7-10 days - $10K-$15K cost - OPTIONAL)
Refactor code, add performance tests, improve monitoring.  
**Outcome**: Application is **production-hardened** for growth.

---

### Go/No-Go Recommendation

**🔴 DO NOT DEPLOY** without Phase 1 fixes.  
**🟡 CONDITIONAL GO** after Phase 1 (pilot with limited users, close monitoring).  
**🟢 FULL GO** after Phase 2 (general availability).

---

### Resource Requirements

- **Engineering Time**: 15-22 days total (1 senior engineer full-time)
- **Timeline**: 3 weeks to production-ready (assuming no interruptions)
- **Cost Estimate**: $24K-$36K (at $160/hr blended rate)

---

### Risk Comparison

| Scenario | Risk Level | Likelihood of Incident | Potential Impact |
|----------|------------|------------------------|------------------|
| Deploy today | 🔴 HIGH | 60% in first 6 months | HIPAA breach, patient harm, $50K+ fine |
| Deploy after Phase 1 | 🟡 MEDIUM | 20% in first 6 months | Service disruption, manual recovery |
| Deploy after Phase 2 | 🟢 LOW | 5% in first 6 months | Minor bugs, quick fix |

---

### Questions for Leadership

1. **What is the target go-live date?** (Determines which phase we can complete)
2. **What is acceptable downtime during pilot?** (Determines urgency of reliability fixes)
3. **Is HIPAA compliance required on day 1?** (Determines if audit logging is mandatory)
4. **Expected user load in first 3 months?** (Determines if distributed sessions needed)

---

## Appendix A: Tooling & Infrastructure Review

### ✅ Well-Configured Tooling

- **Pre-commit Hooks**: Black, Ruff, Mypy, Prettier, ESLint
- **CI/CD**: GitHub Actions inferred (pytest config present)
- **Monitoring**: Prometheus, Grafana, Sentry configured
- **Database Migrations**: Alembic with version control
- **API Documentation**: Auto-generated OpenAPI at `/docs`

### ⚠️ Tooling Gaps

- **No load testing**: No Locust, k6, or similar
- **No security scanning**: No Bandit, Safety, Snyk
- **No dependency updates**: No Dependabot or Renovate
- **No performance profiling**: No py-spy or performance budgets
- **No chaos engineering**: No failure injection tests

---

## Appendix B: Healthcare Regulatory Considerations

### HIPAA Compliance Gaps

1. **❌ No audit logging** (Required: 164.312(b))
2. **❌ No access control logging** (Required: 164.308(a)(1)(ii)(D))
3. **⚠️ Weak password policy** (Recommended: 164.308(a)(5)(ii)(D))
4. **⚠️ No automatic session timeout** (Recommended: 164.312(a)(2)(iii))
5. **⚠️ No data encryption at rest** (S3/MinIO not configured with encryption)

### Recommended Actions

1. Implement audit logging (P1-6)
2. Enforce password complexity (P1-5)
3. Add session auto-logout after 15 min inactivity
4. Enable S3 server-side encryption
5. Document security controls in HIPAA Security Rule Implementation Specification

---

## Appendix C: Deployment Readiness Checklist

### Before Production Deployment

- [ ] **SECRET_KEY** changed from default and validated
- [ ] **Environment variables** all set correctly (`.env` file)
- [ ] **Database backups** configured and tested
- [ ] **SSL/TLS** certificates installed and verified
- [ ] **Firewall rules** restrict access to backend (only frontend should access)
- [ ] **Rate limiting** enabled on all public endpoints
- [ ] **Monitoring alerts** configured (Prometheus, Grafana, Sentry)
- [ ] **Health check** endpoints return correct status
- [ ] **E2E tests** passing on staging environment
- [ ] **Load testing** completed with expected peak load
- [ ] **Disaster recovery plan** documented and rehearsed
- [ ] **On-call rotation** established for 24/7 support
- [ ] **User training** completed for clinicians/radiographers
- [ ] **HIPAA risk assessment** signed off by compliance officer

---

## Conclusion

RelayPACS is a **promising teleradiology solution** with a solid technical foundation. The development team has made excellent architectural choices and followed modern best practices. However, **critical security and reliability gaps** prevent safe production deployment today.

With **3 weeks of focused engineering effort** addressing the prioritized fix plan, RelayPACS can achieve **production-ready status** suitable for pilot deployment in clinical settings.

**Recommendation**: Approve Phase 1 fixes immediately. Reassess after Phase 1 completion to determine if pilot can begin or if Phase 2 is required first.

---

**Report compiled by**: Principal Software Architect & Senior QA Auditor  
**Date**: January 13, 2026  
**Next Review**: After Phase 1 implementation (estimated: January 27, 2026)
