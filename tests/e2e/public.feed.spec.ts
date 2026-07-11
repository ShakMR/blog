import { expect, test } from '@playwright/test';

const STORY_SLUG = process.env.E2E_STORY_SLUG ?? 'e2e-welcome';

test('the stories feed lists cards and a card opens the story', async ({ page }) => {
  await page.goto('/stories');

  const cards = page.locator('.story-card');
  await expect(cards.first()).toBeVisible();

  const seededCard = page.locator(`.story-card:has(a[href="/stories/${STORY_SLUG}"])`);
  await expect(seededCard).toBeVisible();

  // The whole card is a single click target via the stretched title link.
  await seededCard.locator('.title-link').click();
  await expect(page).toHaveURL(new RegExp(`/stories/${STORY_SLUG}$`));
  await expect(page.getByRole('heading', { name: 'E2E Welcome Story' })).toBeVisible();
});
