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
- Current HEAD before next fix cycle: `c0899a9552c2c520236c4bc04fb625dd6dfb044a`
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

Status: ⚠️ partially fixed; negative-test callbacks still require explicit rollback before outer SAVEPOINT release

Updated tests:

- `tests/integration/phase2_kitchen_routing.test.ts`
- `tests/integration/phase2_production_variance.test.ts`
- `tests/integration/phase2_waste_center.test.ts`

The outer `asAdmin` helper now has SAVEPOINT handling, but the negative tests use `expect(...).rejects.toThrow()` inside the callback. That consumes the rejection inside the assertion, so the outer helper still attempts to release an aborted SAVEPOINT. This is now a confirmed root cause of 5 of the remaining 6 failures.

### 5. Master execution log

Status: ✅ created and checkpointed

This file is now the required execution ledger for this branch. Every future edit or CI result must be added here before moving to another phase.

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

This is an improvement from the previous checkpoint of 205 passed / 9 failed.

### Remaining failures and root causes

#### A. Negative-error tests leave their SAVEPOINT aborted — 5 failures

Affected tests:

- kitchen: `route_to_station rejects invalid station`
- production: `produce_inventory_unit rejects non-manufactured unit`
- production: `produce_inventory_unit rejects non-positive quantity`
- waste: `approve_waste rejects if already approved`
- waste: `create_waste_entry rejects invalid waste_type`

Observed error:

`current transaction is aborted, commands ignored until end of transaction block`

The intended RPC error occurs correctly, but the test assertion catches it inside `expect(...).rejects.toThrow()` and the enclosing helper then tries to `RELEASE SAVEPOINT` without first rolling back to that savepoint.

Required fix: introduce/use an explicit expected-error helper that performs `ROLLBACK TO SAVEPOINT` after catching the expected database error and only then releases the savepoint.

#### B. `produce_inventory_unit` does not resolve branch when omitted — 1 failure

Observed error:

`null value in column "branch_id" of relation "raw_material_batches" violates not-null constraint`

The test calls:

`produce_inventory_unit(unit_id, quantity, warehouse_id)`

The current function reaches an insert with `p_branch_id = NULL` even though the warehouse has a valid `branch_id`.

Required fix: preserve the public function contract and resolve `p_branch_id` from `warehouses.branch_id` (with `get_branch_id()` as a final fallback) before the branch-scoped raw-material batch writes.

Do not make the raw-material batch table warehouse-scoped; the canonical schema is branch-scoped.

## Immediate Next Actions

### Phase A — Fix the final 6 DB integration failures

Status: 🔄 in progress

1. Add an explicit expected-error SAVEPOINT helper to the three Phase 2 integration test files.
2. Make `produce_inventory_unit` derive `branch_id` from the selected warehouse when the argument is null/omitted.
3. Add/update a new migration only; do not edit historical migrations.
4. Run the complete DB integration/security/RLS test suite again.
5. Record the exact CI run and failure count before any new phase.

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
| 2026-08-19 | `092_production_raw_material_compatibility.sql` | Production DB compatibility | ✅ applied; production call path still needs branch resolution |
| 2026-08-19 | `093_phase2_schema_compatibility.sql` | Kitchen/production schema compatibility | ✅ schema verification; removed table_number/warehouse_id mismatches |
| 2026-08-19 | Savepoint isolation fixes | Integration tests | ⚠️ outer helper fixed; expected-error helper still required |
| 2026-08-19 | Verify main #240 | CI checkpoint | ⚠️ verify ✅; DB 208/214 passed, 6 failed |
| 2026-08-19 | `PRODUCT_SETUP_MASTER_LOG.md` | Project governance | ✅ persistent source of truth |

## Do Not Forget

- Update this file after **every** meaningful step.
- Record exact commit SHA and CI run for each stabilization step.
- Never claim a green result before GitHub Actions confirms it.
- Do not merge while any required verification job is red.
- Keep the legacy product/unit model untouched unless a compatibility migration is explicitly required.
