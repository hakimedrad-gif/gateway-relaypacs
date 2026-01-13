import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /relaypacs/i })).toBeVisible();
    await expect(page.getByLabel(/user id/i)).toBeVisible();
    await expect(page.getByLabel(/security key/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/user id/i).fill('invaliduser');
    await page.getByLabel(/security key/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/invalid username or password/i)).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/security key/i).fill(testUsers.validUser.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should redirect to home/upload page
    await expect(page).toHaveURL('/');
    await expect(page.getByText(/upload/i).first()).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByLabel(/security key/i);
    const toggleButton = page.locator('button[type="button"]').filter({ has: page.locator('svg') });
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle button
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click again to hide
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should switch between login and register modes', async ({ page }) => {
    // Start in login mode
    await expect(page.getByRole('button', { name: /sign in to gateway/i })).toBeVisible();
    
    // Switch to register mode
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByLabel(/clinical email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create secure account/i })).toBeVisible();
    
    // Switch back to login mode
    await page.getByRole('button', { name: /sign in/i }).first().click();
    await expect(page.getByLabel(/clinical email/i)).not.toBeVisible();
  });
});
