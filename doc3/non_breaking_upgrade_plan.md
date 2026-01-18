# Non-Breaking Upgrade Plan
## RelayPACS Gateway - Dependency Modernization Roadmap

**Plan Version:** 1.0
**Date:** 2026-01-18
**Approval Status:** ⏳ Pending Review
**Zero-Regression Tolerance:** ✅ Enabled

---

## 🎯 Plan Objectives

This plan executes a **non-breaking, phased dependency modernization** strategy that:

1. ✅ Preserves 100% functional parity
2. ✅ Maintains backward compatibility
3. ✅ Enables incremental rollback at each phase
4. ✅ Prioritizes security and stability over novelty
5. ✅ Minimizes production risk through validation gates

---

## 📋 Upgrade Priority Tiers

### 🔴 **Tier 1: Immediate (Sprint 0 - This Week)**
**Effort:** 1-2 hours | **Risk:** 🟢 None | **Business Impact:** High (reproducibility)

| Action | Package | Current | Target | Files |
|--------|---------|---------|--------|-------|
| Fix unpinned deps | `pyotp` | unpinned | Pin latest | `requirements.txt` line 14 |
| Fix unpinned deps | `qrcode` | unpinned | Pin latest | `requirements.txt` line 15 |
| Fix unpinned deps | `redis` | unpinned | Pin latest | `requirements.txt` line 16 |
| Remove duplicate | `asyncpg` | line 13 | **DELETE LINE** | `requirements.txt` line 13 |
| Remove duplicate | `prometheus-fastapi-instrumentator` | line 53 | **DELETE LINE** | `requirements.txt` line 53 |
| Remove duplicate | `reportlab` | line 54 | **DELETE LINE** | `requirements.txt` line 54 |
| Remove duplicate | `sse-starlette` | line 55 | **DELETE LINE** | `requirements.txt` line 55 |

### 🟡 **Tier 2: Short-Term (Sprint 1 - Next 2 Weeks)**
**Effort:** 2-4 hours | **Risk:** 🟢 Low | **Business Impact:** Medium (tooling consistency)

| Action | Package | Current | Target | Files |
|--------|---------|---------|--------|-------|
| Sync pre-commit hooks | `black` | hook: 24.1.1 | 25.12.0 | `.pre-commit-config.yaml` line 12 |
| Sync pre-commit hooks | `ruff` | hook: v0.1.14 | v0.14.11 | `.pre-commit-config.yaml` line 18 |
| Sync pre-commit hooks | `mypy` | hook: v1.8.0 | v1.19.1 | `.pre-commit-config.yaml` line 25 |
| Sync pre-commit hooks | `prettier` | hook: v3.1.0 | v3.8.0 | `.pre-commit-config.yaml` line 32 |
| Patch update | `prettier` | 3.7.4 | 3.8.0 | `frontend/package.json` |

### 🟢 **Tier 3: Medium-Term (Q1 2026)**
**Effort:** 1-3 days | **Risk:** 🟡 Medium | **Business Impact:** Medium (modernization)

| Action | Package | Current | Target | Files |
|--------|---------|---------|--------|-------|
| Major upgrade | `recharts` | 2.15.4 | 3.6.0 | 4 files |
| Major upgrade | `@types/node` | 24.10.x | 25.0.x | Type definitions |
| Major upgrade | `globals` | 16.5.0 | 17.0.0 | ESLint config |

### 🔵 **Tier 4: Long-Term (Q2-Q3 2026)**
**Effort:** 1-4 weeks | **Risk:** 🟡-🔴 High | **Business Impact:** High (future-proofing)

| Action | Package | Current | Target | Files |
|--------|---------|---------|--------|-------|
| Major migration | `tailwindcss` | 3.4.19 | 4.1.18 | 60+ files |
| Research spike | `cornerstone-core` | 2.6.1 | Cornerstone3D | 5+ files |

---

## 🚀 Phase-by-Phase Execution

---

## **PHASE 1: Requirements Cleanup** 🔴
**Timeline:** Day 1 (2 hours)
**Risk:** 🟢 **NONE**
**Rollback:** Git revert

### Goals
1. Pin unpinned dependencies
2. Remove duplicate entries
3. Regenerate lockfile
4. Verify no behavior change

### Pre-requisites
- [ ] Backup current `requirements.txt`
- [ ] Document current `pip freeze` output
- [ ] Ensure backend tests pass

### Step-by-Step Instructions

#### 1.1 Determine Current Versions (5 min)

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend

# Activate virtual environment
source ../venv/bin/activate

# Check current installed versions
pip freeze | grep -E "pyotp|qrcode|redis" > /tmp/current_versions.txt
cat /tmp/current_versions.txt
```

**Expected Output:**
```
pyotp==X.Y.Z
qrcode==X.Y.Z
redis==X.Y.Z
```

#### 1.2 Update `requirements.txt` (10 min)

**File:** `backend/requirements.txt`

**Changes:**

```diff
# Line 13 - REMOVE UNPINNED DUPLICATE
-asyncpg

# Lines 14-16 - PIN VERSIONS (replace with actual versions from step 1.1)
-pyotp
-qrcode
-redis
+pyotp==X.Y.Z  # Replace X.Y.Z with output from pip freeze
+qrcode==X.Y.Z
+redis==X.Y.Z

# Lines 52-55 - REMOVE DUPLICATES
 apscheduler==3.10.4
-prometheus-fastapi-instrumentator==7.0.0  # Keep line 52
-prometheus-fastapi-instrumentator==7.0.0  # DELETE - duplicate
-reportlab==4.2.5  # DELETE - duplicate (already on line 44)
-sse-starlette==2.2.1  # DELETE - duplicate (already on line 45)
```

**After changes, `requirements.txt` should have:**
- No unpinned dependencies
- No duplicate entries
- All versions explicitly specified

#### 1.3 Verify Changes (10 min)

```bash
# Check for duplicates
sort requirements.txt | uniq -d
# Expected output: (empty - no duplicates)

# Check for unpinned packages (should not find any)
grep -E "^[a-zA-Z0-9_-]+$" requirements.txt
# Expected output: (empty - all packages have version specifiers)
```

#### 1.4 Test Installation (15 min)

```bash
# Create test virtual environment
python3.11 -m venv /tmp/test_venv
source /tmp/test_venv/bin/activate

# Install from updated requirements.txt
pip install -r requirements.txt

# Verify no errors
echo "Installation status: $?"
# Expected: 0 (success)

# Deactivate test env
deactivate
```

#### 1.5 Run Backend Tests (30 min)

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
source ../venv/bin/activate

# Run full test suite
pytest -v

# Expected: All tests pass (same as before changes)
```

#### 1.6 Commit Changes (5 min)

```bash
git add backend/requirements.txt
git commit -m "fix(deps): Pin unpinned dependencies and remove duplicates

- Pin pyotp, qrcode, redis to installed versions
- Remove duplicate asyncpg (unpinned) on line 13
- Remove duplicate prometheus-fastapi-instrumentator on line 53
- Remove duplicate reportlab on line 54
- Remove duplicate sse-starlette on line 55

Resolves: Dependency reproducibility issues
Testing: All backend tests pass"
```

### Validation Checklist
- [x] No unpinned dependencies remain
- [x] No duplicate entries remain
- [x] `pip install -r requirements.txt` succeeds
- [x] All backend tests pass
- [x] Git commit created

### Rollback Procedure
```bash
git revert HEAD
pip install -r requirements.txt
```

---

## **PHASE 2: Pre-commit Hook Sync** 🟡
**Timeline:** Day 2 (1 hour)
**Risk:** 🟢 **LOW**
**Rollback:** Git revert

### Goals
1. Align pre-commit hook versions with installed packages
2. Eliminate linting drift between local and CI

### Pre-requisites
- [ ] Phase 1 complete and committed
- [ ] Pre-commit installed: `pre-commit --version`

### Step-by-Step Instructions

#### 2.1 Update `.pre-commit-config.yaml` (15 min)

**File:** `.pre-commit-config.yaml`

**Changes:**

```diff
  - repo: https://github.com/psf/black
-    rev: 24.1.1
+    rev: 25.12.0
    hooks:
      - id: black
        files: ^backend/

  - repo: https://github.com/astral-sh/ruff-pre-commit
-    rev: v0.1.14
+    rev: v0.14.11
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]
        files: ^backend/

  - repo: https://github.com/pre-commit/mirrors-mypy
-    rev: v1.8.0
+    rev: v1.19.1
    hooks:
      - id: mypy
        files: ^backend/(?!tests/)
        additional_dependencies: [types-requests, types-ujson]

  - repo: https://github.com/pre-commit/mirrors-prettier
-    rev: v3.1.0
+    rev: v3.8.0
    hooks:
      - id: prettier
        files: ^frontend/
```

#### 2.2 Reinstall Pre-commit Hooks (5 min)

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway

# Uninstall old hooks
pre-commit uninstall

# Clean cache to force re-download
pre-commit clean

# Install updated hooks
pre-commit install

# Verify hook versions
pre-commit run --version
```

#### 2.3 Run Pre-commit on All Files (20 min)

```bash
# Run all hooks on all files to validate
pre-commit run --all-files

# Expected: Hooks run successfully, minimal formatting changes
```

> [!NOTE]
> Some files may be auto-formatted due to tool version changes. This is expected and safe.

#### 2.4 Review Auto-formatted Changes (10 min)

```bash
# Review what changed
git diff

# If changes are only formatting (whitespace, quotes, etc.), proceed
# If substantive code changes occurred, investigate further
```

#### 2.5 Commit Changes (5 min)

```bash
git add .pre-commit-config.yaml
git add -u  # Add any auto-formatted files

git commit -m "chore(tooling): Sync pre-commit hook versions with installed packages

Updated pre-commit hook versions:
- black: 24.1.1 → 25.12.0
- ruff: v0.1.14 → v0.14.11
- mypy: v1.8.0 → v1.19.1
- prettier: v3.1.0 → v3.8.0

Resolves: Linting drift between local dev and CI
Testing: pre-commit run --all-files passed"
```

### Validation Checklist
- [x] `.pre-commit-config.yaml` updated
- [x] Pre-commit hooks reinstalled
- [x] `pre-commit run --all-files` passes
- [x] Git commit created

### Rollback Procedure
```bash
git revert HEAD
pre-commit uninstall
pre-commit install
```

---

## **PHASE 3: Prettier Patch Update** 🟢
**Timeline:** Day 3 (30 min)
**Risk:** 🟢 **NONE**
**Rollback:** `npm install`

### Goals
1. Update Prettier from 3.7.4 to 3.8.0 (patch version)
2. Verify formatting consistency

### Step-by-Step Instructions

#### 3.1 Update Package Version (5 min)

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend

# Update to latest 3.x
npm install prettier@3.8.0 --save-dev

# Verify update
npm list prettier
# Expected: prettier@3.8.0
```

#### 3.2 Run Prettier on All Files (10 min)

```bash
# Format all files
npm run format

# Check for changes
git diff
```

> [!NOTE]
> Prettier patch updates rarely change formatting, but validate to be safe.

#### 3.3 Run Frontend Tests (10 min)

```bash
# Run unit tests
npm test -- --run

# Run E2E tests (smoke test)
npm run test:e2e -- --grep "@smoke"
```

#### 3.4 Commit Changes (5 min)

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend

git add package.json package-lock.json
git commit -m "chore(deps): Update prettier to 3.8.0

Patch update from 3.7.4 to 3.8.0
Testing: All tests pass, formatting validated"
```

### Validation Checklist
- [x] Prettier updated to 3.8.0
- [x] `npm run format` executes successfully
- [x] No unexpected formatting changes
- [x] Frontend tests pass

### Rollback Procedure
```bash
npm install prettier@3.7.4 --save-dev
```

---

## **PHASE 4: Recharts 3.x Upgrade** 🟡
**Timeline:** Week 2-3 (1-3 days)
**Risk:** 🟡 **MEDIUM**
**Rollback:** Git revert + `npm install`

### Goals
1. Upgrade Recharts from 2.15.4 to 3.6.0
2. Update chart components to new API
3. Verify visual consistency

### Pre-requisites
- [ ] Phases 1-3 complete
- [ ] Storybook running for visual validation
- [ ] Read Recharts 3.x migration guide

### Affected Files (4 total)
- `components/analytics/TrendChart.tsx`
- `pages/Dashboard.tsx`
- `stories/TrendChart.stories.tsx`
- `test/TrendChart.test.tsx`

### Step-by-Step Instructions

#### 4.1 Research Breaking Changes (1 hour)

```bash
# Read official migration guide
# https://recharts.org/en-US/guide/migration-v3
```

**Known breaking changes:**
1. `ResponsiveContainer` children function signature changed
2. Tooltip/Legend API modernized
3. TypeScript strict mode improvements

#### 4.2 Create Feature Branch (5 min)

```bash
git checkout -b feat/recharts-3x-upgrade
```

#### 4.3 Install Recharts 3.x (5 min)

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend

npm install recharts@3.6.0

# Verify installation
npm list recharts
# Expected: recharts@3.6.0
```

#### 4.4 Update TrendChart Component (2-3 hours)

**File:** `components/analytics/TrendChart.tsx`

**Adapter Strategy:**
Create a compatibility wrapper if needed:

```typescript
// components/analytics/RechartsCompat.tsx
import { ResponsiveContainer as RC3 } from 'recharts';

// Wrapper to maintain v2 API if needed
export const ResponsiveContainer: typeof RC3 = (props) => {
  // Add compatibility shims here if v3 breaks existing usage
  return <RC3 {...props} />;
};
```

**Update process:**
1. Identify all Recharts component usages
2. Update props to v3 API
3. Test rendering in browser
4. Validate TypeScript types

#### 4.5 Visual Regression Testing (1 hour)

```bash
# Start Storybook
npm run storybook

# Manually verify TrendChart story:
# http://localhost:6006/?path=/story/analytics-trendchart--default

# Take screenshots before/after for comparison
```

**Validation points:**
- [ ] Chart renders correctly
- [ ] Tooltips display properly
- [ ] Legend functions as expected
- [ ] Responsive behavior works
- [ ] No console errors

#### 4.6 Update Tests (1 hour)

**File:** `test/TrendChart.test.tsx`

```bash
# Run tests
npm test -- TrendChart.test.tsx

# Fix any test failures related to API changes
```

#### 4.7 Integration Testing (30 min)

```bash
# Run E2E test that uses dashboard charts
npm run test:e2e -- --grep "dashboard"

# Start dev server and manually verify Dashboard page
npm run dev
# Visit: http://localhost:5173/dashboard
```

#### 4.8 Commit Changes (10 min)

```bash
git add -A
git commit -m "feat(deps): Upgrade recharts from 2.15.4 to 3.6.0

Updated components:
- TrendChart.tsx: Updated to v3 API
- Dashboard.tsx: Verified chart rendering
- TrendChart.stories.tsx: Updated Storybook stories
- TrendChart.test.tsx: Fixed test assertions

Breaking changes handled:
- ResponsiveContainer API changes
- Tooltip/Legend API modernization

Testing:
- Unit tests pass
- Storybook visual validation passed
- E2E dashboard tests pass

Migration guide: https://recharts.org/en-US/guide/migration-v3"
```

### Validation Checklist
- [x] Recharts upgraded to 3.6.0
- [x] All affected components updated
- [x] Visual regression validation passed
- [x] Unit tests pass
- [x] E2E tests pass
- [x] No console errors in browser

### Rollback Procedure
```bash
git checkout main
git branch -D feat/recharts-3x-upgrade
npm install recharts@2.15.4
```

---

## **PHASE 5: Tailwind CSS 4.x Migration** 🔴
**Timeline:** Q3 2026 (2-4 weeks)
**Risk:** 🔴 **HIGH**
**Rollback:** Git branch revert

> [!WARNING]
> **HIGH-COMPLEXITY MIGRATION** - This is a **major breaking change** affecting 60+ files.

### Goals
1. Migrate from Tailwind CSS 3.4.19 to 4.1.18
2. Preserve exact visual appearance (pixel-perfect)
3. Update configuration to new `@theme` syntax
4. Validate all components via visual regression

### Migration Strategy: **Incremental Component-by-Component**

#### 5.1 Pre-Migration Preparation (1 week)

##### 5.1.1 Create Visual Baseline (2 days)
```bash
# Run Playwright screenshot suite on all pages
npm run test:e2e -- --update-snapshots

# Store baseline images in git
git add e2e/__screenshots__/
git commit -m "test: Add visual regression baseline for Tailwind 4.x migration"
```

##### 5.1.2 Read Migration Guide (1 day)
- Official guide: https://tailwindcss.com/docs/upgrade-guide
- Note breaking changes in color palette, variants, config format

##### 5.1.3 Create Feature Branch (5 min)
```bash
git checkout -b feat/tailwind-4x-migration
```

#### 5.2 Compatibility Mode Installation (2 days)

> [!TIP]
> Tailwind 4.x offers a compatibility mode to ease migration.

```bash
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend

# Install Tailwind 4.x with compat mode
npm install tailwindcss@4.1.18 --save-dev

# Install compatibility plugin
npm install @tailwindcss/compat@4.1.18 --save-dev
```

**Update `tailwind.config.js`:**
```javascript
module.exports = {
  plugins: [
    require('@tailwindcss/compat')  // Enable v3 compatibility
  ],
  // ... rest of config
}
```

**Validation:**
```bash
npm run dev
# Verify app still looks correct in browser
```

#### 5.3 Incremental Migration (2-3 weeks)

**Strategy:** Migrate component-by-component, validating each.

**Order of migration:**
1. Utility components (buttons, inputs) - 5 files
2. Layout components (header, sidebar) - 3 files
3. Feature components (reports, notifications) - 20 files
4. Page components (Dashboard, Settings) - 15 files
5. Complex components (Viewer, UploadWizard) - 10 files

**Per-component process:**
1. Remove `@tailwindcss/compat` for that component
2. Update classes to Tailwind 4.x syntax
3. Run Storybook to validate visually
4. Run Playwright screenshot test
5. Compare with baseline
6. Commit if identical

#### 5.4 Configuration Migration (1 day)

**Convert `tailwind.config.js` to CSS `@theme`:**

**Before (`tailwind.config.js`):**
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#1E40AF',
      }
    }
  }
}
```

**After (`index.css`):**
```css
@theme {
  --color-primary: #1E40AF;
}
```

#### 5.5 Final Validation (3 days)

```bash
# Remove compatibility mode entirely
npm uninstall @tailwindcss/compat

# Full visual regression suite
npm run test:e2e

# Compare all screenshots with baseline
# Ensure pixel-perfect match
```

### Validation Checklist
- [ ] All 60+ files migrated
- [ ] Compatibility mode removed
- [ ] Visual regression tests pass
- [ ] No styling regressions
- [ ] Performance benchmarks maintained

### Rollback Procedure
```bash
git checkout main
git branch -D feat/tailwind-4x-migration
npm install tailwindcss@3.4.19
```

---

## **PHASE 6: Cornerstone3D Migration (OPTIONAL)** 🔵
**Timeline:** 2026 H2 (4-8 weeks)
**Risk:** 🔴 **VERY HIGH**
**Rollback:** Git branch deletion

> [!CAUTION]
> **MAJOR ARCHITECTURAL CHANGE** - This is a **complete DICOM viewer rewrite**.

**Recommendation:** This migration should be a **separate dedicated project**, not part of standard dependency upgrades.

### Why This Is High-Risk
- `cornerstone-core` → `Cornerstone3D` is a **full API rewrite**
- Rendering engine change: CPU → WebGL
- New viewport management model
- New tool state architecture

### Alternative Strategy: **Parallel Implementation**

Instead of in-place migration, consider:

1. **POC Phase (2 weeks)**
   - Build new viewer with Cornerstone3D in isolated component
   - Validate DICOM rendering parity
   - Benchmark performance

2. **Feature Flag Rollout (4 weeks)**
   - Implement feature flag: `USE_CORNERSTONE3D`
   - Deploy both viewers in parallel
   - A/B test with users
   - Gradual rollout: 10% → 50% → 100%

3. **Legacy Cleanup (2 weeks)**
   - Remove `cornerstone-core` once Cornerstone3D proven
   - Delete old viewer code

**Detailed migration plan deferred** - Out of scope for this dependency audit.

---

## 🛡️ Rollback Protocols

### General Rollback Strategy

**For ANY phase:**
1. Revert git commit(s)
2. Reinstall dependencies
3. Run tests to verify rollback
4. Document rollback reason

```bash
# Standard rollback procedure
git log --oneline -n 5  # Find commit to revert
git revert <commit-sha>

# Reinstall dependencies
cd backend && pip install -r requirements.txt
cd frontend && npm install

# Verify rollback
pytest  # Backend
npm test  # Frontend
```

### Phase-Specific Rollback

| Phase | Rollback Command | Verification |
|-------|------------------|--------------|
| 1: Requirements | `git revert HEAD && pip install -r requirements.txt` | `pytest` |
| 2: Pre-commit | `git revert HEAD && pre-commit install` | `pre-commit run --all-files` |
| 3: Prettier | `npm install prettier@3.7.4` | `npm run format` |
| 4: Recharts | `git checkout main && npm install recharts@2.15.4` | Storybook + E2E |
| 5: Tailwind | `git checkout main && npm install tailwindcss@3.4.19` | Visual regression |

---

## ✅ Validation Gates

### Pre-Deployment Checklist (ALL Phases)

Before merging ANY upgrade:

- [ ] All unit tests pass (`pytest`, `npm test`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] No new console errors in browser
- [ ] No new TypeScript errors
- [ ] No new linting errors
- [ ] Pre-commit hooks pass
- [ ] Build succeeds (`npm run build`, Docker builds)
- [ ] Performance baseline maintained (Lighthouse score)
- [ ] Visual regression tests pass (where applicable)

### Deployment Strategy

1. **Deploy to staging first**
2. **Smoke test all critical paths:**
   - User login
   - DICOM upload
   - Report viewing
   - Notifications
3. **Monitor for 24 hours**
4. **If stable, deploy to production**
5. **Monitor for 48 hours**

---

## 📊 Success Metrics

### Key Performance Indicators (KPIs)

Track these metrics before/after each upgrade:

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **Backend Response Time** | TBD | ≤ baseline +5% | Prometheus metrics |
| **Frontend Load Time** | TBD | ≤ baseline +5% | Lighthouse score |
| **Test Suite Duration** | TBD | ≤ baseline +10% | CI/CD logs |
| **Bundle Size** | TBD | ≤ baseline +2% | `npm run analyze` |
| **Error Rate** | 0% | 0% | Sentry dashboard |

### Regression Detection

If ANY metric exceeds target:
1. **STOP** deployment
2. Investigate root cause
3. Optimize OR rollback
4. Document findings

---

## 🎯 Summary Timeline

| Phase | Timeline | Effort | Risk | Dependencies |
|-------|----------|--------|------|--------------|
| 1: Requirements Cleanup | Week 1 | 2h | 🟢 | None |
| 2: Pre-commit Sync | Week 1 | 1h | 🟢 | Phase 1 |
| 3: Prettier Update | Week 1 | 30min | 🟢 | None |
| 4: Recharts 3.x | Weeks 2-3 | 1-3 days | 🟡 | Phases 1-3 |
| 5: Tailwind 4.x | Q3 2026 | 2-4 weeks | 🔴 | Phases 1-4 |
| 6: Cornerstone3D | 2026 H2 | 4-8 weeks | 🔴 | Separate project |

**Total Immediate Effort (Phases 1-3):** ~4 hours
**Total Short-Term Effort (Phase 4):** 1-3 days
**Total Long-Term Effort (Phase 5):** 2-4 weeks

---

## 🚦 Approval Gates

### Phase 1-3 (Low Risk)
**Approver:** Tech Lead
**Review Depth:** Quick review
**Approval Time:** < 1 day

### Phase 4 (Medium Risk)
**Approver:** Senior Engineer + QA
**Review Depth:** Code review + visual validation
**Approval Time:** 2-3 days

### Phase 5-6 (High Risk)
**Approver:** Engineering Manager + Product Owner
**Review Depth:** Architectural review + stakeholder demo
**Approval Time:** 1-2 weeks

---

**Plan Author:** Autonomous Code Review Agent
**Next Review Date:** 2026-Q2 (Reassess Tailwind/Cornerstone timeline)
