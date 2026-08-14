# MASTER_LOG2 — Premier Development Master Log 2

> **Single execution source of truth for the new functional-development track.**
> The redesign is the baseline; this track develops a new, faster, more capable product on top of the current `main` codebase.

## 1. Immutable baseline and environment

- Repository: `Premieros/Premier`
- Protected production branch: `main`
- **Current baseline:** `main` at `e9af268f51b9ccb013f537adcd0ee85ced9a6ff1` (2026-08-14).
- **Development branch:** `development/master-log2`.
- The development branch must always be based on the current published `main` baseline, not the older UI-rebuild branch.
- Supabase: **use the existing Supabase project**. Do not create a Supabase branch or separate project unless explicitly approved.
- Production data/configuration must never be used as a test fixture or modified by CI.
- CI database tests use disposable local Postgres fixtures only.

## 2. Mandatory product/engineering rules

### R1 — Function is independent from position
Every button, control, menu item, shortcut and interactive element has a real business action. Behavior is bound to stable semantic action IDs/contracts, never to screen position or fragile DOM structure. UI redesign must not remove working behavior.

### R2 — One business action, one stable contract
Critical actions expose stable semantic identifiers/test IDs and, where appropriate, a service/RPC contract. Tests target the action, not incidental text, CSS, coordinates, or DOM nesting.

### R3 — Build on the current project, never restart it
Do not recreate completed redesign work. Preserve existing working modules, permissions, RLS, settings and migrations. Extend them additively unless a verified defect requires replacement.

### R4 — Fast by architecture, not by skipping quality
Prefer reusable components, shared hooks/services, parallel data loading, selective queries, memoization where justified, pagination/virtualization for large lists, and avoiding duplicate network calls. Never remove validation or tests merely to make CI faster.

### R5 — No fake green
No fake UI, fake success, swallowed errors, test bypasses, imagined selectors, or mocks that contradict real contracts. A passing test must demonstrate a real business action.

### R6 — Phase gates are mandatory
Every phase: inspect → implement the largest safe coherent slice → review → typecheck/lint/unit/build → relevant integration/E2E → inspect real CI → fix → rerun → regression of all previous phases → document evidence → only then transition.

### R7 — Previous phases are always regression-locked
A phase cannot be marked PASS if an earlier phase regresses. The release matrix grows cumulatively.

### R8 — Data integrity first
Sales, payments, inventory, recipes, stock effects and order lifecycle operations must use transactional/server-side business rules where required. Never rely on UI-only validation for financial or stock-critical rules.

### R9 — Branch isolation
Every branch-scoped query, mutation, report and export must respect the authenticated branch/permission model. Super-admin/global behavior must remain explicit.

### R10 — Errors are first-class
Every async business action has loading, success and actionable error states. No silent failure. Retry must be safe/idempotent where possible.

### R11 — Reusable screen infrastructure
All major list/report screens should share a common view model: branch selector, date range, search, filters, sorting, visible columns, saved views, grouping where useful, pagination, import, export, print and refresh. Only capabilities meaningful to that screen are enabled.

### R12 — Import/export safety
Imports validate schema, required fields, types, duplicates and branch ownership before mutation; provide a preview/error report and never partially corrupt data. Exports honor the active filters/branch/permissions and use a consistent format contract.

### R13 — Accessibility and localization
Interactive controls have accessible names/roles, keyboard support where applicable, RTL/LTR correctness and Arabic/English coverage. Tests must not depend on one language's visible text when a stable semantic selector is available.

### R14 — Observability and auditability
Critical mutations record enough context to diagnose failures and respect existing audit/security mechanisms. Never log secrets or sensitive credentials.

### R15 — Security defaults
Least privilege, RLS/RBAC preservation, server-side authorization for privileged actions, no credentials in commits, and no production secrets in test files.

## 3. Standard screen/view contract

Every major data page should progressively adopt a shared `DataView` pattern:

- branch selector
- date/time range where applicable
- global search
- field-specific filters
- sort/group controls
- selectable/visible columns
- saved personal views
- table/card/compact views where useful
- pagination or virtualization for scale
- import with validation + preview
- export (CSV/XLSX and print/PDF where supported)
- reset/refresh
- permission-aware actions

Example: Orders may be viewed by order number, customer, products, branch, status, order type, payment status, date, totals, etc. The underlying order business actions remain unchanged regardless of view.

## 4. Development plan

### Phase 0 — Current-main baseline + safety
**Status: IN PROGRESS**
- Establish `development/master-log2` from the latest `main`.
- Preserve ERP-01/ERP-02 and all current production-approved functionality.
- Establish this log and cumulative verification matrix.

### Phase 1 — Core application stability
- verify/build/typecheck/lint
- auth and permissions
- dashboard/navigation
- shared data/view infrastructure
- regression baseline

### Phase 2 — POS action-level development
- order start/type flows
- products/categories/cart/quantities
- customer/table/delivery/drive-through/takeaway
- discounts
- hold/resume/cancel
- kitchen send
- payment and sale completion
- receipt/print
- critical action E2E matrix

### Phase 3 — Tables/floor/service
### Phase 4 — Kitchen/fulfillment
### Phase 5 — Inventory/warehouses/recipes/stock effects
### Phase 6 — Customers/loyalty/discounts
### Phase 7 — Purchasing/suppliers/receiving
### Phase 8 — Branches/roles/permissions/settings
### Phase 9 — Reports/accounting-facing outputs + universal views/import/export
### Phase 10 — Performance/security/accessibility/full regression/release gate

## 5. Definition of PASS

A phase is PASS only when its implementation scope is complete, typecheck/lint/unit/build are green, relevant integration/E2E tests are green, all prior-phase regression tests are green, real CI confirms the result, and this log records the exact commit/run evidence. Otherwise status is IN PROGRESS, BLOCKED or FAILED.

## 6. Working record

### 2026-08-15 — Track reset to current published baseline
- Found that the earlier `development/master-log2` snapshot was based on the older UI-rebuild commit `7a6d18a`, while `main` had since advanced to `e9af268` with ERP-01 already merged.
- Corrected the development strategy: the new development line must be based on **current `main`**, so completed ERP-01/current functionality is not accidentally omitted.
- Created temporary reconstruction branch `development/master-log2-current` from current `main` to produce the corrected baseline, then this commit will be promoted to `development/master-log2`.
- No Supabase branch/project created.

## 7. Current status / next action

**Phase 0 — IN PROGRESS.**

Next: promote the corrected current-main baseline to `development/master-log2`, then begin Phase 1 verification and the largest safe Phase 2 POS slice. Every meaningful change must update this log with implementation, tests, CI, failures, fixes, commit SHA and next action.
