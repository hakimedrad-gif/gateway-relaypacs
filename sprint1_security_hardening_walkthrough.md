# Sprint 1 Implementation Walkthrough: Security Hardening

## Overview

This walkthrough documents the implementation of **Security Hardening (Theme 1)** from the feature improvement plan. The goal was to replace the mock authentication system with a real database-backed authentication using hashed passwords.

---

## Changes Made

### Backend Infrastructure

#### 1. Database Dependencies

**File Modified**: [`requirements.txt`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/requirements.txt)

Added:
- `sqlalchemy==2.0.36` - ORM for database abstraction
- `alembic==1.14.0` - Database migrations
- `psycopg2-binary==2.9.10` - PostgreSQL adapter
- `asyncpg==0.30.0` - Async PostgreSQL support

---

#### 2. Database Module Created

**Files Created**:
- [`app/db/__init__.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/db/__init__.py) - Package exports
- [`app/db/database.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/db/database.py) - Database connection and session management
- [`app/db/models.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/db/models.py) - User ORM model

**Key Features**:
- SQLAlchemy `Session` dependency injection via `get_db()`
- Support for both SQLite (default) and PostgreSQL
- User model with UUID primary key, hashed password, role-based access

**User Model Fields**:
```python
- id: UUID (primary key)
- username: str (unique, indexed)
- email: str (unique, indexed)
- hashed_password: str
- full_name: str | None
- role: str (clinician/radiographer/radiologist/admin)
- clinic_id: UUID | None (future multi-tenant support)
- is_active: bool
- created_at: datetime
- updated_at: datetime
```

---

#### 3. Pydantic Schemas

**File Created**: [`app/models/user.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/models/user.py)

New schemas:
- `UserCreate` - Registration with password validation (min 8 chars)
- `UserLogin` - Login credentials
- `UserResponse` - User data in API responses (no password)
- `TokenPair` - Access + refresh token response

---

#### 4. Password Hashing

**File Modified**: [`app/auth/utils.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/auth/utils.py)

**New functions**:
- `hash_password(password: str) -> str` - Hash using bcrypt
- `verify_password(plain_password: str, hashed_password: str) -> bool` - Verify password
- `create_refresh_token(data: dict) -> str` - Generate 7-day refresh token

**Changes**:
- Access token expiration reduced from 24h to 15min (security improvement)
- Bcrypt configured with `ident="2b"` to avoid compatibility issues

---

#### 5. Authentication Router

**File Modified**: [`app/auth/router.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/auth/router.py)

**login endpoint**:
- Queries database for user by username
- Verifies hashed password with `verify_password()`
- Returns `TokenPair` (access_token + refresh_token)
- **Backward compatible**: Falls back to TEST_USERS if user not in DB

**register endpoint**:
- Validates username and email uniqueness
- Hashes password before storage
- Creates User record in database
- Returns tokens for immediate login
- HTTP 201 status on successful creation

**New endpoint**:
- `GET /auth/me` - Returns current user info

---

#### 6. Database Configuration

**File Modified**: [`app/config.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/app/config.py)

Added:
```python
database_url: str = "sqlite:///./relaypacs.db"
```

Can be overridden via environment variable for PostgreSQL in production.

---

#### 7. Database Initialization Script

**File Created**: [`init_db.py`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/init_db.py)

**Purpose**: Create tables and seed test users

**Test users created** (with hashed passwords):
- `testuser1` / `testuser@123` (clinician)
- `admin` / `adminuser@123` (admin)
- `testclinician` / `testclinician@123` (clinician)
- `testradiographer` / `testradiographer@123` (radiographer)
- `testclinic` / `testclinic@123` (clinician)
- `testradiologist` / `testradiologist@123` (radiologist)

---

### Frontend Updates

#### 8. API Client

**File Modified**: [`frontend/src/services/api.ts`](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/src/services/api.ts)

**Updated `login` return type**:
```typescript
Promise<{ access_token: string; refresh_token?: string }>
```

Now handles optional `refresh_token` from backend.

---

## Verification

### Database Creation

✅ **Database file created**: `relaypacs.db` (20.48 KB)

```bash
$ ls -la relaypacs.db
-rw-r--r-- 1 ubuntu-desk ubuntu-desk 20480 Jan 12 19:29 relaypacs.db
```

### Test Users

✅ **6 test users seeded** with bcrypt-hashed passwords

---

## Backward Compatibility

The implementation maintains **100% backward compatibility**:

1. **TEST_USERS fallback**: If user not found in database, authentication falls back to in-memory TEST_USERS dict
2. **Existing API contracts**: Login/register endpoints use same URLs (`POST /auth/login`, `POST /auth/register`)
3. **Token format**: JWT tokens use same structure (added `refresh_token` is optional)

---

## Security Improvements

> [!IMPORTANT]
> **Security Enhancements**

1. ✅ **Password hashing**: Bcrypt with work factor 12 (default)
2. ✅ **Shorter access tokens**: 15 minutes instead of 24 hours
3. ✅ **Refresh tokens**: 7-day refresh tokens for session continuity
4. ✅ **Email validation**: Pydantic EmailStr ensures valid email format
5. ✅ **Username validation**: Alphanumeric + underscore/hyphen only
6. ✅ **Role-based access**: User model includes role field for RBAC
7. ✅ **Account deactivation**: `is_active` flag allows disabling users

---

## Known Limitations

1. **No Alembic migrations**: Currently using `Base.metadata.create_all()` (manual schema management)
2. **No token refresh endpoint**: Backend creates refresh tokens but no `/auth/refresh` endpoint yet
3. **Plaintext TEST_USERS**: Fallback dict still uses plaintext passwords (for backward compat only)
4. **No rate limiting**: Login endpoint not yet protected from brute force
5. **SQLite default**: Production should use PostgreSQL (override via `DATABASE_URL` env var)

---

## Next Steps

Remaining Sprint 1 tasks:
- [ ] Create Alembic migration for User table
- [ ] Implement token refresh endpoint
- [ ] Add rate limiting to login endpoint
- [ ] Update frontend to use `sessionStorage` instead of `localStorage`
- [ ] Begin Theme 3: Data Validation (metadata required fields, DICOM parsing)

---

## Testing Commands

```bash
# Install dependencies
cd backend
./venv/bin/pip install sqlalchemy alembic psycopg2-binary asyncpg

# Initialize database
./venv/bin/python init_db.py

# Verify database
ls -la relaypacs.db

# Test login (once backend running)
curl -X POST http://localhost:8003/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminuser@123"}'
```

---

*Implementation completed: 2026-01-12*
