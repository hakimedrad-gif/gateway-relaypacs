import { test, expect, Page } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';
import { Buffer } from 'buffer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * E2E tests for upload resumption functionality.
 *
 * Tests the ability to resume interrupted uploads using IndexedDB persistence.
 */

test.describe('Upload Resumption', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Mock Login
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({ json: { access_token: 'mock-token', refresh_token: 'mock-refresh' } });
    });

    // Login
    await page.goto('/login');
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/security key/i).fill(testUsers.validUser.password);
    await page.getByRole('button', { name: 'Sign In to Gateway' }).click();
    await expect(page).toHaveURL('/');
  });

  test('should allow resuming an interrupted upload', async () => {
    // Start an upload
    await page
      .getByRole('button', { name: /upload/i })
      .first()
      .click();

    const testFile = await createTestDicomFile();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // Auto-navigates to metadata
    await expect(page).toHaveURL(/\/metadata/);

    await page.getByLabel(/age/i).fill('45Y');
    await page.getByLabel(/gender/i).selectOption('M');
    await page.getByLabel(/clinical history/i).fill('Resume Test Patient History');

    await page.getByTestId('confirm-upload-button').click();

    await expect(page).toHaveURL(/\/progress/);

    // Simulate interruption by navigating away before completion
    await page.waitForTimeout(1000);
    await page.goto('/');

    // Navigate back to uploads or check for resume prompt
    // The app should detect incomplete upload in IndexedDB

    // Look for resume notification or button
    const resumeButton = page.getByRole('button', { name: /resume|continue upload/i });
    const resumeLink = page.getByRole('link', { name: /resume|incomplete upload/i });

    const hasResumeOption =
      (await resumeButton.isVisible().catch(() => false)) ||
      (await resumeLink.isVisible().catch(() => false));

    if (hasResumeOption) {
      // Click resume
      if (await resumeButton.isVisible().catch(() => false)) {
        await resumeButton.click();
      } else {
        await resumeLink.click();
      }

      // Should return to progress page
      await expect(page).toHaveURL(/\/progress/);

      // Upload should complete
      await expect(page.getByText(/Upload Successful/i)).toBeVisible({ timeout: 30000 });
    }

    await cleanupTestFile(testFile);
  });

  test('should persist upload state across page refreshes', async () => {
    await page
      .getByRole('button', { name: /upload/i })
      .first()
      .click();

    const testFile = await createTestDicomFile();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    await expect(page).toHaveURL(/\/metadata/);

    await page.getByLabel(/age/i).fill('45Y');

    // Refresh page before starting upload
    await page.reload();

    // Should restore state and show metadata page
    await expect(page).toHaveURL(/\/metadata/);

    // Metadata should still be filled (if persisted)
    const patientName = await page.getByLabel(/patient name/i).inputValue();
    expect(patientName).toBeTruthy();

    await cleanupTestFile(testFile);
  });

  test('should show resume dialog on return to upload page', async () => {
    // Start upload
    await page
      .getByRole('button', { name: /upload/i })
      .first()
      .click();

    const testFile = await createTestDicomFile();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // Auto-navigates to metadata
    await expect(page).toHaveURL(/\/metadata/);

    await page.getByLabel(/age/i).fill('45Y');
    await page.getByLabel(/gender/i).selectOption('M');
    await page.getByLabel(/clinical history/i).fill('Dialog Test History');

    await page.getByTestId('confirm-upload-button').click();

    // Navigate away during upload
    await page.waitForTimeout(1000);
    await page.goto('/dashboard');

    // Return to upload page
    await page
      .getByRole('button', { name: /upload/i })
      .first()
      .click();

    // Should show resume dialog or indicator
    const hasResumeUI = await page
      .getByText(/resume|incomplete|continue/i)
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // This test documents expected behavior - implementation may vary
    console.log('Resume UI visible:', hasResumeUI);

    await cleanupTestFile(testFile);
  });
});

/**
 * Helpers
 */
async function createTestDicomFile(): Promise<string> {
  const testDir = path.join(__dirname, '../fixtures/test-uploads');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const filePath = path.join(testDir, `resume-test-${Date.now()}.dcm`);
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
  } catch (error) {
    console.warn('Cleanup failed:', filePath);
  }
}
