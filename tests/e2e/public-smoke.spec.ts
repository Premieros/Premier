import { expect, test } from '@playwright/test';

const protectedRoutes = [
  '/dashboard', '/pos', '/floor-plan', '/kitchen', '/tables', '/products', '/inventory',
  '/warehouses', '/raw-materials', '/recipes', '/production', '/transfers', '/inventory-ledger',
  '/branches', '/purchases', '/customers', '/suppliers', '/expenses', '/sales', '/shifts',
  '/reports', '/financial-reports', '/accounting', '/accounts', '/payments', '/journal',
  '/treasury', '/reconciliation', '/users', '/employees', '/audit-log', '/settings',
  '/settings/basic', '/system-health', '/subscription', '/subscriptions',
];

test.describe('public application smoke', () => {
  test('login page renders without browser console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/#/login');
    await expect(page.getByRole('heading', { name: /مرحباً بك|Welcome back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /English|العربية/i })).toBeVisible();
    await expect(page.locator('form button[type="submit"]')).toBeVisible();

    await page.getByRole('button', { name: /English|العربية/i }).click();
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    await expect(page.locator('form button[type="submit"]')).toHaveText(/Sign in/i);

    expect(consoleErrors).toEqual([]);
  });

  test('login validation blocks invalid PIN without leaving login', async ({ page }) => {
    await page.goto('/#/login');
    await page.locator('#login-username').fill('smoke-test');
    await page.locator('#login-pin').fill('12');
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/#\/login$/);
    await expect(page.getByText(/4|أربع|four/i).first()).toBeVisible();
    await expect(page.locator('form button[type="submit"]')).toBeEnabled();
  });

  for (const route of protectedRoutes) {
    test(`protected route ${route} redirects unauthenticated users to login`, async ({ page }) => {
      await page.goto(`/#${route}`);
      await expect(page).toHaveURL(/#\/login$/);
      await expect(page.getByRole('heading', { name: /مرحباً بك|Welcome back/i })).toBeVisible();
    });
  }
});
