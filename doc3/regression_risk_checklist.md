# Regression Risk Checklist
## RelayPACS Gateway - Dependency Upgrade Validation

**Version:** 1.0
**Date:** 2026-01-18
**Purpose:** Zero-regression validation for dependency modernization
**Scope:** Phase 7 - Testing Strategy Alignment

---

## 🎯 Checklist Purpose

This checklist ensures **ZERO functional regressions** during dependency upgrades by:

1. Identifying **high-risk behavior areas**
2. Defining **explicit verification steps**
3. Ensuring **rollback readiness** at every phase
4. Validating **performance baselines** before/after

> [!CAUTION]
> **This checklist is MANDATORY for all dependency upgrades.** Skipping any item increases regression risk.

---

## 🔴 HIGH-RISK BEHAVIOR AREAS

### Critical User Flows (Zero Tolerance for Regression)

| Flow | Risk Level | Why Critical | Test Type |
|------|------------|--------------|-----------|
| **User Login (JWT Authentication)** | 🔴 Critical | Blocks all access | E2E + Manual |
| **DICOM File Upload** | 🔴 Critical | Core business function | E2E + Unit |
| **PACS Query/Retrieve** | 🔴 Critical | Medical data integrity | Integration |
| **Report Status Updates** | 🟡 High | Notification triggers | Integration |
| **Offline Mode (PWA)** | 🟡 High | Multi-provider workflow | E2E |
| **Report PDF Export** | 🟢 Medium | Convenience feature | E2E |

---

## ✅ PRE-UPGRADE BASELINE ESTABLISHMENT

### Step 1: Capture Current State (BEFORE ANY CHANGES)

#### 1.1 Document Installed Versions
```bash
# Backend
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/backend
pip freeze > /tmp/baseline_pip_freeze.txt

# Frontend
cd /home/ubuntu-desk/Desktop/Teleradiology/geteway/frontend
npm list --depth=0 > /tmp/baseline_npm_list.txt
```

**Checklist:**
- [ ] `baseline_pip_freeze.txt` created
- [ ] `baseline_npm_list.txt` created
- [ ] Files committed to git: `git add /tmp/baseline_*.txt && git commit -m "chore: Capture baseline dependency versions"`

---

#### 1.2 Run Full Test Suite (Baseline)
```bash
# Backend tests
cd backend
pytest -v --cov --cov-report=html > /tmp/baseline_backend_tests.log 2>&1

# Frontend unit tests
cd frontend
npm test -- --run --coverage > /tmp/baseline_frontend_tests.log 2>&1

# E2E tests
npm run test:e2e > /tmp/baseline_e2e_tests.log 2>&1
```

**Checklist:**
- [ ] Backend tests: PASS (record count: ___ passed)
- [ ] Frontend tests: PASS (record count: ___ passed)
- [ ] E2E tests: PASS (record count: ___ passed)
- [ ] No flaky tests detected

**Baseline Metrics:**
| Metric | Value |
|--------|-------|
| Backend test count | ___ |
| Backend coverage % | ___% |
| Frontend test count | ___ |
| Frontend coverage % | ___% |
| E2E test count | ___ |

---

#### 1.3 Capture Performance Baseline
```bash
# Frontend bundle size
cd frontend
npm run build
du -sh dist/ > /tmp/baseline_bundle_size.txt

# Backend response time (sample 100 requests)
ab -n 100 -c 10 http://localhost:8003/api/v1/health > /tmp/baseline_api_performance.txt

# Lighthouse score
npm run lighthouse > /tmp/baseline_lighthouse.json
```

**Checklist:**
- [ ] Bundle size recorded: ___ MB
- [ ] API p95 latency: ___ ms
- [ ] Lighthouse Performance score: ___

---

#### 1.4 Visual Regression Baseline (Playwright Screenshots)
```bash
cd frontend
npm run test:e2e -- --update-snapshots
git add e2e/__screenshots__/
git commit -m "test: Capture visual regression baseline"
```

**Checklist:**
- [ ] Screenshots captured for all pages
- [ ] Screenshots committed to git

---

## 🧪 PER-PHASE VALIDATION CHECKLIST

### Phase 1: Requirements Cleanup (Low Risk)

#### Pre-Change Verification
- [ ] Current `requirements.txt` backed up
- [ ] Virtual environment activated
- [ ] All backend tests passing

#### Post-Change Verification

##### Dependency Installation
```bash
# Test clean install
python3.11 -m venv /tmp/phase1_venv
source /tmp/phase1_venv/bin/activate
pip install -r backend/requirements.txt
echo "Exit code: $?"  # Must be 0
```
- [ ] Clean install succeeds (exit code 0)
- [ ] No version conflicts reported

##### Reproducibility Check
```bash
pip freeze | sort > /tmp/phase1_pip_freeze.txt
diff /tmp/baseline_pip_freeze.txt /tmp/phase1_pip_freeze.txt
```
- [ ] Diff shows ONLY intended changes (pinned versions, removed duplicates)
- [ ] No unexpected package upgrades/downgrades

##### Backend Tests
```bash
cd backend
pytest -v --cov
```
- [ ] All tests pass (same count as baseline)
- [ ] No new warnings
- [ ] Coverage % unchanged (±0.5%)

##### Runtime Smoke Test
```bash
# Start backend
uvicorn app.main:app --port 8003 &
sleep 5

# Health check
curl http://localhost:8003/api/v1/health
# Expected: {"status": "healthy"}

# Login test
curl -X POST http://localhost:8003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
# Expected: {"access_token": "...", "token_type": "bearer"}
```
- [ ] Health endpoint responds
- [ ] Login endpoint responds
- [ ] No Python errors in logs

##### Rollback Readiness
- [ ] Can revert via `git revert HEAD`
- [ ] Rollback tested in separate branch

---

### Phase 2: Pre-commit Hook Sync (Low Risk)

#### Pre-Change Verification
- [ ] Current `.pre-commit-config.yaml` backed up
- [ ] Pre-commit hooks working

#### Post-Change Verification

##### Hook Installation
```bash
pre-commit uninstall
pre-commit clean
pre-commit install
pre-commit run --version
```
- [ ] Hooks reinstalled successfully
- [ ] Version output matches expected versions

##### Linting Consistency
```bash
# Run on all files
pre-commit run --all-files > /tmp/phase2_precommit.log 2>&1
```
- [ ] All hooks pass OR only formatting changes
- [ ] No new linting errors introduced

##### Developer Experience Check
```bash
# Make trivial change
echo "# Test" >> backend/app/main.py
git add backend/app/main.py
git commit -m "test: Verify pre-commit hooks"
# hooks should run automatically
git reset HEAD~1  # undo test commit
```
- [ ] Hooks run on commit
- [ ] No errors blocking commit

---

### Phase 3: Prettier Update (Low Risk)

#### Post-Change Verification

##### Package Update
```bash
cd frontend
npm list prettier
# Expected: prettier@3.8.0
```
- [ ] Prettier version updated correctly

##### Formatting Check
```bash
npm run format
git diff
```
- [ ] No unexpected formatting changes OR only whitespace/quotes
- [ ] No syntax errors introduced

##### Frontend Tests
```bash
npm test -- --run
npm run test:e2e -- --grep "@smoke"
```
- [ ] Unit tests pass
- [ ] Smoke E2E tests pass

---

### Phase 4: Recharts 3.x Upgrade (Medium Risk)

#### Pre-Change Verification
- [ ] Baseline screenshots of Dashboard page captured
- [ ] Storybook running for visual validation

#### Post-Change Verification

##### Package Update
```bash
npm list recharts
# Expected: recharts@3.6.0
```
- [ ] Recharts version upgraded

##### TypeScript Compilation
```bash
npm run build
```
- [ ] Build succeeds
- [ ] No new TypeScript errors
- [ ] Bundle size within 5% of baseline

##### Visual Regression (Storybook)
```bash
npm run storybook
# Manually view: http://localhost:6006/?path=/story/analytics-trendchart
```
- [ ] TrendChart renders correctly
- [ ] Tooltips work
- [ ] Legend displays
- [ ] Responsive behavior intact
- [ ] No console errors

##### Unit Tests
```bash
npm test -- TrendChart.test.tsx
```
- [ ] All TrendChart tests pass

##### E2E Tests (Dashboard)
```bash
npm run test:e2e -- --grep "dashboard"
```
- [ ] Dashboard page loads
- [ ] Charts render
- [ ] No visual regressions vs screenshots

##### Manual Verification
**Actions:**
1. Start dev server: `npm run dev`
2. Login as test user
3. Navigate to Dashboard
4. Verify trend charts display correctly
5. Hover over data points (tooltip appears)
6. Resize browser window (charts responsive)

**Checklist:**
- [ ] Charts visible
- [ ] Data accurate
- [ ] Tooltips functional
- [ ] No JS errors in console

---

### Phase 5: Tailwind CSS 4.x Migration (High Risk)

> [!WARNING]
> **HIGH COMPLEXITY** - Requires extensive visual validation.

#### Pre-Change Verification
- [ ] Full visual regression baseline captured
- [ ] All pages screenshotted
- [ ] Storybook stories documented

#### Post-Change Verification

##### Build & Bundle
```bash
npm run build
npm run analyze
```
- [ ] Build succeeds
- [ ] CSS bundle size within 10% of baseline
- [ ] No purge errors

##### Visual Regression (Automated)
```bash
npm run test:e2e
```
- [ ] All screenshot comparisons pass
- [ ] No pixel differences detected

##### Component-by-Component Validation (Storybook)
**For EACH component:**
- [ ] Component renders
- [ ] Colors match design
- [ ] Spacing correct
- [ ] Hover states work
- [ ] Dark mode (if applicable) works

##### Full Application Manual Test

**Test Matrix:**

| Page | Desktop Chrome | Mobile Chrome | Firefox | Safari |
|------|----------------|---------------|---------|--------|
| Login | [ ] | [ ] | [ ] | [ ] |
| Dashboard | [ ] | [ ] | [ ] | [ ] |
| Upload | [ ] | [ ] | [ ] | [ ] |
| Reports | [ ] | [ ] | [ ] | [ ] |
| Notifications | [ ] | [ ] | [ ] | [ ] |
| Settings | [ ] | [ ] | [ ] | [ ] |

**For each page:**
- [ ] Layout correct
- [ ] Typography matches
- [ ] Colors correct
- [ ] Buttons styled
- [ ] Forms styled
- [ ] Responsive breakpoints work

##### Performance
```bash
npm run lighthouse
```
- [ ] Performance score ≥ baseline
- [ ] No new accessibility issues

---

## 🔥 SMOKE TEST MATRIX (Run After Every Phase)

### Backend Smoke Tests (5 min)

```bash
cd backend
source ../venv/bin/activate
uvicorn app.main:app --port 8003 &
BACKEND_PID=$!
sleep 5
```

| Endpoint | Method | Expected | Status |
|----------|--------|----------|--------|
| `/api/v1/health` | GET | `{"status":"healthy"}` | [ ] |
| `/api/v1/auth/login` | POST | `200 + token` | [ ] |
| `/api/v1/reports` | GET | `200 + list` (with auth) | [ ] |
| `/api/v1/pacs/studies` | GET | `200 + list` (with auth) | [ ] |
| `/api/v1/upload/create` | POST | `201 + upload_id` (with auth) | [ ] |

```bash
kill $BACKEND_PID
```

### Frontend Smoke Tests (5 min)

```bash
cd frontend
npm run dev &
FRONTEND_PID=$!
sleep 10
```

| Page | URL | Expected | Status |
|------|-----|----------|--------|
| Login | `/login` | Form visible | [ ] |
| Dashboard | `/dashboard` | Redirects to login (no auth) | [ ] |
| Upload | `/upload` | Redirects to login (no auth) | [ ] |

**With Authentication:**
1. Login as test user
2. Navigate to Dashboard → [ ] Loads
3. Navigate to Reports → [ ] Loads
4. Navigate to Notifications → [ ] Loads
5. Navigate to Settings → [ ] Loads

```bash
kill $FRONTEND_PID
```

---

## 🚨 CRITICAL REGRESSION INDICATORS

### Auto-Fail Criteria (STOP Deployment Immediately)

| Indicator | Detection | Action |
|-----------|-----------|--------|
| **Auth broken** | Login returns 500 | 🔴 ROLLBACK |
| **Database errors** | SQLAlchemy exceptions in logs | 🔴 ROLLBACK |
| **DICOM parsing fails** | `pydicom` exceptions | 🔴 ROLLBACK |
| **Bundle won't build** | Vite build error | 🔴 ROLLBACK |
| **Test coverage drops >5%** | pytest-cov report | 🔴 ROLLBACK |
| **API latency >50% increase** | Prometheus metrics | 🔴 ROLLBACK |
| **Bundle size >20% increase** | webpack-bundle-analyzer | 🔴 INVESTIGATE |

### Warning Criteria (Investigate Before Deploy)

| Indicator | Detection | Action |
|-----------|-----------|--------|
| Test count decreased | pytest output | 🟡 Investigate why |
| New ESLint warnings | `npm run lint` | 🟡 Fix or document |
| New TypeScript errors | `tsc --noEmit` | 🟡 Fix or suppress |
| Lighthouse score drops >5 points | lhci | 🟡 Optimize |
| New Sentry errors | Sentry dashboard | 🟡 Triage severity |

---

## 🔄 ROLLBACK PROCEDURES

### Immediate Rollback (< 5 min)

```bash
# 1. Revert last commit
git revert HEAD

# 2. Reinstall dependencies
cd backend && pip install -r requirements.txt
cd frontend && npm install

# 3. Restart services
docker-compose down
docker-compose up -d

# 4. Verify health
curl http://localhost:8003/api/v1/health
curl http://localhost:3002
```

**Checklist:**
- [ ] Git reverted
- [ ] Dependencies reinstalled
- [ ] Services restarted
- [ ] Health checks pass
- [ ] Rollback reason documented

### Production Rollback (If Already Deployed)

```bash
# 1. Tag broken version
git tag -a broken-deploy-$(date +%Y%m%d-%H%M) -m "Rollback due to regression"

# 2. Revert to last known good commit
git reset --hard <last-good-commit-sha>

# 3. Force push to trigger redeploy (if using CI/CD)
git push --force origin main

# 4. Manual deploy (if not using CI/CD)
docker-compose pull
docker-compose up -d

# 5. Monitor Sentry for 1 hour
```

**Checklist:**
- [ ] Broken version tagged
- [ ] Reverted to known good state
- [ ] Production redeployed
- [ ] Monitoring dashboard shows no errors
- [ ] Post-mortem scheduled

---

## 📊 POST-DEPLOYMENT MONITORING (48 Hours)

### Metrics to Watch

| Metric | Tool | Threshold | Action if Exceeded |
|--------|------|-----------|-------------------|
| **Error Rate** | Sentry | <0.1% | Investigate errors |
| **API P95 Latency** | Prometheus | <500ms | Check slow queries |
| **Frontend Load Time** | Lighthouse CI | <3s | Optimize bundle |
| **Memory Usage** | Docker stats | <80% | Check for leaks |
| **CPU Usage** | Docker stats | <70% | Profile hot paths |

### Daily Checks (Days 1-2 Post-Deploy)

**Day 1 (Deployment Day):**
- [ ] Hour 1: Check Sentry (no new errors)
- [ ] Hour 4: Check Prometheus (latency normal)
- [ ] Hour 8: Check logs (no exceptions)
- [ ] End of day: Review all metrics

**Day 2:**
- [ ] Morning: Check overnight metrics
- [ ] Midday: User feedback review
- [ ] Evening: Final metrics review

**Day 3+:**
- [ ] Resume normal monitoring cadence

---

## ✅ SIGN-OFF CHECKLIST (Per Phase)

### Pre-Deployment Sign-Off

All items must be checked before deploying to production:

- [ ] All automated tests pass (backend + frontend + E2E)
- [ ] Manual smoke tests completed
- [ ] Visual regression tests pass (if applicable)
- [ ] Performance benchmarks within acceptable range
- [ ] No new security vulnerabilities introduced
- [ ] Code review approved by senior engineer
- [ ] Rollback procedure tested in staging
- [ ] Deployment plan documented
- [ ] On-call engineer notified
- [ ] Monitoring dashboards configured

**Sign-Off:**
- **Engineer:** _______________ Date: ___________
- **Reviewer:** _______________ Date: ___________
- **QA:** _______________ Date: ___________

---

### Post-Deployment Sign-Off (After 48 Hours)

- [ ] Zero critical errors in Sentry
- [ ] API latency within baseline ±10%
- [ ] Frontend performance within baseline ±10%
- [ ] No user-reported regressions
- [ ] Monitoring metrics stable
- [ ] Rollback procedure remains available

**Sign-Off:**
- **On-Call Engineer:** _______________ Date: ___________

---

## 🎯 Summary

### Critical Success Factors

1. **Baseline Everything** - Cannot detect regressions without a baseline
2. **Test Each Phase** - Never skip validation steps
3. **Automate Where Possible** - Manual testing is slow and error-prone
4. **Monitor Post-Deploy** - Regressions may appear under load
5. **Rollback Readiness** - Always have an escape hatch

### Minimum Viable Validation (If Time-Constrained)

If you MUST skip some checks, **NEVER** skip these:

1. ✅ Backend unit tests pass
2. ✅ Frontend unit tests pass
3. ✅ Login/Auth smoke test
4. ✅ DICOM upload smoke test
5. ✅ Can rollback via git revert

**Everything else is optional** - but increases risk.

---

**Checklist Version:** 1.0
**Last Updated:** 2026-01-18
**Next Review:** After Phase 5 completion
