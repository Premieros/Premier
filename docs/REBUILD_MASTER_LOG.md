# Premier UI Rebuild — Master Plan & Progress Log

> Persistent source of truth for the UI rebuild. Read before every session and update after every meaningful fix, CI result, phase change, or architectural decision.

**Primary branch:** `ui-rebuild-foodics-2026`  
**PR:** #3 — UI rebuild / stable extensible design  
**Target:** `main` only after final verification and explicit approval.

## 1. Original Objective

Rebuild Premier's interface to match the approved/reference design while respecting the existing architecture, database, business logic, permissions, and routes. The rebuilt UI must be extensible and behaviorally stable: moving a button, switch, card, menu item, or control must not change what it does.

**Final UI objective:** after all phases and final verification pass, the rebuilt/reference design becomes the production UI on `main`; the old UI is not the intended final fallback. The visual/UI layer is rebuilt while preserving correct existing database, business logic, routes, permissions, and services unless a verified defect requires a change.

Core rule:

`Visual Layout → Stable Component/Element ID → Action → Route/State → Permission → Service/Data`

Functionality must never depend on DOM position, visual placement, or fragile selectors.

## 2. Non-Negotiable Rules

1. Do not work directly on `main`.
2. Do not merge PR #3 until final verification passes.
3. Do not add unrelated features while rebuild is in progress.
4. Do not make tests pass by bypassing real application behavior.
5. Diagnose root cause before changing application code or tests.
6. Prefer stable `data-testid`/semantic selectors over DOM position and `nth()`.
7. A phase is closed only after required CI evidence is green.
8. If a later phase exposes an earlier defect, return to that phase, fix, re-verify, then continue.
9. Preserve existing business logic unless audit proves it incorrect.
10. Keep this file updated so future sessions cannot drift from the plan.
11. Future UI changes must remain independent of visual placement; moving/reordering controls must not change their action, permission, route/state, or service behavior.
12. New screens/components must use the shared UI foundation and stable interaction identities so future design changes do not require rewriting business logic.

## 3. Phase Plan

### PHASE 0 — Baseline / Safety
**Status: CLOSED**

### PHASE 1 — Application Shell / Navigation
**Status: CLOSED**

Unified shell/navigation, stable routes/menu configuration, stable identifiers, and Dashboard/navigation Browser E2E verification established.

### PHASE 2 — Core UI Foundation
**Status: FOUNDATION IMPLEMENTED / CONTINUES AS NEEDED**

Reusable UI patterns and stable interaction identifiers are being established so future screens can change without coupling actions to layout.

### PHASE 3 — POS / FloorPlan / Order Workspace
**Status: IN PROGRESS — CURRENT PHASE**

Required action-level flows:
- Order type picker
- Dine-in / FloorPlan / Tables
- Delivery
- Drive-thru
- Takeaway / Quick Pickup
- Product selection
- Cart and quantity changes
- Hold / Resume
- Send to Kitchen
- Discount
- Payment
- Complete Sale
- Back/navigation behavior

### PHASE 4 — Security / RBAC / Branch Isolation
**Status: PENDING**

### PHASE 5 — Final Stabilization / Regression
**Status: PENDING**

### FINAL — PR Review / Merge
**Status: PENDING**

## 4. Verified Architecture Decisions

- Unified application shell is part of the rebuild.
- Navigation/routes are centralized rather than derived from visual placement.
- Stable IDs are used for critical interactions and E2E tests.
- POS order-type selectors include `pos-order-type-picker`, `pos-order-type-dine_in`, `pos-order-type-drive_thru`, `pos-order-type-delivery`, and `pos-order-type-takeaway`.
- Cart quantity controls use product identity: `pos-cart-qty-decrease-{productId}`, `pos-cart-qty-{productId}`, and `pos-cart-qty-increase-{productId}`.
- Payment controls use stable IDs: `pos-payment-method-{method}` and `pos-payment-confirm`.
- Dine-in table controls now use stable table identity: `pos-table-{tableId}`, `pos-table-filter-{status}`, `pos-table-search`, `pos-table-{tableId}-guest-count`, and `pos-table-{tableId}-start`.
- Moving a control must not alter its action, permission, route, state, or service behavior.
- The UI layer is intended to be replaceable/rearrangeable without rewriting the underlying business logic.
- Shared components and stable action identities are the mechanism for safe future UI evolution.

## 5. Completed Work / Evidence

- C1 data-safety fix: migration 045.
- C2 hold-order duplication fix: migration 046.
- Unified application shell / Foodics-oriented UI foundation implemented.
- Stable navigation/menu foundation implemented.
- Dashboard/navigation E2E verification completed.
- Login E2E mocking corrected so POS tests reach the application.
- POS tests corrected to use actual UI stable IDs instead of assumed text/DOM positions.
- POS order-type action test is passing.
- Cart quantity controls received stable product-specific IDs and the test was changed from DOM traversal/`nth()` to those IDs.
- Payment flow was inspected: `Pay` opens the existing `PaymentPanel` inline in the POS workspace; it does not display a literal `Payment method` heading. The real UI exposes payment-method controls and a final confirmation action.
- Added stable payment IDs to the actual payment component and updated the E2E test to assert the real payment workspace instead of the nonexistent heading.
- Run #110 passed all required CI jobs, including Browser E2E.
- Dine-in/FloorPlan/Table components were inspected and found to already provide the real flow: Dine-in → table picker → table action modal → guest count → start order.
- Added stable IDs to the real table picker and table action modal rather than creating a parallel test-only UI.
- Added a Browser E2E scenario with a real mocked vacant table that selects the table, sets guest count to 3, starts the order, and verifies return to the POS workspace.

## 6. Current State — 2026-08-13

**Current branch:** `ui-rebuild-foodics-2026`  
**Current phase:** PHASE 3 — POS / FloorPlan / Order Workspace  
**PR #3:** Open, not merged.

### Relevant fix commits

- `4ebb0ddd8855afe7880cf84ce35ab9bc9f60bc6c` — stable cart quantity IDs.
- `9cf28849332fb079d823a8e8c2f853139a30cef7` — POS quantity test uses stable IDs and verifies `1 → 2`.
- `e7bf73809604d7a97759f75c666ae8b7d9514d5c` — stable payment method/confirmation IDs.
- `ecaf4dd0ea81ac6dd0145343dc9d74d7ddfbd675` — updated POS E2E to assert the actual payment workspace using stable IDs.
- `40a240f28c2299473e8e3736d17722374aff1723` — commit associated with the verified successful Run #110.
- `f7ea1f7bd3caef40c5b1a0d71b646a723f7a1c7c` — stable Dine-in table picker IDs.
- `95485a7fe325db5673e302133e427a57b70e6347` — stable Dine-in table action IDs.
- `310f3546c41b37d8603aa2b27842cb91eb3e46a9` — Browser E2E Dine-in/FloorPlan/Table flow coverage with a mocked vacant table.

## 7. Latest Verification — RUN #110

Run #110 completed successfully.

- **Run:** #110
- **Run ID:** `31671565608`
- **Commit checked:** `40a240f28c2299473e8e3736d17722374aff1723`
- **Workflow:** Verify main
- **Overall conclusion:** **SUCCESS**

### Jobs

- Verify: PASS
- Lint: PASS
- Typecheck: PASS
- Unit Tests: PASS
- Build: PASS
- Browser Smoke / Playwright E2E: PASS

The Browser E2E job completed successfully, so the previous Quick Pickup payment blocker is considered **resolved by CI evidence**.

## 8. Phase 3 Progress After Run #110

The following POS areas were already verified by Run #110:

- Dashboard/navigation actions.
- POS order-type actions and back navigation.
- Quick Pickup / Takeaway path.
- Product/cart quantity flow.
- Pay → Payment Workspace.
- Stable payment method controls and confirmation control.
- Public protected-route smoke coverage.

### Dine-in / FloorPlan / Tables — CURRENT VERIFICATION

The application already contains dedicated components for this flow:
- `OrderTypePicker`
- `TablePickerStep`
- `TableActionModal`
- `TableFloorPlan`

The actual flow is:

`Dine-in → FloorPlan/Table Picker → Select Table → Table Action Modal → Guest Count → Start Order`

The implementation was kept intact; only stable interaction identities and an E2E scenario were added.

Current CI status for these new changes: **PENDING**.

## 9. Exact Next Action — DO NOT SKIP

1. Run CI for the new Dine-in/FloorPlan/Table changes.
2. If CI fails, diagnose and fix the real root cause; do not weaken the test.
3. Record the new CI result in this file.
4. If green, continue through the remaining POS critical flows: Hold/Resume, Send to Kitchen, Discount, Payment completion, and Complete Sale as applicable.
5. Only after all required PHASE 3 action-level flows have green evidence, close PHASE 3 and move to PHASE 4.

## 10. Session Update Rule

Every meaningful action must be recorded here with:
- Date/time
- Branch
- Phase
- Previous verified CI
- Root cause
- Files changed
- Fix
- Commit(s)
- New CI status/result
- Remaining blockers
- Exact next action

**User explicitly requested that every time progress is made, this file is updated and the user is told that it was recorded.**

## 11. Definition of Done

The rebuild is complete only when:
- Reference design and current architecture are aligned.
- The rebuilt/reference UI is the intended final production UI after final verification; the old UI is not retained as the intended final design.
- Critical UI controls have stable identities and actions independent of layout position.
- Future visual rearrangement can be made without changing underlying business logic merely because controls moved.
- Dashboard/navigation behavior is verified.
- POS/FloorPlan/Kitchen/payment critical flows are verified end-to-end.
- RBAC and branch isolation are verified.
- Build, typecheck, lint, unit tests, Browser E2E, and required regression checks pass.
- No critical known blocker remains.
- PR #3 is reviewed and only then merged to `main`.

**Do not replace this plan with a new plan unless the user explicitly changes the project objective.**

## 12. Verification Log — 2026-08-13

### Run #103
- Result: **FAILED**
- Verify: PASS
- Build: PASS
- Browser E2E: 42 PASS / 1 FAIL
- Previous cart quantity blocker: resolved
- Current blocker: Quick Pickup payment assertion expected `طريقة الدفع|Payment method`, but the actual payment UI exposed a different state/control.

### Run #106
- Result: **FAILED**
- Run ID: `31648584834`
- Tested commit: `c3b107f08042faeacd4902a55b90518a318b0510`
- Verify: PASS
- Build: PASS
- Browser E2E: 42 PASS / 1 FAIL
- Failure: Quick Pickup payment assertion expected `طريقة الدفع|Payment method`, but no such element existed after Pay.
- Quantity-selector issue remained resolved.

### Run #110
- Result: **SUCCESS**
- Run ID: `31671565608`
- Tested commit: `40a240f28c2299473e8e3736d17722374aff1723`
- Verify: PASS
- Lint: PASS
- Typecheck: PASS
- Unit Tests: PASS
- Build: PASS
- Browser Smoke / Playwright E2E: PASS
- Payment blocker: **RESOLVED** by the payment-panel stable-ID fix and successful Browser E2E verification.
- Phase status: **PHASE 3 remains IN PROGRESS** because remaining POS/FloorPlan critical flows still require explicit verification.

### Dine-in/FloorPlan/Table verification start
- Application inspection: **PASS** — real components and callbacks confirmed.
- Stable selector implementation: **COMPLETED**.
- E2E coverage: **COMPLETED** in `tests/e2e/pos-actions.spec.ts`.
- New commits: `f7ea1f7bd3caef40c5b1a0d71b646a723f7a1c7c`, `95485a7fe325db5673e302133e427a57b70e6347`, `310f3546c41b37d8603aa2b27842cb91eb3e46a9`.
- CI result: **PENDING**.
- Phase status: **PHASE 3 remains IN PROGRESS** until CI proves this flow.

## 13. Maintainability / Extensibility Requirement

The rebuilt UI must remain safely editable and extensible.

Future visual rearrangement, component replacement, menu reordering, or addition of controls must not require rewriting underlying business logic merely because the UI changed position.

Required mechanisms:
- Stable element/action identities.
- Shared UI components.
- Centralized navigation.
- Separation of UI, action, route/state, permission, and service/data layers.
- E2E selectors that do not depend on DOM position.

This is a core requirement of the original rebuild objective, not an optional future enhancement.
