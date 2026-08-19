# Product Setup — Master Execution Log

> **Persistent source of truth for the unified Product → Units → Recipes → Production work on `agent/product-setup-flow`. Read this file before every edit, update it after every meaningful change, CI result, bug, architectural decision, or phase transition. Do not advance to the next phase until the current phase is recorded and its validation state is explicit.**

## Scope

Goal: unify product creation around the hierarchy:

`Product → Inventory Units → Ready/Manufactured → Unit Recipe → Production → Inventory → POS deduction`

Rules:

- Do not touch `main` directly.
- Do not create duplicate raw materials or inventory units when an existing entity can be reused.
- Preserve branch isolation and RLS.
- Do not alter existing POS deduction behavior unless explicitly required and tested.
- Every database change must be a new migration; do not rewrite historical migrations.
- Every CI failure must be recorded with root cause and resolution.

## Current Branch

- Branch: `agent/product-setup-flow`
- Base: `main`
- PR: `#8` — Implement unified product setup flow
- Current HEAD: `1d95d62e53a10a3c10909e2f6227ee43b060d4b2` before this log checkpoint commit
- PR state: Open, not merged

## Current Status

**Phase: CI stabilization before final product-flow integration**

Status: **IN PROGRESS**

The product setup wizard exists, but final CI is not green yet. Do not merge the PR or declare the product flow complete until DB integration tests and the final verification gate are green.

## Work Completed

### 1. Unified product setup wizard

Status: ✅ implemented

Flow:

1. Product details
2. Select/add inventory units
3. For each unit choose ready vs manufactured sourcing
4. Configure manufactured-unit recipe
5. Review hierarchy
6. Save using the newer unit hierarchy

Primary route:

`/products/setup`

Permission:

`products.manage`

Canonical tables used by the wizard:

- `inventory_units`
- `product_unit_links`
- `inventory_unit_recipes`

The wizard intentionally avoids introducing a third product/unit model.

### 2. Lint/typecheck/build stabilization

Status: ✅

Latest confirmed CI verification job:

- lint: ✅
- typecheck: ✅
- test suite typecheck: ✅
- unit tests: ✅
- build: ✅
- schema verification: ✅

Schema verification reported:

- 60/60 tables
- 65/65 functions
- 92/92 contract RPCs

### 3. Production raw-material compatibility

Status: ✅ implemented

Migration:

`092_production_raw_material_compatibility.sql`

Reason: `produce_inventory_unit` expected `deduct_raw_material_inventory(...)`, while the canonical branch-scoped FIFO helper already present in the system is `_raw_remove_fifo(...)`.

The migration adds a compatibility wrapper and delegates to the canonical FIFO implementation.

### 4. Integration-test transaction isolation

Status: ✅ fixed in code; awaiting CI confirmation

Updated tests:

- `tests/integration/phase2_kitchen_routing.test.ts`
- `tests/integration/phase2_production_variance.test.ts`
- `tests/integration/phase2_waste_center.test.ts`

Each file now has an explicit expected-error helper that catches the database error, rolls back to a nested SAVEPOINT, then releases that SAVEPOINT before returning to the enclosing transaction. This removes the secondary `25P02` failures from intentionally rejected RPC calls.

### 5. Production branch resolution

Status: ✅ fixed in code; awaiting CI confirmation

New migration:

`094_fix_inventory_unit_production_branch_resolution.sql`

The `produce_inventory_unit(uuid,numeric,uuid,uuid,text)` RPC now resolves a missing branch from the selected warehouse, requires the warehouse to have a branch, and rejects a branch/warehouse mismatch. The raw-material batch model remains branch-scoped.

## Latest Known CI Result

Run: `Verify main #240` (PR #8 merge ref `b8628b8...`)

Verification job:

- lint ✅
- typecheck ✅
- typecheck application/test suites ✅
- unit tests ✅
- build ✅

DB integration:

- **208 passed / 214 total**
- **6 failed**
- 3 integration files affected

This was an improvement from the previous checkpoint of 205 passed / 9 failed.

The six failures were traced to two root causes, both now addressed in code on the branch.

### Root cause A — expected-error SAVEPOINT handling (5 failures)

Affected tests:

- kitchen: `route_to_station rejects invalid station`
- production: `produce_inventory_unit rejects non-manufactured unit`
- production: `produce_inventory_unit rejects non-positive quantity`
- waste: `approve_waste rejects if already approved`
- waste: `create_waste_entry rejects invalid waste_type`

Observed secondary failure:

`current transaction is aborted, commands ignored until end of transaction block`

The RPC errors themselves were correct. The test assertion consumed the rejection before the outer helper could roll back the failed SAVEPOINT. This is now fixed by nested explicit `expectDbError` helpers.

### Root cause B — missing production branch (1 failure)

Observed error:

`null value in column "branch_id" of relation "raw_material_batches" violates not-null constraint`

`produce_inventory_unit(unit_id, quantity, warehouse_id)` was using a null default branch in the CI admin context. Migration `094_fix_inventory_unit_production_branch_resolution.sql` now derives the branch from the warehouse and validates the warehouse/branch relationship before any raw-material movement.

## Immediate Next Actions

### Phase A — Verify the final six DB fixes

Status: 🔄 awaiting CI

1. Confirm the three expected-error helpers leave transactions clean.
2. Confirm `produce_inventory_unit(unit_id, quantity, warehouse_id)` completes successfully.
3. Confirm negative production tests still reject invalid unit type and non-positive quantity.
4. Confirm waste and kitchen negative tests remain isolated.
5. Record the new CI run and exact pass/fail counts.

### Phase B — CI verification

Run and record:

- lint
- typecheck
- unit tests
- build
- schema verification
- integration/security/RLS tests
- browser smoke if enabled by the workflow

Target: **all green**.

### Phase C — Connect the Products page

After CI is green:

- Make the main Products-page `Add Product` action open the unified wizard.
- Ensure there is only one primary product-creation path.
- Keep import/export and existing product list behavior intact.

### Phase D — End-to-end product hierarchy test

Validate this exact scenario:

`Burger Product`

→ `Burger Unit` (ready)

→ `Special Sauce Unit` (manufactured)

→ Recipe:

- mayonnaise
- ketchup
- spices

→ Production order for sauce

→ raw-material deduction

→ finished unit batch

→ product sale

→ hierarchical inventory deduction

Also verify:

- no duplicate unit creation
- branch isolation
- RLS
- cost calculation
- production history
- batch tracking

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
| 2026-08-19 | Remove unused `ReportDeepLinkPage` | Routes/lint | ✅ |
| 2026-08-19 | TypeScript/report/excel fixes | Verify gate | ✅ lint/typecheck/build |
| 2026-08-19 | `092_production_raw_material_compatibility.sql` | Production DB compatibility | ✅ applied; final branch resolution pending at that checkpoint |
| 2026-08-19 | `093_phase2_schema_compatibility.sql` | Kitchen/production schema compatibility | ✅ schema verification; removed table_number/warehouse_id mismatches |
| 2026-08-19 | `af6ab058...` | Kitchen expected-error transaction isolation | ✅ code updated |
| 2026-08-19 | `3d0bb5f4...` | Production expected-error transaction isolation | ✅ code updated |
| 2026-08-19 | `cb42db6f...` | Waste expected-error transaction isolation | ✅ code updated |
| 2026-08-19 | `1d95d62e...` | `094_fix_inventory_unit_production_branch_resolution.sql` | ✅ migration added |
| 2026-08-19 | Verify main #240 | CI checkpoint | ⚠️ verify ✅; DB 208/214 passed, 6 failed |
| 2026-08-19 | `PRODUCT_SETUP_MASTER_LOG.md` | Project governance | ✅ persistent source of truth |

## Do Not Forget

- Update this file after **every** meaningful step.
- Record exact commit SHA and CI run for each stabilization step.
- Never claim a green result before GitHub Actions confirms it.
- Do not merge while any required verification job is red.
- Keep the legacy product/unit model untouched unless a compatibility migration is explicitly required.
