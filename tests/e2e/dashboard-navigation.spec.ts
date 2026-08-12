import { expect, test, type Page } from '@playwright/test';

const SUPABASE_ORIGIN = 'https://lwnsdsncmlsroiswgoga.supabase.co';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

function base64Url(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

const fakeJwt = [
  base64Url({ alg: 'none', typ: 'JWT' }),
  base64Url({ aud: 'authenticated', role: 'authenticated', sub: TEST_USER_ID, email: 'e2e@example.test', exp: Math.floor(Date.now() / 1000) + 3600 }),
  'e2e-signature',
].join('.');

const fakeSession = {
  access_token: fakeJwt,
  refresh_token: 'e2e-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: { id: TEST_USER_ID, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.test', user_metadata: {}, app_metadata: {} },
};

async function mockAuthenticatedApp(page: Page) {
  // Supabase JS v2 persists sessions under `sb-<project-ref>-auth-token`.
  // Seed the exact key used by createClient so AuthContext receives a real session
  // during E2E without touching production auth data.
  await page.addInitScript(({ session }) => {
    localStorage.setItem('sb-lwnsdsncmlsroiswgoga-auth-token', JSON.stringify(session));
  }, { session: fakeSession });

  await page.route(`${SUPABASE_ORIGIN}/auth/v1/**`, async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeSession.user),
      });
      return;
    }
    if (url.includes('/auth/v1/token')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeSession),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/users**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: TEST_USER_ID, email: 'e2e@example.test', full_name: 'E2E Admin', role: 'super_admin', is_active: true, branch_id: null, created_at: new Date().toISOString() }]) });
  });
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route(`${SUPABASE_ORIGIN}/rpc/**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

test.describe('dashboard and navigation actions', () => {
  test.beforeEach(async ({ page }) => { await mockAuthenticatedApp(page); });

  test('dashboard renders the application shell without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await page.goto('/#/dashboard');
    await expect(page.locator('a[href="#/dashboard"]').first()).toBeVisible();
    await expect(page.locator('a[href="#/pos"]').first()).toBeVisible();
    await expect(page.locator('a[href="#/inventory"]').first()).toBeVisible();
    await expect(page.locator('a[href="#/reports"]').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign out|تسجيل الخروج/i })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('top navigation actions keep stable route targets', async ({ page }) => {
    await page.goto('/#/dashboard');
    const cases = [
      { selector: 'a[href="#/branches"]', route: /#\/branches$/ },
      { selector: 'a[href="#/inventory"]', route: /#\/inventory$/ },
      { selector: 'a[href="#/pos"]', route: /#\/pos$/ },
    ];
    for (const item of cases) {
      await page.locator(item.selector).first().click();
      await expect(page).toHaveURL(item.route);
      await page.goto('/#/dashboard');
    }
  });

  test('header actions are real actions, not placeholders', async ({ page }) => {
    await page.goto('/#/dashboard');
    await page.getByRole('button', { name: /Active orders|الطلبات النشطة/i }).click();
    await expect(page).toHaveURL(/#\/floor-plan$/);
    await page.goto('/#/dashboard');
    await page.getByRole('button', { name: /Toggle theme|تغيير المظهر/i }).click();
    await expect(page.locator('html')).toHaveAttribute('class', /dark/);
    await page.goto('/#/dashboard');
    await page.getByRole('button', { name: /Sign out|تسجيل الخروج/i }).click();
    await expect(page).toHaveURL(/#\/login$/);
  });
});
