import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const STORY_SLUG = process.env.E2E_STORY_SLUG ?? 'e2e-welcome';
const AUTHOR_SLUG = process.env.E2E_AUTHOR_SLUG ?? 'e2e-author';

const PUBLIC_PAGES = [
  '/',
  '/stories',
  `/stories/${STORY_SLUG}`,
  '/authors',
  `/authors/${AUTHOR_SLUG}`,
  '/about',
  '/auth/login',
];

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

for (const path of PUBLIC_PAGES) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    const detail = JSON.stringify(
      serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) })),
      null,
      2,
    );
    expect(serious, detail).toEqual([]);
  });
}

test('the skip link is the first tab stop and targets main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');

  const skipLink = page.locator('.skip-link');
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveAttribute('href', '#main-content');
});
