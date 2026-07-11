import { expect, test } from '@playwright/test';

const STORY_SLUG = process.env.E2E_STORY_SLUG ?? 'e2e-welcome';

test('sending kudos marks the button as sent', async ({ page }) => {
  await page.goto(`/stories/${STORY_SLUG}`);

  const button = page.locator('[data-kudos-button]');
  await expect(button).toBeVisible();

  await button.click();

  // Progressive-enhancement JS posts the kudos and flips the button state.
  await expect(button).toHaveClass(/sent/);
  await expect(page.locator('[data-kudos-count]')).toBeVisible();
});
