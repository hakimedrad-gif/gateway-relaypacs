import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

/**
 * E2E tests for user registration.
 */

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Registration API
    await page.route('**/auth/register', async (route) => {
      const body = route.request().postDataJSON();
      if (body.username === testUsers.validUser.username) {
        await route.fulfill({
          status: 400,
          json: { detail: 'Username already exists' },
        });
      } else {
        await route.fulfill({
          json: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
        });
      }
    });

    await page.goto('/login');
    // Switch to register mode
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
  });

  test('should display registration form', async ({ page }) => {
    await expect(page.getByLabel(/user id/i)).toBeVisible();
    await expect(page.getByLabel(/clinical email/i)).toBeVisible();
    await expect(page.getByLabel(/security key/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Secure Account' })).toBeVisible();
  });

  test('should show error for duplicate username', async ({ page }) => {
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/clinical email/i).fill('new@example.com');
    await page.getByLabel(/security key/i).fill('Password123!');
    await page.getByRole('button', { name: 'Create Secure Account' }).click();

    // Should show error from mock
    await expect(page.getByText(/already exists/i)).toBeVisible();
  });

  test('should register new user successfully', async ({ page }) => {
    const newUser = testUsers.newUser;

    await page.getByLabel(/user id/i).fill(newUser.username);
    await page.getByLabel(/clinical email/i).fill(newUser.email);
    await page.getByLabel(/security key/i).fill(newUser.password);
    await page.getByRole('button', { name: 'Create Secure Account' }).click();

    // Should redirect to home page after successful registration
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});
