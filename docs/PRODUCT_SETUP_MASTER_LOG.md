# Product Setup — Master Execution Log

> **Persistent source of truth for the unified Product → Units → Recipes → Production work on `agent/product-setup-flow`. Read this file before every edit, update it after every meaningful change, CI result, bug, architectural decision, or phase transition. Do not advance to the next phase until the current phase is recorded and its validation state is explicit.**

## Scope

Goal: enforce the hierarchy:

`Raw Materials → Manufacturing → Inventory Units → Products → Sale`

Rules:

- Do not touch `main` directly.
- Do not create duplicate raw materials or inventory units when an existing entity can be reused.
- Preserve branch isolation and RLS.
- Raw materials are consumed by manufacturing only; sales do not deduct raw materials directly.
- Products use inventory units as their sellable components.
- Manufactured units own their recipes.
- Every database change must be a new migration; do not rewrite historical migrations.
- Every CI failure must be recorded with root cause and resolution.

## Current Branch

- Branch: `agent/product-setup-flow`
- Base: `main`
- PR: `#8` — Implement unified product setup flow
- Current HEAD: `b9de36587e86509b110a4228bf50c83a8e69206f`
- PR state: Open, not merged

## Current Status

**Phase: Unit-centered inventory model**

Status: **IN PROGRESS**

The product Add flow is wired to the new wizard. The next model change is to make inventory units the only sellable component layer: ready units enter inventory directly; manufactured units receive stock only through production; their recipes are owned by the unit; product sales deduct units only.

## Work Completed

### 1. Unified product setup wizard

Status: ✅ implemented

Primary route:

`/products/setup`

Canonical tables:

- `inventory_units`
- `product_unit_links`
- `inventory_unit_recipes`

### 2. Full CI stabilization baseline

Status: ✅

Latest fully green baseline:

`Verify main #250`

- lint ✅
- typecheck ✅
- test suite typecheck ✅
- unit tests ✅
- build ✅
- schema verification ✅
- integration/security/RLS ✅
- browser smoke ✅

### 3. Products-page Add action

Status: ✅ code implemented; fresh CI validation required after later model changes

Main Add action now opens:

`/products/setup`

Existing Edit flow and import/export remain unchanged.

### 4. Sales deduction model changed to unit-only

Commit:

`717c3587e87dd90768743a3283b2abf01448b608`

File:

`src/lib/sales-deduction.ts`

New rule:

- Sale → product → linked inventory units → deduct unit batches only.
- No `inventory_unit_recipes` lookup during sale.
- No `raw_material_inventory` mutation during sale.
- `raw_materials_deducted` remains empty for sale operations.

Reason: raw materials have already been consumed when a manufactured unit is produced. Deducting them again at sale would double-consume stock.

### 5. Unit-owned recipe management

Commit:

`b9de36587e86509b110a4228bf50c83a8e69206f`

File:

`src/features/catalog/pages/InventoryUnitsPage.tsx`

Changes:

- Manufactured units now have a visible Recipe action.
- Recipe editor loads active raw materials.
- Recipe rows support quantity and wastage percentage.
- Save replaces the unit recipe in `inventory_unit_recipes`.
- Ready units do not expose a recipe editor.
- UI explicitly states that raw materials are consumed by manufacturing, not sale.

## Current Architecture Decision

The intended source of truth is now:

`Raw Material`
→ `Unit Recipe`
→ `Manufacturing`
→ `Inventory Unit Batch`
→ `Product Unit Link`
→ `Sale`

Examples:

- Ready unit: purchased/received/added → unit stock increases directly.
- Manufactured unit: production order → recipe consumes raw materials → unit batch increases.
- Product sale: unit stock decreases only.

## Immediate Next Actions

### Phase A — Validate current commits

Status: 🔄 awaiting CI

1. Confirm lint/typecheck/unit/build remain green.
2. Confirm DB integration/security/RLS remain green.
3. Confirm browser smoke remains green.
4. Confirm manufactured-unit Recipe UI compiles and renders.

### Phase B — Convert manufacturing to unit-centered production

Status: ⏳ next

The existing `ProductionOrdersPage` still starts from manufactured **products** and legacy `recipes/recipe_items`.

Replace the primary manufacturing flow with:

`Manufactured Inventory Unit → Unit Recipe → Produce Unit → Consume Raw Materials → Create Unit Batch`

The existing `produce_inventory_unit(uuid,numeric,uuid,uuid,text)` RPC already follows this unit-centered concept. fileciteturn64file0L1-L3

The legacy product production flow must not become the source of truth for the new model.

### Phase C — Product composition validation

After unit production is green, validate:

`Product`
→ `Product Unit Links`
→ `Ready Unit / Manufactured Unit`
→ `Unit stock`

No product-level raw-material Recipe should be required for the new flow.

### Phase D — End-to-end test

Validate exactly:

`Mayonnaise 100`

→ manufacture `Burger Sauce 20`

→ raw material stock decreases according to the unit Recipe

→ `Burger Sauce` unit stock increases by 20

→ product `Chicken Burger` links to `Burger Sauce × 1`

→ sell 2 Chicken Burgers

→ `Burger Sauce` stock decreases by 2

→ mayonnaise stock does **not** decrease again.

Also verify:

- branch isolation
- RLS
- FIFO/batch behavior
- unit cost
- production history
- audit log

### Phase E — Final PR gate

Only when all validations are green:

- review PR diff against `main`
- verify no unintended files changed
- update this log
- mark Product Setup phase complete
- merge only after explicit final review

## Change Ledger

| Date | Commit/Action | Area | Result |
|---|---|---|---|
| 2026-08-19 | Product setup wizard work | Frontend/product flow | ✅ |
| 2026-08-19 | `109e98d3...` | Products-page Add → unified wizard | ✅ code |
| 2026-08-19 | Verify main #250 | Full CI baseline | ✅ all jobs green |
| 2026-08-19 | Verify main #252 | Products Add lint regression | ❌ fixed |
| 2026-08-19 | `717c3587...` | Sales deduction → units only | ✅ code |
| 2026-08-19 | `b9de3658...` | Unit-owned Recipe editor | ✅ code |
| 2026-08-19 | `PRODUCT_SETUP_MASTER_LOG.md` | Project governance | ✅ |

## Do Not Forget

- Update this file after every meaningful step.
- Record exact commit SHA and CI run for each stabilization step.
- Never claim a green result before GitHub Actions confirms it.
- Do not merge while any required verification job is red.
- Legacy product recipes may remain for compatibility, but they must not supersede the unit-centered source of truth.
