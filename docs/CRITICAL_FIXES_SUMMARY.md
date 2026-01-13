# RelayPACS Critical Fixes Summary
**URGENT: Read Before Deployment**

## 🔴 CRITICAL ISSUES (Fix Before Production)

### 1. SECRET_KEY Security Risk
**File**: `backend/.env:9`
```bash
# CURRENT (INSECURE):
SECRET_KEY=dev-secret-key-change-in-production

# REQUIRED FIX:
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
```
**Impact**: Complete authentication bypass if deployed with default key
**Effort**: 4 hours

### 2. Silent Data Loss During Upload
**File**: `backend/app/upload/router.py:96`
**Problem**: File chunks marked as uploaded even if write fails
**Fix**: Add chunk verification after write
**Impact**: Corrupted DICOM files sent to radiologists
**Effort**: 8 hours

### 3. DoS via Unlimited Upload Size
**File**: `backend/app/models/upload.py:25`
**Problem**: No validation on `total_size_bytes`
**Fix**: 
```python
total_size_bytes: int = Field(gt=0, le=2048*1024*1024)
```
**Impact**: Service outage via resource exhaustion
**Effort**: 2 hours

### 4. Authorization Bypass in Notifications
**File**: `backend/app/notifications/router.py:51`
**Problem**: Users can mark other users' notifications as read
**Fix**: Add `if notification.user_id != user["sub"]: raise HTTPException(403)`
**Impact**: Information disclosure
**Effort**: 3 hours

### 5. Broad Exception Handling (17 locations)
**Files**: Multiple files across `upload/`, `pacs/`, `dicom/`
**Problem**: `except Exception` masks critical failures
**Fix**: Replace with specific exception types, fail fast
**Impact**: Silent failures, no error visibility
**Effort**: 10 hours

### 6. No Rate Limiting on Auth
**File**: `backend/app/auth/router.py:24`
**Problem**: Login endpoint can be brute-forced
**Fix**: Add `@limiter.limit("5/minute")` decorator
**Impact**: Account compromise
**Effort**: 4 hours

## Total Time to Fix Critical Issues: **31 hours** (~4 days)

---

## 🟠 HIGH-PRIORITY FIXES (Next Sprint)

1. **Distributed Session Store** (12h) - Current in-memory store won't scale
2. **Chunk Checksum Validation** (6h) - Prevent corrupted file merges
3. **PACS Retry Logic** (8h) - Don't lose studies on transient errors
4. **SSE Auth Fix** (10h) - Token in URL leaks to logs
5. **Password Strength** (3h) - Enforce complexity rules
6. **Audit Logging** (12h) - HIPAA compliance requirement
7. **E2E Upload Tests** (16h) - Core feature has ZERO E2E coverage

## Total Time for High-Priority: **67 hours** (~8 days)

---

## 📊 Production Readiness Status

| Criteria | Status | Blocker? |
|----------|--------|----------|
| Security | ⚠️ 6 Critical Issues | YES |
| Reliability | ⚠️ Data loss risk | YES |
| Testing | ⚠️ No E2E for core flow | YES |
| Compliance (HIPAA) | ❌ No audit logs | YES |
| Scalability | ⚠️ Single-instance only | NO |
| Documentation | ✅ Good | NO |

## Recommendation: **DO NOT DEPLOY** without fixing Critical (🔴) issues

---

## Quick Fix Checklist

```bash
# 1. Generate secure secret key
cd backend
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))" >> .env

# 2. Add validation to upload model
# Edit: backend/app/models/upload.py
# Line 25: Add le=2048*1024*1024 to total_size_bytes Field

# 3. Fix notification auth bypass
# Edit: backend/app/notifications/router.py
# Line 51: Add ownership check (see main audit doc)

# 4. Add rate limiting to auth
# Edit: backend/app/auth/router.py
# Line 24: Add @limiter.limit("5/minute")

# 5. Fix exception handling
# See COMPREHENSIVE_CODEBASE_AUDIT_2026.md Section P0-5

# 6. Add chunk verification
# See COMPREHENSIVE_CODEBASE_AUDIT_2026.md Section P0-4
```

---

## Emergency Contacts

If deploying urgently despite risks:
- [ ] Enable verbose logging: `DEBUG=true`
- [ ] Set up Sentry error monitoring
- [ ] Configure database backups (hourly)
- [ ] Limit pilot to 10 users max
- [ ] Have rollback plan ready
- [ ] Monitor for 24h continuously after launch

**Full Technical Details**: See `COMPREHENSIVE_CODEBASE_AUDIT_2026.md`
