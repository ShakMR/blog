import { expect, test } from '@playwright/test';

test('unknown routes render a localized, noindex 404 page', async ({ page }) => {
  const res = await page.goto('/this-route-does-not-exist-xyz');

  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: /no encontrada|not found|no trobada/i })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page.getByRole('link', { name: /inicio|home|inici/i })).toBeVisible();
});
