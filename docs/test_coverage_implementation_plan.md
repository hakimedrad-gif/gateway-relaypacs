# Comprehensive Test Coverage Implementation Plan
## RelayPACS - Target: 95% Code Coverage, 100% E2E Coverage

**Created:** January 13, 2026
**Goal:** Achieve 95% code line coverage, 100% critical path coverage, and comprehensive E2E test suite
**Current State:** ~60% backend coverage, ~40% frontend coverage, minimal E2E coverage

---

## Executive Summary

### Current Test Coverage Baseline

| Category | Current | Target | Gap | Effort (hours) |
|----------|---------|--------|-----|----------------|
| **Backend Unit Tests** | ~60% | 95% | 35% | 80h |
| **Backend Integration Tests** | ~40% | 100% (critical paths) | 60% | 60h |
| **Frontend Unit Tests** | ~40% | 95% | 55% | 70h |
| **Frontend Component Tests** | ~30% | 95% | 65% | 50h |
| **Frontend Integration Tests** | ~20% | 90% | 70% | 40h |
| **E2E Tests** | ~15% (auth only) | 100% (critical flows) | 85% | 100h |
| **Performance Tests** | 0% | 100% (critical endpoints) | 100% | 30h |
| **Security Tests** | 0% | 100% (vulnerabilities) | 100% | 20h |

**Total Effort:** ~450 hours (11-12 weeks with 1 engineer, 6 weeks with 2 engineers)

### Test Infrastructure Improvements Needed

1. ✅ **Already Present**: pytest, Vitest, Playwright, coverage reporting
2. ❌ **Missing**: Mutation testing, contract testing, chaos engineering
3. ⚠️ **Needs Enhancement**: Test data factories, fixture management, parallel execution

---

## Phase 1: Backend Test Coverage (95% Target)

### 1.1 Backend Unit Tests (Target: 95% line coverage)

#### Current Coverage Analysis

**Existing Test Files (15 files):**
- ✅ `test_auth.py` - Good coverage (143 lines, 10 tests)
- ✅ `test_upload.py` - Basic coverage
- ✅ `test_dicom.py` - Partial coverage
- ✅ `test_pacs.py` - Partial coverage
- ✅ `test_storage.py` - Basic coverage
- ⚠️ `test_analytics.py` - Limited coverage
- ⚠️ `test_reports_notifications.py` - Partial coverage
- ⚠️ `test_hardening.py` - Security tests (limited)
- ⚠️ `test_s3.py` - Storage tests (basic)
- ⚠️ `test_validation.py` - Input validation (basic)

**Untested Modules (0% coverage):**
- ❌ `app/api/v1/*.py` - API versioning routes
- ❌ `app/auth/totp.py` - 2FA/TOTP implementation
- ❌ `app/cache/service.py` - Redis caching
- ❌ `app/database/reports_db.py` - Reports database
- ❌ `app/dicom/parser.py` - DICOM parsing utilities
- ❌ `app/middleware/security.py` - Security headers
- ❌ `app/notifications/service.py` - Notification logic
- ❌ `app/reports/pdf_service.py` - PDF generation
- ❌ `app/reports/pacs_sync.py` - PACS synchronization
- ❌ `app/upload/analytics.py` - Upload statistics
- ❌ `app/upload/service.py` - Upload manager (partial)

#### New Test Files Required

##### **1.1.1 Authentication & Authorization Suite**

**File:** `backend/tests/unit/test_auth_totp.py` (NEW - 200 lines)

```python
"""Unit tests for TOTP/2FA authentication."""

def test_totp_secret_generation():
    """Test TOTP secret generation creates valid base32 string."""

def test_totp_qr_code_generation():
    """Test QR code generation for authenticator apps."""

def test_totp_code_verification_success():
    """Test valid TOTP code verification."""

def test_totp_code_verification_failure_wrong_code():
    """Test invalid TOTP code rejection."""

def test_totp_code_verification_failure_expired():
    """Test expired TOTP code rejection (time-based)."""

def test_totp_enable_for_user():
    """Test enabling 2FA for a user account."""

def test_totp_disable_for_user():
    """Test disabling 2FA for a user account."""

def test_totp_backup_codes_generation():
    """Test backup recovery codes generation."""

def test_login_with_totp_required():
    """Test login flow when TOTP is enabled."""

def test_login_with_totp_missing_code():
    """Test login fails when TOTP enabled but code not provided."""
```

**Effort:** 8 hours

---

**File:** `backend/tests/unit/test_auth_utils.py` (NEW - 150 lines)

```python
"""Unit tests for authentication utilities."""

def test_create_access_token():
    """Test JWT access token creation."""

def test_create_refresh_token():
    """Test JWT refresh token creation."""

def test_create_upload_token():
    """Test scoped upload token creation."""

def test_verify_token_valid():
    """Test token verification with valid token."""

def test_verify_token_expired():
    """Test token verification with expired token."""

def test_verify_token_invalid_signature():
    """Test token verification with tampered token."""

def test_verify_token_wrong_type():
    """Test token type validation (access vs refresh vs upload)."""

def test_hash_password_bcrypt():
    """Test password hashing uses bcrypt."""

def test_verify_password_timing_attack_resistance():
    """Test password verification resists timing attacks."""
```

**Effort:** 6 hours

---

##### **1.1.2 Upload Management Suite**

**File:** `backend/tests/unit/test_upload_manager.py` (NEW - 300 lines)

```python
"""Unit tests for upload session manager."""

def test_create_session():
    """Test upload session creation."""

def test_create_session_generates_unique_id():
    """Test each session gets unique UUID."""

def test_get_session():
    """Test session retrieval by ID."""

def test_get_session_not_found():
    """Test getting non-existent session returns None."""

def test_update_session():
    """Test session state persistence."""

def test_remove_session():
    """Test session deletion."""

def test_cleanup_expired_sessions():
    """Test automatic cleanup of expired sessions."""

def test_session_expiry_calculation():
    """Test session expiry time calculation."""

def test_register_file_chunk():
    """Test chunk registration in session."""

def test_register_file_chunk_idempotency():
    """Test registering same chunk twice doesn't duplicate."""

def test_session_serialization():
    """Test session can be serialized to JSON."""

def test_session_deserialization():
    """Test session can be restored from JSON."""

def test_concurrent_session_access():
    """Test thread-safe session access."""

def test_session_persistence_to_disk():
    """Test session state persisted to filesystem."""

def test_session_recovery_after_crash():
    """Test sessions can be restored after server restart."""
```

**Effort:** 12 hours

---

**File:** `backend/tests/unit/test_upload_analytics.py` (NEW - 250 lines)

```python
"""Unit tests for upload analytics and statistics."""

def test_stats_manager_initialization():
    """Test stats manager initializes with empty state."""

def test_record_upload():
    """Test recording a successful upload."""

def test_record_upload_by_modality():
    """Test upload statistics grouped by modality."""

def test_record_upload_by_service_level():
    """Test upload statistics grouped by service level."""

def test_get_stats_all_time():
    """Test retrieving all-time statistics."""

def test_get_stats_filtered_by_period():
    """Test statistics filtering by time period (1w, 1m, 3m, etc)."""

def test_export_stats_to_csv():
    """Test CSV export formatting."""

def test_export_stats_to_csv_headers():
    """Test CSV includes correct headers."""

def test_generate_trend_data():
    """Test trend data generation for charts."""

def test_generate_trend_data_daily_buckets():
    """Test trend data bucketed by day."""

def test_calculate_success_rate():
    """Test success rate calculation."""

def test_calculate_average_upload_size():
    """Test average upload size calculation."""

def test_stats_persistence():
    """Test statistics persisted to database."""

def test_stats_aggregation_performance():
    """Test stats aggregation completes in <1 second."""
```

**Effort:** 10 hours

---

##### **1.1.3 DICOM Processing Suite**

**File:** `backend/tests/unit/test_dicom_parser.py` (NEW - 350 lines)

```python
"""Unit tests for DICOM parsing and validation."""

def test_parse_dicom_valid_file():
    """Test parsing valid DICOM file."""

def test_parse_dicom_invalid_file():
    """Test parsing invalid file raises error."""

def test_extract_patient_name():
    """Test patient name extraction."""

def test_extract_patient_id():
    """Test patient ID extraction."""

def test_extract_study_instance_uid():
    """Test Study Instance UID extraction."""

def test_extract_series_instance_uid():
    """Test Series Instance UID extraction."""

def test_extract_sop_instance_uid():
    """Test SOP Instance UID extraction."""

def test_extract_modality():
    """Test modality extraction (CT, MRI, XR, etc)."""

def test_extract_study_date():
    """Test study date extraction and formatting."""

def test_extract_study_description():
    """Test study description extraction."""

def test_extract_all_metadata():
    """Test complete metadata extraction."""

def test_validate_dicom_required_tags():
    """Test validation of required DICOM tags."""

def test_validate_dicom_missing_sop_class_uid():
    """Test validation fails when SOPClassUID missing."""

def test_validate_dicom_missing_patient_id():
    """Test validation warns when PatientID missing."""

def test_validate_dicom_pixel_data_present():
    """Test validation of pixel data presence."""

def test_anonymize_dicom():
    """Test DICOM anonymization removes PHI."""

def test_anonymize_dicom_preserves_medical_data():
    """Test anonymization keeps clinical data intact."""

def test_dicom_file_size_validation():
    """Test file size limits enforcement."""

def test_dicom_transfer_syntax_support():
    """Test supported transfer syntaxes."""

def test_compressed_dicom_handling():
    """Test handling of compressed DICOM (JPEG, JPEG2000)."""
```

**Effort:** 14 hours

---

**File:** `backend/tests/unit/test_dicom_service.py` (ENHANCE EXISTING - add 150 lines)

```python
"""Enhanced unit tests for DICOM service."""

def test_dicom_service_initialization():
    """Test DICOM service singleton initialization."""

def test_extract_metadata_caches_results():
    """Test metadata extraction caching."""

def test_extract_metadata_multiple_files():
    """Test batch metadata extraction."""

def test_extract_metadata_error_handling():
    """Test graceful error handling for corrupt files."""

def test_validate_dicom_strict_mode():
    """Test strict validation mode."""

def test_validate_dicom_lenient_mode():
    """Test lenient validation mode with warnings."""
```

**Effort:** 6 hours

---

##### **1.1.4 Storage Service Suite**

**File:** `backend/tests/unit/test_storage_local.py` (NEW - 250 lines)

```python
"""Unit tests for local filesystem storage."""

def test_save_chunk_creates_directory():
    """Test chunk save creates upload directory structure."""

def test_save_chunk_writes_file():
    """Test chunk data written correctly."""

def test_save_chunk_overwrites_existing():
    """Test chunk overwrite behavior."""

def test_chunk_exists_true():
    """Test chunk existence check returns True."""

def test_chunk_exists_false():
    """Test chunk existence check returns False."""

def test_verify_chunk_size():
    """Test chunk verification by size."""

def test_verify_chunk_checksum():
    """Test chunk verification by checksum."""

def test_merge_chunks_sequential():
    """Test merging chunks in order."""

def test_merge_chunks_missing_chunk():
    """Test merge fails when chunk missing."""

def test_merge_chunks_creates_final_file():
    """Test merge creates complete file."""

def test_merge_chunks_streaming():
    """Test memory-efficient streaming merge."""

def test_cleanup_upload_removes_directory():
    """Test upload cleanup removes all files."""

def test_cleanup_upload_idempotent():
    """Test cleanup can be called multiple times safely."""

def test_get_upload_size():
    """Test calculating total upload size."""

def test_concurrent_chunk_writes():
    """Test multiple chunks can be written simultaneously."""
```

**Effort:** 10 hours

---

**File:** `backend/tests/unit/test_storage_s3.py` (ENHANCE EXISTING - add 200 lines)

```python
"""Enhanced unit tests for S3/MinIO storage."""

def test_s3_client_initialization():
    """Test S3 client initialization with credentials."""

def test_s3_bucket_creation():
    """Test bucket auto-creation if not exists."""

def test_save_chunk_to_s3():
    """Test chunk upload to S3."""

def test_save_chunk_multipart():
    """Test large chunk multipart upload."""

def test_merge_chunks_s3_copy():
    """Test merging using S3 copy operations."""

def test_cleanup_s3_batch_delete():
    """Test batch deletion of S3 objects."""

def test_presigned_url_generation():
    """Test pre-signed URL generation for direct uploads."""

def test_s3_connection_retry():
    """Test S3 connection retry on failure."""

def test_s3_transfer_acceleration():
    """Test S3 transfer acceleration support."""
```

**Effort:** 8 hours

---

##### **1.1.5 PACS Integration Suite**

**File:** `backend/tests/unit/test_pacs_service.py` (ENHANCE EXISTING - add 250 lines)

```python
"""Enhanced unit tests for PACS service."""

def test_pacs_client_initialization():
    """Test PACS client initialization."""

def test_get_active_client_dcm4chee():
    """Test active client selection (dcm4chee)."""

def test_get_active_client_orthanc():
    """Test active client selection (Orthanc)."""

def test_get_active_client_fallback():
    """Test fallback when preferred client unavailable."""

def test_forward_files_stow_rs():
    """Test STOW-RS file forwarding."""

def test_forward_files_multipart():
    """Test multipart DICOM forwarding."""

def test_forward_files_retry_on_failure():
    """Test retry logic with exponential backoff."""

def test_forward_files_circuit_breaker():
    """Test circuit breaker pattern."""

def test_forward_files_fallback_to_rest():
    """Test fallback to Orthanc REST API."""

def test_pacs_connection_timeout():
    """Test connection timeout handling."""

def test_pacs_authentication():
    """Test PACS authentication (basic auth)."""

def test_pacs_response_parsing():
    """Test parsing PACS responses."""

def test_pacs_error_handling():
    """Test error handling for various PACS errors."""
```

**Effort:** 10 hours

---

##### **1.1.6 Reports & Notifications Suite**

**File:** `backend/tests/unit/test_reports_db.py` (NEW - 200 lines)

```python
"""Unit tests for reports database."""

def test_create_report():
    """Test report creation."""

def test_get_report_by_id():
    """Test report retrieval by ID."""

def test_get_report_by_upload_id():
    """Test report retrieval by upload ID."""

def test_list_reports_all():
    """Test listing all reports."""

def test_list_reports_filtered_by_status():
    """Test filtering reports by status."""

def test_list_reports_filtered_by_user():
    """Test filtering reports by user."""

def test_update_report_status():
    """Test updating report status."""

def test_update_report_add_pdf():
    """Test adding PDF to report."""

def test_delete_report():
    """Test report deletion."""

def test_report_audit_trail():
    """Test audit trail for report changes."""
```

**Effort:** 8 hours

---

**File:** `backend/tests/unit/test_pdf_service.py` (NEW - 150 lines)

```python
"""Unit tests for PDF generation service."""

def test_generate_report_pdf():
    """Test PDF generation from report data."""

def test_pdf_includes_patient_info():
    """Test PDF contains patient demographics."""

def test_pdf_includes_study_images():
    """Test PDF embeds study thumbnails."""

def test_pdf_includes_report_text():
    """Test PDF contains radiologist report text."""

def test_pdf_formatting():
    """Test PDF formatting and layout."""

def test_pdf_file_size_limit():
    """Test PDF size stays under limit."""

def test_pdf_watermark():
    """Test PDF watermark for draft reports."""
```

**Effort:** 6 hours

---

**File:** `backend/tests/unit/test_notification_service.py` (NEW - 200 lines)

```python
"""Unit tests for notification service."""

def test_create_notification():
    """Test notification creation."""

def test_broadcast_notification_sse():
    """Test SSE notification broadcast."""

def test_notification_deduplicate():
    """Test duplicate notification prevention."""

def test_notification_priority():
    """Test notification priority handling."""

def test_notification_persistence():
    """Test notification persistence to database."""

def test_mark_notification_read():
    """Test marking notification as read."""

def test_unread_count():
    """Test unread notification count."""

def test_notification_expiry():
    """Test old notification cleanup."""
```

**Effort:** 8 hours

---

##### **1.1.7 Middleware & Security Suite**

**File:** `backend/tests/unit/test_security_middleware.py` (NEW - 180 lines)

```python
"""Unit tests for security headers middleware."""

def test_middleware_adds_security_headers():
    """Test security headers added to all responses."""

def test_x_content_type_options():
    """Test X-Content-Type-Options: nosniff."""

def test_x_frame_options():
    """Test X-Frame-Options: DENY."""

def test_x_xss_protection():
    """Test X-XSS-Protection header."""

def test_content_security_policy():
    """Test CSP header configuration."""

def test_csp_development_vs_production():
    """Test CSP differs between dev and prod."""

def test_strict_transport_security():
    """Test HSTS header in production."""

def test_referrer_policy():
    """Test Referrer-Policy header."""

def test_permissions_policy():
    """Test Permissions-Policy header."""
```

**Effort:** 6 hours

---

**File:** `backend/tests/unit/test_cache_service.py` (NEW - 150 lines)

```python
"""Unit tests for Redis caching service."""

def test_cache_set():
    """Test setting cache value."""

def test_cache_get():
    """Test retrieving cached value."""

def test_cache_get_miss():
    """Test cache miss returns None."""

def test_cache_expiry():
    """Test cache expiration."""

def test_cache_delete():
    """Test cache invalidation."""

def test_cache_connection_pool():
    """Test Redis connection pooling."""

def test_cache_serialization():
    """Test complex object serialization."""
```

**Effort:** 6 hours

---

### 1.2 Backend Integration Tests (Target: 100% critical paths)

#### New Integration Test Files

**File:** `backend/tests/integration/test_upload_pipeline_complete.py` (NEW - 400 lines)

```python
"""End-to-end integration tests for complete upload pipeline."""

def test_upload_pipeline_single_file():
    """Test complete upload: init → chunk → merge → validate → PACS → notify."""

def test_upload_pipeline_multiple_files():
    """Test uploading multiple DICOM files in one study."""

def test_upload_pipeline_large_file():
    """Test uploading 500MB+ file with many chunks."""

def test_upload_pipeline_resume_after_interruption():
    """Test resuming upload after network interruption."""

def test_upload_pipeline_concurrent_uploads():
    """Test 10 concurrent upload sessions."""

def test_upload_pipeline_with_s3_storage():
    """Test upload pipeline with S3 backend."""

def test_upload_pipeline_with_local_storage():
    """Test upload pipeline with local filesystem."""

def test_upload_pipeline_pacs_integration():
    """Test upload pipeline with real PACS (Orthanc)."""

def test_upload_pipeline_error_recovery():
    """Test pipeline recovery from various errors."""

def test_upload_pipeline_notification_delivery():
    """Test notifications sent on completion/failure."""
```

**Effort:** 16 hours

---

**File:** `backend/tests/integration/test_auth_flow_complete.py` (NEW - 250 lines)

```python
"""Integration tests for complete authentication flows."""

def test_registration_to_login_flow():
    """Test user registration followed by login."""

def test_login_token_refresh_flow():
    """Test login → use token → refresh → use new token."""

def test_2fa_enrollment_and_login():
    """Test TOTP setup → enable → login with 2FA."""

def test_password_reset_flow():
    """Test complete password reset workflow."""

def test_session_expiry_and_reauth():
    """Test session expiry forces re-authentication."""

def test_concurrent_sessions():
    """Test multiple concurrent sessions for same user."""
```

**Effort:** 10 hours

---

**File:** `backend/tests/integration/test_report_lifecycle.py` (NEW - 300 lines)

```python
"""Integration tests for report lifecycle."""

def test_report_creation_from_upload():
    """Test report created automatically after upload."""

def test_pacs_sync_updates_report():
    """Test PACS sync updates report status."""

def test_report_pdf_generation():
    """Test PDF generated when report ready."""

def test_report_notification_flow():
    """Test notifications sent at each report stage."""

def test_report_download():
    """Test report PDF download."""
```

**Effort:** 12 hours

---

**File:** `backend/tests/integration/test_database_migrations.py` (NEW - 150 lines)

```python
"""Integration tests for database migrations."""

def test_migration_up():
    """Test applying all migrations."""

def test_migration_down():
    """Test rolling back migrations."""

def test_migration_idempotency():
    """Test migrations can be re-applied safely."""

def test_data_preservation_across_migrations():
    """Test existing data preserved during migration."""
```

**Effort:** 6 hours

---

**File:** `backend/tests/integration/test_external_services.py` (NEW - 200 lines)

```python
"""Integration tests with external services (opt-in with env var)."""

def test_real_orthanc_connection():
    """Test connecting to real Orthanc instance."""

def test_real_dcm4chee_connection():
    """Test connecting to real dcm4chee instance."""

def test_real_minio_storage():
    """Test uploading to real MinIO instance."""

def test_real_postgres_queries():
    """Test queries against real PostgreSQL."""

def test_real_redis_caching():
    """Test caching with real Redis."""
```

**Effort:** 8 hours

---

### 1.3 Backend Performance Tests (NEW)

**File:** `backend/tests/performance/test_load.py` (NEW - 300 lines)

```python
"""Load and performance tests."""

def test_concurrent_uploads_10_users():
    """Test 10 concurrent users uploading."""

def test_concurrent_uploads_50_users():
    """Test 50 concurrent users uploading."""

def test_chunk_upload_throughput():
    """Test chunk upload throughput (MB/s)."""

def test_api_response_time_p95():
    """Test P95 response time <500ms for all endpoints."""

def test_database_query_performance():
    """Test slow queries identified."""

def test_memory_usage_under_load():
    """Test memory usage stays <2GB under load."""

def test_cpu_usage_under_load():
    """Test CPU usage stays <80% under load."""
```

**Effort:** 12 hours

---

### 1.4 Backend Security Tests (NEW)

**File:** `backend/tests/security/test_vulnerabilities.py` (NEW - 250 lines)

```python
"""Security vulnerability tests."""

def test_sql_injection_protection():
    """Test SQL injection protection in all endpoints."""

def test_xss_protection():
    """Test XSS protection in responses."""

def test_csrf_protection():
    """Test CSRF token validation."""

def test_jwt_token_manipulation():
    """Test JWT token tampering detected."""

def test_rate_limiting_enforcement():
    """Test rate limits enforced."""

def test_password_brute_force_protection():
    """Test login lockout after failed attempts."""

def test_file_upload_validation():
    """Test malicious file upload rejected."""

def test_path_traversal_protection():
    """Test directory traversal attacks blocked."""
```

**Effort:** 10 hours

---

## Phase 2: Frontend Test Coverage (95% Target)

### 2.1 Frontend Unit Tests

#### Current Frontend Test Files (3 files):
- `components/__tests__/ExportButton.test.tsx`
- `pages/__tests__/Dashboard.test.tsx`
- `pages/__tests__/Login.test.tsx`

#### New Unit Test Files Required

**File:** `frontend/src/services/__tests__/api.test.ts` (NEW - 400 lines)

```typescript
/**
 * Unit tests for API service layer.
 */

describe('API Service', () => {
  describe('Authentication', () => {
    it('should login with username and password', async () => {});
    it('should login with TOTP code', async () => {});
    it('should handle login failure', async () => {});
    it('should set auth token in headers', async () => {});
    it('should clear auth token on logout', async () => {});
  });

  describe('Upload API', () => {
    it('should initialize upload session', async () => {});
    it('should upload chunk with progress callback', async () => {});
    it('should get upload status', async () => {});
    it('should complete upload', async () => {});
    it('should handle chunk upload retry', async () => {});
  });

  describe('Reports API', () => {
    it('should list reports with filters', async () => {});
    it('should get report by ID', async () => {});
    it('should download report PDF', async () => {});
    it('should sync report from PACS', async () => {});
  });

  describe('Notifications API', () => {
    it('should list notifications', async () => {});
    it('should mark notification as read', async () => {});
    it('should connect to SSE stream', async () => {});
    it('should handle SSE reconnection', async () => {});
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized', async () => {});
    it('should handle 403 forbidden', async () => {});
    it('should handle 500 server error', async () => {});
    it('should handle network timeout', async () => {});
  });
});
```

**Effort:** 16 hours

---

**File:** `frontend/src/services/__tests__/uploadManager.test.ts` (NEW - 500 lines)

```typescript
/**
 * Unit tests for upload manager.
 */

describe('Upload Manager', () => {
  describe('File Processing', () => {
    it('should chunk files into 1MB chunks', () => {});
    it('should calculate total chunks correctly', () => {});
    it('should generate unique file IDs', () => {});
    it('should validate DICOM file extensions', () => {});
  });

  describe('Upload State Management', () => {
    it('should initialize upload state', () => {});
    it('should track chunk upload progress', () => {});
    it('should mark chunks as uploaded', () => {});
    it('should identify missing chunks', () => {});
    it('should calculate overall progress percentage', () => {});
  });

  describe('Resume Logic', () => {
    it('should save state to IndexedDB', () => {});
    it('should restore state from IndexedDB', () => {});
    it('should resume from last uploaded chunk', () => {});
    it('should skip already uploaded chunks', () => {});
  });

  describe('Concurrency Control', () => {
    it('should upload max 3 chunks concurrently', () => {});
    it('should queue remaining chunks', () => {});
    it('should handle chunk upload failures', () => {});
    it('should retry failed chunks with backoff', () => {});
  });

  describe('Network Resilience', () => {
    it('should detect network disconnect', () => {});
    it('should pause uploads when offline', () => {});
    it('should resume uploads when online', () => {});
    it('should handle timeout errors', () => {});
  });
});
```

**Effort:** 20 hours

---

**File:** `frontend/src/db/__tests__/db.test.ts` (NEW - 300 lines)

```typescript
/**
 * Unit tests for IndexedDB operations.
 */

describe('IndexedDB Operations', () => {
  describe('Studies Table', () => {
    it('should create study record', async () => {});
    it('should retrieve study by ID', async () => {});
    it('should update study status', async () => {});
    it('should delete study', async () => {});
    it('should list studies by status', async () => {});
  });

  describe('Files Table', () => {
    it('should store file blobs', async () => {});
    it('should retrieve file by study ID', async () => {});
    it('should track uploaded chunks', async () => {});
  });

  describe('Database Migrations', () => {
    it('should upgrade database version', async () => {});
    it('should preserve data during upgrade', async () => {});
  });

  describe('Quota Management', () => {
    it('should check storage quota', async () => {});
    it('should request persistent storage', async () => {});
    it('should handle quota exceeded error', async () => {});
  });
});
```

**Effort:** 12 hours

---

### 2.2 Frontend Component Tests

**File:** `frontend/src/components/__tests__/Layout.test.tsx` (NEW - 200 lines)

```typescript
describe('Layout Component', () => {
  it('should render sidebar navigation', () => {});
  it('should highlight active route', () => {});
  it('should show user profile', () => {});
  it('should handle logout', () => {});
  it('should display notification badge', () => {});
  it('should be responsive on mobile', () => {});
});
```

**Effort:** 8 hours

---

**File:** `frontend/src/components/__tests__/FilePreview.test.tsx` (NEW - 250 lines)

```typescript
describe('FilePreview Component', () => {
  it('should display DICOM file preview', () => {});
  it('should show file metadata', () => {});
  it('should render thumbnails', () => {});
  it('should handle missing pixel data', () => {});
  it('should support zoom and pan', () => {});
});
```

**Effort:** 10 hours

---

**File:** `frontend/src/components/__tests__/TrendChart.test.tsx` (NEW - 150 lines)

```typescript
describe('TrendChart Component', () => {
  it('should render Recharts line chart', () => {});
  it('should display trend data', () => {});
  it('should handle empty data', () => {});
  it('should format axes labels', () => {});
  it('should show tooltips on hover', () => {});
});
```

**Effort:** 6 hours

---

**File:** `frontend/src/components/notifications/__tests__/NotificationList.test.tsx` (NEW - 200 lines)

```typescript
describe('NotificationList Component', () => {
  it('should render notification items', () => {});
  it('should mark as read on click', () => {});
  it('should filter by unread', () => {});
  it('should virtualize long lists', () => {});
  it('should show real-time updates via SSE', () => {});
});
```

**Effort:** 8 hours

---

### 2.3 Frontend Page Tests

**File:** `frontend/src/pages/__tests__/UploadStudy.test.tsx` (NEW - 350 lines)

```typescript
describe('UploadStudy Page', () => {
  it('should render file dropzone', () => {});
  it('should accept DICOM files', () => {});
  it('should reject non-DICOM files', () => {});
  it('should display selected files list', () => {});
  it('should navigate to metadata page', () => {});
  it('should handle folder upload', () => {});
});
```

**Effort:** 14 hours

---

**File:** `frontend/src/pages/__tests__/MetadataConfirmation.test.tsx` (NEW - 300 lines)

```typescript
describe('MetadataConfirmation Page', () => {
  it('should display extracted metadata', () => {});
  it('should allow editing patient name', () => {});
  it('should validate required fields', () => {});
  it('should select service level', () => {});
  it('should add clinical notes', () => {});
  it('should initiate upload session', () => {});
});
```

**Effort:** 12 hours

---

**File:** `frontend/src/pages/__tests__/UploadProgress.test.tsx` (NEW - 350 lines)

```typescript
describe('UploadProgress Page', () => {
  it('should display progress bar', () => {});
  it('should show file-by-file progress', () => {});
  it('should update progress in real-time', () => {});
  it('should handle pause/resume', () => {});
  it('should handle cancel upload', () => {});
  it('should navigate to completion on success', () => {});
  it('should show error state on failure', () => {});
});
```

**Effort:** 14 hours

---

**File:** `frontend/src/pages/__tests__/Reports.test.tsx` (NEW - 300 lines)

```typescript
describe('Reports Page', () => {
  it('should list reports', () => {});
  it('should filter by status', () => {});
  it('should display report details', () => {});
  it('should download PDF', () => {});
  it('should sync from PACS', () => {});
  it('should show loading state', () => {});
});
```

**Effort:** 12 hours

---

**File:** `frontend/src/pages/__tests__/Notifications.test.tsx` (NEW - 250 lines)

```typescript
describe('Notifications Page', () => {
  it('should list notifications', () => {});
  it('should mark individual as read', () => {});
  it('should mark all as read', () => {});
  it('should show unread count', () => {});
  it('should handle real-time updates', () => {});
});
```

**Effort:** 10 hours

---

**File:** `frontend/src/pages/__tests__/Settings.test.tsx` (NEW - 300 lines)

```typescript
describe('Settings Page', () => {
  it('should display user profile', () => {});
  it('should enable 2FA', () => {});
  it('should show QR code for authenticator app', () => {});
  it('should verify TOTP code', () => {});
  it('should disable 2FA', () => {});
  it('should change password', () => {});
  it('should update profile info', () => {});
});
```

**Effort:** 12 hours

---

### 2.4 Frontend Integration Tests

**File:** `frontend/src/__tests__/integration/upload-flow.test.tsx` (NEW - 400 lines)

```typescript
/**
 * Integration tests for complete upload workflow.
 */

describe('Upload Flow Integration', () => {
  it('should complete upload from file selection to completion', async () => {
    // 1. Navigate to upload page
    // 2. Select DICOM files
    // 3. Confirm metadata
    // 4. Monitor upload progress
    // 5. Verify completion screen
    // 6. Verify notification sent
  });

  it('should resume interrupted upload', async () => {
    // 1. Start upload
    // 2. Simulate network disconnect at 50%
    // 3. Reconnect network
    // 4. Verify resume from 50%
    // 5. Complete upload
  });

  it('should handle multiple concurrent uploads', async () => {});
});
```

**Effort:** 16 hours

---

## Phase 3: End-to-End (E2E) Tests (100% Critical Flows)

### 3.1 E2E Test Infrastructure Setup

**Files to Create:**
- `frontend/e2e/fixtures/dicom-samples/` - Sample DICOM files
- `frontend/e2e/fixtures/test-data.ts` - Enhance with more test data
- `frontend/e2e/helpers/auth.ts` - Auth helpers
- `frontend/e2e/helpers/upload.ts` - Upload helpers
- `frontend/e2e/helpers/assertions.ts` - Custom assertions

**Effort:** 8 hours

---

### 3.2 E2E Authentication Tests (ENHANCE EXISTING)

**File:** `frontend/e2e/auth/login.spec.ts` (ENHANCE - add 100 lines)

```typescript
// Add tests:
test('should handle 2FA login flow', async ({ page }) => {});
test('should redirect to intended page after login', async ({ page }) => {});
test('should persist session across page reloads', async ({ page }) => {});
test('should handle concurrent sessions', async ({ page, context }) => {});
```

**Effort:** 4 hours

---

**File:** `frontend/e2e/auth/registration.spec.ts` (NEW - 200 lines)

```typescript
test.describe('User Registration', () => {
  test('should register new user', async ({ page }) => {});
  test('should reject weak password', async ({ page }) => {});
  test('should reject duplicate email', async ({ page }) => {});
  test('should auto-login after registration', async ({ page }) => {});
});
```

**Effort:** 8 hours

---

**File:** `frontend/e2e/auth/2fa.spec.ts` (NEW - 250 lines)

```typescript
test.describe('Two-Factor Authentication', () => {
  test('should enable 2FA', async ({ page }) => {});
  test('should scan QR code', async ({ page }) => {});
  test('should verify TOTP code', async ({ page }) => {});
  test('should require 2FA on next login', async ({ page }) => {});
  test('should disable 2FA', async ({ page }) => {});
  test('should use backup codes', async ({ page }) => {});
});
```

**Effort:** 10 hours

---

### 3.3 E2E Upload Workflow Tests (NEW - CRITICAL)

**File:** `frontend/e2e/upload/single-file.spec.ts` (NEW - 400 lines)

```typescript
test.describe('Single File Upload', () => {
  test('should upload single DICOM file end-to-end', async ({ page }) => {
    // 1. Login
    await loginAsTestUser(page);

    // 2. Navigate to upload page
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /upload/i })).toBeVisible();

    // 3. Select DICOM file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/dicom-samples/ct-brain.dcm');

    // 4. Verify file preview
    await expect(page.getByText(/ct-brain\.dcm/i)).toBeVisible();
    await expect(page.getByText(/Patient:/i)).toBeVisible();

    // 5. Proceed to metadata
    await page.getByRole('button', { name: /continue/i }).click();

    // 6. Confirm metadata
    await page.getByLabel(/modality/i).fill('CT');
    await page.getByLabel(/service level/i).selectOption('routine');
    await page.getByRole('button', { name: /start upload/i }).click();

    // 7. Monitor progress
    await expect(page).toHaveURL(/\/progress\//);
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();

    // 8. Wait for completion
    await expect(page).toHaveURL(/\/complete\//, { timeout: 60000 });
    await expect(page.getByText(/success/i)).toBeVisible();

    // 9. Verify notification
    await page.goto('/notifications');
    await expect(page.getByText(/upload complete/i)).toBeVisible();
  });

  test('should handle large file upload (500MB)', async ({ page }) => {
    // Test with large file, expect longer upload time
  });

  test('should validate file is DICOM before upload', async ({ page }) => {
    // Try to upload non-DICOM file, expect rejection
  });
});
```

**Effort:** 16 hours

---

**File:** `frontend/e2e/upload/multi-file.spec.ts` (NEW - 400 lines)

```typescript
test.describe('Multi-File Upload', () => {
  test('should upload multiple files in one study', async ({ page }) => {});
  test('should display combined size and file count', async ({ page }) => {});
  test('should track individual file progress', async ({ page }) => {});
  test('should handle partial success (some files fail)', async ({ page }) => {});
});
```

**Effort:** 16 hours

---

**File:** `frontend/e2e/upload/folder-upload.spec.ts` (NEW - 300 lines)

```typescript
test.describe('Folder Upload', () => {
  test('should upload entire folder recursively', async ({ page }) => {});
  test('should filter DICOM files from folder', async ({ page }) => {});
  test('should organize by study/series', async ({ page }) => {});
});
```

**Effort:** 12 hours

---

**File:** `frontend/e2e/upload/resume.spec.ts` (NEW - 500 lines)

```typescript
test.describe('Upload Resume', () => {
  test('should resume upload after page refresh', async ({ page, context }) => {
    // 1. Start upload
    // 2. Wait for 50% progress
    // 3. Refresh page
    // 4. Verify resume from 50%
  });

  test('should resume upload after network disconnect', async ({ page, context }) => {
    // Use Playwright's network emulation
  });

  test('should resume upload after browser crash simulation', async ({ page, context }) => {
    // Close and reopen browser
  });

  test('should skip already uploaded chunks', async ({ page }) => {});
});
```

**Effort:** 20 hours

---

**File:** `frontend/e2e/upload/network-resilience.spec.ts` (NEW - 400 lines)

```typescript
test.describe('Network Resilience', () => {
  test('should pause upload when offline', async ({ page, context }) => {
    await context.setOffline(true);
    // Verify upload paused
  });

  test('should resume upload when back online', async ({ page, context }) => {
    await context.setOffline(false);
    // Verify upload resumed
  });

  test('should handle slow network (throttled)', async ({ page, context }) => {
    await context.route('**/*', route => route.continue({ delay: 1000 }));
  });

  test('should retry failed chunks', async ({ page, context }) => {});
});
```

**Effort:** 16 hours

---

### 3.4 E2E Dashboard & Analytics Tests

**File:** `frontend/e2e/dashboard/analytics.spec.ts` (ENHANCE EXISTING - add 200 lines)

```typescript
test.describe('Dashboard Analytics', () => {
  test('should display upload statistics', async ({ page }) => {});
  test('should filter by time period', async ({ page }) => {});
  test('should display trend charts', async ({ page }) => {});
  test('should export CSV', async ({ page }) => {});
  test('should refresh data in real-time', async ({ page }) => {});
});
```

**Effort:** 8 hours

---

### 3.5 E2E Reports Tests

**File:** `frontend/e2e/reports/report-lifecycle.spec.ts` (NEW - 400 lines)

```typescript
test.describe('Report Lifecycle', () => {
  test('should create report after upload', async ({ page }) => {
    // 1. Upload study
    // 2. Navigate to reports page
    // 3. Verify report exists with "assigned" status
  });

  test('should update report status via PACS sync', async ({ page }) => {});
  test('should download report PDF', async ({ page }) => {});
  test('should display report in viewer', async ({ page }) => {});
});
```

**Effort:** 16 hours

---

### 3.6 E2E Notifications Tests

**File:** `frontend/e2e/notifications/realtime.spec.ts` (NEW - 300 lines)

```typescript
test.describe('Real-Time Notifications', () => {
  test('should receive notification via SSE', async ({ page }) => {});
  test('should show browser notification', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
  });
  test('should update badge count', async ({ page }) => {});
  test('should mark as read on click', async ({ page }) => {});
});
```

**Effort:** 12 hours

---

### 3.7 E2E Accessibility Tests

**File:** `frontend/e2e/accessibility/a11y.spec.ts` (NEW - 250 lines)

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility', () => {
  test('should have no accessibility violations on login page', async ({ page }) => {
    await page.goto('/login');
    await injectAxe(page);
    await checkA11y(page);
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Test tab order
  });

  test('should have ARIA labels', async ({ page }) => {});
  test('should support screen readers', async ({ page }) => {});
});
```

**Effort:** 10 hours

---

### 3.8 E2E Mobile/PWA Tests

**File:** `frontend/e2e/pwa/offline.spec.ts` (NEW - 300 lines)

```typescript
test.describe('PWA Offline Support', () => {
  test('should cache static assets', async ({ page, context }) => {});
  test('should work offline after first visit', async ({ page, context }) => {});
  test('should sync uploads when back online', async ({ page, context }) => {});
  test('should show offline indicator', async ({ page, context }) => {});
});
```

**Effort:** 12 hours

---

**File:** `frontend/e2e/pwa/install.spec.ts` (NEW - 200 lines)

```typescript
test.describe('PWA Installation', () => {
  test('should show install prompt', async ({ page }) => {});
  test('should install as standalone app', async ({ page }) => {});
  test('should display in fullscreen mode', async ({ page }) => {});
  test('should update service worker', async ({ page }) => {});
});
```

**Effort:** 8 hours

---

## Phase 4: Test Infrastructure & Tooling

### 4.1 Coverage Reporting Enhancement

**Files to Create:**
- `backend/.coveragerc` - Coverage config
- `frontend/vitest.coverage.config.ts` - Vitest coverage config
- `.github/workflows/coverage-report.yml` - CI coverage workflow
- `scripts/generate-coverage-report.sh` - Combined coverage report

**Configuration:**
```ini
# backend/.coveragerc
[run]
source = app
omit =
    */tests/*
    */migrations/*
    */venv/*

[report]
precision = 2
show_missing = True
skip_covered = False

[html]
directory = coverage_html

fail_under = 95
```

**Effort:** 6 hours

---

### 4.2 Test Data Factories

**File:** `backend/tests/factories.py` (NEW - 300 lines)

```python
"""Test data factories using factory_boy."""

import factory
from app.db.models import User
from app.models.upload import StudyMetadata

class UserFactory(factory.Factory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@test.com")
    hashed_password = factory.LazyFunction(lambda: hash_password("TestPass123"))
    role = "clinician"
    is_active = True

class StudyMetadataFactory(factory.Factory):
    class Meta:
        model = StudyMetadata

    patient_name = factory.Faker('name')
    study_date = factory.Faker('date')
    modality = factory.Iterator(['CT', 'MRI', 'XR', 'US'])
    service_level = "routine"
```

**Effort:** 8 hours

---

### 4.3 Mutation Testing (Optional)

**File:** `backend/pyproject.toml` - Add mutmut config

```toml
[tool.mutmut]
paths_to_mutate = "app/"
paths_to_exclude = "tests/,migrations/"
runner = "pytest"
```

**Effort:** 4 hours to setup, ongoing maintenance

---

### 4.4 Visual Regression Testing (Optional)

**File:** `frontend/e2e/visual/screenshots.spec.ts` (NEW - 200 lines)

```typescript
import { test } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('should match login page screenshot', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveScreenshot('login-page.png');
  });

  test('should match dashboard layout', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard');
    await expect(page).toHaveScreenshot('dashboard.png');
  });
});
```

**Effort:** 10 hours

---

## Implementation Strategy

### Timeline & Phasing

| Phase | Duration | Test Type | Target Coverage |
|-------|----------|-----------|-----------------|
| **Phase 1** | Weeks 1-3 | Backend Unit Tests | 65% → 95% |
| **Phase 2** | Weeks 2-4 | Backend Integration | 40% → 100% (critical) |
| **Phase 3** | Weeks 3-5 | Frontend Unit/Component | 40% → 95% |
| **Phase 4** | Weeks 4-6 | Frontend Integration | 20% → 90% |
| **Phase 5** | Weeks 5-8 | E2E Critical Flows | 15% → 100% |
| **Phase 6** | Weeks 7-9 | Performance/Security | 0% → 100% |
| **Phase 7** | Weeks 8-10 | Polish & CI/CD | Continuous |

**Overlapping phases allow parallel work by multiple engineers.**

---

### Resource Allocation

**Recommended Team:**
- 2x Backend Engineers (unit + integration tests)
- 2x Frontend Engineers (unit + component + integration tests)
- 1x QA Engineer (E2E tests + coordination)
- 0.5x DevOps Engineer (CI/CD + infrastructure)

**Alternative (Solo):**
- 1x Full-Stack Engineer: 12 weeks full-time

---

### Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Backend Line Coverage | ~60% | 95% | pytest-cov |
| Frontend Line Coverage | ~40% | 95% | Vitest coverage |
| E2E Coverage (Critical Flows) | ~15% | 100% | Manual tracking |
| Test Execution Time | ~2 min | <5 min | CI pipeline |
| Test Flakiness | Unknown | <1% | CI retries |
| Automated Tests | ~80 | ~450 | Test count |

---

## Continuous Integration Updates

### GitHub Actions Workflow Enhancement

**File:** `.github/workflows/test-coverage.yml` (NEW)

```yaml
name: Test Coverage

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests with coverage
        run: |
          cd backend
          pytest --cov=app --cov-report=xml --cov-report=html
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml
          flags: backend
      - name: Fail if coverage below 95%
        run: |
          coverage report --fail-under=95

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Run tests with coverage
        run: |
          cd frontend
          npm run test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/coverage-final.json
          flags: frontend

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Playwright
        run: |
          cd frontend
          npx playwright install --with-deps
      - name: Start backend
        run: |
          cd backend
          docker-compose up -d
      - name: Wait for backend
        run: |
          sleep 10
          curl --retry 10 --retry-connrefused http://localhost:8003/health
      - name: Run E2E tests
        run: |
          cd frontend
          npm run test:e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

**Effort:** 4 hours

---

## Documentation Updates

### Test Documentation

**File:** `docs/testing_strategy.md` (NEW - comprehensive guide)

**Contents:**
- Testing philosophy
- Test types and when to use each
- How to run tests locally
- How to write new tests
- Debugging failing tests
- CI/CD integration
- Coverage targets and enforcement

**Effort:** 6 hours

---

## Total Effort Summary

| Category | Estimated Hours |
|----------|----------------|
| **Backend Unit Tests** | 120h |
| **Backend Integration Tests** | 60h |
| **Backend Performance Tests** | 12h |
| **Backend Security Tests** | 10h |
| **Frontend Unit Tests** | 80h |
| **Frontend Component Tests** | 50h |
| **Frontend Integration Tests** | 40h |
| **E2E Tests** | 160h |
| **Test Infrastructure** | 30h |
| **CI/CD Updates** | 10h |
| **Documentation** | 8h |
| **TOTAL** | **~580 hours** |

**Timeline with 2 engineers:** ~15 weeks
**Timeline with 4 engineers:** ~8 weeks
**Timeline with dedicated QA team (6 people):** ~5 weeks

---

## Risk Mitigation

### Potential Challenges

1. **E2E Test Flakiness** - Network timing issues, async state
   - **Mitigation**: Use Playwright's built-in auto-wait, retry logic

2. **Large File Upload Test Duration** - 500MB uploads take time
   - **Mitigation**: Mock large files, test only chunk logic in unit tests

3. **PACS Integration Complexity** - Real PACS required for some tests
   - **Mitigation**: Dockerized Orthanc for integration tests, mocks for unit

4. **Frontend Test Environment Setup** - IndexedDB, Service Worker testing
   - **Mitigation**: fake-indexeddb, Vitest browser mode

5. **Maintaining Test Suite** - 450+ tests require maintenance
   - **Mitigation**: Regular refactoring, shared fixtures, test data factories

---

## Next Steps

1. **Review and approve this plan**
2. **Prioritize test files** (which to implement first)
3. **Set up test infrastructure** (factories, fixtures, CI)
4. **Begin Phase 1** (backend unit tests)
5. **Parallel Phase 3** (frontend unit tests) if multiple engineers
6. **Weekly coverage review** meetings during implementation

---

## Maintenance Plan

After achieving 95% coverage:

1. **Pre-commit hooks** enforce no coverage reduction
2. **CI fails** if coverage drops below 95%
3. **Quarterly test audit** to remove obsolete tests
4. **Test refactoring** as part of regular code refactoring
5. **Mutation testing** runs weekly to verify test quality

---

**Plan Author:** AI Architect
**Date:** January 13, 2026
**Status:** READY FOR REVIEW
