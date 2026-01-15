import { test, expect, Page } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * E2E tests for network resilience and retries.
 */

test.describe('Network Resilience', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Login mock
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({ json: { access_token: 'tk', refresh_token: 'rf' } });
    });

    await page.route('**/upload/init', async (route) => {
      await route.fulfill({
        json: {
          upload_id: 'res-id',
          upload_token: 'res-tk',
          chunk_size: 1024 * 1024,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
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

  test('should allow manual retry after chunk upload failure', async () => {
    let failCount = 0;
    await page.route('**/upload/*/chunk*', async (route) => {
      failCount++;
      if (failCount === 1) {
        // Fail the first attempt
        await route.abort('failed');
      } else {
        await route.fulfill({ json: { success: true } });
      }
    });

    await page.route('**/upload/*/complete', async (route) => {
      await route.fulfill({ json: { success: true } });
    });

    await page.route('**/upload/*/status', async (route) => {
      await route.fulfill({
        json: {
          upload_id: 'res-id',
          state: 'completed',
          progress_percent: 100,
          uploaded_bytes: 1000,
          total_bytes: 1000,
          pacs_status: 'completed',
          files: { f1: { complete: true, received_chunks: [0] } },
        },
      });
    });

    const testFilePath = await createTestFile();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    await expect(page).toHaveURL(/\/metadata\//, { timeout: 10000 });

    await page.getByLabel(/age/i).fill('45Y');
    await page.getByLabel(/gender/i).selectOption('M');
    await page.getByLabel(/clinical history/i).fill('Network resilience test');

    // Handle the alert that will appear on failure
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Failed to start upload');
      await dialog.dismiss();
    });

    // First attempt - fails due to mocked network error
    await page.getByRole('button', { name: /confirm & upload/i }).click();

    // Second attempt - succeeds
    await page.getByRole('button', { name: /confirm & upload/i }).click();

    await expect(page).toHaveURL(/\/progress\//);
    await expect(page.getByText(/upload successful/i)).toBeVisible({ timeout: 15000 });

    await cleanupTestFile(testDir);
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTestFile(): Promise<string> {
  const baseDir = path.join(__dirname, '../fixtures/test-uploads');
  const uniqueDir = path.join(baseDir, `net-${Date.now()}`);
  if (!fs.existsSync(uniqueDir)) {
    fs.mkdirSync(uniqueDir, { recursive: true });
  }
  const filePath = path.join(uniqueDir, 'image.dcm');
  const buffer = Buffer.alloc(132);
  buffer.write('DICM', 128);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function cleanupTestFile(filePath: string): Promise<void> {
  try {
    const dirPath = path.dirname(filePath);
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (error) {}
}
