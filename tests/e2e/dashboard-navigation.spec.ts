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

const fakeUser = {
  id: TEST_USER_ID,
  email: 'e2e@example.test',
  full_name: 'E2E Admin',
  role: 'super_admin',
  is_active: true,
  branch_id: null,
  created_at: new Date().toISOString(),
};

async function mockAuthenticatedApp(page: Page) {
  await page.addInitScript(({ session }) => {
    localStorage.setItem('sb-lwnsdsncmlsroiswgoga-auth-token', JSON.stringify(session));
  }, { session: fakeSession });

  await page.route(`${SUPABASE_ORIGIN}/auth/v1/**`, async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/user')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession.user) });
      return;
    }
    if (url.includes('/auth/v1/token')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  // Use a regex because Supabase adds query parameters to the REST URL.
  await page.route(new RegExp(`${SUPABASE_ORIGIN.replace('.', '\\.')}/rest/v1/users(?:\\?.*)?$`), async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([fakeUser]) });
      return;
    }
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([fakeUser]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([fakeUser]) });
  });

  await page.route(new RegExp(`${SUPABASE_ORIGIN.replace('.', '\\.')}/rest/v1/roles(?:\\?.*)?$`), async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route(`${SUPABASE_ORIGIN}/rpc/**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

async function clickVisibleText(page: Page, pattern: RegExp) {
  const target = page.getByText(pattern).first();
  await expect(target).toBeVisible();
  await target.click();
}

test.describe('dashboard and navigation actions', () => {
  test.beforeEach(async ({ page }) => { await mockAuthenticatedApp(page); });

  test('dashboard renders the application shell without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await page.goto('/#/dashboard');
    await expect(page.getByText(/لوحة التحكم|Dashboard/i).first()).toBeVisible();
    await expect(page.getByText(/نقطة البيع|POS/i).first()).toBeVisible();
    await expect(page.getByText(/المخزون|Inventory/i).first()).toBeVisible();
    await expect(page.getByText(/التقارير|Reports/i).first()).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('top navigation actions keep stable route targets', async ({ page }) => {
    await page.goto('/#/dashboard');
    const cases = [
      { label: /الفروع|Branches/i, route: /#\/branches$/ },
      { label: /المخزون|Inventory/i, route: /#\/inventory$/ },
      { label: /نقطة البيع|POS/i, route: /#\/pos$/ },
    ];
    for (const item of cases) {
      await clickVisibleText(page, item.label);
      await expect(page).toHaveURL(item.route);
      await page.goto('/#/dashboard');
    }
  });

  test('header actions are real actions, not placeholders', async ({ page }) => {
    await page.goto('/#/dashboard');
    await clickVisibleText(page, /الطلبات النشطة|Active orders/i);
    await expect(page).toHaveURL(/#\/floor-plan$/);
    await page.goto('/#/dashboard');

    const themeButton = page.getByRole('button', { name: /تغيير المظهر|Toggle theme|Dark mode|Light mode/i }).first();
    await expect(themeButton).toBeVisible();
    await themeButton.click();
    await expect(page.locator('html')).toHaveAttribute('class', /dark/);

    await page.goto('/#/dashboard');
    const signOut = page.getByRole('button', { name: /تسجيل الخروج|Sign out/i }).first();
    await expect(signOut).toBeVisible();
    await signOut.click();
    await expect(page).toHaveURL(/#\/login$/);
  });
});
