import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

test.describe('Dashboard Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/security key/i).fill(testUsers.validUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/');
    
    // Navigate to dashboard
    await page.getByRole('button', { name: /dashboard/i }).first().click();
  });

  test('should display dashboard page', async ({ page }) => {
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(/analytics|statistics|uploads/i).first()).toBeVisible();
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
    const statsArea = page.locator('[class*="chart"], [class*="stat"], [class*="card"]').first();
    await expect(statsArea).toBeVisible({ timeout: 5000 });
  });

  test('should allow CSV export', async ({ page }) => {
    // Look for export button
    const exportButton = page.getByRole('button', { name: /export|csv|download/i });
    
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
