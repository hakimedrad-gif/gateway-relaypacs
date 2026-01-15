import { test, expect, Page } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * E2E tests for multi-file DICOM upload workflow.
 */

test.describe('Multi-File Upload Workflow', () => {
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
          upload_id: 'mock-multi-upload-id',
          upload_token: 'mock-upload-token',
          chunk_size: 1024 * 1024,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      });
    });

    await page.route('**/upload/*/chunk*', async (route) => {
      await route.fulfill({ json: { success: true } });
    });

    await page.route('**/upload/*/complete', async (route) => {
      await route.fulfill({ json: { success: true, status: 'completed' } });
    });

    await page.route('**/upload/*/status', async (route) => {
      await route.fulfill({
        json: {
          upload_id: 'mock-multi-upload-id',
          state: 'completed',
          progress_percent: 100,
          uploaded_bytes: 2000,
          total_bytes: 2000,
          pacs_status: 'completed',
          files: {
            file1: { complete: true, received_chunks: [0] },
            file2: { complete: true, received_chunks: [0] },
          },
        },
      });
    });

    // Login
    await page.goto('/login');
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/security key/i).fill(testUsers.validUser.password);
    await page.getByRole('button', { name: 'Sign In to Gateway' }).click();
    await expect(page).toHaveURL('/');
  });

  test('should upload multiple DICOM files successfully', async () => {
    // Create multiple test DICOM files
    const file1 = await createTestDicomFile('f1');
    const file2 = await createTestDicomFile('f2');

    // Upload files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([path.join(file1, 'image.dcm'), path.join(file2, 'image.dcm')]);

    // Wait for auto-navigation to metadata
    await expect(page).toHaveURL(/\/metadata\//, { timeout: 10000 });

    // Fill metadata
    await page.getByLabel(/age/i).fill('30Y');
    await page.getByLabel(/gender/i).selectOption('F');
    await page.getByLabel(/clinical history/i).fill('Multi-file test history');

    // Start upload
    await page.getByRole('button', { name: /confirm & upload/i }).click();

    // Progress page
    await expect(page).toHaveURL(/\/progress\//);

    // Wait for completion
    await expect(page.getByText(/upload successful/i)).toBeVisible({ timeout: 30000 });

    // Cleanup
    await cleanupTestFile(file1);
    await cleanupTestFile(file2);
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTestDicomFile(name: string): Promise<string> {
  const baseDir = path.join(__dirname, '../fixtures/test-uploads');
  const uniqueDir = path.join(baseDir, `${name}-${Date.now()}`);
  if (!fs.existsSync(uniqueDir)) {
    fs.mkdirSync(uniqueDir, { recursive: true });
  }
  const filePath = path.join(uniqueDir, 'image.dcm');
  const buffer = Buffer.alloc(132);
  buffer.write('DICM', 128);
  fs.writeFileSync(filePath, buffer);
  return uniqueDir;
}

async function cleanupTestFile(dirPath: string): Promise<void> {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (error) {}
}
