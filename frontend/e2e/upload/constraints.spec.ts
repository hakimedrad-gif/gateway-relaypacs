import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

test.describe('Upload Constraints', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Programmatic Login to bypass UI flakiness
    await page.addInitScript(() => {
      sessionStorage.setItem('relaypacs_auth_token', 'mock-token');
      sessionStorage.setItem('relaypacs_refresh_token', 'mock-refresh');
    });

    // Go to root (protected)
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  test('should handle upload size limit exceeded error', async ({ page }) => {
    // Mock Init Upload to fail with size error
    await page.route('**/upload/init', async (route) => {
      const body = route.request().postDataJSON();
      // Simulating a backend limit (e.g. 1GB)
      if (body.total_size > 500 * 1024 * 1024) {
        // > 500MB
        await route.fulfill({
          status: 413, // Payload Too Large
          json: { detail: 'Upload exceeds maximum size limit of 500MB' },
        });
        return;
      }
      await route.fulfill({ json: { upload_id: '123', upload_token: 'abc' } });
    });

    const testFile = {
      name: 'large_dataset.dcm',
      mimeType: 'application/dicom',
      buffer: Buffer.from(new Array(1024).fill('A').join('')),
    };

    // Force backend rejection
    await page.route('**/upload/init', async (route) => {
      await route.fulfill({
        status: 413,
        json: { detail: 'Upload exceeds maximum size limit' },
      });
    });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // Wait for Metadata page
    await expect(page).toHaveURL(/\/metadata/);

    // Fill metadata
    await page.getByLabel(/age/i).fill('30Y');
    // Gender is a select
    await page.getByRole('combobox', { name: /gender/i }).selectOption('M');
    // Clinical History is required
    await page.getByPlaceholder(/reason for study/i).fill('Test history for upload constraint.');

    // Handle Alert Dialog (App uses alert() for upload errors)
    const dialogPromise = page.waitForEvent('dialog');

    // Click Upload
    await page.getByRole('button', { name: /confirm & upload/i }).click();

    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('Failed to start upload');
    await dialog.dismiss();

    // Should NOT navigate to progress
    await expect(page).not.toHaveURL(/\/progress/);
  });
});
