import { test, expect, Page } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

test.describe('Report Handling Workflow', () => {
  let page: Page;
  const API_URL = 'http://localhost:8003';

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Capture console logs
    page.on('console', (msg) => {
      console.log(`BROWSER LOG [${msg.type()}]: ${msg.text()}`);
    });

    // Mock ALL API calls to localhost:8003
    await page.route(`${API_URL}/**`, async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      const corsHeaders = {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'access-control-allow-headers': 'Content-Type, Authorization',
      };

      if (method === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      console.log(`MOCK: Intercepting ${method} ${url.pathname}`);

      if (url.pathname.includes('/auth/login')) {
        await route.fulfill({
          status: 200,
          json: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
          headers: corsHeaders,
        });
        return;
      }

      if (url.pathname.includes('/notifications/stream')) {
        await route.fulfill({
          status: 500,
          body: 'SSE Mock Disabled',
          headers: corsHeaders,
        });
        return;
      }

      if (url.pathname.includes('/reports')) {
        if (url.pathname.includes('/download')) {
          await route.fulfill({
            status: 200,
            body: Buffer.from('mock pdf content'),
            contentType: 'application/pdf',
            headers: corsHeaders,
          });
          return;
        }

        const allReports = [
          {
            id: 'report-1',
            upload_id: 'upload-1',
            user_id: testUsers.validUser.username,
            study_instance_uid: '1.2.3.4.5.6.7.8.9.0',
            patient_name: 'John Doe',
            study_date: '2023-10-27',
            modality: 'CT',
            status: 'ready',
            report_url: `${API_URL}/reports/report-1/download`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            radiologist_name: 'Dr. Smith',
          },
          {
            id: 'report-2',
            upload_id: 'upload-2',
            user_id: testUsers.validUser.username,
            study_instance_uid: '9.8.7.6.5.4.3.2.1.0',
            patient_name: 'Jane Smith',
            study_date: '2023-10-26',
            modality: 'MR',
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            radiologist_name: 'Dr. Jones',
          },
        ];

        const status = url.searchParams.get('status');
        const filteredReports = status ? allReports.filter((r) => r.status === status) : allReports;

        console.log(
          `MOCK: Returning ${filteredReports.length} reports for status=${status || 'all'}`,
        );

        await route.fulfill({
          status: 200,
          json: { reports: filteredReports, total: filteredReports.length },
          headers: corsHeaders,
        });
        return;
      }

      if (url.pathname.includes('/notifications')) {
        await route.fulfill({
          status: 200,
          json: { notifications: [], unread_count: 0, total: 0 },
          headers: corsHeaders,
        });
        return;
      }

      await route.continue();
    });

    // Perform Login
    await page.goto('/login');
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/security key/i).fill(testUsers.validUser.password);
    await page.getByRole('button', { name: /Sign In to Gateway/i }).click();
    await expect(page).toHaveURL('/', { timeout: 15000 });
  });

  test('should display reports and filter by status', async () => {
    // Navigate to Reports page
    await page.getByRole('button', { name: /reports/i }).click();

    // Ensure the page is loaded
    await page.addStyleTag({ content: 'body, #root { height: 1000px !important; }' });
    await expect(page.getByRole('heading', { name: /my reports/i })).toBeVisible({
      timeout: 15000,
    });

    // Verify reports are rendered
    await expect(page.getByText('John Doe')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Jane Smith')).toBeVisible();

    // Test filtering
    await page.getByRole('button', { name: 'Ready', exact: true }).click();
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).not.toBeVisible();

    // Test filtering back to Pending
    await page.getByRole('button', { name: 'Pending', exact: true }).click();
    await expect(page.getByText('John Doe')).not.toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
  });

  test('should allow downloading a ready report', async () => {
    await page.getByRole('button', { name: /reports/i }).click();
    await page.addStyleTag({ content: 'body, #root { height: 1000px !important; }' });

    await expect(page.getByText('John Doe')).toBeVisible({ timeout: 15000 });
    const card = page.locator('div').filter({ hasText: 'John Doe' }).first();
    const downloadButton = card.getByRole('button', { name: /download/i });

    await expect(downloadButton).toBeEnabled();
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('report');
  });
});
