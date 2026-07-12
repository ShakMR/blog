import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const AUTHED_PAGES = ['/author', '/author/stories/new'];
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

for (const path of AUTHED_PAGES) {
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
