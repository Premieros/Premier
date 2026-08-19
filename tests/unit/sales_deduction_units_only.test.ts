import { beforeEach, describe, expect, it, vi } from 'vitest';

let rawMaterialTouched = false;
let unitEntries: Array<Record<string, unknown>> = [];

function makeBuilder(table: string) {
  let result: { data: unknown; error: null } = { data: [], error: null };
  const builder = {
    select() {
      return this;
    },
    in() {
      if (table === 'product_unit_links') {
        result = {
          data: [{ product_id: 'product-1', unit_id: 'unit-sauce', quantity: 1, unit: { id: 'unit-sauce', name: 'Sauce', unit_type: 'manufactured' } }],
          error: null,
        };
      }
      return this;
    },
    eq() {
      if (table === 'inventory_unit_batches') {
        result = { data: [{ id: 'batch-1', quantity: 10, unit_cost: 20 }], error: null };
      }
      if (table === 'raw_material_inventory') rawMaterialTouched = true;
      return this;
    },
    order() {
      return this;
    },
    update() {
      if (table === 'inventory_unit_batches') {
        result = { data: null, error: null };
      }
      if (table === 'raw_material_inventory') rawMaterialTouched = true;
      return this;
    },
    insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
      if (table === 'raw_material_inventory') rawMaterialTouched = true;
      if (table === 'inventory_unit_entries') {
        unitEntries.push(...(Array.isArray(payload) ? payload : [payload]));
      }
      return { data: payload, error: null };
    },
    then(resolve: (value: { data: unknown; error: null }) => unknown) {
      return Promise.resolve(resolve(result));
    },
  };
  return builder;
}

vi.mock('@/api/client', () => ({
  supabase: {
    from(table: string) {
      return makeBuilder(table);
    },
  },
}));

describe('sales deduction — unit inventory only', () => {
  beforeEach(() => {
    rawMaterialTouched = false;
    unitEntries = [];
    vi.resetModules();
  });

  it('deducts the manufactured unit but never mutates raw-material inventory', async () => {
    const { deductSaleInventory } = await import('@/lib/sales-deduction');
    const result = await deductSaleInventory('branch-1', 'warehouse-1', [{ product_id: 'product-1', quantity: 2 }]);

    expect(result.units_deducted).toHaveLength(1);
    expect(result.units_deducted[0].unit_id).toBe('unit-sauce');
    expect(result.units_deducted[0].quantity).toBe(2);
    expect(result.raw_materials_deducted).toHaveLength(0);
    expect(rawMaterialTouched).toBe(false);
    expect(unitEntries).toHaveLength(1);
    expect(unitEntries[0].quantity).toBe(-2);
    expect(unitEntries[0].entry_type).toBe('sale');
  });
});
