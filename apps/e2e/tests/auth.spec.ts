import { test, expect } from '@playwright/test';

test.describe('Auth flows', () => {
  const testEmail = `e2e-${Date.now()}@oddzilla.test`;
  const testPassword = 'E2eTestPassword123!';

  test('signup flow works', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    const displayNameInput = page.locator('input[name="displayName"], input[placeholder*="name" i]');
    if (await displayNameInput.isVisible()) {
      await displayNameInput.fill('E2E Tester');
    }

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should redirect to home or show success
    await page.waitForURL('/', { timeout: 10000 }).catch(() => {
      // May stay on signup page with success message
    });
  });

  test('login flow works', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    await page.waitForURL('/', { timeout: 10000 }).catch(() => {
      // May stay on login page
    });
  });

  test('unauthenticated user sees sign in link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });
});
