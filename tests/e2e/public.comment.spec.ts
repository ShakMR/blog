import { expect, test } from '@playwright/test';

const STORY_SLUG = process.env.E2E_STORY_SLUG ?? 'e2e-welcome';

test('an anonymous reader can post a valid comment', async ({ page }) => {
  await page.goto(`/stories/${STORY_SLUG}`);

  // Comments live behind a toggle; open the panel to reveal the form.
  await page.locator('[data-comments-trigger]').click();

  const body = `Loved this one — ${Date.now()}`;
  await page.locator('.comment-form input[name="authorName"]').fill('E2E Reader');
  await page.locator('.comment-form textarea[name="body"]').fill(body);
  await page.locator('.comment-form input[name="challengeAnswer"]').fill('5');

  // Anti-spam requires at least a few seconds between render and submit.
  await page.waitForTimeout(4500);
  await page.locator('.comment-form button[type="submit"]').click();

  await expect(page).toHaveURL(/comment_status=posted/);
  await expect(page.getByText(body)).toBeVisible();
});
