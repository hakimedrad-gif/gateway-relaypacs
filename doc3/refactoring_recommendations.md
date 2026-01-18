# Refactoring Recommendations
## RelayPACS Gateway - Code Quality Improvements

**Report Date:** 2026-01-18
**Context:** Companion document to dependency modernization plan
**Scope:** Phase 6 - Refactoring Impact Analysis

---

## 📋 Refactoring Philosophy

> [!IMPORTANT]
> These recommendations are **OPTIONAL** improvements that can be implemented alongside dependency upgrades. They are NOT required for successful modernization but provide long-term value.

### Guiding Principles
1. **Safe first** - All refactors must preserve behavior
2. **Test coverage** - Refactor only code with >80% test coverage
3. **Incremental** - Small, reviewable changes
4. **ROI-driven** - Prioritize high-value, low-effort improvements

---

## 🎯 Refactoring Priority Matrix

### Legend
- **Effort:** XS (<1h) | S (1-4h) | M (1-3d) | L (1-2w) | XL (>2w)
- **Value:** 🟢 Low | 🟡 Medium | 🔴 High
- **Risk:** 🟢 Safe | 🟡 Moderate | 🔴 Risky

---

## 🔴 HIGH VALUE, LOW EFFORT (Do First)

### 1. Remove Duplicate `requirements.txt` Entries
**Effort:** XS (5 min) | **Value:** 🟡 Medium | **Risk:** 🟢 Safe

**Current Problem:**
```python
# requirements.txt
Line 13: asyncpg  # Unpinned - DUPLICATE
Line 23: asyncpg==0.30.0  # Correct

Line 52: prometheus-fastapi-instrumentator==7.0.0  # Keep
Line 53: prometheus-fastapi-instrumentator==7.0.0  # DUPLICATE

Line 44: reportlab==4.2.5  # Keep
Line 54: reportlab==4.2.5  # DUPLICATE

Line 45: sse-starlette==2.2.1  # Keep
Line 55: sse-starlette==2.2.1  # DUPLICATE
```

**Refactor:**
Delete lines 13, 53, 54, 55.

**ROI:** Prevents confusion, improves maintainability. **Already in upgrade plan Phase 1.**

---

### 2. Pin Unpinned Dependencies
**Effort:** XS (15 min) | **Value:** 🔴 High | **Risk:** 🟢 Safe

**Current Problem:**
```python
# requirements.txt
pyotp  # Line 14 - UNPINNED
qrcode  # Line 15 - UNPINNED
redis  # Line 16 - UNPINNED
```

**Refactor:**
```bash
pip freeze | grep -E "pyotp|qrcode|redis"
# Add versions to requirements.txt
```

**ROI:** Reproducible builds, prevents supply chain attacks. **Already in upgrade plan Phase 1.**

---

### 3. Consolidate Type Definitions
**Effort:** S (2-3h) | **Value:** 🟡 Medium | **Risk:** 🟢 Safe

**Current State:** Type definitions scattered across files.

**Recommended Structure:**
```
backend/app/types/
  ├── api.py          # API request/response types
  ├── database.py     # SQLAlchemy model types
  ├── dicom.py        # DICOM-specific types
  ├── auth.py         # JWT, user session types
  └── __init__.py     # Export all types
```

**Benefits:**
- Single source of truth for types
- Easier to find type definitions
- Reduces import cycles

**Files Affected:** 20+ files importing scattered types

---

### 4. Extract Environment Variable Configuration
**Effort:** M (4-6h) | **Value:** 🔴 High | **Risk:** 🟢 Safe

**Current Problem:** Environment variables accessed directly via `os.getenv()` scattered across codebase.

**Recommended Pattern:**
```python
# app/config/settings.py (already exists via pydantic-settings)
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str
    DATABASE_URL: str
    REDIS_URL: str
    S3_ENDPOINT: str
    ORTHANC_URL: str
    # ... centralize ALL env vars

    class Config:
        env_file = ".env"

settings = Settings()
```

**Current Status:** ✅ **ALREADY IMPLEMENTED** via `pydantic-settings`.

**Recommendation:** Audit codebase for stray `os.getenv()` calls and migrate to `settings.*`.

```bash
# Find all os.getenv usage
grep -r "os.getenv" backend/app/
```

**ROI:** Type safety, validation, documentation.

---

## 🟡 MEDIUM VALUE, MEDIUM EFFORT (Consider)

### 5. Standardize Error Handling
**Effort:** M (1-2d) | **Value:** 🟡 Medium | **Risk:** 🟡 Moderate

**Current Pattern:** Mix of exception handling styles.

**Recommended Pattern:**
```python
# app/exceptions.py
class RelayPACSException(Exception):
    """Base exception for all RelayPACS errors"""
    pass

class DICOMParsingError(RelayPACSException):
    """DICOM file parsing failed"""
    pass

class PACSConnectionError(RelayPACSException):
    """Failed to connect to PACS"""
    pass

# Usage in main.py
@app.exception_handler(RelayPACSException)
async def relaypacs_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "type": exc.__class__.__name__}
    )
```

**Benefits:**
- Consistent error JSON format
- Easier to add Sentry tags
- Clearer stack traces

**Files Affected:** 15+ routers, services

---

### 6. Abstract PACS Client Interface
**Effort:** L (1-2w) | **Value:** 🔴 High | **Risk:** 🟡 Moderate

**Current Problem:** Direct dependencies on specific PACS implementations.

**Recommended Pattern:**
```python
# app/pacs/interface.py
from abc import ABC, abstractmethod

class PACSClient(ABC):
    @abstractmethod
    async def query_studies(self, filters: dict) -> List[Study]:
        pass

    @abstractmethod
    async def retrieve_study(self, study_uid: str) -> bytes:
        pass

# app/pacs/orthanc_client.py
class OrthancClient(PACSClient):
    async def query_studies(self, filters):
        # Orthanc-specific implementation
        ...

# app/pacs/dcm4chee_client.py
class DCM4CheeClient(PACSClient):
    async def query_studies(self, filters):
        # DCM4CHEE-specific implementation
        ...

# app/pacs/factory.py
def get_pacs_client() -> PACSClient:
    if settings.PACS_TYPE == "orthanc":
        return OrthancClient()
    elif settings.PACS_TYPE == "dcm4chee":
        return DCM4CheeClient()
```

**Benefits:**
- Easy to add new PACS vendors
- Testable via mock interface
- Decouples business logic from PACS API

**ROI:** Future-proofs multi-PACS support.

---

### 7. Implement Repository Pattern for Database
**Effort:** L (1-2w) | **Value:** 🟡 Medium | **Risk:** 🟡 Moderate

**Current Pattern:** Direct SQLAlchemy queries in routers.

**Recommended Pattern:**
```python
# app/repositories/user_repository.py
class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int) -> User:
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_data: UserCreate) -> User:
        user = User(**user_data.dict())
        self.db.add(user)
        await self.db.commit()
        return user

# Usage in router
@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(404)
    return user
```

**Benefits:**
- Separation of concerns
- Easier to mock for testing
- Reusable queries

**Effort vs Value:** Moderate - Only implement if planning major database refactoring.

---

## 🟢 LOW VALUE (Optional)

### 8. Extract Frontend Constants
**Effort:** S (2-4h) | **Value:** 🟢 Low | **Risk:** 🟢 Safe

**Current State:** Magic strings/numbers scattered.

**Recommended:**
```typescript
// src/constants/app.ts
export const APP_NAME = 'RelayPACS Gateway';
export const MAX_UPLOAD_SIZE_MB = 500;
export const DICOM_FILE_EXTENSIONS = ['.dcm', '.dicom'];

// src/constants/routes.ts
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  REPORTS: '/reports',
  // ...
} as const;
```

**ROI:** Minimal - Only if actively experiencing magic number bugs.

---

### 9. Add JSDocs to Utility Functions
**Effort:** M (1d) | **Value:** 🟢 Low | **Risk:** 🟢 Safe

**Current State:** Utility functions lack documentation.

**Recommended:**
```typescript
/**
 * Parses a DICOM file and extracts metadata tags.
 * @param file - The DICOM file blob
 * @returns Promise resolving to metadata object
 * @throws {DICOMParsingError} If file is not valid DICOM
 */
export async function parseDicomFile(file: Blob): Promise<DicomMetadata> {
  // ...
}
```

**ROI:** Helpful for onboarding, but TypeScript types already provide most context.

---

## 🔴 DEFERRED RISK AREAS (Do NOT Refactor Yet)

### ❌ 1. Cornerstone DICOM Viewer Rewrite
**Effort:** XL (4-8w) | **Risk:** 🔴 **VERY HIGH**

**Why Defer:**
- `cornerstone-core` is stable, not causing issues
- Rewrite to Cornerstone3D is a **full architectural change**
- High risk of introducing regressions in medical imaging (critical domain)

**Recommendation:** Plan as **separate dedicated project** in 2026 H2.

---

### ❌ 2. React Router 7.x Migration (if API changes)
**Effort:** M-L (1-2w) | **Risk:** 🟡 Moderate

**Current:** React Router 7.12.0 (latest)

**Why Defer:**
- No immediate need to upgrade further
- Routing is stable and working
- Wait for clear value proposition from future versions

**Recommendation:** Monitor changelog, upgrade only if security advisory.

---

### ❌ 3. Switch from Dexie to Native IndexedDB
**Effort:** L (2-3w) | **Risk:** 🔴 High

**Why Defer:**
- Dexie provides huge productivity boost
- Native IndexedDB is verbose and error-prone
- No performance issues with Dexie

**Recommendation:** **Never do this** - Dexie is the right abstraction.

---

## ✅ Safe Refactoring Targets (Best ROI)

### Summary Table

| Refactor | Effort | Value | Risk | Timeline | ROI Score |
|----------|--------|-------|------|----------|-----------|
| Remove duplicate deps | XS | 🟡 | 🟢 | Week 1 | ⭐⭐⭐⭐⭐ |
| Pin unpinned deps | XS | 🔴 | 🟢 | Week 1 | ⭐⭐⭐⭐⭐ |
| Consolidate types | S | 🟡 | 🟢 | Week 2 | ⭐⭐⭐⭐ |
| Audit `os.getenv()` | S | 🔴 | 🟢 | Week 2 | ⭐⭐⭐⭐ |
| Standardize errors | M | 🟡 | 🟡 | Sprint 2 | ⭐⭐⭐ |
| Abstract PACS | L | 🔴 | 🟡 | Q2 2026 | ⭐⭐⭐ |
| Repository pattern | L | 🟡 | 🟡 | Optional | ⭐⭐ |

**Recommendation:** Execute top 4 refactors (all Safe 🟢, high ROI ⭐⭐⭐⭐+) within first 2 weeks.

---

## 🧪 Testing Strategy for Refactors

### Pre-Refactor Checklist
- [ ] Identify all files affected
- [ ] Verify test coverage >80% for affected code
- [ ] Create feature branch
- [ ] Document baseline behavior

### During Refactor
- [ ] Refactor incrementally (1 file at a time)
- [ ] Run tests after each file
- [ ] Commit frequently with clear messages

### Post-Refactor Validation
- [ ] All tests pass (unit + integration + E2E)
- [ ] No new linting errors
- [ ] No new TypeScript errors
- [ ] Performance benchmarks unchanged
- [ ] Code review approved

---

## 📊 Refactoring Metrics

Track these before/after:

| Metric | Tool | Target |
|--------|------|--------|
| **Code Duplication** | `radon` (Python), SonarQube | <3% |
| **Cyclomatic Complexity** | `radon cc backend/` | <10 per function |
| **Type Coverage** | `mypy --strict` | 100% |
| **Test Coverage** | `pytest --cov` | >85% |
| **Linting Issues** | `ruff check` | 0 errors |

---

## 🎯 Recommended Refactoring Roadmap

### Week 1 (Phase 1 of Dependency Upgrade)
✅ Fix duplicate/unpinned dependencies (ALREADY IN UPGRADE PLAN)

### Week 2 (Parallel to Dependency Work)
1. Consolidate type definitions
2. Audit `os.getenv()` → migrate to `settings.*`

### Sprint 2 (After Dependency Upgrades Complete)
3. Standardize error handling
4. Add unit tests for newly consolidated types

### Q2 2026 (Long-term)
5. Abstract PACS client interface (if adding new PACS vendor)
6. Consider repository pattern (if database layer becomes unwieldy)

**Do NOT Refactor:**
- Cornerstone viewer (defer to dedicated project)
- React Router (stable, no need)
- Dexie → IndexedDB (bad idea)

---

## 🚫 Anti-Patterns to Avoid

### 1. Refactoring Without Tests
**Problem:** Changes behavior unknowingly.
**Solution:** Only refactor code with >80% test coverage.

### 2. Large Refactors in Single PR
**Problem:** Unreviewable, high merge conflict risk.
**Solution:** Break into small PRs (1 module = 1 PR).

### 3. Premature Abstraction
**Problem:** Over-engineering before patterns emerge.
**Solution:** Wait until 3rd duplication before abstracting (Rule of Three).

### 4. Mixing Refactor + Feature Work
**Problem:** Hard to debug, unclear commit history.
**Solution:** Separate refactor PRs from feature PRs.

---

## ✅ Summary

### Immediate Actions (Week 1-2)
1. ✅ Remove duplicate/unpinned deps (in upgrade plan)
2. ✅ Consolidate type definitions
3. ✅ Migrate stray `os.getenv()` to `settings.*`

### Future Considerations (Q2 2026)
4. Standardize error handling
5. Abstract PACS client (if needed)

### Never Do
❌ Rewrite Cornerstone viewer
❌ Replace Dexie with native IndexedDB
❌ Migrate database ORM (SQLAlchemy 2.0 is excellent)

**Total Recommended Effort:** ~1 day (Week 2)
**Expected Value:** Improved maintainability, type safety, and code clarity.

---

**Report Author:** Autonomous Code Review Agent
**Next Review:** 2026-Q2 (Reassess after dependency upgrades complete)
