import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDbUrl, openDb } from './db';
import type pg from 'pg';

// Regression tests for migration 048 (per-item kitchen tracking):
//
//   * send_to_kitchen snapshots ONLY the unsent lines and returns them.
//   * A re-send is a no-op (items_sent_count = 0, no duplicate rows).
//   * update_order (069) PRESERVES the ids of lines that match the cart, so a
//     Hold -> Resume after Send Kitchen does NOT re-send previously sent items:
//     only genuinely new lines reach KDS (ERP-01 item 4).
//   * send_to_kitchen rejects non-editable (completed) orders.
//   * set_order_status cannot reopen a completed/cancelled order (H4).
//
// Runs inside a single BEGIN..ROLLBACK transaction — safe against the live DB.
//
//   Run:  npm run test:integration
//   Skip: when no URL is configured

const dbUrl = getDbUrl();
const skip = !dbUrl;

describe.skipIf(skip)('send_to_kitchen + order_kitchen_sends (048)', () => {
  let client: pg.Client;
  const branchId = randomUUID();
  const whId = randomUUID();
  const prodA = randomUUID();
  const prodB = randomUUID();
  const cashierId = randomUUID();

  const makeTable = async (): Promise<string> => {
    const id = randomUUID();
    await client.query(
      `INSERT INTO public.dining_tables (id, name, branch_id, capacity, status) VALUES ($1, $2, $3, 4, 'vacant')`,
      [id, `T-${id.slice(0, 4)}`, branchId],
    );
    return id;
  };

  const itemJson = (items: Array<{ product_id: string; quantity: number }>) =>
    JSON.stringify(
      items.map((it) => ({
        product_id: it.product_id,
        unit_name: 'piece',
        quantity: it.quantity,
        unit_price: 100,
        discount_amount: 0,
        bonus_quantity: 0,
        total: it.quantity * 100,
      })),
    );

  async function asUser<T>(fn: () => Promise<T>): Promise<T> {
    await client.query(`SELECT set_config('app.user_id', $1, true)`, [cashierId]);
    await client.query(`SET LOCAL ROLE authenticated`);
    try {
      return await fn();
    } finally {
      await client.query('RESET ROLE').catch(() => {});
      await client.query('RESET app.user_id').catch(() => {});
    }
  }

  async function createOrder(items = itemJson([{ product_id: prodA, quantity: 1 }])) {
    const t = await makeTable();
    return asUser(async () => {
      const res = await client.query<{ r: { success: boolean; error?: string; order_id?: string } }>(
        `SELECT public.create_order($1, 'dine_in', $2, NULL, 2, NULL, $3::jsonb, 100, 0, 'amount', 0, 100, $4) AS r`,
        [branchId, t, items, cashierId],
      );
      return res.rows[0].r;
    });
  }

  async function sendToKitchen(orderId: string) {
    return asUser(async () => {
      const res = await client.query<{
        r: {
          success: boolean;
          error?: string;
          items_sent_count?: number;
          all_sent?: boolean;
          sent?: Array<{ order_item_id: string; product_id: string }>;
        };
      }>(`SELECT public.send_to_kitchen($1) AS r`, [orderId]);
      return res.rows[0].r;
    });
  }

  async function sendRows(orderId: string): Promise<number> {
    const r = await client.query<{ c: number }>(
      `SELECT count(*)::int AS c FROM public.order_kitchen_sends WHERE order_id = $1`,
      [orderId],
    );
    return r.rows[0].c;
  }

  beforeAll(async () => {
    client = openDb(dbUrl!);
    await client.connect();
    await client.query('BEGIN');

    await client.query(`ALTER TABLE public.users DISABLE TRIGGER trg_users_role_guard`);
    await client.query(`INSERT INTO public.branches (id, name) VALUES ($1, $2)`, [branchId, '048 Branch']);
    await client.query(`INSERT INTO public.warehouses (id, name, branch_id, is_active) VALUES ($1, $2, $3, true)`, [whId, '048 WH', branchId]);
    await client.query(`INSERT INTO public.products (id, name, branch_id, sale_price, cost_price, is_active) VALUES ($1, $2, $3, 100, 50, true)`, [prodA, '048 Product A', branchId]);
    await client.query(`INSERT INTO public.products (id, name, branch_id, sale_price, cost_price, is_active) VALUES ($1, $2, $3, 100, 50, true)`, [prodB, '048 Product B', branchId]);
    await client.query(`INSERT INTO public.inventory_batches (product_id, warehouse_id, branch_id, quantity, unit_cost, source_type) VALUES ($1, $2, $3, 100, 50, 'opening')`, [prodA, whId, branchId]);
    await client.query(`INSERT INTO public.inventory_batches (product_id, warehouse_id, branch_id, quantity, unit_cost, source_type) VALUES ($1, $2, $3, 100, 50, 'opening')`, [prodB, whId, branchId]);
    await client.query(`INSERT INTO public.users (id, email, full_name, role, branch_id, is_active) VALUES ($1, $2, $3, 'cashier', $4, true)`, [cashierId, `k-${randomUUID()}@test.local`, 'Cashier', branchId]);
    await client.query(`INSERT INTO public.shifts (branch_id, cashier_id, opening_amount, status) VALUES ($1, $2, 0, 'open')`, [branchId, cashierId]);
    await client.query(`UPDATE public.settings SET tax_enabled = false`);
  });

  afterAll(async () => {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
      await client.end();
    }
  });

  it('send_to_kitchen snapshots every line of a fresh order and reports all_sent', async () => {
    const created = await createOrder(itemJson([
      { product_id: prodA, quantity: 1 },
      { product_id: prodB, quantity: 2 },
    ]));
    expect(created.success).toBe(true);
    const orderId = created.order_id!;

    const sent = await sendToKitchen(orderId);
    expect(sent.success).toBe(true);
    if (!sent.success) throw new Error(JSON.stringify(sent));
    expect(sent.items_sent_count).toBe(2);
    expect(sent.all_sent).toBe(true);
    expect(sent.sent).toHaveLength(2);
    expect(await sendRows(orderId)).toBe(2);
  });

  it('a re-send is a no-op: zero new rows, no duplicates', async () => {
    const created = await createOrder();
    expect(created.success).toBe(true);
    const orderId = created.order_id!;

    const first = await sendToKitchen(orderId);
    expect(first.items_sent_count).toBe(1);

    const second = await sendToKitchen(orderId);
    expect(second.success).toBe(true);
    expect(second.items_sent_count).toBe(0);
    expect(second.all_sent).toBe(true);
    expect(await sendRows(orderId)).toBe(1);

    // order_item_id is unique: exactly one row per line even across re-sends.
    const r = await client.query(
      `SELECT count(*)::int AS c FROM (
         SELECT order_item_id, count(*) AS n FROM public.order_kitchen_sends
         WHERE order_id = $1 GROUP BY order_item_id HAVING count(*) > 1
       ) dup`,
      [orderId],
    );
    expect(r.rows[0].c).toBe(0);
  });

  it('update_order preserves line ids: a same-cart re-persist does not re-send (069)', async () => {
    const created = await createOrder();
    expect(created.success).toBe(true);
    const orderId = created.order_id!;

    const first = await sendToKitchen(orderId);
    expect(first.items_sent_count).toBe(1);
    expect(await sendRows(orderId)).toBe(1);

    // Re-persist the exact same cart (Hold -> Resume). The matching line keeps
    // its order_item_id, its send row survives, and nothing is re-sent.
    await asUser(async () => {
      const res = await client.query(
        `SELECT public.update_order($1, 'dine_in', NULL, NULL, 2, NULL, $2::jsonb, 100, 0, 'amount', 0, 100, 'held') AS r`,
        [orderId, itemJson([{ product_id: prodA, quantity: 1 }])],
      );
      expect(res.rows[0].r.success).toBe(true);
    });

    const second = await sendToKitchen(orderId);
    expect(second.success).toBe(true);
    expect(second.items_sent_count).toBe(0);
    expect(second.all_sent).toBe(true);
    expect(await sendRows(orderId)).toBe(1);

    // The sent line still exists and its send row is intact.
    const lines = await client.query<{ c: number; sent: number }>(
      `SELECT count(*)::int AS c,
              count(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM public.order_kitchen_sends s WHERE s.order_item_id = public.order_items.id
              ))::int AS sent
       FROM public.order_items WHERE order_id = $1`,
      [orderId],
    );
    expect(lines.rows[0].c).toBe(1);
    expect(lines.rows[0].sent).toBe(1);
  });

  it('resume + add item + send + payment: only the new line reaches KDS, sale settles the full cart (ERP-01)', async () => {
    const created = await createOrder();
    expect(created.success).toBe(true);
    const orderId = created.order_id!;

    await sendToKitchen(orderId);
    expect(await sendRows(orderId)).toBe(1);

    // Resume and add product B to the same order.
    const cart = itemJson([
      { product_id: prodA, quantity: 1 },
      { product_id: prodB, quantity: 1 },
    ]);
    await asUser(async () => {
      const res = await client.query(
        `SELECT public.update_order($1, 'dine_in', NULL, NULL, 2, NULL, $2::jsonb, 200, 0, 'amount', 0, 200, 'held') AS r`,
        [orderId, cart],
      );
      expect(res.rows[0].r.success).toBe(true);
    });

    // Send: only product B is new; product A stays sent exactly once.
    const sent = await sendToKitchen(orderId);
    expect(sent.success).toBe(true);
    if (!sent.success) throw new Error(JSON.stringify(sent));
    expect(sent.items_sent_count).toBe(1);
    expect(sent.sent).toHaveLength(1);
    expect(sent.sent![0].product_id).toBe(prodB);
    expect(await sendRows(orderId)).toBe(2);

    // Pay the full order: the sale contains both items and closes the order.
    await client.query(`SELECT public.ensure_chart_of_accounts($1)`, [branchId]);
    await client.query(`SELECT public.seed_account_mappings($1)`, [branchId]);
    const sale = await client.query<{ r: { success: boolean; error?: string; sale_id?: string; detail?: string } }>(
      `SELECT public.process_sale($1, $2, $3, NULL, NULL, 200, 0, 'amount', 0, 0, 200, 200, 'cash', 'completed', $4::jsonb, NULL, 'takeaway', NULL, $5) AS r`,
      [`INV-${randomUUID()}`, branchId, whId, cart, orderId],
    );
    expect(sale.rows[0].r.success).toBe(true);
    if (!sale.rows[0].r.success) throw new Error(JSON.stringify(sale.rows[0].r));

    const saleLines = await client.query<{ c: number }>(
      `SELECT count(*)::int AS c FROM public.sale_items WHERE sale_id = $1`,
      [sale.rows[0].r.sale_id],
    );
    expect(saleLines.rows[0].c).toBe(2);

    // The settled order can no longer be sent to the kitchen.
    const closed = await sendToKitchen(orderId);
    expect(closed.success).toBe(false);
    expect(closed.error).toBe('ORDER_NOT_EDITABLE');
  });

  it('send_to_kitchen rejects a completed order (ORDER_NOT_EDITABLE)', async () => {
    const created = await createOrder();
    expect(created.success).toBe(true);
    await client.query(`UPDATE public.orders SET status = 'completed' WHERE id = $1`, [created.order_id]);

    const sent = await sendToKitchen(created.order_id!);
    expect(sent.success).toBe(false);
    expect(sent.error).toBe('ORDER_NOT_EDITABLE');
  });

  it('set_order_status cannot reopen a completed order (H4 ORDER_CLOSED)', async () => {
    const created = await createOrder();
    expect(created.success).toBe(true);
    await client.query(`UPDATE public.orders SET status = 'completed' WHERE id = $1`, [created.order_id]);

    const res = await asUser(async () =>
      client.query<{ r: { success: boolean; error?: string } }>(
        `SELECT public.set_order_status($1, 'open') AS r`,
        [created.order_id],
      ),
    );
    expect(res.rows[0].r.success).toBe(false);
    expect(res.rows[0].r.error).toBe('ORDER_CLOSED');

    const order = await client.query(`SELECT status FROM public.orders WHERE id = $1`, [created.order_id]);
    expect(order.rows[0].status).toBe('completed');
  });

  it('order_kitchen_sends is readable under RLS within the caller branch', async () => {
    const created = await createOrder();
    expect(created.success).toBe(true);
    await sendToKitchen(created.order_id!);

    const r = await asUser(async () =>
      client.query<{ c: number }>(
        `SELECT count(*)::int AS c FROM public.order_kitchen_sends WHERE order_id = $1`,
        [created.order_id],
      ),
    );
    expect(r.rows[0].c).toBe(1);
  });
});
