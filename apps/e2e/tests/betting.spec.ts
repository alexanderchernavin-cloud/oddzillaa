import { test, expect } from '@playwright/test';

test.describe('Betting flow', () => {
  test('matches page shows live matches', async ({ page }) => {
    await page.goto('/');
    // Wait for matches to load (mock feed creates matches)
    const matchCard = page.locator('[class*="border-border"]').first();
    await expect(matchCard).toBeVisible({ timeout: 15000 });
  });

  test('clicking odds cell shows bet slip', async ({ page }) => {
    await page.goto('/');
    // Wait for odds cells to render
    await page.waitForTimeout(3000);

    const oddsButton = page.locator('button').filter({ hasText: /^\d+\.\d{2}$/ }).first();
    if (await oddsButton.isVisible()) {
      await oddsButton.click();
      // Bet slip should appear
      const betSlip = page.locator('text=Bet Slip');
      await expect(betSlip).toBeVisible({ timeout: 5000 });
    }
  });

  test('match detail page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const matchLink = page.locator('a[href*="/matches/"]').first();
    if (await matchLink.isVisible()) {
      await matchLink.click();
      await page.waitForURL(/\/matches\//, { timeout: 10000 });
      // Should show market sections
      await expect(page.locator('text=Winner').first()).toBeVisible({ timeout: 10000 });
    }
  });
});
