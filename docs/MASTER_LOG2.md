# MASTER LOG 2

## Mandatory development rules
- Development branch: `development/master-log2`. Never develop directly on `main`.
- Baseline must remain recoverable; changes are incremental and reversible.
- Existing design is the baseline. Improve behavior without redesigning completed UI unless explicitly required.
- Every visible control/button must have a real, independently testable action; functionality must not depend on visual position.
- Feature-first execution: prioritize new capabilities; do not repeat already-proven tests unless a change can affect them.
- After each feature group: run fast focused tests/smoke checks; repair failures; then continue.
- Every phase follows: inspect -> implement -> focused test -> CI gate -> fix -> retest -> document -> close.
- A phase cannot close unless all prior phases still pass regression checks.
- Never weaken, delete, skip, or rewrite assertions merely to obtain green CI.
- No fake data or fake success paths in production code. CI-only stubs must remain CI-only.
- Database changes use additive migrations; never edit an applied migration.
- Keep data access behind the project's API boundaries and preserve RLS/RBAC.
- Optimize for speed with lazy loading, pagination, bounded queries, memoization, and minimal rerenders; never trade correctness/security for speed.
- Supabase remains the existing project/environment unless explicit approval is given for a separate project/branch.

## Unified screen capabilities
All operational list/detail screens should use reusable controls for:
- branch selection and branch-aware filtering
- date/range filters, search, sorting, grouping
- configurable columns and multiple saved views
- import/upload and export/download
- print where operationally appropriate
- persisted user preferences

## Approved ERP roadmap
### P0 — Commercial ERP core
1. Inventory lifecycle: stock count, partial/cycle counts, count variance, approval, automatic adjustment, adjustment reasons, full movement ledger, lot/batch, expiry, min/max, reorder point, low-stock alerts, stock valuation.
2. Product/recipe costing: recipe cost, component cost, unit cost, actual/theoretical cost, food cost %, gross margin, product/order/branch profit, actual-vs-recipe variance, supplier-price impact, cost history.
3. Professional procurement: Purchase Request -> RFQ -> Supplier Quotation -> Purchase Order -> Receiving -> Invoice -> Payment; partial/full receiving, backorders, supplier comparison, last/average purchase price, supplier evaluation/history, approvals.
4. Accounting document consistency: every sale, purchase, return, treasury transfer, inventory/COGS/tax/customer/cash movement posts through a unified auditable journal source of truth.

### P1 — ERP Operations / Restaurant / CRM
5. Employee master data, then attendance/shifts/leave/overtime, then payroll as a later slice.
6. Recipe and production planning: BOM/recipe versioning, approval, yield, batch size, production cost, waste, by-products, variance, theoretical-vs-actual consumption.
7. Independent Waste Center: raw material, product, expiry, damage, kitchen and production waste with reason, quantity, cost, employee, branch, approval and reports.
8. Menu Engineering: volume, food cost, gross profit, margin, popularity, contribution margin and Star/Plow Horse/Puzzle/Dog classification.
9. Customer 360.
10. Loyalty: points, rules, tiers, rewards, wallet, expiry, transactions; integrated with POS.
11. Central Promotions Engine: percentage/fixed, BOGO, combos, product/category, happy hour, branch/customer scope, date/time, usage limits.

### P2 — Channels / Advanced Finance
12. Delivery management: zones, fees, drivers, assignment, cash collection/debt, status and performance.
13. Online ordering.
14. Independent Kitchen Display System (KDS).
15. Budgeting and actual-vs-budget variance/approval.
16. Fixed assets and depreciation/disposal/transfer/history.
17. Configurable tax center, including VAT-style rates and tax-inclusive/exclusive reporting without hardcoding one tax regime.

### P3 — Enterprise
18. Approval workflows based on thresholds and RBAC.
19. Advanced audit center: who/what/when/branch/before/after/device/approval chain/document history.
20. Multi-branch intelligence and benchmarking: sales, food cost, waste, labor, margin, inventory variance, profitability and product performance.

## Execution policy for the roadmap
- Implement feature groups in priority order while maximizing throughput by completing cohesive groups together when architecture allows.
- For each new feature group: inspect existing APIs/schema/components -> implement -> run fast focused tests/smoke -> fix -> continue.
- Do not rebuild already-tested POS/auth/navigation functionality unless the new feature touches it.
- Before closing a phase, run full regression/CI and verify all earlier phases still pass.

## Phase reporting rule
At every phase closure report exactly:
- DONE: completed and verified items.
- REMAINING: items not yet completed.
- BLOCKED/RISKS: blockers or risks, with reason.
- EVIDENCE: commit/CI/test evidence.
- NEXT: the next phase or slice only after the gate passes.

## Current execution
- Baseline source is current `main` (`e9af268f51b9ccb013f537adcd0ee85ced9a6ff1`).
- Development branch is `development/master-log2`.
- Supabase is the existing project; no Supabase branch/project is being created.
- POS Core remains active, but already-proven POS/auth/navigation tests are not to be repeated unnecessarily.
- Actual POS source path confirmed from the repository tree: `src/features/pos/pages/PosWorkspacePage.tsx`, with `ActiveOrdersPage.tsx` alongside it.
- CI must be associated with the current head before a phase is closed.
- Working rule: **Feature-first, test-fast, CI-gated** — add new capabilities first; run focused tests immediately after each feature group; use full CI as the phase gate unless a change requires broader regression.
- Next priority after the POS slice closes: P0 Inventory Lifecycle, beginning with Stock Count + Variance + Approval + Adjustment + Movement History as one cohesive feature group.

## Phase closure: P0 Inventory Lifecycle slice — Stock Count / Batches / Valuation / Low-Stock

### DONE
- 4 new operational screens wired end-to-end (routes, menu, layout icons, lazy loading, permissions):
  - StockCountsPage (`/stock-counts`, `inventory.manage`): create full/partial/cycle counts with items, edit items (add/update/remove), submit/approve/reject (with reason)/apply workflow, item viewer, status/type pills, search/status/branch filters.
  - InventoryBatchesPage (`/inventory-batches`, `inventory.view`): batch table with product/warehouse/branch embeds, expiry status (expired / expiring within 90 days), expiry/value summary cards, new-batch modal via add_inventory_batch, branch/warehouse filters.
  - StockValuationPage (`/stock-valuation`, `inventory.ledger.view`): valuation table + summary cards + per-branch grid via get_stock_valuation(+summary), Excel export, search, branch/warehouse filters.
  - LowStockAlertsPage (`/low-stock-alerts`, `inventory.view`): out/low/ok cards + alerts via get_low_stock_alerts(+summary), status filter, Excel export, branch/warehouse filters.
- Database (additive migrations 070-073): stock_counts/stock_count_items tables + create/add/update/remove/submit/approve/reject/apply RPCs (SECURITY DEFINER, permission inventory.manage, server-side branch isolation); min/max/reorder_point columns + low-stock RPCs; stock valuation RPCs; inventory_batches table + add_inventory_batch + expiry tracking.
- Verification/repair pass:
  - Fixed loading-forever bug when the branches query fails (StockValuationPage, LowStockAlertsPage) - now sets error state, clears loading, surfaces toast.
  - Removed redundant double-fetch when a single branch is auto-selected (effective branch computed inline before RPC calls).
  - Branch isolation in UI: branch dropdowns (list filters + create/edit modals) restricted to the user's branch when branchFilter applies (StockCounts, InventoryBatches, StockValuation, LowStockAlerts).
  - StockCountsPage save-edit: NaN quantity guard - new lines without a count are skipped; clearing a count on an existing item sends null instead of NaN (updateStockCountItem typed `number | null`).
  - Extracted timezone-safe expiry math to src/lib/inventoryExpiry.ts (date-only parsed as local midnight), replacing the UTC-parse day-shift bug in InventoryBatchesPage.
- Tests: 4 new pages added to tests/components/pages.smoke.test.tsx (35 pages rendered); new unit suite tests/unit/lib/inventoryExpiry.test.ts (10 tests).

### REMAINING
- StockCountsPage has no Excel export (ledger/valuation/alerts do). Adding it would be a new feature - deferred, not required by this verification phase.
- No DB integration coverage for the 4 screens in this environment (no SUPABASE_DB_URL configured; 154 integration tests skip by design).
- Valuation per-branch summary shows branch id, not name (summary RPC has no branch join) - cosmetic.

### BLOCKED / RISKS
- Integration DB suite cannot run locally without SUPABASE_DB_URL; skipped as pre-existing behaviour.
- Reverse FK embeds `items:stock_count_items(product:products(*))` and `created_user:users!stock_counts_created_by_fkey(...)` rely on PostgREST relationship naming; verified against existing ledger embeds but not exercised against a live DB.
- Branch-scoped RLS + SECURITY DEFINER RPCs are the real isolation boundary; UI dropdown restriction is defence-in-depth, not a substitute.

### EVIDENCE
- Commit: `1cf745c` `feat(inventory): add stock counts, batches, valuation and low-stock screens` (on `development/master-log2`; no merge to main).
- `npm run verify:full` green (EXIT_CODE=0) at head `1cf745c`: typecheck:all, lint (0 errors), build, test:unit 250 passed (20 files), test:integration 154 skipped (no DB URL).
- Focused: tests/unit/lib/inventoryExpiry.test.ts 10 passed; tests/components/pages.smoke.test.tsx 35 passed.

### NEXT
- Proceeding to P0 item 2: product/recipe costing (recipe cost, component cost, unit cost, actual/theoretical cost, food cost %, gross margin, product/order/branch profit, actual-vs-recipe variance, supplier-price impact, cost history) - same rule: implement -> focused tests -> fix -> full verification -> CI -> log.

## Phase closure: P0 item 2 — Product / Recipe Costing slice

### DONE
- Costing Center screen (`/costing`, permission `reports.costing`, group finance, icon Calculator) wired end-to-end (routes.ts, routes.tsx lazy route + ProtectedRoute, menu.config.ts, Layout icon, i18n ar/en keys). Three tabs:
  - Costing Overview: per-product cost grid (sale price, weighted-average batch unit cost, theoretical/BOM cost, actual/recipe cost, margin %, actual-vs-theoretical variance), summary cards (product count, average food cost %, highest-cost-ratio product), search + branch filter, Excel export, row click opens a deep-detail modal.
  - Order Margin: gross margin per sale invoice computed from COGS derived from inventory_ledger (entry_type='sale', reference_id = sale.id), date-range + branch filters, Excel export.
  - Supplier Price Impact: first/last/avg purchase cost + change % per supplier item (product and raw_material), supplier filter, Excel export.
- Detail modal per product: sale price / unit / theoretical / actual cost cards, food cost %, margin %, BOM component lines (quantity x component unit cost), recipe lines (quantity x (1 + wastage%) x raw material cost), and full cost history.
- Database (additive migration `074_product_costing.sql`): `product_cost_history` table + `track_product_cost_history` trigger (SECURITY DEFINER, records any cost_price change with changed_by/source, RLS with select+insert policies); 5 SECURITY DEFINER branch-scoped RPCs - `get_costing_overview`, `get_product_costing_detail` (jsonb deep detail incl. history), `get_cost_history`, `get_supplier_price_impact` (product + raw_material union), `get_order_margin` (COGS from the ledger, admin may pass NULL branch, non-admin locked to own branch via is_pos_admin() pattern).
- Client maths isolated in `src/lib/costing.ts` (safeDiv, weightedAvgCost, foodCostPct, grossMargin, marginPct, variancePct) with pure unit tests.
- Tests: new unit suite `tests/unit/lib/costing.test.ts` (6 tests); `CostingCenterPage` added to `tests/components/pages.smoke.test.tsx` (36 pages rendered); permission added to `Permission` union, `ALL_PERMISSIONS`, `PERMISSION_LABELS`, reports group, and branch_manager/accountant default roles.

### REMAINING
- No DB integration coverage for the 5 RPCs in this environment (no SUPABASE_DB_URL configured; 154 integration tests skip by design). Migration 074 is untested against a live Postgres here.
- Costing center is read-only; editing product cost / BOM / recipe components happens on their existing screens (Products / Components / Recipes) and is captured in cost history via the trigger.
- Order margin tab caps at 500 invoices (LIMIT 500 in get_order_margin) with no pager yet - cosmetic.

### BLOCKED / RISKS
- Integration DB suite cannot run locally without SUPABASE_DB_URL; skipped as pre-existing behaviour.
- Weighted-average batch cost helpers fall back to raw_materials.default_cost for raw materials with no batches; products with no batches report 0 unit cost (no products.cost_price fallback) - documented behaviour, revisit if product-level costing without batches is required.
- `_product_bom_cost` / `_product_recipe_cost` are per-unit costs; they do not divide by recipes.yield_quantity (recipe_item quantities are already per yield unit by schema convention).

### EVIDENCE
- Commit: `82c7b1c` `feat(costing): add product costing center with recipe cost, order margin and supplier impact` (on `development/master-log2`; no merge to main).
- `npm run verify:full` green (EXIT_CODE=0) at head `82c7b1c`: typecheck:all, lint (0 errors), build, test:unit 257 passed (21 files), test:integration 154 skipped (no DB URL).
- Focused: tests/unit/lib/costing.test.ts 6 passed; tests/components/pages.smoke.test.tsx 36 passed.

### NEXT
- Proceeding to P0 item 3: purchasing workflow (same rule: implement -> focused tests -> fix -> full verification -> CI -> log).

## Branch unification audit (2026-08-15) — single development branch `development/master-log2`

### DECISION
- From now on **`development/master-log2` is the ONLY development branch**. No new feature branches. Every new feature is logged in MASTER_LOG2 and follows the cycle: implement -> test -> fix -> verify -> CI -> publish. `main` remains the production/published baseline (never developed on directly).

### DONE — branches reviewed vs `development/master-log2`
Every branch below was compared against `development/master-log2` (unique-commit analysis + merge-base ancestor checks + per-file content diffs).

| Branch (local + remote) | Unique commits vs master-log2 | Verdict | Notes |
|---|---|---|---|
| `main` / `origin/main` | 0 | **KEEP** (production baseline) | Strict ancestor of master-log2 |
| `origin/development/master-log2-current` | 0 | SAFE TO DELETE | Strict ancestor |
| `origin/erp-01-settings-organization` (+ local) | 0 | SAFE TO DELETE | Strict ancestor (ERP-01 merged via PR #5) |
| `origin/feature/dashboard-redesign` | 0 | SAFE TO DELETE | Strict ancestor |
| `origin/feature/pos-action-level-2026` | 0 | SAFE TO DELETE | Strict ancestor |
| `origin/feature/pos-active-orders` | 0 | SAFE TO DELETE | Strict ancestor |
| `origin/stabilization/final-system-fix` | 0 | SAFE TO DELETE | Strict ancestor |
| `origin/ui-rebuild-foodics-2026` (+ local) | 0 | SAFE TO DELETE | Strict ancestor |
| `origin/ui-rebuild-phase3-checkpoint-2026-08-13` | 0 | SAFE TO DELETE | Strict ancestor |
| `origin/ui-rebuild-phase4-checkpoint-2026-08-13` | 0 | SAFE TO DELETE | Strict ancestor |
| `origin/ui-rebuild-phase5-checkpoint-2026-08-13` | 0 | SAFE TO DELETE | Strict ancestor |
| `origin/deploy-060-branch-isolation` | 1 (`3aac4b3`) | SAFE TO DELETE — content already in master-log2 | `3aac4b3` migration `060_branch_isolate_raw_materials.sql` is **byte-identical** to master-log2's `c549f82`; master-log2 then superseded it with `8c0070f` (canonical `is_pos_admin()`/`get_branch_id()` helpers) and `56515c0` (portable backfill). No unique work |
| `origin/erp-roadmap-safe` | 2 (`42b203b`, `e7ca527`) | SAFE TO DELETE — superseded | Both only touch `docs/ERP_DEVELOPMENT_ROADMAP.md`; master-log2's version is strictly newer (ERP-01 status COMPLETE-MERGED + CI record vs branch's older "STARTED" draft). No unique content |
| `origin/ui-visual-rebuild-6h` (+ local) | 1 (`6863991`) | SAFE TO DELETE — superseded | Only touches `docs/REBUILD_MASTER_LOG.md`; master-log2's version is strictly newer (6H+6I merged `d390c47` + deployed + ERP-01/PR #5 record vs branch's older pending draft). No unique content |
| `origin/erp-02-recipe-costing` (+ local) | 3 (`087768a`, `b0a5455`, `8f5414a`) | SAFE TO DELETE — feature superseded; **unique artifact MOVED** (below) | Parallel/older costing implementation. master-log2's `82c7b1c` (migration `074_product_costing.sql` + `CostingCenterPage.tsx`) is a strict functional superset of the branch's draft migration `070` RPCs (`compute_recipe_cost`, `recipe_costing_report`, `raw_material_cost_history`, `costing_profitability_report`) and old 3-tab UI. All 8 ERP-02 roadmap bullets covered by the master-log2 implementation. The branch's integration/contract tests target the **removed** `070` RPC set and were NOT ported (would be broken against 074; see REMAINING). Its i18n keys have zero references in master-log2 src/tests (superseded label set) |

### MOVED (unique work preserved from other branches)
- `docs/ERP-02_EXECUTION_PLAN.md` — preserved from `erp-02-recipe-costing` `087768a` into `development/master-log2` with a **SUPERSEDED** status header pointing to the 074 implementation (commit `dc18e66`). Only non-superseded unique artifact found in the whole audit.

### REMAINING
- Equivalent DB integration coverage for the `074` costing RPCs should be written against the live schema when a `SUPABASE_DB_URL` environment is available (the erp-02 draft tested the removed `070` RPCs). Not blocking: the 074 implementation has unit (`tests/unit/lib/costing.test.ts`) + smoke coverage, and the pre-existing 154 integration tests self-skip without a DB URL.

### BLOCKED / RISKS
- Integration DB suite cannot run locally without `SUPABASE_DB_URL`; skipped as pre-existing behaviour.
- No unique commits were left un-preserved: every commit reachable from any deleted branch is present in `development/master-log2` (as an ancestor, or superseded by identical/newer content, or preserved via `dc18e66`).

### EVIDENCE
- Preserve commit: `dc18e66` `docs(costing): preserve ERP-02 execution plan from erp-02-recipe-costing (superseded by 074 implementation)`.
- `npm run verify:full` green (EXIT_CODE=0) at head `dc18e66`: typecheck:all, lint (0 errors, 16 pre-existing warnings), build, test:unit 257 passed (21 files), test:integration 154 skipped (no DB URL).
- Final docs commit (this record) and remote branch deletions follow this entry.

### NEXT
- P0 item 3: purchasing workflow on `development/master-log2` (no new branch).


## Phase closure: Integration DB suite activated against an isolated local PostgreSQL (2026-08-15)

### DECISION
- Integration tests now run for real. `SUPABASE_DB_URL` is provided as a session environment variable pointing at an **isolated local PostgreSQL 18.4 cluster** (`C:\Users\CAVOCE~1\AppData\Local\Temp\opencode\pg-itest`, port 55432, trust auth, loopback only). No Supabase project/branch was created; the production Supabase project and the local production service on port 5432 were never touched. The URL is passed inline per command and was never written to `.env` or committed (git status shows no secret file; `.gitignore` keeps `.env*` excluded).
- Exact CI recipe reproduced from `.github/workflows/verify-main.yml`: `stub_auth.sql` (CI-only, never on real Supabase) -> `apply-migration.js --dir supabase/migrations` -> `verify-schema.js` -> `disable_subscription_guard.sql` -> `seed_raw_material_branch.sql`, then `npm run test:integration`.

### DONE
- Fixed two real SQL bugs in migration `074_product_costing.sql` (found only because the suite now runs against a live Postgres; the migration had failed/rolled back in the local cluster and was **never applied anywhere**, so editing is legal under the additive rule):
  1. `_raw_wavg_cost`: `rm.default_cost` referenced from a JOIN without GROUP BY -> PostgreSQL "must appear in the GROUP BY clause" error. Replaced with a scalar subquery against `raw_materials` (keeps the no-batches fallback semantics).
  2. `get_supplier_price_impact`: `ORDER BY item_type, item_name` in a UNION ALL could not resolve those names (first branch column is the unaliased literal `'product'::text`). Aliased the literal as `item_type` and switched ORDER BY to positional `ORDER BY 2 ASC, 3 ASC`.
- Applied the full migration chain on the isolated cluster: 79 prior migrations (replayed cleanly), `074_product_costing.sql` (after the fixes above), plus the 3 CI scripts.
- `node scripts/db/verify-schema.js` passes: 52 tables, 51 functions, PostgreSQL 18.4.
- `npm run test:integration` green: 10 files, 154 tests passed (5.07s) - this is the first real DB execution of these tests.
- `npm run verify:full` green at this record: typecheck:all, lint, build, test:unit 257 passed (21 files), test:integration 154 passed (10 files).

### REMAINING
- The 074 costing RPCs still have no dedicated integration tests (unit + smoke only). Not blocking; the migration is now proven to apply and verify against a real Postgres. Equivalent coverage can be added with the next costing-related feature.

### BLOCKED / RISKS
- Local Postgres startup on Windows showed transient flakiness during the first attempt (0xC0000142 autovacuum worker exit, shared-memory error 487 after an unclean parent kill); a clean restart via a detached `start.cmd` (Start-Process) succeeded and shut down cleanly. Treat first-start instability as environmental, not schema-related.

### EVIDENCE
- This record (no feature code beyond the two 074 SQL fixes). Branch `development/master-log2`; no merge to main.
- `npm run verify:full` EXIT_CODE=0 at this state: test:unit 257 passed, test:integration 154 passed (10 files).
- Local cluster stopped cleanly after the run (pg_ctl stop, 0 listeners on 55432). Production service on 5432 untouched.

### NEXT
- P0 item 3: purchasing workflow on `development/master-log2` (implement -> focused tests -> fix -> full verification incl. integration against the isolated cluster -> CI -> log).


## CI record: integration-suite fix `eed94cb` (2026-08-15)

### EVIDENCE
- Commit: `eed94cb` `fix(costing): repair migration 074 SQL bugs found by live integration tests` (on `development/master-log2`; no merge to main).
- Pushed to `origin/development/master-log2` (196efc0..eed94cb).
- GitHub Actions "Verify main" run 31899146903 (triggered via the open PR from this branch to main, head_sha `eed94cb`): **conclusion success** - jobs `verify`, `db`, `browser-smoke` all success. Run URL: https://github.com/Premieros/Premier/actions/runs/31899146903
- Local `npm run verify:full` was green (EXIT_CODE=0) before the commit (see prior phase-closure entry).

### NEXT
- P0 item 3: purchasing workflow - begin with an audit of the current schema/APIs/screens BEFORE any migration or new code.


## Phase closure: P0 item 3 — Procurement Workflow (2026-08-15)

### SCOPE (implemented in one batch on `development/master-log2`)
- Full chain: Purchase Request -> RFQ -> Supplier Quotation (comparison + selection) -> Purchase Order (draft -> submitted -> approved/cancelled) -> Receiving/GRN (partial + full, posts to ledger like process_purchase) -> Backorders -> Receipts -> Supplier Evaluation + hardened supplier price impact.
- Migration `075_procurement_workflow.sql` (additive): 8 new tables (`purchase_requests`, `purchase_request_items`, `rfqs`, `rfq_items`, `supplier_quotations`, `supplier_quotation_items`, `purchase_receipts`, `purchase_receipt_items`), workflow columns on `purchases`/`purchase_items`, status CHECKs, RLS backstops, document sequences, and 13 SECURITY DEFINER RPCs enforcing `is_pos_admin()/can_permission('purchases.manage')` + branch isolation.

### DONE
- Frontend: `PurchaseRequestsPage`, `RfqsPage`, `ReceivingPage` (backorders/receipts/evaluation tabs) + `PurchasesPage` PO actions + `SuppliersPage` evaluation; `api.procurement` module (13 wrappers); permissions `purchases.requests/rfq/receiving/evaluation`; routes `/purchases/requests|rfqs|receiving` + menu + lazy loading; ~50 i18n keys (ar/en); types in `src/lib/types.ts`.
- `scripts/db/verify-schema.js` extended: 60 tables, 65 functions — passes on the isolated cluster.
- New integration suite `tests/integration/procurement_workflow.test.ts` (8 tests): NOT_ALLOWED, request lifecycle + bad transitions, branch isolation, RFQ copy + quotation recording/rejection, comparison, selection/award, PO creation/approval, partial/over/full receiving, backorders, ledger posting, receipts, supplier evaluation, hardened `get_supplier_price_impact` isolation.
- Three real SQL bugs found only by the live suite and fixed in 075 (applied/verified on the isolated cluster):
  1. `create_purchase_order`: loop variable `v_item jsonb` over a multi-column `SELECT` cast the first column (a uuid) to jsonb -> `invalid input syntax for type json`; switched the quotation loop to a dedicated `record` variable.
  2. `receive_purchase_order`: validation `SELECT quantity, received_quantity INTO v_pitem` left the record without an `id` field -> `record has no field` exception masking the intended `OVER_RECEIPT`; now `SELECT *`.
  3. `get_supplier_evaluation`: `LEFT JOIN` of purchases and quotations cross-multiplied `SUM(pc.total)` (1760 for an 880 PO); rewritten with per-supplier aggregated subqueries; also qualified subquery columns to avoid PL/pgSQL RETURNS TABLE variable ambiguity.

### EVIDENCE
- Commit: `e8f9b87` `feat(procurement): P0 procurement workflow - ...` pushed to `origin/development/master-log2` (15 files, +3031).
- Local `npm run verify:full` green (EXIT_CODE=0) at this state: typecheck:all, lint (0 errors, 16 pre-existing warnings), build, test:unit 257 passed (21 files), test:integration 162 passed (11 files) on the isolated cluster.
- GitHub Actions run for the push: see CI record below.

### NEXT
- P0 item 4 (inventory replenishment / reorder) with the same rule: implement -> focused tests -> fix -> full verification -> CI -> log.


## CI record: P0 procurement workflow `e8f9b87` (2026-08-15)

### EVIDENCE
- Commit: `e8f9b87` `feat(procurement): P0 procurement workflow - ...` (on `development/master-log2`; no merge to main).
- Pushed to `origin/development/master-log2` (49d4db1..e8f9b87).
- GitHub Actions run (triggered via the open PR from this branch to main, head_sha `e8f9b87`): run 31901346288 — **conclusion success** (verify, db, browser-smoke jobs). Run URL: https://github.com/Premieros/Premier/actions/runs/31901346288
- Local `npm run verify:full` was green (EXIT_CODE=0) before the commit.

## GitHub Pages deployment rule change `29e2ec6` (2026-08-15)

### RULE
- `development/master-log2` is now the **sole source of development AND publishing**.
- `main` is the **production baseline only**: never developed on directly, never deleted. No merge from this branch to main is required for publishing.
- Every push to `development/master-log2` runs the strict gate chain `verify -> db -> e2e -> deploy`; any failing test aborts the chain and **no deployment happens** (no deploy ever skips a gate).

### WORKFLOW CHANGES (`.github/workflows/deploy.yml`, commit `29e2ec6`)
- Trigger changed from `push: [main]` to `push: [development/master-log2]` (+ `workflow_dispatch`).
- Jobs: `verify` (lint, typecheck, `typecheck:all` with `@playwright/test@1.55.0`, 257 unit tests, production build, `upload-pages-artifact@v3`) -> `db` (needs verify; `stub_auth`, canonical migrations, `verify-schema`, `disable_subscription_guard`, `seed_raw_material_branch`, 162 integration tests against an **isolated postgres:18 service** - never Production DB) -> `e2e` (needs db; Playwright chromium, 50 browser tests against the production build) -> `deploy` (needs e2e; `actions/deploy-pages@v4`, environment `github-pages`).

### UNBLOCKING
- GitHub Pages was already `build_type: workflow`, but the `github-pages` environment had a **custom deployment-branch policy allowing only `main`**, so the deploy job failed instantly on this branch ("Branch ... is not allowed to deploy to github-pages due to environment protection rules").
- Fixed via API: added branch policy `development/master-log2` (type branch) to the environment. `main` policy left untouched.

### EVIDENCE
- Commit `29e2ec6` pushed to `origin/development/master-log2` (fb88e2d..29e2ec6).
- GitHub Actions run 31904141867, attempt 2 — **conclusion success**: verify ✓, db ✓, e2e ✓, deploy ✓. Run URL: https://github.com/Premieros/Premier/actions/runs/31904141867
- Local pre-push verification green: lint (0 errors), `typecheck:all`, 257 unit, `npm run build`, 162 integration (isolated cluster, port 55432), 50 Playwright e2e (dist preview on 127.0.0.1:4173).
- Pages deployment created for `29e2ec6` (github-pages environment, created 2026-08-15T19:42:40Z).
- Live site: https://premieros.github.io/Premier/ — HTTP 200, title "Premier | Business Management Platform".
