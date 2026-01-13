# RelayPACS Priority Improvements - Implementation Plan

**Created:** January 13, 2026  
**Scope:** Address 16 priority improvements (Immediate, Short-term, Medium-term + Storybook)  
**Status:** Planning Phase

---

## Implementation Strategy

This plan addresses the following improvements in **logical dependency order**:

### Phase 1: Security & Infrastructure (Week 1)
1. Fix hardcoded secrets
2. Set up Alembic migrations
3. Add security headers
4. Integrate error monitoring (Sentry)

### Phase 2: Database & Testing Foundation (Week 2-3)
5. PostgreSQL migration preparation
6. E2E test framework setup (Playwright)
7. API versioning implementation

### Phase 3: Accessibility & Documentation (Week 3-4)
8. Accessibility audit and fixes
9. Architecture documentation
10. Deployment guide

### Phase 4: Testing & Code Quality (Month 2)
11. Frontend test coverage expansion
12. Component library setup (Storybook)

### Phase 5: Performance & Advanced Features (Month 2-3)
13. Caching layer (Redis)
14. 2FA/TOTP implementation
15. Performance optimization
16. Monitoring setup (Prometheus/Grafana)

---

## Detailed Implementation Steps

### 📋 Phase 1: Security & Infrastructure (Week 1)

#### 1. Fix Hardcoded Secrets ⚡ CRITICAL

**Priority:** Immediate  
**Effort:** 2 hours  
**Risk:** High security vulnerability

**Steps:**
1. Create `.env.example` templates for backend and frontend
2. Update `backend/app/config.py`:
   ```python
   secret_key: str = Field(..., env="SECRET_KEY")
   ```
3. Generate secure secret keys:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
4. Update `docker-compose.yml` environment variables
5. Add `.env` files to `.gitignore` (verify)
6. Document in README.md

**Validation:**
- [ ] No hardcoded secrets in codebase (grep check)
- [ ] App starts with environment variables
- [ ] Docker Compose uses env vars

**Files Modified:**
- `backend/app/config.py`
- `backend/.env.example`
- `docker-compose.yml`
- `README.md`

---

#### 2. Set Up Alembic Migrations ⚡ CRITICAL

**Priority:** Immediate  
**Effort:** 4 hours  
**Dependencies:** None

**Steps:**
1. Initialize Alembic in backend:
   ```bash
   cd backend
   alembic init alembic
   ```

2. Configure `alembic.ini`:
   ```ini
   sqlalchemy.url = driver://user:pass@localhost/dbname
   # Use env var instead ^
   ```

3. Update `alembic/env.py`:
   ```python
   from app.db.models import Base
   from app.config import get_settings
   
   settings = get_settings()
   config.set_main_option("sqlalchemy.url", settings.database_url)
   target_metadata = Base.metadata
   ```

4. Create initial migration:
   ```bash
   alembic revision --autogenerate -m "Initial schema"
   ```

5. Test migration:
   ```bash
   alembic upgrade head
   alembic downgrade -1
   alembic upgrade head
   ```

6. Add migration commands to README
7. Create pre-commit hook for migration check

**Validation:**
- [ ] Initial migration created
- [ ] Migration runs successfully
- [ ] Rollback works
- [ ] Schema matches models

**Files Created:**
- `backend/alembic/` (directory)
- `backend/alembic.ini`
- `backend/alembic/env.py`
- `backend/alembic/versions/001_initial_schema.py`

**Files Modified:**
- `README.md`
- `.pre-commit-config.yaml` (optional)

---

#### 3. Add Security Headers

**Priority:** Immediate  
**Effort:** 2 hours  
**Dependencies:** None

**Steps:**
1. Install secure-headers middleware:
   ```bash
   pip install secure
   ```

2. Create security middleware (`backend/app/middleware/security.py`):
   ```python
   from fastapi import Request
   from starlette.middleware.base import BaseHTTPMiddleware
   
   class SecurityHeadersMiddleware(BaseHTTPMiddleware):
       async def dispatch(self, request: Request, call_next):
           response = await call_next(request)
           response.headers["X-Content-Type-Options"] = "nosniff"
           response.headers["X-Frame-Options"] = "DENY"
           response.headers["X-XSS-Protection"] = "1; mode=block"
           response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
           response.headers["Content-Security-Policy"] = "default-src 'self'"
           response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
           return response
   ```

3. Add to `backend/app/main.py`:
   ```python
   from app.middleware.security import SecurityHeadersMiddleware
   app.add_middleware(SecurityHeadersMiddleware)
   ```

4. Test headers with curl:
   ```bash
   curl -I http://localhost:8003/health
   ```

5. Update CSP policy for frontend assets

**Validation:**
- [ ] All security headers present in responses
- [ ] CSP doesn't block legitimate resources
- [ ] Tests still pass

**Files Created:**
- `backend/app/middleware/__init__.py`
- `backend/app/middleware/security.py`

**Files Modified:**
- `backend/app/main.py`
- `backend/requirements.txt`

---

#### 4. Integrate Error Monitoring (Sentry)

**Priority:** Immediate  
**Effort:** 3 hours  
**Dependencies:** None

**Steps:**
1. Create Sentry account/project
2. Install Sentry SDK:
   ```bash
   # Backend
   pip install sentry-sdk[fastapi]
   
   # Frontend
   npm install @sentry/react @sentry/vite-plugin
   ```

3. Configure backend (`backend/app/config.py`):
   ```python
   sentry_dsn: str | None = None
   sentry_environment: str = "development"
   ```

4. Initialize in `backend/app/main.py`:
   ```python
   import sentry_sdk
   
   if settings.sentry_dsn:
       sentry_sdk.init(
           dsn=settings.sentry_dsn,
           environment=settings.sentry_environment,
           traces_sample_rate=0.1,
       )
   ```

5. Configure frontend (`frontend/src/main.tsx`):
   ```typescript
   import * as Sentry from "@sentry/react";
   
   if (import.meta.env.VITE_SENTRY_DSN) {
       Sentry.init({
           dsn: import.meta.env.VITE_SENTRY_DSN,
           integrations: [new Sentry.BrowserTracing()],
           tracesSampleRate: 0.1,
       });
   }
   ```

6. Test error reporting
7. Configure alert rules in Sentry dashboard

**Validation:**
- [ ] Test errors appear in Sentry
- [ ] Source maps uploaded (frontend)
- [ ] Performance traces captured
- [ ] Alerts configured

**Files Modified:**
- `backend/requirements.txt`
- `backend/app/config.py`
- `backend/app/main.py`
- `frontend/package.json`
- `frontend/src/main.tsx`
- `frontend/vite.config.ts`

---

### 📋 Phase 2: Database & Testing Foundation (Week 2-3)

#### 5. PostgreSQL Migration Preparation ⚡ CRITICAL

**Priority:** Short-term  
**Effort:** 6 hours  
**Dependencies:** Alembic setup (#2)

**Steps:**
1. Create PostgreSQL Docker service (already exists in docker-compose.yml for dcm4chee, add shared one)

2. Update `docker-compose.yml`:
   ```yaml
   postgres:
     image: postgres:16
     environment:
       POSTGRES_DB: relaypacs
       POSTGRES_USER: ${DB_USER:-relaypacs}
       POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
     volumes:
       - postgres_data:/var/lib/postgresql/data
     ports:
       - "5432:5432"
   ```

3. Create migration guide (`docs/postgresql_migration.md`):
   - Backup SQLite data
   - Export to SQL
   - Import to PostgreSQL
   - Verification steps

4. Update config for PostgreSQL:
   ```python
   database_url: str = "postgresql+asyncpg://user:pass@localhost/relaypacs"
   ```

5. Test with asyncpg:
   ```bash
   pip install asyncpg
   ```

6. Create database initialization script
7. Update CI/CD to use PostgreSQL for tests

**Validation:**
- [ ] PostgreSQL container starts
- [ ] Migrations run on PostgreSQL
- [ ] All tests pass with PostgreSQL
- [ ] Performance benchmarks acceptable

**Files Created:**
- `docs/postgresql_migration.md`
- `backend/scripts/migrate_sqlite_to_postgres.py`

**Files Modified:**
- `docker-compose.yml`
- `backend/app/config.py`
- `backend/requirements.txt`
- `.github/workflows/quality.yml`

---

#### 6. E2E Test Framework Setup (Playwright) ⚡ CRITICAL

**Priority:** Short-term  
**Effort:** 8 hours  
**Dependencies:** None

**Steps:**
1. Install Playwright:
   ```bash
   cd frontend
   npm install -D @playwright/test
   npx playwright install
   ```

2. Create Playwright config (`frontend/playwright.config.ts`):
   ```typescript
   import { defineConfig } from '@playwright/test';
   
   export default defineConfig({
     testDir: './e2e',
     use: {
       baseURL: 'http://localhost:3002',
       trace: 'on-first-retry',
     },
     webServer: {
       command: 'npm run dev',
       port: 3002,
     },
   });
   ```

3. Create test structure:
   ```
   frontend/e2e/
   ├── auth/
   │   ├── login.spec.ts
   │   └── register.spec.ts
   ├── upload/
   │   ├── upload-workflow.spec.ts
   │   └── resume-upload.spec.ts
   ├── dashboard/
   │   └── analytics.spec.ts
   └── fixtures/
       └── test-data.ts
   ```

4. Write critical path tests:
   - User login flow
   - User registration
   - Complete upload workflow
   - Resume interrupted upload
   - View dashboard analytics

5. Add to package.json:
   ```json
   "scripts": {
     "test:e2e": "playwright test",
     "test:e2e:ui": "playwright test --ui"
   }
   ```

6. Add to CI/CD pipeline

**Validation:**
- [ ] All E2E tests pass
- [ ] Tests run in CI/CD
- [ ] Test reports generated
- [ ] Screenshots on failure

**Files Created:**
- `frontend/playwright.config.ts`
- `frontend/e2e/auth/login.spec.ts`
- `frontend/e2e/auth/register.spec.ts`
- `frontend/e2e/upload/upload-workflow.spec.ts`
- `frontend/e2e/upload/resume-upload.spec.ts`
- `frontend/e2e/dashboard/analytics.spec.ts`

**Files Modified:**
- `frontend/package.json`
- `.github/workflows/quality.yml`

---

#### 7. API Versioning Implementation

**Priority:** Short-term  
**Effort:** 4 hours  
**Dependencies:** None

**Steps:**
1. Create versioned router structure:
   ```
   backend/app/
   ├── api/
   │   ├── __init__.py
   │   └── v1/
   │       ├── __init__.py
   │       ├── auth.py
   │       ├── upload.py
   │       ├── reports.py
   │       └── notifications.py
   ```

2. Move existing routers to v1:
   ```python
   # backend/app/api/v1/__init__.py
   from fastapi import APIRouter
   from .auth import router as auth_router
   from .upload import router as upload_router
   
   api_router = APIRouter()
   api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
   api_router.include_router(upload_router, prefix="/upload", tags=["upload"])
   ```

3. Update main.py:
   ```python
   from app.api.v1 import api_router as v1_router
   
   app.include_router(v1_router, prefix="/api/v1")
   ```

4. Update frontend API client:
   ```typescript
   const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/v1`;
   ```

5. Add API version header:
   ```python
   response.headers["API-Version"] = "1.0"
   ```

6. Update all tests with new paths

**Validation:**
- [ ] All endpoints accessible via `/api/v1/`
- [ ] Frontend works with new paths
- [ ] Old paths return deprecation notice
- [ ] Tests pass

**Files Created:**
- `backend/app/api/__init__.py`
- `backend/app/api/v1/__init__.py`
- `backend/app/api/v1/auth.py` (moved)
- `backend/app/api/v1/upload.py` (moved)
- `backend/app/api/v1/reports.py` (moved)
- `backend/app/api/v1/notifications.py` (moved)

**Files Modified:**
- `backend/app/main.py`
- `frontend/src/services/api.ts`
- All test files

---

### 📋 Phase 3: Accessibility & Documentation (Week 3-4)

#### 8. Accessibility Audit and Fixes

**Priority:** Short-term  
**Effort:** 12 hours  
**Dependencies:** None

**Steps:**

**Part A: Automated Testing Setup (2 hours)**
1. Install accessibility tools:
   ```bash
   npm install -D @axe-core/react jest-axe
   ```

2. Add to test setup:
   ```typescript
   import { toHaveNoViolations } from 'jest-axe';
   expect.extend(toHaveNoViolations);
   ```

3. Create accessibility test helper
4. Add axe tests to all components

**Part B: WCAG AA Compliance (6 hours)**

5. **Keyboard Navigation:**
   - Add skip navigation link
   - Implement focus management on route changes
   - Test all interactive elements with keyboard
   - Add visible focus indicators

6. **ARIA Attributes:**
   - Add roles to landmarks
   - Add aria-label to icon buttons
   - Add aria-live regions for notifications
   - Add aria-expanded/collapsed states
   - Add aria-describedby for form errors

7. **Color Contrast:**
   - Audit all text/background combinations
   - Fix low contrast issues (aim for 7:1 for AAA)
   - Ensure focus indicators are visible

8. **Semantic HTML:**
   - Replace divs with semantic elements
   - Proper heading hierarchy (h1→h2→h3)
   - Use <button> for all clickable actions

**Part C: Screen Reader Testing (4 hours)**

9. Test with NVDA (Windows) or VoiceOver (Mac)
10. Document keyboard shortcuts
11. Create accessibility statement page

**Files to Modify:**
- All components in `frontend/src/components/`
- All pages in `frontend/src/pages/`
- `frontend/src/index.css` (focus styles)
- `frontend/src/components/SkipNavigation.tsx` (new)
- `frontend/src/pages/AccessibilityStatement.tsx` (new)

**Validation:**
- [ ] Axe tests pass
- [ ] Lighthouse accessibility score ≥ 95
- [ ] Manual keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Color contrast meets WCAG AA

---

#### 9. Architecture Documentation

**Priority:** Short-term  
**Effort:** 6 hours  
**Dependencies:** None

**Steps:**
1. Create architecture diagrams using Mermaid:
   - System architecture
   - Database schema
   - Upload workflow
   - Authentication flow
   - PACS integration

2. Create `docs/architecture.md`:
   ```markdown
   # RelayPACS Architecture
   
   ## System Overview
   [Mermaid diagram]
   
   ## Component Breakdown
   - Backend
   - Frontend
   - Database
   - PACS Integration
   - Storage Layer
   
   ## Data Flow
   ...
   ```

3. Document API contracts:
   - Request/response schemas
   - Error codes
   - Rate limits
   - Authentication

4. Create `docs/api.md` from OpenAPI spec
5. Add sequence diagrams for key workflows

**Files Created:**
- `docs/architecture.md`
- `docs/api.md`
- `docs/database-schema.md`
- `docs/workflows.md`

---

#### 10. Deployment Guide

**Priority:** Short-term  
**Effort:** 4 hours  
**Dependencies:** PostgreSQL migration (#5)

**Steps:**
1. Create `docs/deployment.md`:
   - Prerequisites
   - Environment setup
   - SSL/TLS configuration
   - Database initialization
   - Docker deployment
   - Kubernetes deployment (optional)
   - Nginx configuration
   - Monitoring setup
   - Backup procedures
   - Troubleshooting

2. Create deployment scripts:
   - `scripts/deploy.sh`
   - `scripts/backup.sh`
   - `scripts/restore.sh`

3. Create environment templates:
   - `deployment/production.env.example`
   - `deployment/staging.env.example`

4. Document SSL setup with Let's Encrypt
5. Create health check endpoints documentation

**Files Created:**
- `docs/deployment.md`
- `scripts/deploy.sh`
- `scripts/backup.sh`
- `scripts/restore.sh`
- `deployment/production.env.example`
- `deployment/nginx-ssl.conf`

---

### 📋 Phase 4: Testing & Code Quality (Month 2)

#### 11. Frontend Test Coverage Expansion

**Priority:** Short-term  
**Effort:** 16 hours  
**Dependencies:** E2E setup (#6)

**Steps:**
1. Set coverage targets in `vite.config.ts`:
   ```typescript
   test: {
     coverage: {
       provider: 'v8',
       reporter: ['text', 'json', 'html'],
       lines: 80,
       functions: 80,
       branches: 80,
       statements: 80,
     },
   }
   ```

2. Test all pages (7 pages × 2 hours = 14 hours):
   - `Login.test.tsx` - Login/register forms, validation, errors
   - `Dashboard.test.tsx` - Charts, filters, data loading
   - `UploadStudy.test.tsx` - File selection, drag-drop
   - `MetadataConfirmation.test.tsx` - Form validation
   - `UploadProgress.test.tsx` - Progress display, pause/resume
   - `Reports.test.tsx` - List, filters, status updates
   - `Notifications.test.tsx` - List, mark as read

3. Test remaining components:
   - `Layout.test.tsx`
   - `FilePreview.test.tsx`
   - `TrendChart.test.tsx`
   - `NetworkStatus.test.tsx`
   - `PWAInstallPrompt.test.tsx`

4. Test hooks:
   - `useAuth.test.ts`
   - `useNetworkStatus.test.ts`
   - `usePWAAppBadge.test.ts`

5. Add coverage reporting to CI/CD
6. Fix coverage gaps

**Validation:**
- [ ] Coverage ≥ 80% for lines/functions/branches
- [ ] All pages have tests
- [ ] All hooks have tests
- [ ] Coverage reports in CI/CD

**Files Created:**
- `frontend/src/pages/__tests__/Login.test.tsx`
- `frontend/src/pages/__tests__/Dashboard.test.tsx`
- `frontend/src/pages/__tests__/UploadStudy.test.tsx`
- (... 10+ more test files)

---

#### 12. Component Library Setup (Storybook)

**Priority:** Long-term (but requested)  
**Effort:** 12 hours  
**Dependencies:** None

**Steps:**
1. Install Storybook:
   ```bash
   npx storybook@latest init --type react-vite
   ```

2. Configure Storybook for Tailwind:
   ```typescript
   // .storybook/preview.ts
   import '../src/index.css';
   ```

3. Create stories for all components (14 components × 30 min):
   - `Login.stories.tsx`
   - `Layout.stories.tsx`
   - `FilePreview.stories.tsx`
   - `TrendChart.stories.tsx`
   - `ExportButton.stories.tsx`
   - `NotificationBell.stories.tsx`
   - `NotificationToast.stories.tsx`
   - `ReportCard.stories.tsx`
   - (... 6 more)

4. Add component documentation:
   - Props table
   - Usage examples
   - Accessibility notes

5. Configure Storybook addons:
   - a11y addon for accessibility testing
   - viewport addon for responsive testing
   - actions addon for interaction testing

6. Add to CI/CD:
   ```bash
   npm run build-storybook
   ```

7. Deploy Storybook to GitHub Pages or Chromatic

**Validation:**
- [ ] All components have stories
- [ ] Stories show all variants
- [ ] Accessibility checks pass
- [ ] Storybook deployed

**Files Created:**
- `.storybook/main.ts`
- `.storybook/preview.ts`
- `frontend/src/components/**/*.stories.tsx` (14+ files)

**Files Modified:**
- `frontend/package.json`
- `.gitignore`

---

### 📋 Phase 5: Performance & Advanced Features (Month 2-3)

#### 13. Caching Layer (Redis)

**Priority:** Medium-term  
**Effort:** 8 hours  
**Dependencies:** None

**Steps:**
1. Add Redis to Docker Compose:
   ```yaml
   redis:
     image: redis:7-alpine
     ports:
       - "6379:6379"
     volumes:
       - redis_data:/data
   ```

2. Install Redis client:
   ```bash
   pip install redis aioredis
   ```

3. Create cache service (`backend/app/cache/service.py`):
   ```python
   import aioredis
   from app.config import get_settings
   
   class CacheService:
       def __init__(self):
           self.redis = None
       
       async def connect(self):
           settings = get_settings()
           self.redis = await aioredis.from_url(settings.redis_url)
       
       async def get(self, key: str):
           return await self.redis.get(key)
       
       async def set(self, key: str, value: str, ttl: int = 300):
           await self.redis.setex(key, ttl, value)
   ```

4. Add caching to:
   - Upload statistics (5-minute TTL)
   - User authentication (session cache)
   - PACS query results

5. Implement cache invalidation strategy
6. Add cache monitoring

**Validation:**
- [ ] Redis container runs
- [ ] Cache hits/misses logged
- [ ] Performance improvement measured
- [ ] Cache invalidation works

**Files Created:**
- `backend/app/cache/__init__.py`
- `backend/app/cache/service.py`

**Files Modified:**
- `docker-compose.yml`
- `backend/requirements.txt`
- `backend/app/config.py`
- `backend/app/upload/router.py`

---

#### 14. 2FA/TOTP Implementation

**Priority:** Medium-term  
**Effort:** 10 hours  
**Dependencies:** None

**Steps:**
1. Install TOTP library:
   ```bash
   pip install pyotp qrcode
   ```

2. Add database fields for 2FA:
   ```python
   # Migration
   totp_secret = Column(String, nullable=True)
   totp_enabled = Column(Boolean, default=False)
   backup_codes = Column(JSON, nullable=True)
   ```

3. Create 2FA endpoints:
   - `POST /auth/2fa/setup` - Generate TOTP secret
   - `POST /auth/2fa/verify` - Verify TOTP code
   - `POST /auth/2fa/disable` - Disable 2FA
   - `GET /auth/2fa/backup-codes` - Generate backup codes

4. Update login flow:
   - Check if 2FA enabled
   - Request TOTP code
   - Verify before issuing token

5. Create frontend components:
   - `TwoFactorSetup.tsx` - QR code display
   - `TwoFactorVerify.tsx` - Code input
   - `BackupCodes.tsx` - Backup codes display

6. Add to user settings page

**Validation:**
- [ ] TOTP setup works
- [ ] Login with 2FA works
- [ ] Backup codes work
- [ ] Disable 2FA works

**Files Created:**
- `backend/app/auth/totp.py`
- `backend/alembic/versions/00X_add_2fa.py`
- `frontend/src/components/TwoFactorSetup.tsx`
- `frontend/src/components/TwoFactorVerify.tsx`

---

#### 15. Performance Optimization

**Priority:** Medium-term  
**Effort:** 12 hours  
**Dependencies:** Caching (#13)

**Backend Optimizations (6 hours):**
1. Add database connection pooling:
   ```python
   engine = create_async_engine(
       settings.database_url,
       pool_size=20,
       max_overflow=10,
   )
   ```

2. Implement query optimization:
   - Add indexes to frequently queried columns
   - Use eager loading for relationships
   - Implement pagination

3. Add response compression:
   ```python
   from fastapi.middleware.gzip import GZipMiddleware
   app.add_middleware(GZipMiddleware, minimum_size=1000)
   ```

4. Optimize DICOM processing (async)

**Frontend Optimizations (6 hours):**
1. Implement code splitting:
   ```typescript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

2. Add image optimization:
   ```bash
   npm install vite-plugin-image-optimizer
   ```

3. Optimize bundle size:
   - Analyze with `vite-bundle-visualizer`
   - Remove unused dependencies
   - Tree-shake unused code

4. Implement virtual scrolling for long lists

5. Add resource preloading

**Validation:**
- [ ] Lighthouse performance score ≥ 90
- [ ] Bundle size reduced by 20%
- [ ] API response times improved
- [ ] Database query times optimized

---

#### 16. Monitoring Setup (Prometheus/Grafana)

**Priority:** Medium-term  
**Effort:** 10 hours  
**Dependencies:** Redis (#13)

**Steps:**
1. Add Prometheus and Grafana to Docker Compose:
   ```yaml
   prometheus:
     image: prom/prometheus:latest
     ports:
       - "9090:9090"
     volumes:
       - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
       - prometheus_data:/prometheus
   
   grafana:
     image: grafana/grafana:latest
     ports:
       - "3001:3000"
     volumes:
       - grafana_data:/var/lib/grafana
   ```

2. Install metrics exporter:
   ```bash
   pip install prometheus-fastapi-instrumentator
   ```

3. Add metrics to FastAPI:
   ```python
   from prometheus_fastapi_instrumentator import Instrumentator
   
   Instrumentator().instrument(app).expose(app)
   ```

4. Create Prometheus config:
   - Scrape backend metrics
   - Scrape Redis metrics
   - Scrape PostgreSQL metrics

5. Create Grafana dashboards:
   - API performance
   - Upload statistics
   - System resources
   - Error rates
   - User activity

6. Set up alerting rules

**Validation:**
- [ ] Metrics exported
- [ ] Prometheus scrapes successfully
- [ ] Grafana dashboards display data
- [ ] Alerts trigger correctly

**Files Created:**
- `monitoring/prometheus.yml`
- `monitoring/grafana/dashboards/*.json`
- `monitoring/alerts.yml`

**Files Modified:**
- `docker-compose.yml`
- `backend/requirements.txt`
- `backend/app/main.py`

---

## Success Criteria

### Phase 1 Complete When:
- ✅ No hardcoded secrets anywhere
- ✅ Database migrations working
- ✅ Security headers on all responses
- ✅ Errors logged to Sentry

### Phase 2 Complete When:
- ✅ PostgreSQL fully operational
- ✅ E2E tests covering critical paths
- ✅ All APIs versioned under `/api/v1/`

### Phase 3 Complete When:
- ✅ Lighthouse accessibility score ≥ 95
- ✅ Architecture fully documented
- ✅ Deployment guide complete

### Phase 4 Complete When:
- ✅ Frontend test coverage ≥ 80%
- ✅ Storybook deployed with all components

### Phase 5 Complete When:
- ✅ Redis caching operational
- ✅ 2FA fully functional
- ✅ Performance improvements measurable
- ✅ Monitoring dashboards live

---

## Risk Management

### High-Risk Items:
1. **PostgreSQL Migration** - Could cause data loss
   - Mitigation: Comprehensive backup strategy, test migration multiple times

2. **API Versioning** - Could break existing clients
   - Mitigation: Maintain v0 compatibility temporarily, clear deprecation timeline

3. **Security Headers** - Could break CORS or CSP
   - Mitigation: Test thoroughly in staging, gradual rollout

### Dependencies:
- Alembic must be set up before PostgreSQL migration
- E2E tests should be in place before major refactoring
- Security headers should be tested before production deployment

---

## Timeline Summary

| Phase | Duration | Dates (Estimate) |
|-------|----------|------------------|
| Phase 1 | 1 week | Week 1 |
| Phase 2 | 2 weeks | Week 2-3 |
| Phase 3 | 2 weeks | Week 3-4 |
| Phase 4 | 4 weeks | Month 2 |
| Phase 5 | 4 weeks | Month 2-3 |

**Total Duration:** ~3 months for all 16 improvements

---

## Next Steps

1. Review and approve this implementation plan
2. Create Git branch: `feat/improvements-phase-1`
3. Begin with Phase 1, Item #1 (Fix hardcoded secrets)
4. Track progress in implementation checklist
5. Review after each phase completion
