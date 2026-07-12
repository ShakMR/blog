import { expect, test } from '@playwright/test';

const STORY_SLUG = process.env.E2E_STORY_SLUG ?? 'e2e-welcome';
const DRAFT_SLUG = process.env.E2E_DRAFT_SLUG ?? 'e2e-draft';
const DRAFT_TOKEN = process.env.E2E_DRAFT_TOKEN ?? '00000000-0000-4000-8000-000000000001';
const NOINDEX_SLUG = process.env.E2E_NOINDEX_SLUG ?? 'e2e-noindex';

test('robots.txt disallows private areas and points to the sitemap', async ({ request, baseURL }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('Disallow: /draft');
  expect(body).toContain('Disallow: /author');
  expect(body).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
});

test('sitemap lists published stories but not drafts or private areas', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('xml');
  const xml = await res.text();

  expect(xml).toContain(`/stories/${STORY_SLUG}`);
  expect(xml).not.toContain(`/stories/${DRAFT_SLUG}`);
  expect(xml).not.toContain('/draft/');
  expect(xml).not.toContain('/author/stories');
});

test('a published story exposes canonical + OpenGraph metadata', async ({ page }) => {
  await page.goto(`/stories/${STORY_SLUG}`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    new RegExp(`/stories/${STORY_SLUG}$`),
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /E2E Welcome Story/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
});

test('a draft is not publicly readable (404 for anonymous visitors)', async ({ request }) => {
  const res = await request.get(`/draft/${DRAFT_TOKEN}`);
  expect(res.status()).toBe(404);
});

test('an opted-out published story is reachable but noindex + AI-blocked', async ({ page, request }) => {
  // Still publicly reachable...
  const res = await request.get(`/stories/${NOINDEX_SLUG}`);
  expect(res.status()).toBe(200);
  expect(res.headers()['x-robots-tag']).toContain('noindex');

  // ...but marked noindex with AI opt-out tokens.
  await page.goto(`/stories/${NOINDEX_SLUG}`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noai/);

  // Excluded from the sitemap and disallowed for AI crawlers in robots.txt.
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).not.toContain(`/stories/${NOINDEX_SLUG}`);

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('User-agent: GPTBot');
  expect(robots).toContain(`Disallow: /stories/${NOINDEX_SLUG}`);
});
