import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // Switch to register mode
    await page.getByRole('button', { name: /sign up/i }).click();
  });

  test('should display registration form', async ({ page }) => {
    await expect(page.getByLabel(/user id/i)).toBeVisible();
    await expect(page.getByLabel(/clinical email/i)).toBeVisible();
    await expect(page.getByLabel(/security key/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create secure account/i })).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: /create secure account/i }).click();
    
    // Form should not submit, fields should show validation
    await expect(page).toHaveURL('/login');
  });

  test('should show error for duplicate username', async ({ page }) => {
    // Try to register with existing username
    await page.getByLabel(/user id/i).fill(testUsers.validUser.username);
    await page.getByLabel(/clinical email/i).fill('new@example.com');
    await page.getByLabel(/security key/i).fill('Password123!');
    await page.getByRole('button', { name: /create secure account/i }).click();
    
    // Should show error
    await expect(page.getByText(/already exists|registration failed/i)).toBeVisible({ timeout: 5000 });
  });

  test('should register new user successfully', async ({ page }) => {
    const newUser = testUsers.newUser;
    
    await page.getByLabel(/user id/i).fill(newUser.username);
    await page.getByLabel(/clinical email/i).fill(newUser.email);
    await page.getByLabel(/security key/i).fill(newUser.password);
    await page.getByRole('button', { name: /create secure account/i }).click();
    
    // Should redirect to home page after successful registration
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});
