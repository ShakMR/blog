import { expect, test as setup } from '@playwright/test';

const AUTH_FILE = 'tests/e2e/.auth/author.json';
const email = process.env.E2E_AUTHOR_EMAIL ?? 'e2e-author@example.test';
const password = process.env.E2E_AUTHOR_PASSWORD ?? 'E2ePassword123!';

setup('authenticate as the seeded author', async ({ page }) => {
  await page.goto('/auth/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('.login-form button[type="submit"]').click();

  // Successful login redirects into the protected author area.
  await page.waitForURL(/\/author(\/|$|\?)/);
  await expect(page).toHaveURL(/\/author/);

  await page.context().storageState({ path: AUTH_FILE });
});
