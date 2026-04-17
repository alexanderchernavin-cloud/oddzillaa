import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('home page loads and shows Oddzilla branding', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Oddzilla')).toBeVisible();
  });

  test('navigation links are present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/"]')).toBeVisible();
    await expect(page.locator('a[href="/history"]')).toBeVisible();
  });

  test('health endpoint responds', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
