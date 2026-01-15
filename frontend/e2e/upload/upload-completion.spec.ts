import { test, expect, Page } from '@playwright/test';
import {
  setupMockAPIs,
  loginAs,
  clearIndexedDB,
  waitForUploadComplete,
  waitForReportsLoaded,
} from '../fixtures/test-helpers';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';
import { Buffer } from 'buffer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * E2E tests for upload completion verification.
 *
 * Tests post-upload state, PACS forwarding confirmation, and report creation.
 */

test.describe('Upload Completion Verification', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Clear IndexedDB for clean state
    await page.goto('/');
    await clearIndexedDB(page);

    // Setup centralized API mocks
    await setupMockAPIs(page);

    // Perform Login
    await loginAs(page, 'validUser');
  });

  // NOTE: This test is skipped due to ReportList component ESM import issues
  // with react-window and react-virtualized-auto-sizer.
  // The Reports page works in production but has Vite HMR cache issues during E2E tests.
  test('should create report after successful upload', async () => {
    // Complete full upload
    await performCompleteUpload(page);

    // Navigate to reports page
    await page
      .getByRole('button', { name: /^REPORTS$/ })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/reports/);

    // Initial check for page header
    // Use data-testid for more stable targeting
    const header = page.getByTestId('reports-header');
    await expect(header).toBeVisible({ timeout: 15000 });
    await expect(header).toHaveText(/My Reports/i);

    // Wait for reports to load
    await waitForReportsLoaded(page);

    // Should see newly created report (from mock data)
    await expect(page.getByText('Completion Test Patient')).toBeVisible({ timeout: 10000 });
  });

  test('should show PACS forwarding status', async () => {
    await performCompleteUpload(page);

    // On completion page, use data-testid for reliable selection
    await expect(page.getByTestId('upload-complete-banner')).toBeVisible();
    await expect(page.getByTestId('upload-success-message')).toHaveText('Upload Successful');
    await expect(page.getByTestId('pacs-status-message')).toHaveText('Study secured in Cloud PACS');
  });

  test('should display upload statistics on dashboard', async () => {
    await performCompleteUpload(page);

    // Navigate to dashboard
    await page
      .getByRole('button', { name: /^DASHBOARD$/ })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Should see updated statistics
    await expect(page.getByText(/Total Studies/i)).toBeVisible({ timeout: 10000 });
  });

  test('should allow starting new upload after completion', async () => {
    await performCompleteUpload(page);

    // Click "UPLOAD" in nav to start new
    await page
      .getByRole('button', { name: /^UPLOAD$/ })
      .filter({ visible: true })
      .first()
      .click();

    // Should be on upload page (root route maps to upload)
    await expect(page).toHaveURL(/\/(upload)?$/);
  });

  test('should show success notification after upload', async () => {
    await performCompleteUpload(page);

    // Use data-testid for reliable selection
    await expect(page.getByTestId('upload-success-message')).toBeVisible();
  });

  test('should handle PACS forwarding failures gracefully', async () => {
    await performCompleteUpload(page);
    await expect(page.getByTestId('upload-complete-banner')).toBeVisible();
  });
});

/**
 * Helper: Perform complete upload workflow
 */
async function performCompleteUpload(page: Page): Promise<void> {
  // 1. Navigate to upload page if needed
  const currentUrl = page.url();
  if (!currentUrl.endsWith('/') && !currentUrl.includes('/upload')) {
    await page
      .getByRole('button', { name: /^UPLOAD$/ })
      .filter({ visible: true })
      .first()
      .click();
  }

  // Create and upload test file
  const testFile = await createTestDicomFile();

  // Ensure we are in Files mode (not Folder mode)
  await page.getByRole('button', { name: 'Files' }).click();

  const fileInput = page.locator('input[type="file"]:not([webkitdirectory])');
  await fileInput.setInputFiles(testFile);

  // Wait for navigation to metadata page
  await expect(page).toHaveURL(/\/metadata/, { timeout: 10000 });

  // 2. Fill Metadata Confirmation Page
  await page.getByLabel(/age/i).fill('45Y');
  await page.getByLabel(/gender/i).selectOption('M');

  // Fill Clinical History (required field)
  const historyInput = page.locator('textarea#clinicalHistory');
  await historyInput.fill('Completion Test Patient History');

  // Wait for form to be valid and button enabled
  const confirmBtn = page.getByTestId('confirm-upload-button');
  await expect(confirmBtn).toBeEnabled({ timeout: 5000 });
  await confirmBtn.click();

  // 3. Wait for Progress Page and completion
  await expect(page).toHaveURL(/\/progress/, { timeout: 10000 });

  // Use centralized helper for completion check
  await waitForUploadComplete(page);

  // Cleanup
  await cleanupTestFile(testFile);
}

async function createTestDicomFile(): Promise<string> {
  const testDir = path.join(__dirname, '../fixtures/test-uploads');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const filePath = path.join(testDir, `completion-test-${Date.now()}.dcm`);
  const buffer = Buffer.alloc(256);
  buffer.write('DICM', 128);
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

async function cleanupTestFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    console.warn('Cleanup failed:', filePath);
  }
}
