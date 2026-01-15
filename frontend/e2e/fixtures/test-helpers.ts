/**
 * Centralized E2E test helpers for RelayPACS
 * Provides consistent mocking and navigation utilities
 */
import { Page, expect } from '@playwright/test';
import { testUsers } from './test-data';

/**
 * Login as a specific user type
 */
export async function loginAs(page: Page, userType: 'validUser' | 'admin' = 'validUser') {
  await page.goto('/login');
  const user = testUsers[userType];
  await page.getByLabel(/user id/i).fill(user.username);
  await page.getByLabel(/security key/i).fill(user.password);
  await page.getByRole('button', { name: 'Sign In to Gateway' }).click();
  await expect(page).toHaveURL('/');
}

/**
 * Setup all mock API responses for E2E tests
 */
export async function setupMockAPIs(page: Page) {
  // Authentication
  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      json: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
    });
  });

  // Upload initialization
  await page.route('**/upload/init', async (route) => {
    await route.fulfill({
      json: {
        upload_id: 'mock-upload-id',
        upload_token: 'mock-upload-token',
        chunk_size: 1024 * 1024,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
    });
  });

  // Chunk upload
  await page.route('**/upload/*/chunk*', async (route) => {
    await route.fulfill({
      json: {
        upload_id: 'mock-upload-id',
        file_id: '1',
        chunk_index: 0,
        received_bytes: 256,
      },
    });
  });

  // Upload completion
  await page.route('**/upload/*/complete', async (route) => {
    await route.fulfill({
      json: { status: 'complete', upload_id: 'mock-upload-id' },
    });
  });

  // Upload statistics
  await page.route('**/upload/stats*', async (route) => {
    await route.fulfill({
      json: {
        total_uploads: 15,
        failed_uploads: 1,
        modality: { CT: 10, MR: 5 },
        last_updated: new Date().toISOString(),
      },
    });
  });

  // Reports - match any reports API call
  await page.route('**/reports*', async (route) => {
    await route.fulfill({
      json: {
        reports: [
          {
            id: 'rep-1',
            upload_id: 'mock-upload-id',
            patient_name: 'Completion Test Patient',
            status: 'ready',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            study_instance_uid: '1.2.3.4.5.6.7.8.9.0',
            report_url: 'http://example.com/report.pdf',
          },
        ],
        total: 1,
      },
    });
  });

  // Notifications
  await page.route('**/notifications*', async (route) => {
    await route.fulfill({
      json: { notifications: [], unread_count: 0, total: 0 },
    });
  });
}

/**
 * Navigate to a specific section using nav buttons
 */
export async function navigateTo(
  page: Page,
  destination: 'upload' | 'reports' | 'dashboard' | 'notifications',
) {
  const buttonName = destination.toUpperCase();
  const buttonSelector = destination === 'notifications' ? 'NOTIFS' : buttonName;

  await page
    .getByRole('button', { name: new RegExp(`^${buttonSelector}$`) })
    .filter({ visible: true })
    .first()
    .click();
}

/**
 * Wait for upload completion banner to be visible
 */
export async function waitForUploadComplete(page: Page, timeout = 30000) {
  await expect(page.getByTestId('upload-complete-banner')).toBeVisible({ timeout });
}

/**
 * Wait for reports list to be loaded
 */
export async function waitForReportsLoaded(page: Page, timeout = 15000) {
  // Wait for either reports list or empty state
  await expect(page.getByTestId('reports-list').or(page.getByTestId('reports-empty'))).toBeVisible({
    timeout,
  });
}

/**
 * Clear IndexedDB before test to ensure clean state
 */
export async function clearIndexedDB(page: Page) {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  });
}
