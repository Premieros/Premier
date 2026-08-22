import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type pg from 'pg';
import { getDbUrl, openDb } from './db';
import { seedRlsFixture, runAs, canImpersonate } from './rls';

const dbUrl = getDbUrl();

describe.skipIf(!dbUrl)('Raw material branch isolation hardening', () => {
  let client: pg.Client;
  let branchA: string;
  let branchB: string;
  let managerA: string;
  let rmA: string;
  let rmB: string;
  let imp = false;

  beforeAll(async () => {
    client = openDb(dbUrl!);
    await client.connect();
    await client.query('BEGIN');
    const ids = await seedRlsFixture(client);
    branchA = ids.branchA;
    branchB = ids.branchB;
    managerA = ids.users.branch_manager;
    rmA = ids.rm;
    rmB = await client.query<{ id: string }>(
      `INSERT INTO public.raw_materials (code, name, branch_id) VALUES ('RM-B-TEST', 'Branch B RM', $1) RETURNING id`,
      [branchB],
    ).then(r => r.rows[0].id);
    await client.query(`UPDATE public.raw_materials SET branch_id = $1 WHERE id = $2`, [branchA, rmA]);
    imp = await canImpersonate(client);
  });

  afterAll(async () => {
    await client?.query('ROLLBACK').catch(() => {});
    await client?.end().catch(() => {});
  });

  it('branch manager sees only raw materials owned by their branch', async () => {
    if (!imp) return;
    const result = await runAs(
      client,
      managerA,
      `SELECT id FROM public.raw_materials WHERE id IN ($1, $2) ORDER BY id`,
      [rmA, rmB],
    );
    expect(result.error).toBeUndefined();
    expect(result.rows.map(r => String(r.id))).toEqual([rmA]);
  });

  it('branch manager cannot update a raw material owned by another branch', async () => {
    if (!imp) return;
    const result = await runAs(
      client,
      managerA,
      `UPDATE public.raw_materials SET name = 'SHOULD-NOT-CHANGE' WHERE id = $1`,
      [rmB],
    );
    expect(result.error).toBeUndefined();
    expect(result.rowCount).toBe(0);
  });

  it('branch manager cannot forge branch ownership on insert', async () => {
    if (!imp) return;
    const result = await runAs(
      client,
      managerA,
      `INSERT INTO public.raw_materials (code, name, branch_id) VALUES ('RM-FORGED', 'Forged', $1)`,
      [branchB],
    );
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/row-level security|policy/i);
  });
});