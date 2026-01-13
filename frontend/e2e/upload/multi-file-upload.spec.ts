import { test, expect, Page } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';
import * as path from 'path';
import * as fs from 'fs';

/**
 * E2E tests for multi-file DICOM upload workflow.
 * 
 * Tests uploading multiple DICOM files in a single session.
 */

test.describe('Multi-File Upload Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Login
    await page.goto('/login');
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/security key/i).fill(testUsers.validUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/');
    
    // Navigate to upload
    await page.getByRole('link', { name: /upload/i }).first().click();
    await expect(page).toHaveURL('/upload');
  });

  test('should upload multiple DICOM files successfully', async () => {
    //Create multiple test DICOM files
    const file1 = await createTestDicomFile('file1');
    const file2 = await createTestDicomFile('file2');
    const file3 = await createTestDicomFile('file3');
    
    // Upload all files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([file1, file2, file3]);
    
    // Wait for files to be processed
    await page.waitForTimeout(2000);
    
    // Should show all 3 files in the list
    await expect(page.getByText(/3.*files?/i)).toBeVisible();
    
    // Continue to metadata
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page).toHaveURL(/\/upload\/metadata/);
    
    // Fill metadata
    await page.getByLabel(/patient name/i).fill('Multi-File Test Patient');
    await page.getByLabel(/study date/i).fill('2024-01-01');
    await page.getByLabel(/modality/i).selectOption('CT');
    
    // Start upload
    await page.getByRole('button', { name: /start upload/i }).click();
    await expect(page).toHaveURL(/\/upload\/progress/);
    
    // Wait for completion
    await expect(page.getByText(/upload complete/i)).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(/3.*file.*uploaded/i)).toBeVisible();
    
    // Cleanup
    await Promise.all([
      cleanupTestFile(file1),
      cleanupTestFile(file2),
      cleanupTestFile(file3)
    ]);
  });

  test('should handle individual file failures gracefully', async () => {
    // Create valid and invalid files
    const validFile = await createTestDicomFile('valid');
    const invalidFile = await createTestTextFile('invalid');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([validFile, invalidFile]);
    await page.waitForTimeout(2000);
    
    // Should show error for invalid file
    await expect(page.getByText(/invalid|error/i)).toBeVisible();
    
    // Should still be able to continue with valid file
    // (or remove invalid file and continue)
    
    await Promise.all([
      cleanupTestFile(validFile),
      cleanupTestFile(invalidFile)
    ]);
  });

  test('should display progress for each file during multi-file upload', async () => {
    const files = await Promise.all([
      createTestDicomFile('progress1'),
      createTestDicomFile('progress2')
    ]);
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(files);
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByLabel(/patient name/i).fill('Progress Test');
    await page.getByLabel(/study date/i).fill('2024-01-01');
    await page.getByLabel(/modality/i).selectOption('MR');
    await page.getByRole('button', { name: /start upload/i }).click();
    
    // Should show individual file progress
    await expect(page).toHaveURL(/\/upload\/progress/);
    
    // Look for file-specific progress indicators
    const fileNames = ['progress1', 'progress2'];
    for (const fileName of fileNames) {
      // File name or index should be visible
      const hasFileName = await page.getByText(new RegExp(fileName, 'i')).isVisible().catch(() => false);
      const hasFileIndex = await page.getByText(/file \d+ of \d+/i).isVisible().catch(() => false);
      
      expect(hasFileName || hasFileIndex).toBe(true);
    }
    
    await Promise.all(files.map(cleanupTestFile));
  });
});

/**
 * Helper functions
 */
async function createTestDicomFile(name: string = 'test'): Promise<string> {
  const testDir = path.join(__dirname, '../fixtures/test-uploads');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filePath = path.join(testDir, `${name}-${Date.now()}.dcm`);
  const buffer = Buffer.alloc(256);
  buffer.write('DICM', 128);
  fs.writeFileSync(filePath, buffer);
  
  return filePath;
}

async function createTestTextFile(name: string = 'test'): Promise<string> {
  const testDir = path.join(__dirname, '../fixtures/test-uploads');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filePath = path.join(testDir, `${name}-${Date.now()}.txt`);
  fs.writeFileSync(filePath, 'Not a DICOM file');
  
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
