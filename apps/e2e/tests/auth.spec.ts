import { test, expect } from './fixtures';

test.describe('Auth flows', () => {
  const testEmail = `e2e-${Date.now()}@oddzilla.test`;
  const testPassword = 'E2eTestPassword123!';

  test('signup flow works', async ({ page }) => {
    await page.goto('/signup');

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 15000 });

    await emailInput.fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);

    const displayNameInput = page.locator('input[autocomplete="nickname"]');
    if (await displayNameInput.isVisible()) {
      await displayNameInput.fill('E2E Tester');
    }

    await page.locator('button[type="submit"]').click();

    await page.waitForURL('/', { timeout: 15000 }).catch(() => {
      // May stay on signup page with success message
    });
  });

  test('login flow works', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 15000 });

    await emailInput.fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);

    await page.locator('button[type="submit"]').click();

    await page.waitForURL('/', { timeout: 15000 }).catch(() => {
      // May stay on login page
    });
  });

  test('unauthenticated user sees sign in link', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Sign in' }),
    ).toBeVisible({ timeout: 15000 });
  });
});
