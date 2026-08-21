import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type pg from 'pg';
import { getDbUrl, openDb } from './db';
import { seedRlsFixture, runAs, canImpersonate, type RlsIds } from './rls';

const dbUrl = getDbUrl();

describe.skipIf(!dbUrl)('Branch visibility hardening', () => {
  let client: pg.Client;
  let ids: RlsIds;
  let imp = false;

  beforeAll(async () => {
    client = openDb(dbUrl!);
    await client.connect();
    await client.query('BEGIN');
    ids = await seedRlsFixture(client);
    imp = await canImpersonate(client);
  });

  afterAll(async () => {
    await client?.query('ROLLBACK').catch(() => {});
    await client?.end().catch(() => {});
  });

  it('branch manager sees only the assigned branch', async () => {
    if (!imp) return;
    const result = await runAs(
      client,
      ids.users.branch_manager,
      `SELECT id FROM public.branches ORDER BY id`,
    );
    expect(result.error).toBeNull();
    expect(result.rows.map((r: { id: string }) => r.id)).toEqual([ids.branchA]);
  });

  it('branch manager cannot update another branch metadata', async () => {
    if (!imp) return;
    const result = await runAs(
      client,
      ids.users.branch_manager,
      `UPDATE public.branches SET name = 'SHOULD-NOT-CHANGE' WHERE id = $1`,
      [ids.branchB],
    );
    expect(result.error).toBeNull();
    expect(result.rowCount).toBe(0);
  });

  it('organization owner can see branches in its organization but not another organization', async () => {
    if (!imp) return;
    const result = await runAs(
      client,
      ids.users.owner,
      `SELECT id FROM public.branches ORDER BY id`,
    );
    expect(result.error).toBeNull();
    expect(result.rows.map((r: { id: string }) => r.id)).toEqual([ids.branchA]);
  });
});
