import { expect, test } from '@playwright/test';

test('an author can publish a story opted out of search indexing', async ({ page }) => {
  const title = `E2E NoIndex ${Date.now()}`;

  await page.goto('/author/stories/new');
  await page.locator('input[name="title"]').fill(title);

  const editor = page.locator('.ProseMirror');
  await editor.click();
  await editor.pressSequentially('Body of a story kept out of search engines.');

  // Uncheck "allow search engines to index this story".
  await page.locator('input[name="indexable"][type="checkbox"]').uncheck();
  await page.locator('select[name="status"]').selectOption('published');
  await page.locator('#story-form button[type="submit"]').click();
  await page.waitForURL(/\/author\/stories/);

  // The published story renders noindex.
  await page.goto('/stories');
  await page.locator('.story-card', { hasText: title }).locator('.title-link').click();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
