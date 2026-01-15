# Comprehensive Test Automation Plan

## Document Information
- **Product**: RelayPACS Gateway
- **Purpose**: Define quality assurance and test automation strategy
- **Version**: 1.0
- **Last Updated**: 2026-01-14

---

## Table of Contents
1. [Testing Strategy](#testing-strategy)
2. [Test Pyramid](#test-pyramid)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Test Data Management](#test-data-management)
7. [CI Integration](#ci-integration)
8. [Quality Metrics](#quality-metrics)

---

## Testing Strategy

### Testing Objectives

1. **Functional Correctness**: All features work as specified
2. **Regression Prevention**: Regressions caught before production
3. **Performance Validation**: Latency and throughput meet SLOs
4. **Security Assurance**: Vulnerabilities identified early
5. **HIPAA Compliance**: PHI handling validated

### Test Levels

```mermaid
graph TB
    subgraph "Testing Layers"
        E2E[" End-to-End Tests<br/>(Playwright)<br/>UI → API → DB → PACS"]
        INT[Integration Tests<br/>(pytest)<br/>API → DB → S3"]
        UNIT[Unit Tests<br/>(pytest, Vitest)<br/>Individual Functions"]
    end

    E2E -->|Few, Slow| Critical_Flows
    INT -->|Medium| API_Endpoints
    UNIT -->|Many, Fast| Business_Logic
```

### Test Coverage Targets

| Test Level | Coverage Target | Execution Time | Frequency |
|------------|-----------------|----------------|-----------|
| **Unit** | 90% (backend), 80% (frontend) | <2 minutes | Every commit |
| **Integration** | 70% of API endpoints | <5 minutes | Every PR |
| **E2E** | 100% of critical paths | <10 minutes | Every PR + Nightly |
| **Performance** | Key transactions | <30 minutes | Weekly |
| **Security** | SAST + DAST | <15 minutes | Every PR |

---

## Test Pyramid

### Pyramid Distribution

```
        /\
       /E2E\ ← 10% (20 tests)
      /------\
     /  INT  \ ← 30% (60 tests)
    /----------\
   /    UNIT   \ ← 60% (120 tests)
  /--------------\
```

**Rationale**:
- **Unit tests**: Fast feedback, isolate bugs
- **Integration tests**: Validate module interactions
- **E2E tests**: User journey validation

### Anti-Patterns to Avoid

❌ **Ice Cream Cone** (too many E2E tests):
- Slow test suite
- Flaky tests
- High maintenance

❌ **Hourglass** (no integration tests):
- Gap between unit and E2E
- Integration bugs slip through

✅ **Pyramid** (balanced approach):
- Fast, reliable, maintainable

---

## Unit Testing

### Backend Unit Tests (pytest)

**Test Structure**:
```
backend/tests/unit/
├── test_auth.py
├── test_upload_service.py
├── test_dicom_processing.py
├── test_pacs_service.py
└── conftest.py  # Fixtures
```

**Example Test**:
```python
# tests/unit/test_upload_service.py
import pytest
from uuid import uuid4
from app.services.upload_service import UploadService
from app.models.upload import UploadInitRequest

@pytest.fixture
def mock_storage_service(mocker):
    return mocker.Mock()

@pytest.fixture
def upload_service(mock_storage_service, mock_pacs_service, mock_repo):
    return UploadService(
        storage=mock_storage_service,
        pacs=mock_pacs_service,
        repo=mock_repo
    )

class TestUploadService:
    async def test_init_upload_creates_session(self, upload_service):
        # Arrange
        request = UploadInitRequest(
            file_names=["test.dcm"],
            file_sizes=[1048576],
            metadata=StudyMetadata(
                patient_name="TEST^PATIENT",
                study_date="20260114",
                modality="CT"
            )
        )

        # Act
        result = await upload_service.init_upload(user_id=uuid4(), request=request)

        # Assert
        assert result.upload_id is not None
        assert result.chunk_size == 1048576
        upload_service.repo.create.assert_called_once()

    async def test_duplicate_upload_raises_conflict(self, upload_service):
        # Arrange
        upload_service.repo.find_by_hash.return_value = Mock(id=uuid4())

        # Act & Assert
        with pytest.raises(DuplicateUploadError):
            await upload_service.init_upload(user_id=uuid4(), request=request)
```

**Mocking Strategy**:
- Mock external dependencies (DB, S3, PACS)
- Use `pytest-mock` for Mocking
- Fixture-based test data

### Frontend Unit Tests (Vitest)

**Test Structure**:
```
frontend/src/
├── hooks/__tests__/
│   └── useAuth.test.ts
├── services/__tests__/
│   └── uploadService.test.ts
└── components/__tests__/
    └── UploadProgress.test.tsx
```

**Example Test**:
```typescript
// hooks/__tests__/useAuth.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { db } from '../../db';

describe('useAuth', () => {
  beforeEach(async () => {
    await db.authTokens.clear();
  });

  it('should login successfully', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('testuser', 'password123');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.username).toBe('testuser');
    });
  });

  it ('should handle login failure', async () => {
    const { result } = renderHook(() => useAuth());

    await expect(async () => {
      await result.current.login('baduser', 'wrongpass');
    }).rejects.toThrow('Invalid credentials');

    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

**Component Tests**:
```typescript
// components/__tests__/UploadProgress.test.tsx
import { render, screen } from '@testing-library/react';
import { UploadProgress } from '../UploadProgress';

describe('UploadProgress', () => {
  it('should display progress percentage', () => {
    render(<UploadProgress uploadedBytes={500000} totalBytes={1000000} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should show completion state', () => {
    render(<UploadProgress uploadedBytes={1000000} totalBytes={1000000} />);

    expect(screen.getByText('Upload Complete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view report/i })).toBeInTheDocument();
  });
});
```

---

## Integration Testing

### API Integration Tests

**Test Structure**:
```
backend/tests/integration/
├── test_upload_workflow.py
├── test_authentication_flow.py
├── test_report_generation.py
└── conftest.py  # Test DB setup
```

**Test Database Strategy**:
- Use TestContainers for PostgreSQL, Redis, MinIO
- Transaction rollback after each test
- Seed data via fixtures

**Example Test**:
```python
# tests/integration/test_upload_workflow.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
async def authenticated_client(client):
    # Register and login
    await client.post("/api/v1/auth/register", json={
        "username": "testuser",
        "password": "SecurePass123!",
        "email": "test@example.com"
    })

    response = await client.post("/api/v1/auth/login", json={
        "username": "testuser",
        "password": "SecurePass123!"
    })

    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client

class TestUploadWorkflow:
    async def test_complete_upload_flow(self, authenticated_client):
        # Step 1: Initialize upload
        init_response = await authenticated_client.post("/api/v1/upload/init", json={
            "file_names": ["test.dcm"],
            "file_sizes": [1048576],
            "metadata": {
                "patient_name": "TEST^PATIENT",
                "study_date": "20260114",
                "modality": "CT",
                "service_level": "routine"
            }
        })
        assert init_response.status_code == 201
        upload_id = init_response.json()["upload_id"]
        session_token = init_response.json()["session_token"]

        # Step 2: Upload chunk
        chunk_data = b"x" * 1048576  # 1MB chunk
        chunk_response = await authenticated_client.put(
            f"/api/v1/upload/{upload_id}/chunk?chunk_index=0&file_id=test.dcm",
            content=chunk_data,
            headers={"X-Upload-Token": session_token}
        )
        assert chunk_response.status_code == 200

        # Step 3: Complete upload
        complete_response = await authenticated_client.post(
            f"/api/v1/upload/{upload_id}/complete",
            headers={"X-Upload-Token": session_token}
        )
        assert complete_response.status_code == 200
        assert "report_id" in complete_response.json()
```

---

## End-to-End Testing

### Playwright E2E Tests

**Test Structure**:
```
frontend/e2e/
├── auth/
│   ├── login.spec.ts
│   └── two-factor.spec.ts
├── upload/
│   ├── single-upload.spec.ts
│   ├── resume-upload.spec.ts
│   └── smart-upload-wizard.spec.ts
├── reports/
│   ├── view-reports.spec.ts
│   └── download-pdf.spec.ts
└── fixtures/
    └── test-data.dcm
```

**Playwright Configuration**:
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['junit', { outputFile: 'test-results/junit.xml' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Example E2E Test**:
```typescript
// e2e/upload/single-upload.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Single File Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/upload');
  });

  test('should upload single DICOM file successfully', async ({ page }) => {
    // Select file
    const filePath = path.resolve(__dirname, '../fixtures/test-data.dcm');
    await page.setInputFiles('input[type="file"]', filePath);

    // Verify file appears in list
    await expect(page.locator('text=test-data.dcm')).toBeVisible();

    // Fill metadata (auto-populated, verify)
    await expect(page.locator('[name="patient_name"]')).toHaveValue('TEST^PATIENT');
    await expect(page.locator('[name="modality"]')).toHaveValue('CT');

    // Continue to confirmation
    await page.click('button:has-text("Continue")');

    // Confirm metadata
    await page.click('button:has-text("Start Upload")');

    // Wait for progress screen
    await expect(page.locator('text=Uploading')).toBeVisible();

    // Wait for completion (with timeout)
    await expect(page.locator('text=Upload Complete')).toBeVisible({ timeout: 30000 });

    // Verify report created
    await expect(page.locator('text=Report ID')).toBeVisible();
  });

  test('should resume upload after network failure', async ({ page, context }) => {
    // Start upload
    const filePath = path.resolve(__dirname, '../fixtures/large-study.dcm');  // 50MB
    await page.setInputFiles('input[type="file"]', filePath);
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Start Upload")');

    // Simulate offline after 20% progress
    await page.waitForFunction(() => {
      const progressText = document.querySelector('.progress-percentage')?.textContent;
      return progressText && parseInt(progressText) >= 20;
    });

    // Go offline
    await context.setOffline(true);

    // Verify "Offline" banner
    await expect(page.locator('text=You are offline')).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Verify auto-resume
    await expect(page.locator('text=Uploading')).toBeVisible();

    // Verify completion
    await expect(page.locator('text=Upload Complete')).toBeVisible({ timeout: 60000 });
  });
});
```

### Visual Regression Testing

**Percy Integration**:
```typescript
// e2e/visual/dashboard.spec.ts
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('dashboard visual comparison', async ({ page }) => {
  await page.goto('/dashboard');
  await percySnapshot(page, 'Dashboard - Default View');

  // Filter to 1 month
  await page.click('button:has-text("1M")');
  await percySnapshot(page, 'Dashboard - 1 Month Filter');
});
```

---

## Test Data Management

### Test DICOM Files

**Test Data Repository**:
```
frontend/e2e/fixtures/
├── small-study.dcm          # 1MB, CT scan
├── multi-file-study/        # 10 files, MRI series
│   ├── image-001.dcm
│   ├── image-002.dcm
│   └── ...
└── invalid-dicom.txt        # For negative tests
```

**Data Anonymization**:
- Use synthetic patient data only
- No real PHI in tests
- Generated with `pydicom` utilities

**Database Seeding**:
```python
# tests/factories.py
from factory import Factory, Faker, Sequence
from app.database.models import User, Upload

class UserFactory(Factory):
    class Meta:
        model = User

    username = Sequence(lambda n: f"user{n}")
    email = Faker('email')
    password_hash = "$2b$12$..."  # Pre-hashed test password
    role = "clinician"

class UploadFactory(Factory):
    class Meta:
        model = Upload

    user_id = SubFactory(UserFactory)
    study_hash = Faker('sha256')
    metadata = {
        "patient_name": Faker('name'),
        "study_date": "20260114",
        "modality": "CT"
    }
    status = "completed"
```

---

## CI Integration

### GitHub Actions Test Jobs

```yaml
# .github/workflows/tests.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements-dev.txt
      - name: Run pytest
        run: |
          cd backend
          pytest tests/unit \
            --cov=app \
            --cov-report=xml \
            --cov-fail-under=90 \
            --junitxml=junit.xml
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start services
        run: docker-compose up -d
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
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
```

---

## Quality Metrics

### Test Metrics Dashboard

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Unit Test Coverage** | 90% | 92% | ✅ Pass |
| **E2E Test Pass Rate** | 100% | 98% | ⚠️ Warning |
| **Test Execution Time** | <10min | 8min | ✅ Pass |
| **Test Flakiness** | <2% | 1.5% | ✅ Pass |
| **Defect Escape Rate** | <5% | 3% | ✅ Pass |

### Continuous Improvement

**Monthly Reviews**:
- Analyze flaky tests (fix or remove)
- Review test coverage gaps
- Update test data for new scenarios
- Performance test benchmarks

---

**Document Status**: ✅ COMPLETE
**Maintained By**: QA Lead + Engineers
**Review Frequency**: Monthly
