# Implementation Plan: Dependency Modernization - Quick Wins

**Priority:** 🔴 High (Immediate Action)
**Effort:** 2-3 hours total
**Risk:** 🟢 Very Low
**Timeline:** Complete within 1 week

---

## Overview

This plan implements **Tier 1 & 2 fixes** from the dependency audit, focusing on zero-risk improvements that enhance build reproducibility, security, and developer experience.

### What This Plan Accomplishes

1. ✅ Fixes 4 duplicate entries in `requirements.txt`
2. ✅ Pins 3 unpinned dependencies (`pyotp`, `qrcode`, `redis`)
3. ✅ Syncs pre-commit hooks with installed package versions
4. ✅ Updates Prettier to latest patch version

**All changes are non-breaking** and preserve 100% functional parity.

---

## User Review Required

> [!IMPORTANT]
> **Breaking Changes:** None - All changes are configuration/version pinning only.
>
> **Testing Requirements:** Backend tests, pre-commit hooks validation.
>
> **Deployment Impact:** None - Can be deployed at any time.

---

## Proposed Changes

### Backend Configuration

#### [MODIFY] [requirements.txt](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/backend/requirements.txt)

**Changes:**
1. **Delete duplicate unpinned `asyncpg`** (line 13)
2. **Pin `pyotp`** to installed version (line 14)
3. **Pin `qrcode`** to installed version (line 15)
4. **Pin `redis`** to installed version (line 16)
5. **Delete duplicate `prometheus-fastapi-instrumentator`** (line 53)
6. **Delete duplicate `reportlab`** (line 54)
7. **Delete duplicate `sse-starlette`** (line 55)

**Effort:** 15 minutes
**Risk:** 🟢 None - Only removing duplicates and pinning versions

---

### Development Tooling

#### [MODIFY] [.pre-commit-config.yaml](file://home/ubuntu-desk/Desktop/Teleradiology/geteway/.pre-commit-config.yaml)

**Changes:**
1. Update `black` hook: `24.1.1` → `25.12.0`
2. Update `ruff` hook: `v0.1.14` → `v0.14.11`
3. Update `mypy` hook: `v1.8.0` → `v1.19.1`
4. Update `prettier` hook: `v3.1.0` → `v3.8.0`

**Effort:** 10 minutes
**Risk:** 🟢 Very Low - Syncing with installed versions

---

### Frontend Dependencies

#### [MODIFY] [frontend/package.json](file:///home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend/package.json)

**Changes:**
1. Update `prettier`: `3.2.4` → `3.8.0` (patch update)

**Effort:** 5 minutes
**Risk:** 🟢 None - Patch version update

---

## Verification Plan

### Automated Tests

**Backend validation:**
```bash
cd backend
source ../venv/bin/activate
pytest -v --cov
```
**Expected:** All tests pass (same count as current)

**Frontend validation:**
```bash
cd frontend
npm test -- --run
npm run lint
```
**Expected:** All tests pass, no new linting errors

### Manual Verification

**Pre-commit hooks:**
```bash
pre-commit run --all-files
```
**Expected:** All hooks run successfully with updated versions

**Dependency installation:**
```bash
# Backend
pip install -r backend/requirements.txt --dry-run

# Frontend
npm install --dry-run
```
**Expected:** No conflicts, clean installation

---

## Detailed Implementation Steps

### Step 1: Pin Unpinned Backend Dependencies (15 min)

#### 1.1 Determine Current Versions
```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
source ../venv/bin/activate
pip freeze | grep -E "pyotp|qrcode|redis"
```

**Record versions here:**
- `pyotp==___`
- `qrcode==___`
- `redis==___`

#### 1.2 Update requirements.txt

Open `backend/requirements.txt` and make these changes:

**Line 13:** DELETE
```diff
-asyncpg
```

**Lines 14-16:** ADD VERSION PINS
```diff
-pyotp
-qrcode
-redis
+pyotp==<VERSION_FROM_STEP_1.1>
+qrcode==<VERSION_FROM_STEP_1.1>
+redis==<VERSION_FROM_STEP_1.1>
```

**Lines 53-55:** DELETE DUPLICATES
```diff
 apscheduler==3.10.4
-prometheus-fastapi-instrumentator==7.0.0
-reportlab==4.2.5
-sse-starlette==2.2.1
```

#### 1.3 Validate Changes
```bash
# Check for remaining duplicates
sort requirements.txt | uniq -d
# Expected output: (empty)

# Check for unpinned packages
grep -E "^[a-zA-Z0-9_-]+$" requirements.txt
# Expected output: (empty)
```

#### 1.4 Test Installation
```bash
pip install -r requirements.txt --dry-run
# Expected: No errors
```

---

### Step 2: Sync Pre-commit Hooks (10 min)

#### 2.1 Update .pre-commit-config.yaml

Open `.pre-commit-config.yaml` and update these lines:

**Line 12:**
```diff
-    rev: 24.1.1
+    rev: 25.12.0
```

**Line 18:**
```diff
-    rev: v0.1.14
+    rev: v0.14.11
```

**Line 25:**
```diff
-    rev: v1.8.0
+    rev: v1.19.1
```

**Line 32:**
```diff
-    rev: v3.1.0
+    rev: v3.8.0
```

#### 2.2 Reinstall Hooks
```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway
pre-commit uninstall
pre-commit clean
pre-commit install
```

#### 2.3 Validate All Hooks
```bash
pre-commit run --all-files
```
**Expected:** All hooks pass (minor formatting changes acceptable)

---

### Step 3: Update Prettier (5 min)

#### 3.1 Update Package
```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend
npm install prettier@3.8.0 --save-dev
```

#### 3.2 Verify Update
```bash
npm list prettier
# Expected: prettier@3.8.0
```

#### 3.3 Run Format Check
```bash
npm run format
```
**Expected:** No or minimal formatting changes

---

### Step 4: Validation & Testing (30 min)

#### 4.1 Backend Tests
```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
pytest -v --cov
```
**Acceptance criteria:**
- [ ] All tests pass
- [ ] Test count unchanged
- [ ] Coverage ≥ current baseline

#### 4.2 Frontend Tests
```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend
npm test -- --run
npm run lint
```
**Acceptance criteria:**
- [ ] All unit tests pass
- [ ] No new linting errors
- [ ] Build succeeds: `npm run build`

#### 4.3 Integration Smoke Test
```bash
# Start services
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway
docker-compose up -d backend postgres redis

# Wait for services
sleep 10

# Health check
curl http://localhost:8003/api/v1/health
# Expected: {"status":"healthy"}
```
**Acceptance criteria:**
- [ ] Backend starts without errors
- [ ] Health endpoint responds
- [ ] No Python import errors in logs

---

### Step 5: Commit Changes (5 min)

#### 5.1 Review Changed Files
```bash
git status
git diff
```
**Expected changes:**
- `backend/requirements.txt`
- `.pre-commit-config.yaml`
- `frontend/package.json`
- `frontend/package-lock.json`

#### 5.2 Commit
```bash
git add backend/requirements.txt
git add .pre-commit-config.yaml
git add frontend/package.json frontend/package-lock.json

git commit -m "fix(deps): Pin unpinned dependencies and sync pre-commit hooks

Backend changes:
- Pin pyotp, qrcode, redis to installed versions
- Remove duplicate asyncpg (unpinned) on line 13
- Remove duplicate prometheus-fastapi-instrumentator on line 53
- Remove duplicate reportlab on line 54
- Remove duplicate sse-starlette on line 55

Development tooling:
- Sync pre-commit hooks to installed package versions:
  - black: 24.1.1 → 25.12.0
  - ruff: v0.1.14 → v0.14.11
  - mypy: v1.8.0 → v1.19.1
  - prettier: v3.1.0 → v3.8.0

Frontend:
- Update prettier: 3.2.4 → 3.8.0 (patch)

Testing:
✅ All backend tests pass
✅ All frontend tests pass
✅ Pre-commit hooks validated
✅ No functional changes

Resolves: Dependency reproducibility issues
Resolves: Pre-commit hook version drift"
```

---

## Rollback Procedure

If any issue arises:

### Immediate Rollback
```bash
# Revert commit
git revert HEAD

# Reinstall dependencies
cd backend && pip install -r requirements.txt
cd frontend && npm install

# Reinstall pre-commit hooks
pre-commit uninstall && pre-commit install

# Verify rollback
pytest  # Backend
npm test  # Frontend
```

### Partial Rollback

If only one component has issues, revert specific files:

```bash
# Backend only
git checkout HEAD~1 -- backend/requirements.txt
pip install -r backend/requirements.txt

# Pre-commit only
git checkout HEAD~1 -- .pre-commit-config.yaml
pre-commit install

# Frontend only
git checkout HEAD~1 -- frontend/package.json frontend/package-lock.json
npm install
```

---

## Success Criteria

### Pre-Deployment Checklist

- [ ] All duplicate `requirements.txt` entries removed
- [ ] All unpinned dependencies now pinned
- [ ] Pre-commit hooks synced with installed versions
- [ ] Prettier updated to 3.8.0
- [ ] Backend tests pass (100%)
- [ ] Frontend tests pass (100%)
- [ ] Pre-commit hooks run successfully
- [ ] No new linting/type errors
- [ ] Build succeeds for both frontend and backend
- [ ] Git commit created with descriptive message

### Post-Deployment Monitoring (24 hours)

- [ ] No new Sentry errors
- [ ] API response times unchanged
- [ ] Frontend bundle size unchanged (±2%)
- [ ] No CI/CD failures
- [ ] Developer feedback: pre-commit hooks working correctly

---

## Timeline & Ownership

### Proposed Schedule

| Step | Task | Duration | Owner | Status |
|------|------|----------|-------|--------|
| 1 | Pin backend dependencies | 15 min | Backend Dev | ⏳ Pending |
| 2 | Sync pre-commit hooks | 10 min | DevOps | ⏳ Pending |
| 3 | Update Prettier | 5 min | Frontend Dev | ⏳ Pending |
| 4 | Run validation tests | 30 min | QA | ⏳ Pending |
| 5 | Code review | 30 min | Tech Lead | ⏳ Pending |
| 6 | Merge & deploy | 10 min | DevOps | ⏳ Pending |

**Total Time:** ~2 hours (elapsed time with reviews)

### Assignment Recommendations

- **Backend changes:** Any backend developer
- **Pre-commit changes:** DevOps or tech lead
- **Frontend changes:** Any frontend developer
- **Code review:** Senior engineer (quick review, low complexity)

---

## Follow-Up Actions (Future Sprints)

After this plan is complete, consider these future upgrades:

### Sprint 2 (Weeks 2-3)
- [ ] Recharts 2.x → 3.x upgrade (4 files, 1-3 days effort)
- [ ] Consolidate TypeScript type definitions

### Q2 2026
- [ ] Tailwind CSS 3.x → 4.x migration (2-4 weeks effort, HIGH COMPLEXITY)
- [ ] Abstract PACS client interface

### 2026 H2
- [ ] Research Cornerstone3D migration (separate project)

---

## Risk Assessment

### Overall Risk: 🟢 **VERY LOW**

| Risk Category | Level | Mitigation |
|---------------|-------|------------|
| **Functional Regression** | 🟢 None | No code changes, only config |
| **Performance Impact** | 🟢 None | No runtime changes |
| **Security Impact** | 🟢 Positive | Improved build reproducibility |
| **Developer Experience** | 🟢 Positive | Consistent linting across team |

### Known Issues: **NONE**

All changes are:
- Configuration-only (no code logic changes)
- Version pinning (no upgrades beyond current installed)
- Tool synchronization (aligning existing tools)

---

## Questions for Review

Before proceeding, please confirm:

1. **Do the pinned versions from `pip freeze` look correct?** (You'll see them in Step 1.1)
2. **Should we deploy this immediately or wait for next release cycle?** (Recommend: next regular deployment)
3. **Any additional validation needed beyond automated tests?** (Current plan includes comprehensive checks)

---

**Plan Status:** ⏳ Ready for Approval
**Estimated Completion:** 1 week from approval
**Next Action:** Execute Step 1 (Pin backend dependencies)
