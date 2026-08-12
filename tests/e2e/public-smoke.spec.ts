import { expect, test } from '@playwright/test';

const protectedRoutes = [
  '/dashboard',
  '/pos',
  '/floor-plan',
  '/products',
  '/inventory',
  '/warehouses',
  '/raw-materials',
  '/recipes',
  '/production',
  '/transfers',
  '/inventory-ledger',
  '/branches',
  '/purchases',
  '/customers',
  '/suppliers',
  '/expenses',
  '/sales',
  '/shifts',
  '/reports',
  '/financial-reports',
  '/accounts',
  '/payments',
  '/journal',
  '/treasury',
  '/reconciliation',
  '/users',
  '/audit-log',
  '/settings',
  '/settings/basic',
  '/system-health',
  '/subscriptions',
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
    await expect(page.getByRole('button', { name: /تسجيل الدخول|Sign in/i })).toBeVisible();

    await page.getByRole('button', { name: /English|العربية/i }).click();
    await expect(page.getByRole('heading', { name: /Welcome back|مرحباً بك/i })).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('login validation blocks invalid PIN without network navigation', async ({ page }) => {
    await page.goto('/#/login');
    await page.getByLabel(/اسم المستخدم|username/i).fill('smoke-test');
    await page.getByLabel(/PIN|الرمز السري/i).fill('12');
    await page.getByRole('button', { name: /تسجيل الدخول|Sign in/i }).click();

    await expect(page).toHaveURL(/#\/login$/);
    await expect(page.getByText(/4|أربع|four/i).first()).toBeVisible();
  });

  for (const route of protectedRoutes) {
    test(`protected route ${route} redirects unauthenticated users to login`, async ({ page }) => {
      await page.goto(`/#${route}`);
      await expect(page).toHaveURL(/#\/login$/);
      await expect(page.getByRole('heading', { name: /مرحباً بك|Welcome back/i })).toBeVisible();
    });
  }
});
