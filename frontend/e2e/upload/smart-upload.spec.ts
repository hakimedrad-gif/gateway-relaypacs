import { test, expect } from '@playwright/test';
import {
  loginAs,
  setupMockAPIs,
  clearIndexedDB,
  waitForUploadComplete,
} from '../fixtures/test-helpers';

test.describe('Smart Upload Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to ensure context for IndexedDB
    await page.goto('/');
    await clearIndexedDB(page);
    await setupMockAPIs(page);
    await loginAs(page, 'validUser');
  });

  test('should complete standard flow', async ({ page }) => {
    await page.goto('/upload-new');
    await expect(page.getByRole('heading', { name: 'New Study Upload' })).toBeVisible();

    // Step 1: Files
    // Simulate drop or file selection by manipulating the hidden input
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles([
      {
        name: 'test-image.dcm',
        mimeType: 'application/dicom',
        buffer: Buffer.from('mock-dicom-data'),
      },
    ]);

    // Auto transition to Metadata is EXPECTED
    await expect(page.getByTestId('patient-name-input')).toBeVisible();

    // Step 2: Metadata
    await page.getByTestId('patient-name-input').fill('Wizard Test Patient');
    await page.getByTestId('age-input').fill('45Y');
    await page.getByTestId('clinical-history-input').fill('Test history for wizard');

    // Start Upload
    const startBtn = page.getByTestId('start-upload-btn');
    await expect(startBtn).toBeEnabled();
    await startBtn.click();

    // Step 3: Progress - transition to upload state
    // We expect the progress spinner or text
    await expect(page.getByText('Uploading')).toBeVisible();

    // Step 4: Complete
    await waitForUploadComplete(page, 10000);

    // Verify banner content
    // We can check for text "Upload Complete"
    await expect(page.getByText('Upload Complete')).toBeVisible();

    // Verify actions availability
    await expect(page.getByRole('button', { name: 'View Reports' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload Another' })).toBeVisible();
  });
});
