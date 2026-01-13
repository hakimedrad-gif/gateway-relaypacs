import { test, expect, Page } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';
import * as path from 'path';
import * as fs from 'fs';

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
    
    // Login first
    await page.goto('/login');
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/security key/i).fill(testUsers.validUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for redirect to home
    await expect(page).toHaveURL('/');
    
    // Navigate to upload page
    await page.getByRole('link', { name: /upload/i }).first().click();
    await expect(page).toHaveURL('/upload');
  });

  test('should complete full single-file upload flow', async () => {
    // Step 1: Upload Study page - File selection
    await expect(page.getByRole('heading', { name: /upload study/i })).toBeVisible();
    
    // Create a test DICOM file
    const testDicomPath = await createTestDicomFile();
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDicomPath);
    
    // Wait for file to be processed
    await page.waitForTimeout(1000);
    
    // Click continue to metadata page
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    
    // Step 2: Metadata Confirmation page
    await expect(page).toHaveURL(/\/upload\/metadata/);
    await expect(page.getByRole('heading', { name: /confirm metadata/i })).toBeVisible();
    
    // Fill in metadata
   await page.getByLabel(/patient name/i).fill('Test Patient');
    await page.getByLabel(/study date/i).fill('2024-01-01');
    await page.getByLabel(/modality/i).selectOption('CT');
    await page.getByLabel(/service level/i).selectOption('routine');
    
    // Optionally fill clinical history
    const clinicalHistory = page.getByLabel(/clinical history/i);
    if (await clinicalHistory.isVisible()) {
      await clinicalHistory.fill('Test clinical history for E2E test');
    }
    
    // Start upload
    const startUploadButton = page.getByRole('button', { name: /start upload/i });
    await expect(startUploadButton).toBeEnabled();
    await startUploadButton.click();
    
    // Step 3: Upload Progress page
    await expect(page).toHaveURL(/\/upload\/progress/);
    await expect(page.getByRole('heading', { name: /uploading/i })).toBeVisible();
    
    // Wait for upload to complete (with timeout)
    const completionText = page.getByText(/upload complete/i);
    await expect(completionText).toBeVisible({ timeout: 30000 });
    
    // Verify progress indicators
    await expect(page.getByText(/100%/)).toBeVisible();
    await expect(page.getByText(/success/i)).toBeVisible();
    
    // Step 4: Verify completion and navigation
    const viewReportsButton = page.getByRole('button', { name: /view reports/i });
    if (await viewReportsButton.isVisible()) {
      await viewReportsButton.click();
      await expect(page).toHaveURL(/\/reports/);
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
    await expect(page.getByText(/invalid|not a valid dicom/i)).toBeVisible({ timeout: 5000 });
    
    // Continue button should be disabled
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeDisabled();
    
    await cleanupTestFile(testTextPath);
  });

  test('should allow file removal before upload', async () => {
    const testDicomPath = await createTestDicomFile();
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDicomPath);
    await page.waitForTimeout(500);
    
    // Find and click remove button
    const removeButton = page.getByRole('button', { name: /remove|delete/i }).first();
    await removeButton.click();
    
    // File list should be empty
    await expect(page.getByText(/no files selected/i)).toBeVisible();
    
    // Continue should be disabled
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeDisabled();
    
    await cleanupTestFile(testDicomPath);
  });

  test('should enforce required metadata fields', async () => {
    const testDicomPath = await createTestDicomFile();
    
    // Upload and navigate to metadata page
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDicomPath);
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /continue/i }).click();
    
    await expect(page).toHaveURL(/\/upload\/metadata/);
    
    // Try to start upload without filling required fields
    const startUploadButton = page.getByRole('button', { name: /start upload/i });
    
    // Button should be disabled or clicking should show validation errors
    const isDisabled = await startUploadButton.isDisabled();
    if (!isDisabled) {
      await startUploadButton.click();
      // Should show validation errors
      await expect(page.getByText(/required|field.*required/i)).toBeVisible();
    }
    
    await cleanupTestFile(testDicomPath);
  });

  test('should display upload progress indicators', async () => {
    const testDicomPath = await createTestDicomFile();
    
    // Complete upload flow up to progress page
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testDicomPath);
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /continue/i }).click();
    
    // Fill metadata
    await page.getByLabel(/patient name/i).fill('Progress Test Patient');
    await page.getByLabel(/study date/i).fill('2024-01-01');
    await page.getByLabel(/modality/i).selectOption('CT');
    await page.getByRole('button', { name: /start upload/i }).click();
    
    // On progress page, check for indicators
    await expect(page).toHaveURL(/\/upload\/progress/);
    
    // Should show progress bar or percentage
    const progressIndicators = [
      page.locator('[role="progressbar"]'),
      page.getByText(/%/),
      page.getByText(/uploading/i)
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

/**
 * Helper: Create a minimal test DICOM file
 */
async function createTestDicomFile(): Promise<string> {
  const testDir = path.join(__dirname, '../fixtures/test-uploads');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filePath = path.join(testDir, `test-dicom-${Date.now()}.dcm`);
  
  // Create a minimal DICOM file (simplified for testing)
  // In production, you'd want actual DICOM test files
  const dicomHeader = Buffer.from([
    0x44, 0x49, 0x43, 0x4D, // "DICM" magic bytes at offset 128
  ]);
  
  const buffer = Buffer.alloc(256);
  buffer.write('DICM', 128);
  
  fs.writeFileSync(filePath, buffer);
  
  return filePath;
}

/**
 * Helper: Create a test text file (for negative testing)
 */
async function createTestTextFile(): Promise<string> {
  const testDir = path.join(__dirname, '../fixtures/test-uploads');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filePath = path.join(testDir, `test-text-${Date.now()}.txt`);
  fs.writeFileSync(filePath, 'This is not a DICOM file');
  
  return filePath;
}

/**
 * Helper: Cleanup test file
 */
async function cleanupTestFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn('Failed to cleanup test file:', filePath, error);
  }
}
