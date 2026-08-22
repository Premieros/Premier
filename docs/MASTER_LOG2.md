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
- Historical work later verified in CI includes branch isolation/RLS, subscription administration foundations, KDS active-order behavior, raw-material/inventory isolation, and Super Admin controls. These remain subject to regression whenever touched; they are not declared fully closed merely because earlier runs passed.

## Unified current-state log — 2026-08-22
### DONE / VERIFIED
- Branch isolation hardening reached a successful CI run after the final policy correction: Owner/Admin scope is organization-bound, Branch Manager/Staff scope is branch-bound, and Super Admin remains globally privileged. Earlier CI reached 336/337 before the final correction; the subsequent full run passed all jobs including browser smoke.
- The current Routes implementation is `src/app/routes.tsx`; do not invent or use `src/routes/routes.tsx`.
- Subscription administration UI exists and supports plan pricing, active/inactive plans, module selection, branch subscriptions, branch overrides, subscription states, and payment review. Super Admin access is enforced at the administration page.
- A centralized subscription feature-key/type layer is now present on the development branch.
- `ProtectedRoute` is now wired to the centralized module gate on the development branch, including explicit Super Admin bypass and direct-route blocking for mapped modules.
- An additive database migration now exposes effective plan feature maps plus per-branch feature overrides through `subscription_status()` and adds `has_subscription_feature(branch_id, feature)` for backend enforcement.

### CURRENT FOCUS
1. Subscription Module Enforcement: complete backend/API/RPC enforcement and add focused tests proving ON/OFF behavior for every mapped module, branch override precedence, expired subscription behavior, and Super Admin bypass.
2. KDS: active orders only; newly added unsent items in an existing order must remain independently pending and sendable; previously sent items must not be resent or falsely mark all items as sent.
3. Raw Materials: visible operational screen, branch-isolated stock/data, and correct linkage to recipes/production/purchases where applicable.
4. Super Admin Settings: expose all administrative controls from one coherent settings surface, including subscription/module controls, without hiding required controls or duplicating the same action elsewhere.
5. After each cohesive group: focused test -> fix -> CI -> record evidence here.

### REMAINING / NOT CLOSED
- Backend/API/RPC feature enforcement is not yet proven end-to-end; `has_subscription_feature()` is the centralized primitive, but protected write/read operations still need to adopt it where module gating is required.
- Super Admin still needs a complete, non-duplicated UI for editing module maps and branch overrides; current subscription administration must be verified against the new JSON feature shape.
- KDS and raw-material requirements are not closed until current-code verification and CI evidence are recorded.
- Super Admin Settings completeness still requires current UI/schema verification.
- No claim is made that every roadmap P0/P1/P2 item is complete; the roadmap remains authoritative.

### BLOCKED / RISKS
- The module gate is now implemented on the current development branch, but no CI run is currently attached to commit `0b1502a9c6701865cd9b96b039ff11d5da46de20`; therefore the feature is not closed.
- The new migration uses additive schema changes only. It intentionally normalizes the three existing seeded plans to explicit module maps; this must be validated against the Super Admin plan editor before release.
- Do not use historical feature-branch commits as evidence for the current development head without re-verifying them on `development/master-log2`.
- Do not create additional Master Logs. `docs/MASTER_LOG2.md` is the single execution log; other planning/report files are historical/supporting documents unless explicitly promoted here.
- Any RLS change must preserve existing security tests and must not solve a failing test by weakening the assertion.

### EVIDENCE
- `eee7b0217d40fbf3d08ab42e813938bfe9209994`: subscription feature types added to the development branch.
- `416b009dc0c587cdb2c62ec046973f1f4aced776`: centralized `src/lib/subscriptionGate.ts` added to the development branch.
- `6e84e4f6e9ebdd120936a4cde304a0cef9bb4456`: additive migration exposing plan features, branch overrides, effective `subscription_status()`, and `has_subscription_feature()`.
- `0b1502a9c6701865cd9b96b039ff11d5da46de20`: `src/app/routes.tsx` now imports and applies the centralized gate to protected routes.
- No current-head CI result exists yet for `0b1502a9...`; this is intentionally recorded as pending.

### NEXT
Run the focused subscription-gate tests/CI on the current development head. Fix any TypeScript, migration, route, or regression failures. Only after CI passes, add backend/API enforcement to the highest-risk module operations and verify Super Admin plan/override editing against the new feature-map shape. Then move to the KDS/raw-material cohesive group.
