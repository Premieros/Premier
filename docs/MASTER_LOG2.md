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
