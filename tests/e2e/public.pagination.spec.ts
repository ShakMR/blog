import { expect, test } from '@playwright/test';

test('the stories feed handles out-of-range pages with a way back', async ({ page }) => {
  await page.goto('/stories');
  await expect(page.locator('.story-card').first()).toBeVisible();

  // A page beyond the last renders the empty state plus a "previous" control.
  await page.goto('/stories?page=99');
  const pagination = page.locator('.pagination');
  await expect(pagination).toBeVisible();
  await expect(pagination.locator('a[rel="prev"]')).toBeVisible();
});
