import { expect, test } from '@playwright/test';

test('an author can create and publish a story that shows up in the feed', async ({ page }) => {
  const title = `E2E Published ${Date.now()}`;

  await page.goto('/author/stories/new');

  await page.locator('input[name="title"]').fill(title);
  await page.locator('input[name="subtitle"]').fill('Published from an end-to-end test');

  // Body is a Tiptap editor; typing into it syncs the hidden body inputs.
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await editor.pressSequentially('The body of an end-to-end published story.');

  await page.locator('select[name="status"]').selectOption('published');
  await page.locator('#story-form button[type="submit"]').click();

  // Save redirects back to the author's stories list.
  await page.waitForURL(/\/author\/stories/);

  // The freshly published story appears on the public feed.
  await page.goto('/stories');
  await expect(page.getByText(title)).toBeVisible();
});
