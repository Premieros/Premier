import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDbUrl, openDb } from './db';
import type pg from 'pg';

// Regression tests for migration 047 (audit H1/H3/H4/M9/L2):
//
//   H1  detach_order nulls the order's table_id and frees the old table.
//   H3  process_sale frees the origin table of a DIRECT dine-in sale inside
//       the sale transaction (no client-side call needed afterwards).
//   H4  a table with a second open/held order is NOT freed when settling one.
//   M9  process_sale stores guest_count on sales.
//   L2  CHECK constraints reject impossible orders.status/order_type and
//       dining_tables.status values.
//
// Runs inside a single BEGIN..ROLLBACK transaction — safe against the live DB.
//
//   Run:  npm run test:integration
//   Skip: when no URL is configured

const dbUrl = getDbUrl();
const skip = !dbUrl;

describe.skipIf(skip)('order-lifecycle guards (047 H1/H3/H4/M9/L2)', () => {
  let client: pg.Client;
  const branchId = randomUUID();
  const whId = randomUUID();
  const prodId = randomUUID();
  const cashierId = randomUUID();

  const makeTable = async (): Promise<string> => {
    const id = randomUUID();
    await client.query(
      `INSERT INTO public.dining_tables (id, name, branch_id, capacity, status) VALUES ($1, $2, $3, 4, 'vacant')`,
      [id, `T-${id.slice(0, 4)}`, branchId],
    );
    return id;
  };

  const itemJson = (qty: number, price = 100) =>
    JSON.stringify([
      { product_id: prodId, unit_name: 'piece', quantity: qty, unit_price: price, discount_amount: 0, bonus_quantity: 0, total: qty * price },
    ]);

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

  async function createOrder(tableId: string | null) {
    return asUser(async () => {
      const res = await client.query<{ r: { success: boolean; error?: string; order_id?: string; detail?: string } }>(
        `SELECT public.create_order($1, 'dine_in', $2, NULL, 2, NULL, $3::jsonb, 100, 0, 'amount', 0, 100, $4) AS r`,
        [branchId, tableId, itemJson(1), cashierId],
      );
      return res.rows[0].r;
    });
  }

  async function detachOrder(orderId: string) {
    return asUser(async () => {
      const res = await client.query<{ r: { success: boolean; error?: string; detail?: string } }>(
        `SELECT public.detach_order($1) AS r`,
        [orderId],
      );
      return res.rows[0].r;
    });
  }

  async function tableStatus(tableId: string): Promise<string> {
    const r = await client.query<{ status: string }>(`SELECT status FROM public.dining_tables WHERE id = $1`, [tableId]);
    return r.rows[0].status;
  }

  async function orderTable(orderId: string): Promise<string | null> {
    const r = await client.query<{ table_id: string | null }>(`SELECT table_id FROM public.orders WHERE id = $1`, [orderId]);
    return r.rows[0].table_id;
  }

  // Full process_sale (direct or linked) inside the transaction.
  async function settle(invoice: string, opts: { tableId?: string | null; orderId?: string | null; guestCount?: number | null; orderType?: string } = {}) {
    return asUser(async () => {
      const res = await client.query<{ r: { success: boolean; error?: string; sale_id?: string; detail?: string } }>(
        `SELECT public.process_sale($1, $2, $3, NULL, NULL, 100, 0, 'amount', 0, 0, 100, 100, 'cash', 'completed',
           $4::jsonb, NULL, $5, $6, $7, $8) AS r`,
        [invoice, branchId, whId, itemJson(1), opts.orderType ?? 'dine_in', opts.tableId ?? null, opts.orderId ?? null, opts.guestCount ?? null],
      );
      return res.rows[0].r;
    });
  }

  beforeAll(async () => {
    client = openDb(dbUrl!);
    await client.connect();
    await client.query('BEGIN');

    await client.query(`ALTER TABLE public.users DISABLE TRIGGER trg_users_role_guard`);

    await client.query(`INSERT INTO public.branches (id, name) VALUES ($1, $2)`, [branchId, '047 Branch']);
    await client.query(`INSERT INTO public.warehouses (id, name, branch_id, is_active) VALUES ($1, $2, $3, true)`, [whId, '047 WH', branchId]);
    await client.query(`INSERT INTO public.products (id, name, branch_id, sale_price, cost_price, is_active) VALUES ($1, $2, $3, 100, 50, true)`, [prodId, '047 Product', branchId]);
    await client.query(`INSERT INTO public.inventory_batches (product_id, warehouse_id, branch_id, quantity, unit_cost, source_type) VALUES ($1, $2, $3, 10, 50, 'opening')`, [prodId, whId, branchId]);
    await client.query(`INSERT INTO public.users (id, email, full_name, role, branch_id, is_active) VALUES ($1, $2, $3, 'cashier', $4, true)`, [cashierId, `g-${randomUUID()}@test.local`, 'Guard', branchId]);
    await client.query(`INSERT INTO public.shifts (branch_id, cashier_id, opening_amount, status) VALUES ($1, $2, 0, 'open')`, [branchId, cashierId]);
    await client.query(`SELECT public.ensure_chart_of_accounts($1)`, [branchId]);
    await client.query(`SELECT public.seed_account_mappings($1)`, [branchId]);
    await client.query(`UPDATE public.settings SET tax_enabled = false`);
  });

  afterAll(async () => {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
      await client.end();
    }
  });

  it('detach_order nulls table_id and frees the table (H1)', async () => {
    const t = await makeTable();
    const created = await createOrder(t);
    expect(created.success).toBe(true);

    const det = await detachOrder(created.order_id!);
    expect(det.success).toBe(true);

    expect(await orderTable(created.order_id!)).toBeNull();
    expect(await tableStatus(t)).toBe('vacant');
  });

  it('detach_order rejects a completed order (ORDER_NOT_EDITABLE)', async () => {
    const t = await makeTable();
    const created = await createOrder(t);
    await client.query(`UPDATE public.orders SET status = 'completed' WHERE id = $1`, [created.order_id]);

    const det = await detachOrder(created.order_id!);
    expect(det.success).toBe(false);
    expect(det.error).toBe('ORDER_NOT_EDITABLE');
  });

  it('process_sale frees the origin table of a DIRECT dine-in sale (H3)', async () => {
    const t = await makeTable();
    const res = await settle(`INV-${randomUUID()}`, { tableId: t, orderId: null, orderType: 'dine_in', guestCount: 4 });
    expect(res.success).toBe(true);
    expect(await tableStatus(t)).toBe('vacant');
  });

  it('process_sale stores guest_count on the sale (M9)', async () => {
    const t = await makeTable();
    const res = await settle(`INV-${randomUUID()}`, { tableId: t, orderId: null, orderType: 'dine_in', guestCount: 6 });
    expect(res.success).toBe(true);
    const sale = await client.query<{ guest_count: number | null }>(`SELECT guest_count FROM public.sales WHERE id = $1`, [res.sale_id]);
    expect(sale.rows[0].guest_count).toBe(6);
  });

  it('process_sale does NOT free a table that still has another open order (H4)', async () => {
    const t = await makeTable();
    // Legacy desync: two open orders on the same table (guards added later,
    // but existing data must be handled defensively).
    await client.query(
      `INSERT INTO public.orders (order_number, branch_id, order_type, status, table_id, subtotal, discount_amount, tax_amount, total)
       VALUES ($1, $2, 'dine_in', 'open', $3, 100, 0, 0, 100)`,
      [`ORD-${randomUUID()}`, branchId, t],
    );
    await client.query(
      `INSERT INTO public.orders (order_number, branch_id, order_type, status, table_id, subtotal, discount_amount, tax_amount, total)
       VALUES ($1, $2, 'dine_in', 'open', $3, 100, 0, 0, 100)`,
      [`ORD-${randomUUID()}`, branchId, t],
    );
    await client.query(`UPDATE public.dining_tables SET status = 'occupied' WHERE id = $1`, [t]);

    // Settle ONE of them directly (bypassing create_order which now guards).
    const toSettle = await client.query<{ id: string }>(
      `SELECT id FROM public.orders WHERE table_id = $1 AND status = 'open' LIMIT 1`, [t],
    );
    const res = await settle(`INV-${randomUUID()}`, { tableId: t, orderId: toSettle.rows[0].id, orderType: 'dine_in' });
    expect(res.success).toBe(true);
    // The other open order still references the table → keep it occupied.
    expect(await tableStatus(t)).toBe('occupied');
  });

  it('CHECK constraints reject impossible status/type values (L2)', async () => {
    const badStatus = async () => {
      await client.query('SAVEPOINT l2_status');
      try {
        await client.query(
          `INSERT INTO public.orders (order_number, branch_id, order_type, status, subtotal, discount_amount, tax_amount, total)
           VALUES ('ORD-X', $1, 'dine_in', 'ghost_status', 0, 0, 0, 0)`,
          [branchId],
        );
        return null;
      } catch (e: unknown) {
        return (e as Error).message;
      } finally {
        await client.query('ROLLBACK TO SAVEPOINT l2_status').catch(() => {});
        await client.query('RELEASE SAVEPOINT l2_status').catch(() => {});
      }
    };
    const badType = async () => {
      await client.query('SAVEPOINT l2_type');
      try {
        await client.query(
          `INSERT INTO public.orders (order_number, branch_id, order_type, status, subtotal, discount_amount, tax_amount, total)
           VALUES ('ORD-Y', $1, 'teleport', 'open', 0, 0, 0, 0)`,
          [branchId],
        );
        return null;
      } catch (e: unknown) {
        return (e as Error).message;
      } finally {
        await client.query('ROLLBACK TO SAVEPOINT l2_type').catch(() => {});
        await client.query('RELEASE SAVEPOINT l2_type').catch(() => {});
      }
    };
    const badTable = async () => {
      await client.query('SAVEPOINT l2_table');
      try {
        await client.query(
          `INSERT INTO public.dining_tables (id, name, branch_id, capacity, status) VALUES ($1, $2, $3, 4, 'ghost')`,
          [randomUUID(), 'T-Ghost', branchId],
        );
        return null;
      } catch (e: unknown) {
        return (e as Error).message;
      } finally {
        await client.query('ROLLBACK TO SAVEPOINT l2_table').catch(() => {});
        await client.query('RELEASE SAVEPOINT l2_table').catch(() => {});
      }
    };

    expect(await badStatus()).toBeTruthy();
    expect(await badType()).toBeTruthy();
    expect(await badTable()).toBeTruthy();
  });
});
