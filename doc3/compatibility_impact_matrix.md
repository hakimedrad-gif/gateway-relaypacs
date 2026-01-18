# Compatibility Impact Matrix
## RelayPACS Gateway - Dependency → Module Mapping

**Analysis Date:** 2026-01-18
**Scope:** Phase 4 Codebase Compatibility Analysis

---

## Matrix Legend

### Risk Classification
- 🟢 **LOW** - Minor/patch updates, no breaking changes expected
- 🟡 **MEDIUM** - Major version upgrade with documented migration path
- 🔴 **HIGH** - Significant API changes or deprecated features in use
- 🔵 **RESEARCH** - Requires POC/spike to assess impact

### Refactor Scope
- **XS** - < 1 hour (config/version bump)
- **S** - 1-4 hours (targeted code changes)
- **M** - 1-3 days (module-level refactor)
- **L** - 1-2 weeks (architecture change)
- **XL** - > 2 weeks (major migration)

---

## 🎨 Frontend Impact Analysis

### React 19 Dependencies

| Dependency | Current → Target | Affected Modules | Risk | Refactor | Notes |
|------------|------------------|------------------|------|----------|-------|
| **React Core** | 19.2.0 → (stable) | ✅ No upgrade needed | 🟢 | XS | Already latest |
| `react-router-dom` | 7.12.0 → 7.x | `main.tsx`, routing config, all pages (20+ files) | 🟢 | XS | Minor updates only |
| `react-window` | 2.2.5 → 2.x | `ReportList.tsx`, virtualized components (3 files) | 🟢 | XS | Stable API |
| `dexie-react-hooks` | 4.2.0 → 4.x | `hooks/useOfflineData.ts`, IndexedDB access (5+ files) | 🟢 | XS | React 19 compatible |

### Build System & Tooling

| Dependency | Current → Target | Affected Modules | Risk | Refactor | Notes |
|------------|------------------|------------------|------|----------|-------|
| **Vite** | 7.2.4 → 7.x | `vite.config.ts`, build pipeline | 🟢 | XS | Config stable |
| **TypeScript** | 5.9.3 → 5.9.x | All `.ts/.tsx` files (100+) | 🟢 | XS | Patch updates safe |
| `tailwindcss` | 3.4.19 → **4.1.18** | All components with Tailwind classes (60+ files) | 🟡 | **M-L** | ⚠️ **MAJOR BREAKING CHANGES** |
| `postcss` | 8.5.6 → 8.x | Build pipeline | 🟢 | XS | Indirect dependency |

#### Tailwind 4.x Breaking Changes Detail

> [!WARNING]
> Tailwind CSS 4.x introduces significant breaking changes:

**Affected Files (Estimated 60+):**
- All components in `components/` (30+ files)
- All pages in `pages/` (15+ files)
- `index.css` (global styles)
- `tailwind.config.js`

**Breaking Changes:**
1. **New engine:** Lightning CSS replaces PostCSS
2. **Config format:** `tailwind.config.ts` → `@theme` in CSS
3. **Default colors:** `gray-500` → different shade values
4. **Removed variants:** Some custom variants may be deprecated
5. **Plugin API:** Custom plugins need migration

**Mitigation Strategy:**
- Use compatibility mode initially
- Incremental migration per component
- Update Storybook stories to validate styling
- Visual regression testing with Playwright screenshots

### Major Version Upgrades Available

| Dependency | Current → Latest | Affected Modules | Risk | Refactor | Migration Path |
|------------|------------------|------------------|------|----------|----------------|
| `recharts` | 2.15.4 → **3.6.0** | `TrendChart.tsx`, dashboard charts (4 files) | 🟡 | **S-M** | API changes in 3.0 |
| `@chromatic-com/storybook` | 4.1.3 → **5.0.0** | Storybook config, visual tests | 🟡 | **S** | Storybook addon config |
| `globals` | 16.5.0 → **17.0.0** | `eslint.config.js` | 🟢 | XS | ESLint globals definition |
| `@types/node` | 24.x → **25.x** | Type definitions only | 🟢 | XS | No runtime impact |

#### Recharts 3.x Migration Detail

**Affected Files:**
- `components/analytics/TrendChart.tsx`
- `pages/Dashboard.tsx`
- `stories/TrendChart.stories.tsx`
- `test/TrendChart.test.tsx`

**Breaking Changes (3.0):**
- `ResponsiveContainer` API changes
- New composition API for tooltips/legends
- TypeScript strict mode improvements

**Effort:** 4-8 hours (update 4 files + test)

### DICOM/Medical Imaging Stack

| Dependency | Current → Recommendation | Affected Modules | Risk | Refactor | Notes |
|------------|--------------------------|------------------|------|----------|-------|
| `cornerstone-core` | 2.6.1 → **Cornerstone3D** | `Viewer.tsx`, DICOM rendering (5+ files) | 🔴 | **XL** | ⚠️ **Full rewrite** |
| `dicom-parser` | 1.8.21 → 1.8.x | DICOM parsing utilities (3 files) | 🟢 | XS | Stable, maintained |

#### Cornerstone3D Migration (OPTIONAL - Future Planning)

> [!IMPORTANT]
> **Current State:** `cornerstone-core` 2.6.1 is in maintenance mode, not actively developed.
> **Future-Proof Option:** Migrate to Cornerstone3D (modern, WebGL-based, actively developed)

**Affected Files:**
- `components/Viewer.tsx`
- `components/DicomViewer.tsx`
- `hooks/useDicomImage.ts`
- `utils/dicomUtils.ts`
- Related tests and stories

**Refactor Scope:** **XL (2-4 weeks)**
- Complete API rewrite
- WebGL rendering engine changes
- Viewport management changes
- Tool state management changes

**Recommendation:** **Defer to future roadmap** - Current `cornerstone-core` is stable for now.

---

## 🐍 Backend Impact Analysis

###Core Framework Stack

| Dependency | Current → Target | Affected Modules | Risk | Refactor | Notes |
|------------|------------------|------------------|------|----------|-------|
| **FastAPI** | 0.128.0 → 0.128.x | All routers, `main.py` (15+ files) | 🟢 | XS | Patch updates safe |
| **Pydantic** | 2.12.5 → 2.12.x | All models, request/response schemas (25+ files) | 🟢 | XS | Already on v2 |
| **SQLAlchemy** | 2.0.36 → 2.0.x | All models, db layer (10+ files) | 🟢 | XS | Already on 2.0 LTS |
| `uvicorn` | 0.40.0 → 0.40.x | Server runtime | 🟢 | XS | ASGI server |

### Authentication & Security

| Dependency | Current → Action | Affected Modules | Risk | Refactor | Notes |
|------------|------------------|------------------|------|----------|-------|
| `python-jose` | 3.5.0 → (stable) | `auth/jwt.py`, token handling (3 files) | 🟢 | XS | Stable library |
| `passlib` | 1.7.4 → (stable) | `auth/password.py`, hashing (2 files) | 🟢 | XS | LTS version |
| `pyotp` | **UNPINNED** → pin to latest | `auth/totp.py` (1 file) | 🟡 | **XS** | ⚠️ **Pin version** |
| `qrcode` | **UNPINNED** → pin to latest | `auth/totp.py` (QR code gen) | 🟢 | **XS** | ⚠️ **Pin version** |

**Action Required:**
```bash
# Determine current installed versions
pip freeze | grep -E "pyotp|qrcode|redis"

# Update requirements.txt with pinned versions
pyotp==X.Y.Z
qrcode==X.Y.Z
redis==X.Y.Z
```

### DICOM Processing Stack

| Dependency | Current → Target | Affected Modules | Risk | Refactor | Notes |
|------------|------------------|------------------|------|----------|-------|
| `pydicom` | 3.0.1 → 3.0.x | `dicom/parser.py`, `dicom/service.py`, `pacs/service.py` (7+ files) | 🟢 | XS | Active maintenance |
| `dicomweb-client` | 0.60.1 → 0.60.x | `pacs/dicomweb.py` (3 files) | 🟢 | XS | DICOMweb integration |
| `pillow` | 12.1.0 → 12.x | Image processing utilities (2 files) | 🟢 | XS | Security updates |

### Database Layer

| Dependency | Current → Target | Affected Modules | Risk | Refactor | Notes |
|------------|------------------|------------------|------|----------|-------|
| `alembic` | 1.14.0 → 1.14.x | Migration scripts, `alembic/` (10+ files) | 🟢 | XS | Migration tool |
| `psycopg2-binary` | 2.9.10 → 2.9.x | Database driver (indirect) | 🟢 | XS | PostgreSQL adapter |
| `asyncpg` | **DUPLICATE** | Database async driver | 🟡 | **XS** | ⚠️ **Remove line 13** |

**Issue:** `requirements.txt` has duplicate entry
```
Line 13: asyncpg  # UNPINNED - REMOVE THIS
Line 23: asyncpg==0.30.0  # CORRECT - KEEP THIS
```

### Storage & Caching

| Dependency | Current → Action | Affected Modules | Risk | Refactor | Notes |
|------------|------------------|------------------|------|----------|-------|
| `boto3` | 1.42.25 → 1.42.x | `storage/s3.py`, MinIO integration (2 files) | 🟢 | XS | AWS SDK |
| `botocore` | 1.42.25 → 1.42.x | Indirect (boto3 dependency) | 🟢 | XS | Keep in sync with boto3 |
| `redis` | **UNPINNED** → pin to latest | `cache/redis.py`, background tasks (4 files) | 🟡 | **XS** | ⚠️ **Pin version** |

### Monitoring & Observability

| Dependency | Current → Action | Affected Modules | Risk | Refactor | Notes |
|------------|------------------|------------------|------|----------|-------|
| `sentry-sdk` | 2.25.1 → 2.25.x | `main.py`, error tracking | 🟢 | XS | Sentry integration |
| `prometheus-fastapi-instrumentator` | **DUPLICATE** | `main.py`, metrics | 🟡 | **XS** | ⚠️ **Remove line 53** |
| `apscheduler` | 3.10.4 → 3.10.x | Background job scheduling (2 files) | 🟢 | XS | Scheduler |

### Utilities & Helpers

| Dependency | Current → Target | Affected Modules | Risk | Refactor | Notes |
|------------|------------------|------------------|------|----------|-------|
| `reportlab` | **DUPLICATE** | Report PDF generation (1 file) | 🟡 | **XS** | ⚠️ **Remove line 54** |
| `sse-starlette` | **DUPLICATE** | SSE notification stream (1 file) | 🟡 | **XS** | ⚠️ **Remove line 55** |
| `python-dotenv` | 1.2.1 → 1.2.x | Environment loading | 🟢 | XS | Dev tool |

---

## 🔧 Development Tooling Impact

### Pre-commit Hooks Misalignment

> [!CAUTION]
> Pre-commit hook versions are significantly behind installed package versions, causing **lint drift** between local development and CI/CD.

| Tool | Installed Version | Pre-commit Hook Version | Affected Files | Action |
|------|-------------------|-------------------------|----------------|--------|
| **black** | 25.12.0 | 24.1.1 | `backend/**/*.py` (100+ files) | Update `.pre-commit-config.yaml` line 12 |
| **ruff** | 0.14.11 | 0.1.14 | `backend/**/*.py` (100+ files) | Update `.pre-commit-config.yaml` line 18 |
| **mypy** | 1.19.1 | 1.8.0 | `backend/**/*.py` (except tests) | Update `.pre-commit-config.yaml` line 25 |
| **prettier** | 3.7.4+ | 3.1.0 | `frontend/**/*.{ts,tsx,css}` (100+ files) | Update `.pre-commit-config.yaml` line 32 |

**Recommended Changes to `.pre-commit-config.yaml`:**

```yaml
  - repo: https://github.com/psf/black
    rev: 25.12.0  # WAS: 24.1.1

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.14.11  # WAS: v0.1.14

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.19.1  # WAS: v1.8.0

  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.8.0  # WAS: v3.1.0
```

**Refactor Scope:** **XS (15 minutes)**
**Risk:** 🟢 **LOW** - only sync existing tools

---

## 🐳 Docker Infrastructure Impact

### Base Image Compatibility

| Image | Current | Target | Affected Services | Risk | Refactor | Notes |
|-------|---------|--------|-------------------|------|----------|-------|
| `node:20-alpine` | 20-alpine | (stable) | `frontend` | 🟢 | XS | LTS until 2026-04 |
| `python:3.11-slim` | 3.11-slim | (stable) | `backend` | 🟢 | XS | Supported until 2027-10 |
| `nginx:alpine` | alpine | (stable) | `frontend` serving | 🟢 | XS | Always latest stable |
| `postgres:16-alpine` | 16-alpine | (stable) | `postgres` | 🟢 | XS | LTS until 2028 |

**No changes required** - all base images are on stable LTS versions.

---

## 📋 Summary Matrix

### Immediate Action Required (Risk: 🟡 Medium)

| Issue | Files Affected | Effort | Business Impact |
|-------|----------------|--------|-----------------|
| Fix unpinned dependencies (`pyotp`, `qrcode`, `redis`, `asyncpg` line 13) | `requirements.txt` | XS | Build reproducibility |
| Remove duplicate entries (3 packages) | `requirements.txt` | XS | Maintenance clarity |
| Sync pre-commit hook versions | `.pre-commit-config.yaml` | XS | Linting consistency |

### Planned Upgrades (Risk: 🟡-🟢)

| Dependency | Files Affected | Effort | Timeline |
|------------|----------------|--------|----------|
| `prettier` 3.7.4 → 3.8.0 | 100+ frontend files | XS | Next release |
| `@types/node` 24 → 25 | Type definitions | XS | Optional |
| `recharts` 2.x → 3.x | 4 files | S-M | Q2 2026 |
| `tailwindcss` 3.x → 4.x | 60+ files | M-L | Q3 2026 |

### Future Considerations (Risk: 🔴 High, Effort: XL)

| Migration | Files Affected | Effort | Recommendation |
|-----------|----------------|--------|----------------|
| `cornerstone-core` → Cornerstone3D | 5+ DICOM viewer files | XL (2-4 weeks) | Defer to 2026 H2 |

---

## 🎯 Dependency → File Mapping (Top 10 Critical)

### 1. **React 19**
- **Files:** `main.tsx`, `Layout.tsx`, all components in `components/`, all pages in `pages/` (70+ files)
- **Risk:** 🟢 LOW (already latest)
- **Action:** Monitor for patches

### 2. **FastAPI**
- **Files:** `main.py`, `auth/router.py`, `reports/router.py`, `notifications/router.py`, `upload/router.py`, `pacs/router.py` (15+ files)
- **Risk:** 🟢 LOW (already latest)
- **Action:** Monitor for patches

### 3. **pydicom**
- **Files:** `dicom/parser.py`, `dicom/service.py`, `pacs/service.py`, `upload/dicom_validator.py` (7+ files)
- **Risk:** 🟢 LOW (already latest)
- **Action:** Monitor for security patches

### 4. **SQLAlchemy 2.0**
- **Files:** `models/*.py`, `database.py`, `alembic/versions/*.py` (20+ files)
- **Risk:** 🟢 LOW (already 2.0 LTS)
- **Action:** Monitor for 2.0.x patches

### 5. **Vite 7**
- **Files:** `vite.config.ts`, build pipeline
- **Risk:** 🟢 LOW (already latest)
- **Action:** Monitor for build improvements

### 6. **cornerstone-core**
- **Files:** `Viewer.tsx`, `DicomViewer.tsx`, `hooks/useDicomImage.ts` (5+ files)
- **Risk:** 🟡 MEDIUM (maintenance mode)
- **Action:** Plan Cornerstone3D migration for 2026 H2

### 7. **Tailwind CSS**
- **Files:** All components + pages with Tailwind classes (60+ files)
- **Risk:** 🟡 MEDIUM (3.x → 4.x breaking changes)
- **Action:** Migration planned for Q3 2026

### 8. **boto3 (MinIO/S3)**
- **Files:** `storage/s3.py`, `storage/service.py` (2 files)
- **Risk:** 🟢 LOW (AWS SDK, stable)
- **Action:** Monitor for security patches

### 9. **redis (unpinned)**
- **Files:** `cache/redis.py`, `background/tasks.py`, `notifications/pubsub.py` (4 files)
- **Risk:** 🟡 MEDIUM (unpinned version)
- **Action:** **Pin to specific version immediately**

### 10. **dexie (IndexedDB)**
- **Files:** `db/schema.ts`, `hooks/useOfflineData.ts`, PWA offline logic (5+ files)
- **Risk:** 🟢 LOW (stable API)
- **Action:** Monitor for patches

---

**Matrix Compiled By:** Autonomous Code Review Agent
**Last Updated:** 2026-01-18T19:31:03+03:00
