import { test, expect } from '@playwright/test';

test('diagnostic: visit login directly', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const content = await page.content();
  console.log('Page content length:', content.length);

  const is404 = await page.getByText(/404|not found|unexpected application error/i).isVisible();
  console.log('Is 404 visible?', is404);

  if (is404) {
    console.log('Full content of 404 page:', await page.locator('body').innerText());
  } else {
    await expect(page.getByRole('heading', { name: /gateway|sign in/i })).toBeVisible();
  }
});
