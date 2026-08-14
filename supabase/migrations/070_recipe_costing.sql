-- ============================================================================
-- ERP-02 — Product & Recipe Costing RPCs
-- ----------------------------------------------------------------------------
-- Additive-only (CREATE OR REPLACE FUNCTION; no DDL/DML/data changes).
-- Supplies the branch-scoped costing analytics used by the Costing Center:
--   1. compute_recipe_cost           - per-recipe current cost + breakdown
--   2. recipe_costing_report         - current recipe cost / margin / food cost %
--   3. raw_material_cost_history     - unit-cost history incl. supplier trace
--   4. costing_profitability_report  - revenue vs theoretical vs actual COGS
--
-- Costing rules (matching the manufacturing model in 011/013):
--   * recipe unit cost = SUM(consumed_qty x unit_cost) / yield_quantity
--   * consumed_qty    = recipe_items.quantity x (1 + wastage_percent/100)
--   * raw-material unit_cost = raw_material_inventory.avg_cost (branch);
--     fallback raw_materials.default_cost.
--   * theoretical cost = current active recipe unit cost x units sold.
--   * actual COGS      = -SUM(inventory_ledger.total_cost) for entry_type
--     'sale' rows linked to completed sales (written by _product_inv_remove_fifo
--     via process_sale, FIFO by nearest expiry).
--
-- Branch isolation mirrors the RLS pattern: is_pos_admin() OR branch_id =
-- get_branch_id(). With no auth context (CI/service-role tests) the
-- NULL-tolerant check allows execution, matching process_sale/update_order.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. compute_recipe_cost(p_recipe_id uuid) -> jsonb
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_recipe_cost(p_recipe_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recipe public.recipes%ROWTYPE;
  v_item record;
  v_unit_cost numeric(12,2);
  v_line_cost numeric(12,2);
  v_consumed numeric(14,4);
  v_total numeric(14,2) := 0;
  v_unit_total numeric(14,2) := 0;
  v_items jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO v_recipe FROM public.recipes WHERE id = p_recipe_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'RECIPE_NOT_FOUND');
  END IF;

  -- Branch isolation (mirror of the recipes RLS policy).
  IF NOT is_pos_admin() AND get_branch_id() IS NOT NULL
     AND v_recipe.branch_id <> get_branch_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'BRANCH_MISMATCH');
  END IF;

  FOR v_item IN
    SELECT ri.raw_material_id, ri.quantity, ri.wastage_percent,
           rm.name AS material_name,
           COALESCE(rinv.avg_cost, 0) AS branch_avg,
           COALESCE(rm.default_cost, 0) AS default_cost
      FROM public.recipe_items ri
      JOIN public.raw_materials rm ON rm.id = ri.raw_material_id
      LEFT JOIN public.raw_material_inventory rinv
        ON rinv.raw_material_id = ri.raw_material_id
       AND rinv.branch_id = v_recipe.branch_id
     WHERE ri.recipe_id = p_recipe_id
  LOOP
    IF v_item.branch_avg > 0 THEN
      v_unit_cost := v_item.branch_avg;
    ELSE
      v_unit_cost := v_item.default_cost;
    END IF;

    v_consumed := round(COALESCE(v_item.quantity, 0) * (1 + COALESCE(v_item.wastage_percent, 0) / 100.0), 4);
    v_line_cost := round(v_consumed * v_unit_cost, 2);
    v_total := v_total + v_line_cost;

    v_items := v_items || jsonb_build_object(
      'raw_material_id', v_item.raw_material_id,
      'name', v_item.material_name,
      'quantity', v_item.quantity,
      'wastage_percent', COALESCE(v_item.wastage_percent, 0),
      'consumed_quantity', v_consumed,
      'unit_cost', v_unit_cost,
      'line_cost', v_line_cost
    );
  END LOOP;

  IF COALESCE(v_recipe.yield_quantity, 1) > 0 THEN
    v_unit_total := round(v_total / v_recipe.yield_quantity, 2);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'recipe_id', v_recipe.id,
    'product_id', v_recipe.product_id,
    'branch_id', v_recipe.branch_id,
    'name', v_recipe.name,
    'yield_quantity', v_recipe.yield_quantity,
    'total_cost', v_total,
    'unit_cost', v_unit_total,
    'items', v_items
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. recipe_costing_report(p_branch_id uuid DEFAULT NULL)
--    One row per active recipe: current cost, margin, food-cost %.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recipe_costing_report(p_branch_id uuid DEFAULT NULL)
 RETURNS TABLE (
   product_id uuid,
   product_name text,
   category_id uuid,
   branch_id uuid,
   recipe_id uuid,
   recipe_name text,
   yield_quantity numeric,
   sale_price numeric,
   recipe_cost numeric,
   gross_margin numeric,
   gross_margin_pct numeric,
   food_cost_pct numeric
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_eff_branch uuid;
  v_recipe record;
  v_cost jsonb;
  v_unit_cost numeric(12,2);
BEGIN
  IF NOT is_pos_admin() AND get_branch_id() IS NOT NULL THEN
    IF p_branch_id IS NOT NULL AND p_branch_id <> get_branch_id() THEN
      RETURN;
    END IF;
    v_eff_branch := get_branch_id();
  ELSE
    v_eff_branch := p_branch_id;
  END IF;

  FOR v_recipe IN
    SELECT r.id AS recipe_id, r.name AS recipe_name, r.yield_quantity,
           r.branch_id, r.product_id,
           p.name AS product_name, p.category_id,
           COALESCE(p.sale_price, 0) AS sale_price
      FROM public.recipes r
      JOIN public.products p ON p.id = r.product_id
     WHERE r.is_active
       AND (v_eff_branch IS NULL OR r.branch_id = v_eff_branch)
     ORDER BY p.name, r.branch_id
  LOOP
    v_cost := public.compute_recipe_cost(v_recipe.recipe_id);
    IF NOT (v_cost->>'success')::boolean THEN
      CONTINUE;
    END IF;
    v_unit_cost := round((v_cost->>'unit_cost')::numeric, 2);

    product_id       := v_recipe.product_id;
    product_name     := v_recipe.product_name;
    category_id      := v_recipe.category_id;
    branch_id        := v_recipe.branch_id;
    recipe_id        := v_recipe.recipe_id;
    recipe_name      := v_recipe.recipe_name;
    yield_quantity   := v_recipe.yield_quantity;
    sale_price       := v_recipe.sale_price;
    recipe_cost      := v_unit_cost;
    gross_margin     := round(v_recipe.sale_price - v_unit_cost, 2);
    gross_margin_pct := CASE WHEN v_recipe.sale_price > 0
                          THEN round((v_recipe.sale_price - v_unit_cost) / v_recipe.sale_price * 100, 2)
                          ELSE 0 END;
    food_cost_pct    := CASE WHEN v_recipe.sale_price > 0
                          THEN round(v_unit_cost / v_recipe.sale_price * 100, 2)
                          ELSE 0 END;
    RETURN NEXT;
  END LOOP;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. raw_material_cost_history(p_raw_material_id uuid DEFAULT NULL,
--                               p_branch_id uuid DEFAULT NULL)
--    Every raw-material lot with its unit cost; purchase lots carry the
--    supplier trace (roadmap: unit cost history, cost history, supplier
--    impact on product cost).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.raw_material_cost_history(p_raw_material_id uuid DEFAULT NULL, p_branch_id uuid DEFAULT NULL)
 RETURNS TABLE (
   raw_material_id uuid,
   raw_material_name text,
   unit_id uuid,
   category text,
   branch_id uuid,
   unit_cost numeric,
   quantity numeric,
   batch_number text,
   source_type text,
   supplier_id uuid,
   supplier_name text,
   occurred_at timestamptz
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_eff_branch uuid;
BEGIN
  IF NOT is_pos_admin() AND get_branch_id() IS NOT NULL THEN
    IF p_branch_id IS NOT NULL AND p_branch_id <> get_branch_id() THEN
      RETURN;
    END IF;
    v_eff_branch := get_branch_id();
  ELSE
    v_eff_branch := p_branch_id;
  END IF;

  RETURN QUERY
    SELECT rb.raw_material_id,
           rm.name AS raw_material_name,
           rm.unit_id,
           rm.category,
           rb.branch_id,
           rb.unit_cost,
           rb.quantity,
           rb.batch_number,
           rb.source_type,
           p.supplier_id,
           s.name AS supplier_name,
           rb.created_at AS occurred_at
      FROM public.raw_material_batches rb
      JOIN public.raw_materials rm ON rm.id = rb.raw_material_id
      LEFT JOIN public.purchases p ON p.id = rb.source_id AND rb.source_type = 'purchase'
      LEFT JOIN public.suppliers s ON s.id = p.supplier_id
     WHERE (p_raw_material_id IS NULL OR rb.raw_material_id = p_raw_material_id)
       AND (v_eff_branch IS NULL OR rb.branch_id = v_eff_branch)
     ORDER BY rb.created_at DESC;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. costing_profitability_report(p_branch_id uuid, p_from timestamptz,
--                                 p_to timestamptz)
--    Per product: units sold, revenue, theoretical cost (current recipe),
--    actual COGS (FIFO ledger), gross profit, margin %, variance.
--    Roadmap: theoretical vs actual, branch/product profitability.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.costing_profitability_report(p_branch_id uuid, p_from timestamptz, p_to timestamptz)
 RETURNS TABLE (
   product_id uuid,
   product_name text,
   category_id uuid,
   units_sold numeric,
   revenue numeric,
   theoretical_cost numeric,
   actual_cogs numeric,
   gross_profit numeric,
   gross_margin_pct numeric,
   variance numeric
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row record;
  v_recipe_id uuid;
  v_cost jsonb;
  v_recipe_cost numeric(12,2) := 0;
BEGIN
  IF p_branch_id IS NULL OR p_from IS NULL OR p_to IS NULL THEN
    RETURN;
  END IF;

  IF NOT is_pos_admin() AND get_branch_id() IS NOT NULL AND p_branch_id <> get_branch_id() THEN
    RETURN;
  END IF;

  FOR v_row IN
    WITH sold AS (
      SELECT si.product_id,
             SUM(si.quantity) AS units_sold,
             SUM(si.total)    AS revenue
        FROM public.sale_items si
        JOIN public.sales s ON s.id = si.sale_id
       WHERE s.branch_id = p_branch_id
         AND s.status = 'completed'
         AND s.created_at >= p_from
         AND s.created_at <= p_to
       GROUP BY si.product_id
    ),
    cogs AS (
      SELECT il.product_id,
             -SUM(il.total_cost) AS actual_cogs
        FROM public.inventory_ledger il
        JOIN public.sales s ON s.id = il.reference_id AND s.status = 'completed'
       WHERE il.entry_type = 'sale'
         AND il.branch_id = p_branch_id
         AND s.created_at >= p_from
         AND s.created_at <= p_to
       GROUP BY il.product_id
    )
    SELECT p.id AS product_id,
           p.name AS product_name,
           p.category_id,
           sd.units_sold,
           sd.revenue,
           COALESCE(cg.actual_cogs, 0) AS actual_cogs
      FROM sold sd
      JOIN public.products p ON p.id = sd.product_id
      LEFT JOIN cogs cg ON cg.product_id = sd.product_id
     ORDER BY sd.revenue DESC
  LOOP
    v_recipe_cost := 0;
    SELECT r.id INTO v_recipe_id
      FROM public.recipes r
     WHERE r.product_id = v_row.product_id
       AND r.branch_id = p_branch_id
       AND r.is_active
     ORDER BY r.updated_at DESC
     LIMIT 1;
    IF v_recipe_id IS NOT NULL THEN
      v_cost := public.compute_recipe_cost(v_recipe_id);
      IF (v_cost->>'success')::boolean THEN
        v_recipe_cost := round((v_cost->>'unit_cost')::numeric, 2);
      END IF;
    END IF;

    product_id       := v_row.product_id;
    product_name     := v_row.product_name;
    category_id      := v_row.category_id;
    units_sold       := v_row.units_sold;
    revenue          := v_row.revenue;
    theoretical_cost := round(v_recipe_cost * v_row.units_sold, 2);
    actual_cogs      := v_row.actual_cogs;
    gross_profit     := round(v_row.revenue - v_row.actual_cogs, 2);
    gross_margin_pct := CASE WHEN v_row.revenue > 0
                          THEN round((v_row.revenue - v_row.actual_cogs) / v_row.revenue * 100, 2)
                          ELSE 0 END;
    variance         := round(v_row.actual_cogs - theoretical_cost, 2);
    RETURN NEXT;
  END LOOP;
END;
$function$;
