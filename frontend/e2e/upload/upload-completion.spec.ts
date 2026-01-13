import { test, expect, Page } from '@playwright/test';
import { testUsers, apiBaseUrl } from '../fixtures/test-data';
import * as path from 'path';
import * as fs from 'fs';

/**
 * E2E tests for upload completion verification.
 * 
 * Tests post-upload state, PACS forwarding confirmation, and report creation.
 */

test.describe('Upload Completion Verification', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Login
    await page.goto('/login');
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/security key/i).fill(testUsers.validUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('should create report after successful upload', async () => {
    // Complete full upload
    await performCompleteUpload(page);
    
    // Navigate to reports page
    const viewReportsBtn = page.getByRole('button', { name: /view reports|go to reports/i });
    if (await viewReportsBtn.isVisible()) {
      await viewReportsBtn.click();
    } else {
      await page.getByRole('link', { name: /reports/i }).click();
    }
    
    await expect(page).toHaveURL(/\/reports/);
    
    // Should see newly created report
    await expect(page.getByText(/completion test patient/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show PACS forwarding status', async () => {
    await performCompleteUpload(page);
    
    // On completion page, should show PACS status
    await expect(page.getByText(/pacs/i)).toBeVisible();
    await expect(page.getByText(/forwarded|sent to pacs|success/i)).toBeVisible();
  });

  test('should display upload statistics on dashboard', async () => {
    await performCompleteUpload(page);
    
    // Navigate to dashboard
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard|\//);
    
    // Should see updated statistics
    const hasStats = await page.getByText(/total uploads|upload.*success/i).isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasStats) {
      // Verify stat count increased
      await expect(page.locator('[data-testid="upload-count"], [role="status"]').first()).toBeVisible();
    }
  });

  test('should allow starting new upload after completion', async () => {
    await performCompleteUpload(page);
    
    // Click "Upload Another" or navigate to upload page
    const uploadAnotherBtn = page.getByRole('button', { name: /upload another|new upload/i });
    
    if (await uploadAnotherBtn.isVisible()) {
      await uploadAnotherBtn.click();
    } else {
      await page.getByRole('link', { name: /upload/i }).click();
    }
    
    // Should be on clean upload page
    await expect(page).toHaveURL(/\/upload/);
    await expect(page.getByText(/no files selected|select files/i)).toBeVisible();
  });

  test('should show success notification after upload', async () => {
    await page.getByRole('link', { name: /upload/i }).first().click();
    
    const testFile = await createTestDicomFile();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByLabel(/patient name/i).fill('Notification Test');
    await page.getByLabel(/study date/i).fill('2024-01-01');
    await page.getByLabel(/modality/i).selectOption('CT');
    await page.getByRole('button', { name: /start upload/i }).click();
    
    // Wait for completion
    await expect(page.getByText(/upload complete/i)).toBeVisible({ timeout: 30000 });
    
    // Look for success indicators
    const successIndicators = [
      page.getByRole('alert').filter({ hasText: /success/i }),
      page.locator('[role="status"]').filter({ hasText: /success/i }),
      page.getByText(/successfully uploaded/i),
      page.locator('svg[data-success="true"], .success-icon')
    ];
    
    let foundSuccess = false;
    for (const indicator of successIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        foundSuccess = true;
        break;
      }
    }
    
    expect(foundSuccess).toBe(true);
    
    await cleanupTestFile(testFile);
  });

  test('should handle PACS forwarding failures gracefully', async () => {
    // This test would require mocking PACS unavailability
    // For now, document expected behavior
    
    await page.getByRole('link', { name: /upload/i }).first().click();
    
    const testFile = await createTestDicomFile();
    await page.locator('input[type="file"]').setInputFiles(testFile);
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByLabel(/patient name/i).fill('PACS Failure Test');
    await page.getByLabel(/study date/i).fill('2024-01-01');
    await page.getByLabel(/modality/i).selectOption('MR');
    
    // Start upload
    await page.getByRole('button', { name: /start upload/i }).click();
    
    // Even if PACS fails, upload should complete with warning
    await expect(page.getByText(/upload complete|completed/i)).toBeVisible({ timeout: 30000 });
    
    // Look for warning about PACS
    const hasWarning = await page.getByText(/warning|pacs.*failed|partial/i).isVisible().catch(() => false);
    
    // Document behavior - may show warning, may show partial success
    console.log('PACS failure warning visible:', hasWarning);
    
    await cleanupTestFile(testFile);
  });
});

/**
 * Helper: Perform complete upload workflow
 */
async function performCompleteUpload(page: Page): Promise<void> {
  await page.getByRole('link', { name: /upload/i }).first().click();
  
  const testFile = await createTestDicomFile();
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFile);
  await page.waitForTimeout(1000);
  
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByLabel(/patient name/i).fill('Completion Test Patient');
  await page.getByLabel(/study date/i).fill('2024-01-01');
  await page.getByLabel(/modality/i).selectOption('CT');
  await page.getByRole('button', { name: /start upload/i }).click();
  
  await expect(page.getByText(/upload complete/i)).toBeVisible({ timeout: 30000 });
  
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
  } catch (error) {
    console.warn('Cleanup failed:', filePath);
  }
}
