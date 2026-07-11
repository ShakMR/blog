import { expect, test } from '@playwright/test';

const DRAFT_TOKEN = process.env.E2E_DRAFT_TOKEN ?? '00000000-0000-4000-8000-000000000001';

test('the owning author can preview their draft, and it is noindex', async ({ page }) => {
  await page.goto(`/draft/${DRAFT_TOKEN}`);

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page.getByText('E2E Draft Story')).toBeVisible();
});
