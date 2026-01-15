import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

/**
 * E2E tests for Two-Factor Authentication (2FA).
 */

test.describe('Two-Factor Authentication Flow', () => {
  test('should setup 2FA in settings and then login with it', async ({ page }) => {
    // Mock login
    await page.route('**/auth/login', async (route) => {
      await route.fulfill({ json: { access_token: 'tk' } });
    });

    // Mock 2FA Setup
    await page.route('**/2fa/setup', async (route) => {
      await route.fulfill({
        json: {
          secret: 'MOCK_SECRET',
          qr_code:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          provisioning_uri: 'otpauth://totp/RelayPACS:testuser?secret=MOCK_SECRET',
        },
      });
    });

    // Mock 2FA Enable
    await page.route('**/2fa/enable', async (route) => {
      await route.fulfill({ json: { success: true, enabled: true } });
    });

    // 1. Log in
    await page.goto('/login');
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/security key/i).fill(testUsers.validUser.password);
    await page.getByRole('button', { name: 'Sign In to Gateway' }).click();
    await expect(page).toHaveURL('/');

    // 2. Go to Settings and Enable 2FA
    await page.goto('/settings');
    await page.getByRole('button', { name: /enable 2fa/i }).click();

    // Check QR Code
    await expect(page.getByAltText('2FA QR Code')).toBeVisible();

    // Enter verification code
    await page.getByPlaceholder('000 000').fill('123456');
    await page.getByRole('button', { name: /verify & enable/i }).click();

    // Verify Success notification
    await expect(page.getByText(/Two-Factor Authentication enabled/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /disable 2fa/i })).toBeVisible();
  });

  test('should handle login challenge for a user with 2FA enabled', async ({ page }) => {
    // Stage 1: Initial login attempt returns 403 with x-totp-required
    let loginCallCount = 0;
    await page.route('**/auth/login', async (route) => {
      loginCallCount++;
      const body = route.request().postDataJSON();

      if (!body.totp_code && loginCallCount === 1) {
        await route.fulfill({
          status: 403,
          headers: {
            'x-totp-required': 'true',
            'X-TOTP-Required': 'true',
            'access-control-expose-headers': 'x-totp-required',
          },
          json: { detail: '2FA required' },
        });
      } else if (body.totp_code === '123456') {
        await route.fulfill({ json: { access_token: 'logged-in-token' } });
      } else {
        await route.fulfill({ status: 401, json: { detail: 'Invalid code' } });
      }
    });

    await page.goto('/login');
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/security key/i).fill(testUsers.validUser.password);
    await page.getByRole('button', { name: 'Sign In to Gateway' }).click();

    // Verify 2FA challenge UI
    await expect(page.getByText(/authentication code/i)).toBeVisible();
    const totpInput = page.locator('input[placeholder="000000"]');
    await expect(totpInput).toBeVisible();

    // Attempt invalid code
    await totpInput.fill('000000');
    await page.getByRole('button', { name: /verify & sign in/i }).click();
    await expect(page.getByText(/invalid credentials or authentication code/i)).toBeVisible();

    // Enter valid code
    await totpInput.fill('123456');
    await page.getByRole('button', { name: /verify & sign in/i }).click();

    await expect(page).toHaveURL('/');
  });
});
