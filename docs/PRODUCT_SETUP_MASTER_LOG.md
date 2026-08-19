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
- Current HEAD after browser workflow change: `41b0f1748e2a739f18f501d610851a62a3740536`
- PR state: Open, not merged

## Current Status

**Phase: CI stabilization before final product-flow integration**

Status: **IN PROGRESS**

The product setup wizard exists, and the application/DB verification gates are green on the latest completed run. Browser Smoke was blocked in Playwright dependency installation, so the workflow was adjusted before considering the final gate complete.

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

Latest completed verification job:

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

### 4. Integration-test transaction isolation

Status: ✅ fixed in code and confirmed by latest DB CI

Updated tests:

- `tests/integration/phase2_kitchen_routing.test.ts`
- `tests/integration/phase2_production_variance.test.ts`
- `tests/integration/phase2_waste_center.test.ts`

Each file now has explicit expected-error handling that rolls back to a nested SAVEPOINT before releasing it.

### 5. Production branch resolution

Status: ✅ fixed and confirmed by latest DB CI

Migration:

`094_fix_inventory_unit_production_branch_resolution.sql`

The `produce_inventory_unit(uuid,numeric,uuid,uuid,text)` RPC resolves a missing branch from the selected warehouse and validates the warehouse/branch relationship. The raw-material batch model remains branch-scoped.

### 6. Browser Smoke workflow stabilization

Status: ✅ workflow updated; awaiting new CI result

Problem observed:

`npx playwright install --with-deps chromium` remained in progress for a prolonged period in GitHub Actions, before the browser test itself could begin.

Fix:

`.github/workflows/verify-main.yml` now runs `browser-smoke` inside:

`mcr.microsoft.com/playwright:v1.55.0-noble`

This image provides Chromium and the required system dependencies up front, so the workflow no longer runs the long `playwright install --with-deps chromium` step.

The browser test itself remains unchanged:

`npx playwright test --project=chromium`

## Latest Known CI Result

Run: `Verify main #248`

Completed jobs:

- verification job ✅
- DB integration/security/RLS ✅
- Browser Smoke was previously blocked in `playwright install --with-deps chromium` and had not reached the test stage.

Because the workflow was changed afterward, a new CI run is required before declaring the final gate green.

## Immediate Next Actions

### Phase A — Validate updated Browser Smoke

Status: 🔄 awaiting CI

1. Confirm the new Playwright container starts successfully.
2. Confirm `npm ci` and project build succeed inside the container.
3. Confirm `npx playwright test --project=chromium` passes.
4. Record the exact CI run and result here.

### Phase B — Connect the Products page

Only after the complete CI gate is green:

- Make the main Products-page `Add Product` action open the unified wizard.
- Ensure there is only one primary product-creation path.
- Keep import/export and existing product list behavior intact.

### Phase C — End-to-end product hierarchy test

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

### Phase D — Final PR gate

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
| 2026-08-19 | `092_production_raw_material_compatibility.sql` | Production DB compatibility | ✅ |
| 2026-08-19 | `093_phase2_schema_compatibility.sql` | Kitchen/production schema compatibility | ✅ |
| 2026-08-19 | `af6ab058...` | Kitchen expected-error transaction isolation | ✅ |
| 2026-08-19 | `3d0bb5f4...` | Production expected-error transaction isolation | ✅ |
| 2026-08-19 | `cb42db6f...` | Waste expected-error transaction isolation | ✅ |
| 2026-08-19 | `1d95d62e...` | `094_fix_inventory_unit_production_branch_resolution.sql` | ✅ |
| 2026-08-19 | Verify main #248 | CI checkpoint | ✅ verify + DB; browser setup blocked |
| 2026-08-19 | `41b0f174...` | Playwright container workflow | 🔄 awaiting CI |
| 2026-08-19 | `PRODUCT_SETUP_MASTER_LOG.md` | Project governance | ✅ persistent source of truth |

## Do Not Forget

- Update this file after **every** meaningful step.
- Record exact commit SHA and CI run for each stabilization step.
- Never claim a green result before GitHub Actions confirms it.
- Do not merge while any required verification job is red.
- Keep the legacy product/unit model untouched unless a compatibility migration is explicitly required.
