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
