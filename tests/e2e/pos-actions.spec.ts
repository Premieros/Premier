import { expect, test, type Page } from '@playwright/test';

const SUPABASE_ORIGIN = 'https://lwnsdsncmlsroiswgoga.supabase.co';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const BRANCH_ID = '00000000-0000-0000-0000-000000000010';
const PRODUCT_ID = '00000000-0000-0000-0000-000000000020';
const WAREHOUSE_ID = '00000000-0000-0000-0000-000000000030';

const fakeUser = { id: TEST_USER_ID, email: 'e2e@example.test', full_name: 'E2E Admin', role: 'super_admin', is_active: true, branch_id: BRANCH_ID, created_at: new Date().toISOString() };
const product = { id: PRODUCT_ID, branch_id: BRANCH_ID, name: 'E2E Burger', name_en: 'E2E Burger', sku: 'E2E-001', barcode: '628000000020', sale_price: 100, product_type: 'simple', category_id: null, is_active: true, low_stock_threshold: 5 };

function base64Url(value: unknown) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function makeSession() {
  const accessToken = [base64Url({ alg: 'none', typ: 'JWT' }), base64Url({ aud: 'authenticated', role: 'authenticated', sub: TEST_USER_ID, email: fakeUser.email, exp: Math.floor(Date.now() / 1000) + 3600 }), 'e2e-signature'].join('.');
  return { access_token: accessToken, refresh_token: 'e2e-refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: { id: TEST_USER_ID, aud: 'authenticated', role: 'authenticated', email: fakeUser.email, user_metadata: {}, app_metadata: {} } };
}

async function mockPosBackend(page: Page) {
  const session = makeSession();
  await page.route(`${SUPABASE_ORIGIN}/auth/v1/**`, async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session.user) });
    if (url.includes('/auth/v1/token')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/users**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([fakeUser]) }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/products**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([product]) }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/customers**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/categories**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/branches**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: BRANCH_ID, name: 'E2E Branch', name_en: 'E2E Branch', is_active: true }]) }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/settings**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ currency: 'EGP', tax_enabled: false, tax_rate: 0 }) }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/warehouses**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: WAREHOUSE_ID, branch_id: BRANCH_ID, is_active: true }]) }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/inventory**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ product_id: PRODUCT_ID, quantity: 20 }]) }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/product_components**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/dining_tables**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/orders**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/order_items**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/order_kitchen_sends**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/kitchen_sends**`, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${SUPABASE_ORIGIN}/rest/v1/rpc/**`, async (r) => {
    const name = new URL(r.request().url()).pathname.split('/').pop();
    if (name === 'get_login_email') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, email: fakeUser.email }) });
    if (name === 'record_login_success' || name === 'record_login_failure') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    if (name === 'get_active_shift') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, open: false }) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, id: 'e2e-order-id', order_id: 'e2e-order-id', order_number: 'E2E-001' }) });
  });
}

async function login(page: Page) {
  await page.goto('/#/login');
  await page.locator('#login-username').fill('e2e-admin');
  await page.locator('#login-pin').fill('1234');
  await page.locator('form').getByRole('button', { name: /دخول|تسجيل الدخول|Sign in/i }).click();
  await expect(page).toHaveURL(/#\/dashboard$/);
}

test.describe('POS action-level', () => {
  test.beforeEach(async ({ page }) => {
    await mockPosBackend(page);
    await login(page);
    const posLink = page.getByRole('link', { name: /نقطة البيع|POS/i }).first();
    await expect(posLink).toBeVisible({ timeout: 10000 });
    await posLink.click();
    await expect(page).toHaveURL(/#\/pos$/);
    await expect(page.getByTestId('pos-order-type-picker')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('body')).not.toHaveText(/Error Loading Data|خطأ في تحميل البيانات/i);
  });

  test('starts quick pickup, adds product, changes quantity, and opens payment', async ({ page }) => {
    await page.getByTestId('pos-order-type-takeaway').click();
    await expect(page.getByText('E2E Burger', { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /E2E Burger/i }).click();
    await expect(page.getByText('100.00 ج.م', { exact: true }).first()).toBeVisible();
    const quantity = page.getByTestId(`pos-cart-qty-${PRODUCT_ID}`);
    const increase = page.getByTestId(`pos-cart-qty-increase-${PRODUCT_ID}`);
    await expect(quantity).toHaveText('1');
    await increase.click();
    await expect(quantity).toHaveText('2');
    const pay = page.getByRole('button', { name: /الدفع|Pay/i }).first();
    await expect(pay).toBeEnabled();
    await pay.click();
    await expect(page.getByTestId('pos-payment-confirm')).toBeVisible();
    await expect(page.getByTestId('pos-payment-method-cash')).toBeVisible();
  });

  test('order-type actions expose supported flows and back navigation', async ({ page }) => {
    await expect(page.getByTestId('pos-order-type-dine_in')).toBeVisible();
    await expect(page.getByTestId('pos-order-type-drive_thru')).toBeVisible();
    await expect(page.getByTestId('pos-order-type-delivery')).toBeVisible();
    await expect(page.getByTestId('pos-order-type-takeaway')).toBeVisible();
    await page.getByTestId('pos-order-type-drive_thru').click();
    await expect(page.getByText(/أدخل رقم اللوحة لبدء الطلب|Enter the plate to start/i)).toBeVisible();
    await expect(page.locator('input').first()).toBeVisible();
    await page.getByRole('button', { name: /رجوع|Back/i }).click();
    await expect(page.getByTestId('pos-order-type-picker')).toBeVisible();
  });
});
