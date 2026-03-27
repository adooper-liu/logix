import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/LogiX/);
});

test('navigation works', async ({ page }) => {
  await page.goto('/');
  // Check if main navigation exists
  await expect(page.locator('header')).toBeVisible();
});
