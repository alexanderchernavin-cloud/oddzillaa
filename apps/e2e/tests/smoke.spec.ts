import { test, expect } from './fixtures';

test.describe('Smoke tests', () => {
  test('home page loads and shows Oddzilla branding', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Oddzilla')).toBeVisible({ timeout: 15000 });
  });

  test('navigation links are present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Oddzilla' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('a[href="/login"]')).toBeVisible({ timeout: 15000 });
  });

  test('health endpoint responds', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
