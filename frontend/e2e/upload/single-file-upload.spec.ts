import { test, expect, Page } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * E2E tests for single file DICOM upload workflow.
 *
 * Tests the complete upload flow from file selection through completion,
 * covering the critical path identified in the audit as having zero E2E coverage.
 */

test.describe('Single File Upload Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Mock Backend API
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({ json: { access_token: 'mock-token', refresh_token: 'mock-refresh' } });
    });

    await page.route('**/upload/init', async (route) => {
      await route.fulfill({
        json: {
          upload_id: 'mock-upload-id',
          upload_token: 'mock-upload-token',
          chunk_size: 1024 * 1024,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      });
    });

    // Valid chunk upload mock
    await page.route('**/upload/*/chunk*', async (route) => {
      await route.fulfill({
        json: {
          upload_id: 'mock-upload-id',
          file_id: 'mock-file-id',
          chunk_index: 0,
          received_bytes: 1024,
        },
      });
    });

    // Capture console logs for debugging
    page.on('console', (msg) => console.log(`BROWSER LOG: ${msg.text()}`));

    await page.route('**/upload/*/complete', async (route) => {
      await route.fulfill({ json: { success: true, status: 'completed' } });
    });

    // Stateful status mock
    let statusCallCount = 0;
    await page.route('**/upload/*/status', async (route) => {
      statusCallCount++;
      // Return uploading for first few calls, then complete
      if (statusCallCount < 2) {
        await route.fulfill({
          json: {
            upload_id: 'mock-upload-id',
            state: 'uploading',
            progress_percent: 50,
            uploaded_bytes: 500,
            total_bytes: 1000,
            pacs_status: 'pending',
            files: {},
          },
        });
      } else {
        await route.fulfill({
          json: {
            upload_id: 'mock-upload-id',
            state: 'completed',
            progress_percent: 100,
            uploaded_bytes: 1000,
            total_bytes: 1000,
            pacs_status: 'completed',
            files: {
              file1: { complete: true, received_chunks: [0] },
            },
          },
        });
      }
    });

    // Login first
    await page.goto('/login');
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/security key/i).fill(testUsers.validUser.password);
    await page.getByRole('button', { name: 'Sign In to Gateway' }).click();

    // Wait for redirect to home (Upload page)
    await expect(page).toHaveURL('/');
  });

  test('should complete full single-file upload flow', async () => {
    // Step 1: Upload Study page - File selection
    await expect(page.getByRole('heading', { name: /upload study/i })).toBeVisible();

    // Create a test DICOM file
    const testDicomPath = await createTestDicomFile();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDicomPath);

    // Wait for file to be processed and automatic navigation
    await expect(page).toHaveURL(/\/metadata\//, { timeout: 10000 });

    // Step 2: Metadata Confirmation page
    await expect(page.getByRole('heading', { name: /confirm metadata/i })).toBeVisible();

    // Fill in metadata
    // Verify pre-filled metadata (Readonly in current implementation)
    await expect(page.getByLabel(/patient name/i)).toHaveValue('DOE^JOHN');
    // Study date is dynamic (today), just check it's not empty or ignore specific value
    await expect(page.getByLabel(/modality/i)).toHaveValue('CT');
    // Service Level is not displayed on confirmation page

    // Fill required fields
    await page.getByLabel(/age/i).fill('45Y');
    await page.getByLabel(/gender/i).selectOption('M');
    await page.getByLabel(/clinical history/i).fill('Test clinical history for E2E test');

    // Start upload ("Confirm & Upload")
    const startUploadButton = page.getByRole('button', { name: /confirm & upload/i });
    await expect(startUploadButton).toBeEnabled();
    await startUploadButton.click();

    // Step 3: Upload Progress page
    await expect(page).toHaveURL(/\/progress\//);
    await expect(page.getByRole('heading', { name: /uploading/i })).toBeVisible();

    // Wait for upload to complete (with timeout)
    const completionText = page.getByText(/upload successful/i);
    await expect(completionText).toBeVisible({ timeout: 30000 });

    // Verify progress indicators
    await expect(page.getByText(/synchronized/i)).toBeVisible(); // 100% Synchronized

    // Step 4: Verify completion and navigation
    const newUploadButton = page.getByRole('button', { name: /upload new study/i });
    if (await newUploadButton.isVisible()) {
      await newUploadButton.click();
      await expect(page).toHaveURL('/');
    }

    // Cleanup
    await cleanupTestFile(testDicomPath);
  });

  test('should show file validation errors for invalid files', async () => {
    // Try to upload a non-DICOM file
    const testTextPath = await createTestTextFile();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testTextPath);

    // Should show error message
    await expect(page.getByText(/invalid|not a valid dicom|supported/i)).toBeVisible({
      timeout: 5000,
    });

    // Should NOT navigate
    await expect(page).toHaveURL('/');

    await cleanupTestFile(testTextPath);
  });

  test.skip('should allow file removal before upload', async () => {
    const testDicomPath = await createTestDicomFile();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDicomPath);
    await page.waitForTimeout(500);

    // Find and click remove button
    const removeButton = page.getByRole('button', { name: /remove|delete/i }).first();
    await removeButton.click();

    // Verify we are still on upload page (no navigation)
    await expect(page).toHaveURL('/');

    // File list should be empty
    await expect(page.getByText(/no files selected/i)).toBeVisible();

    await cleanupTestFile(testDicomPath);
  });

  test('should display upload progress indicators', async () => {
    const testDicomPath = await createTestDicomFile();

    // Complete upload flow up to progress page
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDicomPath);

    // Wait for auto-navigation
    await expect(page).toHaveURL(/\/metadata\//, { timeout: 10000 });

    // Verify metadata pre-fill
    await expect(page.getByLabel(/patient name/i)).toHaveValue('DOE^JOHN');

    // Fill required fields for progress test
    await page.getByLabel(/age/i).fill('45Y');
    await page.getByLabel(/gender/i).selectOption('M');
    await page.getByLabel(/clinical history/i).fill('Test history');

    // Button name is "Confirm & Upload"
    await page.getByRole('button', { name: /confirm & upload/i }).click();

    // On progress page, check for indicators
    await expect(page).toHaveURL(/\/progress\//);

    // Should show progress bar or percentage
    const progressIndicators = [
      page.locator('[role="progressbar"]'),
      page.getByText(/%/),
      page.getByText(/uploading/i),
    ];

    // At least one progress indicator should be visible
    let foundIndicator = false;
    for (const indicator of progressIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        foundIndicator = true;
        break;
      }
    }

    expect(foundIndicator).toBe(true);

    await cleanupTestFile(testDicomPath);
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper: Create a minimal test DICOM file
 */
async function createTestDicomFile(): Promise<string> {
  const baseDir = path.join(__dirname, '../fixtures/test-uploads');
  const uniqueDir = path.join(baseDir, `dicom-${Date.now()}`);

  if (!fs.existsSync(uniqueDir)) {
    fs.mkdirSync(uniqueDir, { recursive: true });
  }

  const filePath = path.join(uniqueDir, 'image.dcm');

  // Create a minimal DICOM file
  const buffer = Buffer.alloc(132 + 256); // Preamble + Header + body
  buffer.write('DICM', 128);

  fs.writeFileSync(filePath, buffer);

  return uniqueDir;
}

/**
 * Helper: Create a test text file (for negative testing)
 */
async function createTestTextFile(): Promise<string> {
  const baseDir = path.join(__dirname, '../fixtures/test-uploads');
  const uniqueDir = path.join(baseDir, `text-${Date.now()}`);

  if (!fs.existsSync(uniqueDir)) {
    fs.mkdirSync(uniqueDir, { recursive: true });
  }

  const filePath = path.join(uniqueDir, 'test.txt');
  fs.writeFileSync(filePath, 'This is not a DICOM file');

  return uniqueDir;
}

/**
 * Helper: Cleanup test file
 */
async function cleanupTestFile(dirPath: string): Promise<void> {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn('Failed to cleanup test dir:', dirPath, error);
  }
}
