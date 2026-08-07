import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDbUrl, openDb } from './db';
import type pg from 'pg';

// Functional test for the floor-plan / open-order foundation (036-039).
//
// Runs inside a single BEGIN..ROLLBACK transaction; every row is discarded.
// Impersonation goes through the CI stub (auth.uid() reads app.user_id).
//
//   Run:  npm run test:integration
//   Skip: when no URL is configured

const dbUrl = getDbUrl();
const skip = !dbUrl;

describe.skipIf(skip)('floor plan + open orders (036-039)', () => {
  let client: pg.Client;
  const branchA = randomUUID();
  const branchB = randomUUID();
  const whA = randomUUID();
  const whB = randomUUID();
  const prodA = randomUUID();
  const prodB = randomUUID();
  const tableA = randomUUID();
  const tableB = randomUUID();
  const cashierA = randomUUID();
  const cashierB = randomUUID();

  async function asUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    await client.query(`SELECT set_config('app.user_id', $1, true)`, [userId]);
    await client.query(`SET LOCAL ROLE authenticated`);
    try {
      return await fn();
    } finally {
      await client.query('RESET ROLE').catch(() => {});
      await client.query('RESET app.user_id').catch(() => {});
    }
  }

  beforeAll(async () => {
    client = openDb(dbUrl!);
    await client.connect();
    await client.query('BEGIN');

    // The role-guard trigger reads auth.uid() and rejects inserts when the
    // caller is unknown; seeding runs as postgres, so disable it for the seed
    // (the guard is exercised implicitly by the RLS suite, not here).
    await client.query('ALTER TABLE public.users DISABLE TRIGGER trg_users_role_guard');

    const seedBranch = async (branchId: string, whId: string, prodId: string, tableId: string, cashierId: string, name: string) => {
      await client.query(`INSERT INTO public.branches (id, name) VALUES ($1, $2)`, [branchId, name]);
      await client.query(`INSERT INTO public.warehouses (id, name, branch_id, is_active) VALUES ($1, $2, $3, true)`, [whId, `${name} WH`, branchId]);
      await client.query(`INSERT INTO public.products (id, name, branch_id, sale_price, cost_price, is_active) VALUES ($1, $2, $3, 100, 50, true)`, [prodId, `${name} Product`, branchId]);
      await client.query(`INSERT INTO public.inventory_batches (product_id, warehouse_id, branch_id, quantity, unit_cost, source_type) VALUES ($1, $2, $3, 10, 50, 'opening')`, [prodId, whId, branchId]);
      await client.query(`INSERT INTO public.dining_tables (id, name, branch_id, capacity, status) VALUES ($1, $2, $3, 4, 'vacant')`, [tableId, 'T1', branchId]);
      await client.query(`INSERT INTO public.users (id, email, full_name, role, branch_id, is_active) VALUES ($1, $2, $3, 'cashier', $4, true)`, [cashierId, `fp-${randomUUID()}@test.local`, name, branchId]);
      await client.query(`INSERT INTO public.shifts (branch_id, cashier_id, opening_amount, status) VALUES ($1, $2, 0, 'open')`, [branchId, cashierId]);
      await client.query(`SELECT public.ensure_chart_of_accounts($1)`, [branchId]);
      await client.query(`SELECT public.seed_account_mappings($1)`, [branchId]);
    };

    await seedBranch(branchA, whA, prodA, tableA, cashierA, 'FP A');
    await seedBranch(branchB, whB, prodB, tableB, cashierB, 'FP B');
    await client.query(`UPDATE public.settings SET tax_enabled = false`);
  });

  afterAll(async () => {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
      await client.end();
    }
  });

  const itemJson = (prodId: string, qty: number, price = 100) =>
    JSON.stringify([{ product_id: prodId, unit_name: 'piece', quantity: qty, unit_price: price, discount_amount: 0, bonus_quantity: 0, total: qty * price }]);

  it('create_order opens a dine-in order and occupies the table', async () => {
    const r = await asUser(cashierA, () =>
      client.query(
        `SELECT public.create_order($1, 'dine_in', $2, NULL, 4, NULL, $3::jsonb, 200, 0, 'amount', 0, 200) AS r`,
        [branchA, tableA, itemJson(prodA, 2)],
      ));
    const order = r.rows[0].r;
    expect(order.success).toBe(true);
    if (!order.success) throw new Error(JSON.stringify(order));

    const o = await client.query(`SELECT status, order_type, order_number FROM public.orders WHERE id = $1`, [order.order_id]);
    expect(o.rows[0].status).toBe('open');
    expect(o.rows[0].order_type).toBe('dine_in');
    expect(String(o.rows[0].order_number)).toContain('-');

    const t = await client.query(`SELECT status FROM public.dining_tables WHERE id = $1`, [tableA]);
    expect(t.rows[0].status).toBe('occupied');

    const items = await client.query(`SELECT count(*)::int AS c FROM public.order_items WHERE order_id = $1`, [order.order_id]);
    expect(items.rows[0].c).toBe(1);

    // Completing the order frees the table.
    const comp = await asUser(cashierA, () =>
      client.query(`SELECT public.set_order_status($1, 'completed') AS r`, [order.order_id]));
    expect(comp.rows[0].r.success).toBe(true);
    const t2 = await client.query(`SELECT status FROM public.dining_tables WHERE id = $1`, [tableA]);
    expect(t2.rows[0].status).toBe('vacant');
  });

  it('process_sale stores order channel + table and settles a linked order', async () => {
    const created = await asUser(cashierA, () =>
      client.query(
        `SELECT public.create_order($1, 'dine_in', $2, NULL, 2, NULL, $3::jsonb, 100, 0, 'amount', 0, 100) AS r`,
        [branchA, tableA, itemJson(prodA, 1)],
      ));
    const order = created.rows[0].r;
    expect(order.success).toBe(true);

    const res = await asUser(cashierA, () =>
      client.query(
        `SELECT public.process_sale($1, $2, $3, NULL, NULL, 0, 0, 'amount', 0, 0, 0, 100, 'cash', 'completed',
           $4::jsonb, NULL, 'dine_in', $5, $6) AS r`,
        [`FP-INV-${Date.now()}`, branchA, whA, itemJson(prodA, 1, 1), tableA, order.order_id],
      ));
    const r = res.rows[0].r;
    expect(r.success).toBe(true);
    if (!r.success) throw new Error(JSON.stringify(r));

    const sale = await client.query(
      `SELECT order_type, table_id FROM public.sales WHERE id = $1`,
      [r.sale_id],
    );
    expect(sale.rows[0].order_type).toBe('dine_in');
    expect(sale.rows[0].table_id).toBe(tableA);

    const settled = await client.query(`SELECT status FROM public.orders WHERE id = $1`, [order.order_id]);
    expect(settled.rows[0].status).toBe('completed');

    const t = await client.query(`SELECT status FROM public.dining_tables WHERE id = $1`, [tableA]);
    expect(t.rows[0].status).toBe('vacant');
  });

  it('RPCs are branch-gated: cross-branch access is rejected', async () => {
    // cashierB (branch B) tries to open an order in branch A.
    const bad = await asUser(cashierB, () =>
      client.query(
        `SELECT public.create_order($1, 'dine_in', $2, NULL, 2, NULL, $3::jsonb, 100, 0, 'amount', 0, 100) AS r`,
        [branchA, tableA, itemJson(prodA, 1)],
      ));
    expect(bad.rows[0].r.success).toBe(false);
    expect(bad.rows[0].r.error).toBe('BRANCH_MISMATCH');

    // cashierA cannot touch a table of branch B.
    const tb = await asUser(cashierA, () =>
      client.query(`SELECT public.set_table_status($1, 'reserved') AS r`, [tableB]));
    expect(tb.rows[0].r.success).toBe(false);
    expect(tb.rows[0].r.error).toBe('BRANCH_MISMATCH');

    // Own-branch table control works.
    const ok = await asUser(cashierA, () =>
      client.query(`SELECT public.set_table_status($1, 'reserved') AS r`, [tableA]));
    expect(ok.rows[0].r.success).toBe(true);
    const t = await client.query(`SELECT status FROM public.dining_tables WHERE id = $1`, [tableA]);
    expect(t.rows[0].status).toBe('reserved');
  });
});
