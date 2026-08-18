import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDbUrl, openDb } from './db';
import type pg from 'pg';

const dbUrl = getDbUrl();
const skip = !dbUrl;

describe.skipIf(skip)('Kitchen M091/M092 RBAC + branch isolation', () => {
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

  it('production_manager can read only the caller branch even when another branch is supplied', async () => {
    const rows = await asUser(productionUser, async () => {
      const r = await client.query<{ order_id: string }>(
        `SELECT order_id FROM public.get_kitchen_queue(NULL, $1)`, [branchB],
      );
      return r.rows;
    });
    expect(rows.find((r) => r.order_id === orderB)).toBeUndefined();
    expect(rows.find((r) => r.order_id === orderA)?.order_id).toBe(orderA);
  });

  it('production_manager cannot route an order belonging to another branch', async () => {
    await asUser(productionUser, async () => {
      await expect(
        client.query(`SELECT public.route_to_station($1, 'grill')`, [orderB]),
      ).rejects.toThrow(/ORDER_NOT_FOUND_OR_WRONG_BRANCH|NOT_ALLOWED/);
    });
    const rows = await client.query<{ station: string }>(`SELECT station FROM public.orders WHERE id = $1`, [orderB]);
    expect(rows.rows[0].station).toBe('main');
  });

  it('cashier cannot read the kitchen queue', async () => {
    await asUser(cashierUser, async () => {
      await expect(
        client.query(`SELECT * FROM public.get_kitchen_queue(NULL, NULL)`),
      ).rejects.toThrow(/NOT_ALLOWED/);
    });
  });

  it('cashier cannot route a kitchen order', async () => {
    await asUser(cashierUser, async () => {
      await expect(
        client.query(`SELECT public.route_to_station($1, 'grill')`, [orderA]),
      ).rejects.toThrow(/NOT_ALLOWED/);
    });
  });
});
