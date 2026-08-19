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
- Current HEAD before final add-action CI: `109e98d3fd29224bcf028b6f9a27b14a98c1d165`
- PR state: Open, not merged

## Current Status

**Phase: Products-page integration**

Status: **IN PROGRESS**

The CI baseline is green. The main Products-page Add action is now wired to the unified wizard. Final CI for this change must be green before the phase is considered complete.

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

Latest fully green CI baseline was `Verify main #250`:

- lint: ✅
- typecheck: ✅
- test suite typecheck: ✅
- unit tests: ✅
- build: ✅
- schema verification: ✅
- integration/security/RLS: ✅
- browser smoke: ✅

### 3. Database compatibility and integration-test stabilization

Status: ✅

Completed migrations:

- `092_production_raw_material_compatibility.sql`
- `093_phase2_schema_compatibility.sql`
- `094_fix_inventory_unit_production_branch_resolution.sql`

Completed integration-test transaction isolation fixes in:

- `tests/integration/phase2_kitchen_routing.test.ts`
- `tests/integration/phase2_production_variance.test.ts`
- `tests/integration/phase2_waste_center.test.ts`

The final six DB failures were eliminated; `Verify main #250` confirmed the DB job green.

### 4. Browser smoke stabilization

Status: ✅

Browser smoke now uses the Playwright container image with Chromium and dependencies preinstalled instead of running `npx playwright install --with-deps chromium` inside the job.

This removed the long/hanging browser dependency installation step. `Verify main #250` confirmed Browser Smoke green.

### 5. Products-page Add action integration

Status: ✅ code updated; awaiting fresh CI

File:

`src/features/catalog/pages/ProductsPage.tsx`

Change:

- Main **Add Product** button (`data-testid="products-add"`) now navigates to `/products/setup`.
- Existing **Edit Product** flow remains unchanged and continues to use the legacy edit modal.
- Import/export actions remain unchanged.
- No POS or inventory deduction logic was changed.

This establishes a single primary creation path for new products while preserving the existing edit workflow.

## Latest Confirmed CI

`Verify main #250` — all jobs green:

- Verify ✅
- DB ✅
- Browser Smoke ✅

The next run must validate the Products-page Add action change.

## Immediate Next Actions

### Phase A — Validate Products-page Add action

Status: 🔄 awaiting CI

1. Confirm lint/typecheck/unit/build remain green.
2. Confirm DB integration/security/RLS remain green.
3. Confirm browser smoke remains green.
4. Confirm the Products-page Add action reaches `/products/setup`.

### Phase B — End-to-end product hierarchy validation

After Phase A is green:

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

### Phase C — Final PR gate

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
| 2026-08-19 | `094_fix_inventory_unit_production_branch_resolution.sql` | Production branch resolution | ✅ |
| 2026-08-19 | Phase 2 expected-error SAVEPOINT fixes | Integration tests | ✅ |
| 2026-08-19 | Verify main #250 | Full CI baseline | ✅ all jobs green |
| 2026-08-19 | Browser smoke container change | CI | ✅ |
| 2026-08-19 | `109e98d3...` | Products-page Add → unified wizard | 🔄 awaiting CI |
| 2026-08-19 | `PRODUCT_SETUP_MASTER_LOG.md` | Project governance | ✅ persistent source of truth |

## Do Not Forget

- Update this file after **every** meaningful step.
- Record exact commit SHA and CI run for each stabilization step.
- Never claim a green result before GitHub Actions confirms it.
- Do not merge while any required verification job is red.
- Keep the legacy product/unit model untouched unless a compatibility migration is explicitly required.
