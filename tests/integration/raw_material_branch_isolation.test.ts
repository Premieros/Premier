import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type pg from 'pg';
import { randomUUID } from 'node:crypto';
import { getDbUrl, openDb } from './db';
import { runAs, canImpersonate } from './rls';

const dbUrl = getDbUrl();

describe.skipIf(!dbUrl)('Raw material branch isolation', () => {
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

    const orgA = (await client.query<{ id: string }>(
      `INSERT INTO public.organizations (name, slug) VALUES ('RM Org A', $1) RETURNING id`,
      [`rm-org-a-${randomUUID()}`],
    )).rows[0].id;
    const orgB = (await client.query<{ id: string }>(
      `INSERT INTO public.organizations (name, slug) VALUES ('RM Org B', $1) RETURNING id`,
      [`rm-org-b-${randomUUID()}`],
    )).rows[0].id;

    branchA = (await client.query<{ id: string }>(
      `INSERT INTO public.branches (name, organization_id) VALUES ('RM Branch A', $1) RETURNING id`,
      [orgA],
    )).rows[0].id;
    branchB = (await client.query<{ id: string }>(
      `INSERT INTO public.branches (name, organization_id) VALUES ('RM Branch B', $1) RETURNING id`,
      [orgB],
    )).rows[0].id;

    await client.query('ALTER TABLE public.users DISABLE TRIGGER trg_users_role_guard');
    managerA = (await client.query<{ id: string }>(
      `INSERT INTO public.users (id, email, username, full_name, role, branch_id, is_active)
       VALUES ($1, 'rm-manager@test.local', 'rm-manager', 'RM Manager', 'branch_manager', $2, true)
       RETURNING id`,
      [randomUUID(), branchA],
    )).rows[0].id;
    await client.query('ALTER TABLE public.users ENABLE TRIGGER trg_users_role_guard');

    await client.query(
      `INSERT INTO public.organization_members (organization_id, user_id, membership_role, is_active)
       VALUES ($1, $2, 'member', true)`,
      [orgA, managerA],
    );

    rmA = (await client.query<{ id: string }>(
      `INSERT INTO public.raw_materials (code, name, branch_id) VALUES ('RM-A', 'Raw A', $1) RETURNING id`,
      [branchA],
    )).rows[0].id;
    rmB = (await client.query<{ id: string }>(
      `INSERT INTO public.raw_materials (code, name, branch_id) VALUES ('RM-B', 'Raw B', $1) RETURNING id`,
      [branchB],
    )).rows[0].id;

    imp = await canImpersonate(client);
  });

  afterAll(async () => {
    await client?.query('ROLLBACK').catch(() => {});
    await client?.end().catch(() => {});
  });

  it('branch manager can read only raw materials from the assigned branch', async () => {
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
    expect(result.error?.message).toMatch(/row-level security|policy/i);
  });
});
