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
- Current HEAD: `c0899a9552c2c520236c4bc04fb625dd6dfb044a`
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

Latest confirmed CI before the remaining DB failures:

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

Status: ✅ implemented, awaiting fresh CI confirmation

Migration added:

`092_production_raw_material_compatibility.sql`

Reason: `produce_inventory_unit` expected `deduct_raw_material_inventory(...)`, while the canonical branch-scoped FIFO helper already present in the system is `_raw_remove_fifo(...)`.

The migration adds a compatibility wrapper and delegates to the canonical FIFO implementation.

### 4. Integration-test transaction isolation

Status: ✅ implemented, awaiting fresh CI confirmation

Updated tests:

- `tests/integration/phase2_kitchen_routing.test.ts`
- `tests/integration/phase2_production_variance.test.ts`
- `tests/integration/phase2_waste_center.test.ts`

The tests now isolate expected database errors with SAVEPOINT/ROLLBACK TO SAVEPOINT so one intentionally failing RPC does not poison the enclosing transaction.

## Latest Known CI Result

Run: `Verify main #236` (PR #8 merge ref)

The verify job was green:

- lint ✅
- typecheck ✅
- typecheck application/test suites ✅
- unit tests ✅
- build ✅

DB job was still failing with **9 integration test failures / 205 passed** across 18 files.

### Root causes identified from the failing run

#### A. Kitchen queue RPC schema mismatch

Error:

`column o.table_number does not exist`

Location:

`get_kitchen_queue(text, uuid)`

The RPC created by the current migration references an `orders.table_number` column that is not present in the canonical schema.

#### B. Production RPC schema mismatch

Error:

`column "warehouse_id" of relation "raw_material_batches" does not exist`

Location:

`produce_inventory_unit(uuid,numeric,uuid,uuid,text)`

The canonical `raw_material_batches` table is branch-scoped and does not contain `warehouse_id`.

#### C. SAVEPOINT ordering bug in test helper

The earlier test helper created the SAVEPOINT before setting the service/admin role and then attempted `RELEASE SAVEPOINT` after the RPC had already aborted the transaction. This generated secondary `current transaction is aborted` failures.

The helper has been rewritten so expected failures are rolled back to the SAVEPOINT before release.

## Immediate Next Actions

### Phase A — Database compatibility fix

Status: 🔄 in progress

Add a new migration only (do not edit historical migrations) to:

1. Replace/fix `get_kitchen_queue` so it matches the actual `orders` schema while preserving its public return contract.
2. Replace/fix `produce_inventory_unit` so it writes to the actual `raw_material_batches` schema and continues using branch-scoped FIFO consumption.
3. Preserve existing RLS/security behavior.
4. Keep the public RPC signatures stable unless a compatibility wrapper is required.

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
| 2026-08-19 | `092_production_raw_material_compatibility.sql` | Production DB compatibility | ✅ migration applied in CI; needs final integration confirmation |
| 2026-08-19 | Savepoint isolation fixes | Integration tests | ✅ implemented; needs final CI confirmation |
| 2026-08-19 | Kitchen/production schema compatibility migration (`093`) | DB | 🔄 added; awaiting CI confirmation |

## Do Not Forget

- Update this file after **every** meaningful step.
- Record exact commit SHA and CI run for each stabilization step.
- Never claim a green result before GitHub Actions confirms it.
- Do not merge while any required verification job is red.
- Keep the legacy product/unit model untouched unless a compatibility migration is explicitly required.
