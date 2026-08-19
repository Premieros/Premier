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
  /** Raw materials are intentionally never mutated by sale deduction.
   * They are consumed only by manufacturing operations. */
  raw_materials_deducted: RawMaterialDeduction[];
  errors: string[];
}

/**
 * Sales deduction is intentionally unit-based only.
 * Product -> inventory unit links determine what is deducted.
 * Raw materials are consumed during manufacturing, not at sale time.
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

  const { data: links, error: linkErr } = await supabase
    .from('product_unit_links')
    .select('product_id, unit_id, quantity, unit:inventory_units(id, name, unit_type)')
    .in('product_id', productIds);

  if (linkErr) {
    result.errors.push(`Failed to fetch unit links: ${linkErr.message}`);
    return result;
  }

  if (!links?.length) return result;

  const unitQtyMap = new Map<string, { name: string; type: 'ready' | 'manufactured'; total: number }>();

  for (const item of items) {
    const itemLinks = links.filter((l) => l.product_id === item.product_id);
    for (const link of itemLinks) {
      const unit = link.unit as unknown as { id: string; name: string; unit_type: string };
      if (!unit) continue;
      const existing = unitQtyMap.get(link.unit_id);
      const addQty = item.quantity * Number(link.quantity);
      if (existing) {
        existing.total += addQty;
      } else {
        unitQtyMap.set(link.unit_id, {
          name: unit.name,
          type: unit.unit_type as 'ready' | 'manufactured',
          total: addQty,
        });
      }
    }
  }

  for (const [unitId, info] of unitQtyMap) {
    let remaining = info.total;

    const { data: batches, error: batchErr } = await supabase
      .from('inventory_unit_batches')
      .select('id, quantity, unit_cost')
      .eq('unit_id', unitId)
      .eq('branch_id', branch_id)
      .order('created_at', { ascending: true });

    if (batchErr) {
      result.errors.push(`Failed to fetch stock for ${info.name}: ${batchErr.message}`);
      continue;
    }

    if (!batches?.length) {
      result.errors.push(`No stock for unit ${info.name}`);
      continue;
    }

    for (const batch of batches) {
      if (remaining <= 0) break;
      const deduct = Math.min(remaining, Number(batch.quantity));
      if (deduct <= 0) continue;

      const { error: updateErr } = await supabase
        .from('inventory_unit_batches')
        .update({ quantity: Number(batch.quantity) - deduct })
        .eq('id', batch.id);
      if (updateErr) {
        result.errors.push(`Failed to deduct batch for ${info.name}: ${updateErr.message}`);
        continue;
      }

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
