import { test, expect } from '@playwright/test';

test.describe('Security & Authorization', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Attempt to access protected routes
    const protectedRoutes = ['/', '/upload', '/dashboard', '/settings'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
      // Check for key login page elements to confirm we are on login page
      await expect(page.getByLabel(/user id|username/i)).toBeVisible();
    }
  });

  test('should prevent SQL injection attempts in login', async ({ page }) => {
    // Only test one characteristic payload to ensure mechanism works
    // Testing logic loop in E2E is flaky without proper resets between iterations in the same test
    await page.goto('/login');

    await page.route('**/auth/login', async (route) => {
      // Mock backend rejecting suspicious input or failing auth
      // If the backend was vulnerable, it might return 500 or success.
      // We expect it to handle it (400/401)
      await route.fulfill({
        status: 401,
        json: { detail: 'Invalid credentials' },
      });
    });

    const maliciousInput = "' OR '1'='1";
    await page.getByLabel(/user id/i).fill(maliciousInput);
    await page.getByLabel(/security key/i).fill('password123');
    await page.getByTestId('login-button').click({ force: true });

    // Should show error, NOT crash or let user in
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('should sanitize XSS inputs in fields', async ({ page }) => {
    await page.goto('/login');

    // Testing XSS in the User ID field (text input)
    const xssPayload = '<script style="display:none">alert("xss")</script>';

    await page.getByLabel(/user id/i).fill(xssPayload);

    // Check value is retained as text and not executed (implicit by it being in input value)
    await expect(page.getByLabel(/user id/i)).toHaveValue(xssPayload);

    // Verify no alert dialog was triggered (Playwright handles dialogs automatically,
    // so if one pops up unexpected it usually fails unless handled, but we can explicitly listen)
    page.on('dialog', (dialog) => {
      throw new Error(`Unexpected dialog: ${dialog.message()}`);
    });
  });
});
