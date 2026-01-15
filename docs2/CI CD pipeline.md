# CI/CD Pipeline

## Document Information
- **Product**: RelayPACS Gateway
- **Purpose**: Continuous Integration and Deployment strategy
- **Version**: 1.0
- **Last Updated**: 2026-01-14

---

## Table of Contents
1. [Pipeline Overview](#pipeline-overview)
2. [Branching Strategy](#branching-strategy)
3. [CI Pipeline Stages](#ci-pipeline-stages)
4. [CD Pipeline Stages](#cd-pipeline-stages)
5. [Quality Gates](#quality-gates)
6. [Deployment Strategies](#deployment-strategies)
7. [Rollback Procedures](#rollback-procedures)
8. [Pipeline Configuration](#pipeline-configuration)

---

## Pipeline Overview

### Automation Philosophy
RelayPACS follows **trunk-based development** with short-lived feature branches and continuous integration to `main`. Every commit triggers automated validation, and every merge to `main` deploys to staging.

### Pipeline Tool Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| **Source Control** | GitHub | Version control, PR reviews |
| **CI/CD Platform** | GitHub Actions | Automated workflows |
| **Container Registry** | Docker Hub / Amazon ECR | Docker image storage |
| **Deployment Target** | Kubernetes (staging/prod) | Container orchestration |
| **Artifact Storage** | S3 | Build artifacts, test reports |
| **Secrets Management** | GitHub Secrets / AWS Secrets Manager | Credentials and API keys |

### Pipeline Architecture

```mermaid
graph LR
    subgraph "Developer Workflow"
        FEATURE[Feature Branch]
        PR[Pull Request]
    end

    subgraph "CI Pipeline (on PR)"
        LINT[Lint & Format]
        UNIT[Unit Tests]
        BUILD[Build Containers]
        E2E[E2E Tests]
    end

    subgraph "CD Pipeline (on merge to main)"
        TAG[Tag Release]
        PUSH[Push Images]
        DEPLOY_STAGING[Deploy to Staging]
        SMOKE[Smoke Tests]
    end

    subgraph "Production Deployment (manual approval)"
        APPROVE[Human Approval]
        DEPLOY_PROD[Deploy to Production]
        VERIFY[Verification Tests]
        NOTIFY[Notify Team]
    end

    FEATURE --> PR
    PR --> LINT --> UNIT --> BUILD --> E2E
    E2E -->|Merge| TAG --> PUSH --> DEPLOY_STAGING --> SMOKE
    SMOKE --> APPROVE --> DEPLOY_PROD --> VERIFY --> NOTIFY
```

---

## Branching Strategy

### Branch Model

**Main Branches**:
- **`main`**: Production-ready code (always deployable)
- **`staging`**: Pre-production environment sync (mirrors staging deployment)

**Supporting Branches**:
- **Feature branches**: `feature/<ticket-id>-description` (e.g., `feature/RP-123-add-2fa`)
- **Bugfix branches**: `bugfix/<ticket-id>-description`
- **Hotfix branches**: `hotfix/<ticket-id>-description` (critical production fixes)

### Branch Lifecycle

```mermaid
gitGraph
    commit
    commit
    branch feature/RP-123
    checkout feature/RP-123
    commit id: "Implement 2FA"
    commit id: "Add tests"
    checkout main
    merge feature/RP-123 tag: "v1.2.0"
    commit
    branch hotfix/RP-150
    commit id: "Fix login bug"
    checkout main
    merge hotfix/RP-150 tag: "v1.2.1"
```

### Branch Protection Rules

**`main` branch**:
- [ ] Require pull request reviews (minimum 1 approval)
- [ ] Require status checks to pass before merging:
  - [ ] Lint & format checks
  - [ ] Unit tests (backend & frontend)
  - [ ] E2E tests (critical paths)
  - [ ] Security scan (no high/critical vulnerabilities)
- [ ] Require branches to be up to date before merging
- [ ] Prohibit direct pushes (force PRs)
- [ ] Require linear history (rebase or squash merge)

### Commit Message Convention

**Format**: `<type>(<scope>): <subject>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no logic change)
- `refactor`: Code restructuring
- `test`: Adding/updating tests
- `chore`: Build process, dependencies

**Examples**:
```
feat(auth): add TOTP two-factor authentication
fix(upload): resolve chunk merge race condition
docs(readme): update deployment instructions
test(e2e): add upload resume scenario
```

**Commit Hook** (validate on commit):
```bash
# .git/hooks/commit-msg
commitlint --edit $1
```

---

## CI Pipeline Stages

### Stage 1: Code Quality (Lint & Format)

**Objective**: Ensure code adheres to style guidelines and best practices

**Backend (Python)**:
```yaml
- name: Lint Backend
  run: |
    cd backend
    ruff check .                    # Fast linter
    black --check .                  # Code formatter check
    mypy app --strict               # Type checking
    bandit -r app -ll               # Security linting
```

**Frontend (TypeScript)**:
```yaml
- name: Lint Frontend
  run: |
    cd frontend
    npm run lint                    # ESLint
    npm run format:check            # Prettier
    npm run type-check              # TypeScript compilation check
```

**Quality Thresholds**:
- No linting errors allowed (warnings acceptable with justification)
- Type coverage >90%
- No Bandit security issues rated "high" or above

### Stage 2: Unit Tests

**Objective**: Validate individual component functionality

**Backend Tests**:
```yaml
- name: Run Backend Unit Tests
  run: |
    cd backend
    pytest tests/unit \
      --cov=app \
      --cov-report=xml \
      --cov-fail-under=90 \
      --junitxml=junit/backend-results.xml
```

**Frontend Tests**:
```yaml
- name: Run Frontend Unit Tests
  run: |
    cd frontend
    npm run test:unit -- \
      --coverage \
      --coverageReporters=json-summary \
      --minCoverage=80
```

**Quality Gates**:
- Backend coverage ≥90%
- Frontend coverage ≥80%
- All tests must pass
- Test execution time <5 minutes

### Stage 3: Build Artifacts

**Objective**: Compile and package application components

**Backend Container Build**:
```yaml
- name: Build Backend Image
  run: |
    docker build \
      -t relaypacs/backend:${{ github.sha }} \
      -t relaypacs/backend:latest \
      --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
      --build-arg VCS_REF=${{ github.sha }} \
      backend/
```

**Frontend Build**:
```yaml
- name: Build Frontend
  run: |
    cd frontend
    npm run build
    # Output: dist/ directory with optimized assets
```

**Artifacts**:
- Docker images pushed to registry (tagged with git SHA)
- Frontend static assets uploaded to S3
- Build metadata (version, commit, timestamp)

### Stage 4: Integration Tests

**Objective**: Test component interactions in isolated environment

**Docker Compose Test Environment**:
```yaml
- name: Start Test Stack
  run: docker-compose -f docker-compose.test.yml up -d

- name: Wait for Health Checks
  run: ./scripts/wait-for-stack.sh 120

- name: Run Integration Tests
  run: |
    pytest tests/integration \
      --maxfail=5 \
      --tb=short
```

**Test Scenarios**:
- Upload workflow (init → chunk → complete → PACS forward)
- Authentication flow (login → refresh → protected endpoint)
- Report lifecycle (creation → status update → PDF generation)
- Database migrations (apply → verify schema)

### Stage 5: E2E Tests

**Objective**: Validate user-facing workflows in browser

**Playwright E2E Tests**:
```yaml
- name: Run E2E Tests
  run: |
    cd frontend
    npx playwright test \
      --reporter=html \
      --workers=2

- name: Upload Test Results
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: frontend/playwright-report/
```

**Critical E2E Scenarios**:
- User login (with/without 2FA)
- DICOM file upload (happy path)
- Upload resume after simulated network failure
- Dashboard metrics rendering
- Report download

**Quality Gates**:
- All critical path tests must pass
- Test execution time <10 minutes
- Screenshots/videos captured on failure

### Stage 6: Security Scanning

**Objective**: Identify vulnerabilities before deployment

**Dependency Scanning**:
```yaml
- name: Scan Python Dependencies
  run: |
    pip install safety
    safety check --json

- name: Scan npm Dependencies
  run: |
    cd frontend
    npm audit --audit-level=high
```

**Container Scanning** (Trivy):
```yaml
- name: Scan Backend Image
  run: |
    trivy image \
      --severity HIGH,CRITICAL \
      --exit-code 1 \
      relaypacs/backend:${{ github.sha }}
```

**Quality Gates**:
- No critical CVEs in production dependencies
- High-severity CVEs require tracking ticket (acceptable with plan)
- SAST (Bandit, ESLint security) findings must be addressed

---

## CD Pipeline Stages

### Stage 7: Tag Release

**Objective**: Create versioned release for traceability

**Semantic Versioning**:
- **MAJOR**: Breaking API changes
- **MINOR**: New features (backward-compatible)
- **PATCH**: Bug fixes

**Auto-Tagging** (on main merge):
```yaml
- name: Determine Version
  id: version
  run: |
    # Read version from package.json or VERSION file
    VERSION=$(cat VERSION)
    echo "version=$VERSION" >> $GITHUB_OUTPUT

- name: Create Git Tag
  run: |
    git tag v${{ steps.version.outputs.version }} ${{ github.sha }}
    git push origin v${{ steps.version.outputs.version }}
```

### Stage 8: Push Container Images

**Objective**: Publish verified images to registry

**Multi-Registry Push**:
```yaml
- name: Push to Docker Hub
  run: |
    echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
    docker push relaypacs/backend:${{ github.sha }}
    docker push relaypacs/backend:latest

- name: Push to Amazon ECR
  run: |
    aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}
    docker tag relaypacs/backend:${{ github.sha }} ${{ secrets.ECR_REGISTRY }}/relaypacs/backend:${{ github.sha }}
    docker push ${{ secrets.ECR_REGISTRY }}/relaypacs/backend:${{ github.sha }}
```

### Stage 9: Deploy to Staging

**Objective**: Automatically deploy to pre-production environment

**Kubernetes Deployment** (kubectl):
```yaml
- name: Deploy to Staging
  run: |
    kubectl config use-context staging-cluster
    kubectl set image deployment/backend \
      backend=${{ secrets.ECR_REGISTRY }}/relaypacs/backend:${{ github.sha }} \
      -n relaypacs-staging

    kubectl rollout status deployment/backend -n relaypacs-staging --timeout=5m
```

**Database Migrations**:
```yaml
- name: Run Migrations
  run: |
    kubectl exec deployment/backend -n relaypacs-staging -- \
      alembic upgrade head
```

### Stage 10: Smoke Tests (Staging)

**Objective**: Verify critical functionality in staging

**Synthetic Monitoring**:
```yaml
- name: Run Smoke Tests
  run: |
    ./scripts/smoke-tests.sh https://staging.relaypacs.com

# smoke-tests.sh
#!/bin/bash
BASE_URL=$1

# Health check
curl -f $BASE_URL/health || exit 1

# API availability
curl -f $BASE_URL/api/v1/health || exit 1

# Login flow
TOKEN=$(curl -X POST $BASE_URL/api/v1/auth/login \
  -d '{"username":"testuser","password":"testpass"}' \
  -H "Content-Type: application/json" | jq -r '.access_token')

[ -n "$TOKEN" ] || exit 1
```

**Quality Gates**:
- All smoke tests must pass
- Response time <1s for health checks
- No 5xx errors

---

## Quality Gates

### PR Merge Gates (Required)

| Gate | Threshold | Blocking |
|------|-----------|----------|
| **Code Lint** | 0 errors | Yes |
| **Unit Tests** | 100% pass, ≥90% coverage (backend), ≥80% (frontend) | Yes |
| **E2E Tests** | 100% critical path pass | Yes |
| **Security Scan** | 0 critical CVEs | Yes |
| **Code Review** | 1+ approval | Yes |

### Staging Deployment Gates (Auto)

| Gate | Threshold | Blocking |
|------|-----------|----------|
| **Build Success** | All artifacts built | Yes |
| **Migration Status** | Migrations applied successfully | Yes |
| **Smoke Tests** | 100% pass | Yes |

### Production Deployment Gates (Manual)

| Gate | Threshold | Blocking |
|------|-----------|----------|
| **Staging Soak** | Minimum 4 hours in staging with no errors | Yes |
| **Human Approval** | Engineering Manager or Tech Lead sign-off | Yes |
| **Rollback Plan** | Documented and tested | Yes |
| **Incident Count** | <2 P1/P2 incidents in last 7 days | No (warning) |

---

## Deployment Strategies

### Staging Deployment (Automated)

**Strategy**: Rolling update with health checks

**Process**:
1. Deploy new pods (maxSurge: 1)
2. Wait for readiness probe success
3. Terminate old pods (maxUnavailable: 0)
4. Complete when all replicas updated

**Kubernetes Deployment Spec**:
```yaml
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: backend
        image: relaypacs/backend:{{ IMAGE_TAG }}
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 3
```

### Production Deployment (Manual Approval)

**Strategy**: Blue-Green deployment for zero-downtime

**Process**:
1. Deploy "green" environment (parallel to "blue")
2. Run smoke tests on green
3. Switch ingress traffic to green (50% canary for 10 minutes)
4. Monitor error rates (revert if >0.5% increase)
5. Full cutover to green
6. Keep blue idle for 1 hour (fast rollback)
7. Decommission blue

**GitHub Actions Workflow**:
```yaml
deploy-production:
  runs-on: ubuntu-latest
  environment:
    name: production
    url: https://relaypacs.com
  steps:
    - name: Deploy Green Environment
      run: |
        kubectl apply -f k8s/deployment-green.yaml
        kubectl wait --for=condition=available deployment/backend-green --timeout=5m

    - name: Canary Traffic (50%)
      run: |
        kubectl patch service backend \
          -p '{"spec":{"selector":{"version":"green"}}}' \
          --dry-run=client -o yaml | kubectl apply -f -

        sleep 600  # 10-minute canary

    - name: Monitor Error Rate
      run: ./scripts/check-error-rate.sh

    - name: Full Cutover
      if: success()
      run: |
        kubectl label service backend version=green
        kubectl scale deployment backend-blue --replicas=0
```

### Hotfix Deployment (Expedited)

**When**: Critical production bug (P1 incident)

**Process**:
1. Create hotfix branch from `main`
2. Implement fix + test
3. PR review (expedited, 1 approval)
4. Merge to `main`
5. **Skip staging** (exception)
6. Deploy directly to production
7. Post-deployment monitoring (1 hour)

**Risk Mitigation**:
- Fix must be minimal (1-file change preferred)
- Must include added test coverage
- Rollback script ready

---

## Rollback Procedures

### Automated Rollback Triggers

**Rollback initiated automatically if**:
- Error rate >1% within 5 minutes post-deployment
- Health check failures >20% of pods
- Database migration fails

**GitHub Actions Auto-Rollback**:
```yaml
- name: Monitor Deployment
  run: |
    for i in {1..12}; do
      ERROR_RATE=$(curl -s https://prometheus.relaypacs.com/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m]) | jq -r '.data.result[0].value[1]')

      if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
        echo "High error rate detected: $ERROR_RATE"
        kubectl rollout undo deployment/backend
        exit 1
      fi

      sleep 30
    done
```

### Manual Rollback

**Kubernetes Rollback** (last known good):
```bash
# View deployment history
kubectl rollout history deployment/backend

# Rollback to previous revision
kubectl rollout undo deployment/backend

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=5
```

**Database Rollback**:
```bash
# Alembic downgrade
kubectl exec deployment/backend -- alembic downgrade -1

# Or restore from backup (if data corruption)
./scripts/restore-db.sh relaypacs-prod 2026-01-14T18:00:00Z
```

### Rollback Decision Matrix

| Scenario | Rollback Method | Estimated Time |
|----------|-----------------|----------------|
| **High error rate** | Automated k8s rollback | 2 minutes |
| **Feature bug (non-critical)** | Hotfix forward | 30 minutes |
| **Data corruption** | Database restore + app rollback | 2 hours |
| **Security breach** | Immediate rollback + credential rotation | 15 minutes + 4 hours |

---

## Pipeline Configuration

### GitHub Actions Workflow File

**`.github/workflows/ci-cd.yml`**:
```yaml
name: CI/CD Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

env:
  PYTHON_VERSION: '3.12'
  NODE_VERSION: '20'

jobs:
  lint-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements-dev.txt
      - name: Run linters
        run: |
          cd backend
          ruff check .
          black --check .
          mypy app
          bandit -r app -ll

  lint-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Run linters
        run: |
          cd frontend
          npm run lint
          npm run format:check
          npm run type-check

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb
          SECRET_KEY: test-secret-key
        run: |
          cd backend
          pytest tests/unit \
            --cov=app \
            --cov-report=xml \
            --cov-fail-under=90
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Run tests
        run: |
          cd frontend
          npm run test:unit -- --coverage

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    steps:
      - uses: actions/checkout@v4
      - name: Start stack
        run: docker-compose up -d
      - name: Wait for services
        run: ./scripts/wait-for-stack.sh 120
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - name: Install Playwright
        run: |
          cd frontend
          npm ci
          npx playwright install --with-deps
      - name: Run E2E tests
        run: |
          cd frontend
          npx playwright test
      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/

  build-and-push:
    runs-on: ubuntu-latest
    needs: [lint-backend, lint-frontend, test-backend, test-frontend, e2e-tests]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            relaypacs/backend:${{ github.sha }}
            relaypacs/backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG_STAGING }}" > kubeconfig
          export KUBECONFIG=./kubeconfig

      - name: Deploy to staging
        run: |
          kubectl set image deployment/backend \
            backend=relaypacs/backend:${{ github.sha }} \
            -n relaypacs-staging
          kubectl rollout status deployment/backend -n relaypacs-staging --timeout=5m

      - name: Run smoke tests
        run: ./scripts/smoke-tests.sh https://staging.relaypacs.com

  deploy-production:
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://relaypacs.com
    steps:
      - uses: actions/checkout@v4

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG_PROD }}" > kubeconfig
          export KUBECONFIG=./kubeconfig

      - name: Deploy to production
        run: |
          kubectl set image deployment/backend \
            backend=relaypacs/backend:${{ github.sha }} \
            -n relaypacs-prod
          kubectl rollout status deployment/backend -n relaypacs-prod --timeout=5m

      - name: Monitor deployment
        run: ./scripts/monitor-deployment.sh 10

      - name: Notify Slack
        if: success()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"✅ Production deployment successful: v${{ github.sha }}"}'
```

---

**Document Status**: ✅ COMPLETE
**Maintained By**: DevOps Team
**Review Frequency**: Quarterly or after major pipeline changes
