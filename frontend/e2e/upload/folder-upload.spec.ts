import { test, expect, Page } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * E2E tests for folder-based DICOM upload.
 */

test.describe('Folder Upload Workflow', () => {
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
          upload_id: 'mock-folder-upload-id',
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
          upload_id: 'mock-folder-upload-id',
          state: 'completed',
          progress_percent: 100,
          uploaded_bytes: 3000,
          total_bytes: 3000,
          pacs_status: 'completed',
          files: {
            'img1.dcm': { complete: true, received_chunks: [0] },
            'img2.dcm': { complete: true, received_chunks: [0] },
            'img3.dcm': { complete: true, received_chunks: [0] },
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

  test('should upload a folder containing DICOM files successfully', async () => {
    // Select Folder mode
    await page.getByRole('button', { name: 'Folder' }).click();

    const testFolder = await createTestDicomFolder();

    // In Playwright, to simulate folder upload on a webkitdirectory input:
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFolder);

    // Wait for auto-navigation to metadata
    await expect(page).toHaveURL(/\/metadata\//, { timeout: 10000 });

    // Verify metadata and continue
    await page.getByLabel(/age/i).fill('60Y');
    await page.getByLabel(/gender/i).selectOption('O');
    await page.getByLabel(/clinical history/i).fill('Folder upload test');

    await page.getByRole('button', { name: /confirm & upload/i }).click();

    // Progress page
    await expect(page).toHaveURL(/\/progress\//);

    // Wait for completion
    await expect(page.getByText(/upload successful/i)).toBeVisible({ timeout: 30000 });

    // Cleanup
    await cleanupTestFolder(testFolder);
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTestDicomFolder(): Promise<string> {
  const baseDir = path.join(__dirname, '../fixtures/test-uploads');
  const folderPath = path.join(baseDir, `folder-${Date.now()}`);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  for (let i = 1; i <= 3; i++) {
    const filePath = path.join(folderPath, `img${i}.dcm`);
    const buffer = Buffer.alloc(132);
    buffer.write('DICM', 128);
    fs.writeFileSync(filePath, buffer);
  }

  return folderPath;
}

async function cleanupTestFolder(folderPath: string): Promise<void> {
  try {
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }
  } catch (error) {}
}
