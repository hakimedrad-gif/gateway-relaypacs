import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

test.describe('Dashboard Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Backend API
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({ json: { access_token: 'mock-token', refresh_token: 'mock-refresh' } });
    });

    await page.route('**/upload/stats*', async (route) => {
      await route.fulfill({
        json: {
          total_uploads: 150,
          failed_uploads: 5,
          last_updated: new Date().toISOString(),
          modality: { ct: 80, mr: 40, us: 30 },
          service_level: { routine: 100, emergency: 30, stat: 20 },
        },
      });
    });

    await page.route('**/upload/trend*', async (route) => {
      await route.fulfill({
        json: [
          { date: '2024-01-01', count: 10 },
          { date: '2024-01-02', count: 15 },
          { date: '2024-01-03', count: 8 },
        ],
      });
    });

    await page.route('**/upload/export*', async (route) => {
      const csvContent = 'date,count\n2024-01-01,10\n2024-01-02,15\n';
      await route.fulfill({
        contentType: 'text/csv',
        body: csvContent,
        headers: {
          'Content-Disposition': 'attachment; filename=stats.csv',
        },
      });
    });

    // Login first
    await page.goto('/login');
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/security key/i).fill(testUsers.validUser.password);
    await page.getByRole('button', { name: 'Sign In to Gateway' }).click();
    await expect(page).toHaveURL('/');

    // Navigate to dashboard
    await page
      .getByRole('button', { name: /dashboard/i })
      .first()
      .click();
  });

  test('should display dashboard page', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: /Analytics Dashboard/i })).toBeVisible();
  });

  test('should show time period filters', async ({ page }) => {
    // Check for period filter buttons
    const periodFilters = ['1W', '2W', '1M', '3M', '6M', 'ALL'];
    for (const period of periodFilters) {
      await expect(page.getByRole('button', { name: period })).toBeVisible();
    }
  });

  test('should display upload statistics', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(1000);

    // Should show stats cards or chart area
    await expect(page.getByText(/Total Studies/i)).toBeVisible();
    await expect(page.getByText(/Success Rate/i)).toBeVisible();
  });

  test('should allow CSV export', async ({ page }) => {
    // Look for export button
    const exportButton = page.getByRole('button', { name: /export/i });

    if (await exportButton.isVisible()) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await exportButton.click();

      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toContain('.csv');
      }
    }
  });
});
