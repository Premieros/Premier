import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { getDbUrl, openDb } from './db';
import type pg from 'pg';

// Functional test for the ERP-02 costing RPCs:
//   compute_recipe_cost, recipe_costing_report, raw_material_cost_history,
//   costing_profitability_report.
//
// Runs inside a single BEGIN..ROLLBACK transaction: everything written here is
// discarded, so running against the live Supabase database is safe.
//
//   Run:  npm run test:integration
//   URL:  SUPABASE_DB_URL (or DATABASE_URL) in .env / environment
//   Skip: when no URL is configured

const dbUrl = getDbUrl();
const skip = !dbUrl;

// Fixture numbers (computed by hand, asserted below):
//   RM1 default_cost = 4, qty 3, wastage 10% -> consumed 3.3
//   RM2 default_cost = 10, qty 1, wastage 0%  -> consumed 1.0
//   total (no inventory) = 3.3*4 + 1*10 = 23.20 ; yield 2 -> unit 11.60
//   After purchasing RM1 @5 (x10) and RM2 @8 (x10):
//     total = 3.3*5 + 1*8 = 24.50 ; yield 2 -> unit 12.25
//   Product sale_price = 100 -> margin 87.75, margin_pct 87.75, food_cost 12.25

describe.skipIf(skip)('ERP-02 recipe & costing RPCs', () => {
  let client: pg.Client;
  const branchId = randomUUID();
  const warehouseId = randomUUID();
  const supplierId = randomUUID();
  const rm1 = randomUUID();
  const rm2 = randomUUID();
  const productId = randomUUID();
  const recipeId = randomUUID();
  const invPrefix = `ERP02-${Date.now()}`;

  beforeAll(async () => {
    client = openDb(dbUrl!);
    await client.connect();
    await client.query('BEGIN');

    await client.query(`INSERT INTO public.branches (id, name) VALUES ($1, $2)`, [branchId, 'ERP02 Costing Branch']);
    await client.query(
      `INSERT INTO public.warehouses (id, name, branch_id, is_active) VALUES ($1, $2, $3, true)`,
      [warehouseId, 'ERP02 Warehouse', branchId],
    );
    await client.query(
      `INSERT INTO public.suppliers (id, name, branch_id) VALUES ($1, $2, $3)`,
      [supplierId, 'ERP02 Supplier', branchId],
    );
    await client.query(
      `INSERT INTO public.raw_materials (id, code, name, default_cost, is_active) VALUES ($1, $2, $3, 4, true)`,
      [rm1, 'RM-ERP02-1', 'Flour'],
    );
    await client.query(
      `INSERT INTO public.raw_materials (id, code, name, default_cost, is_active) VALUES ($1, $2, $3, 10, true)`,
      [rm2, 'RM-ERP02-2', 'Cheese'],
    );
    await client.query(
      `INSERT INTO public.products (id, name, branch_id, sale_price, cost_price, is_active) VALUES ($1, $2, $3, 100, 50, true)`,
      [productId, 'ERP02 Pizza', branchId],
    );
    await client.query(
      `INSERT INTO public.recipes (id, product_id, branch_id, name, yield_quantity, is_active) VALUES ($1, $2, $3, 'Pizza Recipe', 2, true)`,
      [recipeId, productId, branchId],
    );
    await client.query(
      `INSERT INTO public.recipe_items (recipe_id, raw_material_id, quantity, wastage_percent) VALUES ($1, $2, 3, 10)`,
      [recipeId, rm1],
    );
    await client.query(
      `INSERT INTO public.recipe_items (recipe_id, raw_material_id, quantity, wastage_percent) VALUES ($1, $2, 1, 0)`,
      [recipeId, rm2],
    );

    await client.query(`SELECT public.ensure_chart_of_accounts($1)`, [branchId]);
    await client.query(`SELECT public.seed_account_mappings($1)`, [branchId]);
    // Disable VAT so asserted totals are exactly the catalog prices.
    await client.query(`UPDATE public.settings SET tax_enabled = false`);
  });

  afterAll(async () => {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
      await client.end();
    }
  });

  it('compute_recipe_cost falls back to raw_materials.default_cost when no inventory', async () => {
    const res = await client.query(`SELECT public.compute_recipe_cost($1) AS r`, [recipeId]);
    const r = res.rows[0].r;
    expect(r.success).toBe(true);
    if (!r.success) throw new Error(JSON.stringify(r));
    expect(Number(r.total_cost)).toBeCloseTo(23.2, 2);
    expect(Number(r.unit_cost)).toBeCloseTo(11.6, 2);
    expect(Number(r.yield_quantity)).toBe(2);
    expect(r.items).toHaveLength(2);
    expect(Number(r.items[0].consumed_quantity)).toBeCloseTo(3.3, 4);
  });

  it('returns RECIPE_NOT_FOUND for an unknown recipe id', async () => {
    const res = await client.query(`SELECT public.compute_recipe_cost($1) AS r`, [randomUUID()]);
    expect(res.rows[0].r.success).toBe(false);
    expect(res.rows[0].r.error).toBe('RECIPE_NOT_FOUND');
  });

  it('uses branch avg_cost after raw-material purchases (supplier trace recorded)', async () => {
    const purch = await client.query(
      `SELECT public.process_purchase($1, $2, $3, NULL, 0, 0, 0, 0, 0, 'cash', 'completed', NULL, $4::jsonb) AS r`,
      [
        `${invPrefix}-PURCH-RM`,
        supplierId,
        branchId,
        JSON.stringify([
          { raw_material_id: rm1, quantity: 10, unit_cost: 5 },
          { raw_material_id: rm2, quantity: 10, unit_cost: 8 },
        ]),
      ],
    );
    const pr = purch.rows[0].r;
    expect(pr.success).toBe(true);
    if (!pr.success) throw new Error(JSON.stringify(pr));

    const res = await client.query(`SELECT public.compute_recipe_cost($1) AS r`, [recipeId]);
    const r = res.rows[0].r;
    expect(Number(r.total_cost)).toBeCloseTo(24.5, 2);
    expect(Number(r.unit_cost)).toBeCloseTo(12.25, 2);
    expect(Number(r.items[0].unit_cost)).toBe(5); // avg_cost wins over default_cost
  });

  it('recipe_costing_report returns margin and food-cost percentages', async () => {
    const res = await client.query(`SELECT public.recipe_costing_report($1) AS r`, [branchId]);
    expect(res.rows.length).toBeGreaterThan(0);
    const row = res.rows[0].r;
    expect(row.product_id).toBe(productId);
    expect(Number(row.sale_price)).toBe(100);
    expect(Number(row.recipe_cost)).toBeCloseTo(12.25, 2);
    expect(Number(row.gross_margin)).toBeCloseTo(87.75, 2);
    expect(Number(row.gross_margin_pct)).toBeCloseTo(87.75, 2);
    expect(Number(row.food_cost_pct)).toBeCloseTo(12.25, 2);
  });

  it('recipe_costing_report with a different branch filter returns no rows', async () => {
    const other = randomUUID();
    const res = await client.query(`SELECT public.recipe_costing_report($1) AS r`, [other]);
    expect(res.rows).toHaveLength(0);
  });

  it('raw_material_cost_history traces purchase lots to the supplier', async () => {
    const res = await client.query(`SELECT public.raw_material_cost_history($1, $2) AS r`, [rm1, branchId]);
    expect(res.rows.length).toBeGreaterThan(0);
    const row = res.rows[0].r;
    expect(row.raw_material_id).toBe(rm1);
    expect(row.raw_material_name).toBe('Flour');
    expect(Number(row.unit_cost)).toBe(5);
    expect(Number(row.quantity)).toBe(10);
    expect(row.source_type).toBe('purchase');
    expect(row.supplier_id).toBe(supplierId);
    expect(row.supplier_name).toBe('ERP02 Supplier');
  });

  it('costing_profitability_report compares revenue vs theoretical vs actual COGS', async () => {
    // Receive finished goods into the warehouse at cost 10/unit.
    const fg = await client.query(
      `SELECT public.process_purchase($1, $2, $3, $4, 0, 0, 0, 0, 0, 'cash', 'completed', NULL, $5::jsonb) AS r`,
      [
        `${invPrefix}-PURCH-FG`,
        supplierId,
        branchId,
        warehouseId,
        JSON.stringify([{ product_id: productId, unit_name: 'piece', quantity: 10, unit_cost: 10 }]),
      ],
    );
    expect(fg.rows[0].r.success).toBe(true);

    // Sell 4 units at the catalog price of 100.
    const sale = await client.query(
      `SELECT public.process_sale($1, $2, $3, NULL, NULL, 4, 0, 'amount', 0, 0, 4, 400, 'cash', 'completed', $4::jsonb) AS r`,
      [
        `${invPrefix}-SALE-1`,
        branchId,
        warehouseId,
        JSON.stringify([{ product_id: productId, unit_name: 'piece', quantity: 4, unit_price: 100, discount_amount: 0, bonus_quantity: 0, total: 400 }]),
      ],
    );
    const sr = sale.rows[0].r;
    expect(sr.success).toBe(true);
    if (!sr.success) throw new Error(JSON.stringify(sr));

    const from = new Date(Date.now() - 60_000).toISOString();
    const to = new Date(Date.now() + 60_000).toISOString();
    const res = await client.query(
      `SELECT public.costing_profitability_report($1, $2::timestamptz, $3::timestamptz) AS r`,
      [branchId, from, to],
    );
    expect(res.rows.length).toBeGreaterThan(0);
    const row = res.rows[0].r;
    expect(row.product_id).toBe(productId);
    expect(Number(row.units_sold)).toBe(4);
    expect(Number(row.revenue)).toBe(400);
    // theoretical = current recipe unit cost (12.25) x units sold
    expect(Number(row.theoretical_cost)).toBeCloseTo(49, 2);
    // actual COGS = FIFO cost of goods (10/unit) x 4
    expect(Number(row.actual_cogs)).toBeCloseTo(40, 2);
    expect(Number(row.gross_profit)).toBeCloseTo(360, 2);
    expect(Number(row.gross_margin_pct)).toBeCloseTo(90, 2);
    expect(Number(row.variance)).toBeCloseTo(-9, 2);
  });
});
