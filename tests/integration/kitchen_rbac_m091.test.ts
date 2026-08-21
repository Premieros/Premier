import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDbUrl, openDb } from './db';
import type pg from 'pg';

const dbUrl = getDbUrl();
const skip = !dbUrl;

describe.skipIf(skip)('Kitchen branch isolation', () => {
  let client: pg.Client;
  const branchA = randomUUID();
  const branchB = randomUUID();
  const productionUser = randomUUID();
  const cashierUser = randomUUID();
  const orderA = randomUUID();
  const orderB = randomUUID();

  async function asUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    await client.query(`SELECT set_config('app.user_id', $1, true)`, [userId]);
    await client.query(`SET LOCAL ROLE authenticated`);
    try { return await fn(); }
    finally {
      await client.query('RESET ROLE').catch(() => {});
      await client.query('RESET app.user_id').catch(() => {});
    }
  }

  beforeAll(async () => {
    client = openDb(dbUrl!);
    await client.connect();
    await client.query('BEGIN');
    await client.query(`ALTER TABLE public.users DISABLE TRIGGER trg_users_role_guard`);
    await client.query(`INSERT INTO public.branches (id, name) VALUES ($1, 'Kitchen RBAC A'), ($2, 'Kitchen RBAC B')`, [branchA, branchB]);
    await client.query(
      `INSERT INTO public.users (id, email, full_name, role, branch_id, is_active)
       VALUES ($1, $2, 'Production User', 'production_manager', $3, true),
              ($4, $5, 'Cashier User', 'cashier', $3, true)`,
      [productionUser, `${randomUUID()}@test.local`, branchA, cashierUser, `${randomUUID()}@test.local`],
    );
    await client.query(
      `INSERT INTO public.orders (id, order_number, branch_id, status, kitchen_status, station)
       VALUES ($1, 'M091-A', $2, 'open', 'sent', 'main'),
              ($3, 'M091-B', $4, 'open', 'sent', 'main')`,
      [orderA, branchA, orderB, branchB],
    );
  });

  afterAll(async () => {
    await client.query('ROLLBACK').catch(() => {});
    await client.end().catch(() => {});
  });

  it('branch user can only query its own kitchen queue', async () => {
    const ownRows = await asUser(productionUser, async () => {
      const r = await client.query<{ order_id: string }>(
        `SELECT order_id FROM public.get_kitchen_queue(NULL, $1)`, [branchA],
      );
      return r.rows;
    });
    expect(ownRows.map(r => r.order_id)).toContain(orderA);
    expect(ownRows.map(r => r.order_id)).not.toContain(orderB);

    await expect(asUser(productionUser, async () => {
      await client.query(`SELECT order_id FROM public.get_kitchen_queue(NULL, $1)`, [branchB]);
    })).rejects.toThrow(/BRANCH_ACCESS_DENIED/);
  });

  it('branch user cannot route another branch order', async () => {
    await asUser(productionUser, async () => {
      await expect(client.query(`SELECT public.route_to_station($1, 'grill')`, [orderB]))
        .rejects.toThrow(/BRANCH_ACCESS_DENIED/);
      const own = await client.query(`SELECT public.route_to_station($1, 'grill')`, [orderA]);
      expect(own.rowCount).toBe(1);
    });
  });

  it('cashier cannot query another branch through the SECURITY DEFINER RPC', async () => {
    await asUser(cashierUser, async () => {
      await expect(client.query(`SELECT * FROM public.get_kitchen_queue(NULL, $1)`, [branchB]))
        .rejects.toThrow(/BRANCH_ACCESS_DENIED/);
    });
  });

  it('ready orders remain visible in the active kitchen queue', async () => {
    await client.query(`UPDATE public.orders SET kitchen_status = 'ready' WHERE id = $1`, [orderA]);
    const rows = await asUser(productionUser, async () => {
      const r = await client.query<{ order_id: string; kitchen_status: string }>(
        `SELECT order_id, kitchen_status FROM public.get_kitchen_queue(NULL, $1)`, [branchA],
      );
      return r.rows;
    });
    expect(rows).toContainEqual(expect.objectContaining({ order_id: orderA, kitchen_status: 'ready' }));
  });
});
