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
- Dine-in table controls use stable table identity: `pos-table-{tableId}`, `pos-table-filter-{status}`, `pos-table-search`, `pos-table-{tableId}-guest-count`, and `pos-table-{tableId}-start`.
- Remaining POS action controls now use stable IDs: `pos-action-discount`, `pos-action-hold`, `pos-action-send-kitchen`, `pos-action-pay`, `pos-discount-editor`, `pos-discount-input`, and `pos-total-value`.
- Drive-thru start controls use `pos-drive-thru-plate`, `pos-drive-thru-customer`, `pos-drive-thru-people`, and `pos-drive-thru-start`.
- Delivery start controls use `pos-delivery-phone`, `pos-delivery-address`, `pos-delivery-notes`, and `pos-delivery-start`.
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
- Added stable IDs to the real CurrentOrderPanel action controls and created Action-Level E2E coverage for Discount, Hold, Send to Kitchen, and Complete Sale.
- Added stable IDs and Action-Level E2E coverage for Delivery and Drive-thru start flows.
- The new E2E tests assert real Supabase RPC calls/payloads for `create_order`, `set_order_status`, `send_to_kitchen`, and `process_sale`, rather than merely asserting button visibility.

## 6. Current State — 2026-08-13

**Current branch:** `ui-rebuild-foodics-2026`  
**Current phase:** PHASE 3 — POS / FloorPlan / Order Workspace  
**PR #3:** Open, not merged.

### New action-coverage commits

- `bb1a9fb4d5161c401dac95b258889366c5f2a0dd` — stable IDs for CurrentOrderPanel actions, discount editor, total/discount values.
- `c27063c0148dc9336b68412e74ebb7b67efc7830` — stable IDs for drive-thru start flow.
- `58eb589ec161a7499b79a6720ab94afa347dde24` — stable IDs for delivery start flow.
- `f50d9996c89b614b040223b3620cc83fc7bb5009` — Action-Level E2E coverage for remaining PHASE 3 flows.

### Earlier relevant commits

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

## 8. PHASE 3 Action-Level Coverage — NEW

The new tests now cover these real actions:

- Delivery: phone + address → start order → verify `create_order` with `p_order_type=delivery` and notes.
- Drive-thru: plate + customer + people → start order → verify `create_order` with `p_order_type=drive_thru` and plate notes.
- Discount: open discount editor → select percent → enter 10 → verify discount value and total change from 100 to 90.
- Hold: add product → Hold → verify `create_order` followed by `set_order_status` with `p_status=held`.
- Send to Kitchen: add product → Send to Kitchen → verify `create_order` and `send_to_kitchen` with the generated order ID.
- Complete Sale: add product → Pay → Cash → Confirm Payment → verify `process_sale` with `p_status=completed`, `p_payment_method=cash`, and `p_order_type=takeaway`.

The tests use stable IDs and inspect the application's real RPC contract. They do not use DOM position, `nth()`, or button-only assertions for these flows.

## 9. Current Verification Status After New Tests

**CI for commit `f50d9996c89b614b040223b3620cc83fc7bb5009` is currently PENDING.**

The PR head is confirmed to be `f50d9996c89b614b040223b3620cc83fc7bb5009`.

No green result is claimed yet for the new action-level coverage.

## 10. Exact Next Action — DO NOT SKIP

1. Wait for/inspect CI for commit `f50d9996c89b614b040223b3620cc83fc7bb5009`.
2. If CI fails, diagnose and fix the real root cause; do not weaken or delete the new assertions.
3. If the tests expose a real application defect, fix the application and re-run CI.
4. Record every CI result and fix in this file.
5. Once all PHASE 3 critical flows have green CI evidence, close PHASE 3.
6. Only then move to PHASE 4 — Security / RBAC / Branch Isolation.

## 11. Session Update Rule

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

## 12. Definition of Done

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

## 13. Verification Log — 2026-08-13

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

### New PHASE 3 Action-Level Coverage — commit `f50d9996c89b614b040223b3620cc83fc7bb5009`
- Result: **PENDING CI**
- Added tests: Delivery, Drive-thru, Discount, Hold, Send to Kitchen, Complete Sale.
- Added stable selectors to the actual UI components.
- Assertions inspect actual RPC names and relevant payload values.
- No success is claimed until CI completes.

## 14. Maintainability / Extensibility Requirement

The rebuilt UI must remain safely editable and extensible.

Future visual rearrangement, component replacement, menu reordering, or addition of controls must not require rewriting underlying business logic merely because the UI changed position.

Required mechanisms:
- Stable element/action identities.
- Shared UI components.
- Centralized navigation.
- Separation of UI, action, route/state, permission, and service/data layers.
- E2E selectors that do not depend on DOM position.

This is a core requirement of the original rebuild objective, not an optional future enhancement.
