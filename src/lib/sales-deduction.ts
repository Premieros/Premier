import { supabase } from '@/api/client';

export interface DeductionItem {
  product_id: string;
  quantity: number;
}

export interface UnitDeduction {
  unit_id: string;
  unit_name: string;
  quantity: number;
  unit_type: 'ready' | 'manufactured';
}

export interface RawMaterialDeduction {
  raw_material_id: string;
  raw_material_name: string;
  quantity: number;
  unit_id: string;
  unit_name: string;
}

export interface DeductionResult {
  units_deducted: UnitDeduction[];
  raw_materials_deducted: RawMaterialDeduction[];
  errors: string[];
}

/**
 * Hierarchical deduction engine for sales.
 * Deducts inventory_units linked to products, then cascades
 * raw material deductions for manufactured units.
 */
export async function deductSaleInventory(
  branch_id: string,
  warehouse_id: string,
  items: DeductionItem[],
): Promise<DeductionResult> {
  const result: DeductionResult = {
    units_deducted: [],
    raw_materials_deducted: [],
    errors: [],
  };

  if (!items.length) return result;

  const productIds = [...new Set(items.map((i) => i.product_id))];

  // 1. Fetch product → unit links
  const { data: links, error: linkErr } = await supabase
    .from('product_unit_links')
    .select('product_id, unit_id, quantity, unit:inventory_units(id, name, unit_type)')
    .in('product_id', productIds);

  if (linkErr) {
    result.errors.push(`Failed to fetch unit links: ${linkErr.message}`);
    return result;
  }

  if (!links?.length) return result;

  // 2. Build per-unit deduction quantities
  const unitQtyMap = new Map<string, { name: string; type: 'ready' | 'manufactured'; total: number }>();

  for (const item of items) {
    const itemLinks = links.filter((l) => l.product_id === item.product_id);
    for (const link of itemLinks) {
      const unit = link.unit as unknown as { id: string; name: string; unit_type: string };
      if (!unit) continue;
      const key = link.unit_id;
      const existing = unitQtyMap.get(key);
      const addQty = item.quantity * Number(link.quantity);
      if (existing) {
        existing.total += addQty;
      } else {
        unitQtyMap.set(key, {
          name: unit.name,
          type: unit.unit_type as 'ready' | 'manufactured',
          total: addQty,
        });
      }
    }
  }

  // 3. Deduct inventory_unit batches
  for (const [unitId, info] of unitQtyMap) {
    let remaining = info.total;

    const { data: batches } = await supabase
      .from('inventory_unit_batches')
      .select('id, quantity, unit_cost')
      .eq('unit_id', unitId)
      .eq('branch_id', branch_id)
      .order('created_at', { ascending: true });

    if (!batches?.length) {
      result.errors.push(`No stock for unit ${info.name}`);
      continue;
    }

    for (const batch of batches) {
      if (remaining <= 0) break;
      const deduct = Math.min(remaining, Number(batch.quantity));
      const { error: updateErr } = await supabase
        .from('inventory_unit_batches')
        .update({ quantity: Number(batch.quantity) - deduct })
        .eq('id', batch.id);
      if (updateErr) {
        result.errors.push(`Failed to deduct batch for ${info.name}: ${updateErr.message}`);
        continue;
      }

      // Create ledger entry
      await supabase.from('inventory_unit_entries').insert({
        unit_id: unitId,
        branch_id,
        warehouse_id,
        quantity: -deduct,
        unit_cost: Number(batch.unit_cost),
        entry_type: 'sale',
        reference_type: 'sale',
        reference_id: null,
        batch_number: batch.id,
      });

      remaining -= deduct;
    }

    if (remaining > 0.001) {
      result.errors.push(`Insufficient stock for ${info.name}: short ${remaining.toFixed(4)}`);
    }

    result.units_deducted.push({
      unit_id: unitId,
      unit_name: info.name,
      quantity: info.total - remaining,
      unit_type: info.type,
    });
  }

  // 4. Cascade: deduct raw materials for manufactured units
  const manufacturedUnits = [...unitQtyMap.entries()].filter(([, info]) => info.type === 'manufactured');

  if (manufacturedUnits.length) {
    const unitIds = manufacturedUnits.map(([id]) => id);

    const { data: recipes } = await supabase
      .from('inventory_unit_recipes')
      .select('unit_id, raw_material_id, quantity, wastage_percent, raw_material:raw_materials(id, name)')
      .in('unit_id', unitIds);

    if (recipes?.length) {
      for (const [unitId, info] of manufacturedUnits) {
        const unitRecipes = recipes.filter((r) => r.unit_id === unitId);
        const unitsProduced = info.total;

        for (const recipe of unitRecipes) {
          const rawQty = unitsProduced * Number(recipe.quantity) * (1 + Number(recipe.wastage_percent) / 100);
          const rawMaterial = recipe.raw_material as unknown as { id: string; name: string };

          // Deduct from raw_material_inventory
          const { data: rmInventory } = await supabase
            .from('raw_material_inventory')
            .select('id, quantity')
            .eq('raw_material_id', recipe.raw_material_id)
            .eq('branch_id', branch_id)
            .order('created_at', { ascending: true });

          if (rmInventory?.length) {
            let rmRemaining = rawQty;
            for (const inv of rmInventory) {
              if (rmRemaining <= 0) break;
              const deduct = Math.min(rmRemaining, Number(inv.quantity));
              await supabase
                .from('raw_material_inventory')
                .update({ quantity: Number(inv.quantity) - deduct })
                .eq('id', inv.id);
              rmRemaining -= deduct;
            }
          }

          result.raw_materials_deducted.push({
            raw_material_id: recipe.raw_material_id,
            raw_material_name: rawMaterial?.name || recipe.raw_material_id,
            quantity: rawQty,
            unit_id: unitId,
            unit_name: info.name,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Compute the cost of inventory_unit batches for margin calculation.
 */
export async function computeUnitStockCost(
  unit_id: string,
  branch_id: string,
): Promise<{ total_qty: number; total_cost: number; weighted_avg: number }> {
  const { data: batches } = await supabase
    .from('inventory_unit_batches')
    .select('quantity, unit_cost')
    .eq('unit_id', unit_id)
    .eq('branch_id', branch_id);

  if (!batches?.length) return { total_qty: 0, total_cost: 0, weighted_avg: 0 };

  let totalQty = 0;
  let totalCost = 0;
  for (const b of batches) {
    totalQty += Number(b.quantity);
    totalCost += Number(b.quantity) * Number(b.unit_cost);
  }

  return {
    total_qty: totalQty,
    total_cost: totalCost,
    weighted_avg: totalQty > 0 ? totalCost / totalQty : 0,
  };
}
