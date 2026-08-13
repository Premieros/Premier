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
13. **PRE-CI VALIDATION GATE:** before sending a change to CI, run/verify typecheck, lint, unit tests, the affected Playwright test, then the PHASE 3 E2E set. CI is the final confirmation, not the first debugging environment.
14. **CHECKPOINT RULE:** before risky PHASE changes, preserve a named Git checkpoint/branch so the last known-safe state can be restored without rewriting history.

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
- Remaining POS action controls use stable IDs: `pos-action-discount`, `pos-action-hold`, `pos-action-send-kitchen`, `pos-action-pay`, `pos-discount-editor`, `pos-discount-input`, and `pos-total-value`.
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
- The new E2E tests assert real Supabase RPC calls/payloads for persisted actions, rather than merely asserting button visibility.

## 6. Current State — 2026-08-13

**Current branch:** `ui-rebuild-foodics-2026`  
**Current phase:** PHASE 3 — POS / FloorPlan / Order Workspace  
**PR #3:** Open, not merged.

### New action-coverage commits

- `bb1a9fb4d5161c401dac95b258889366c5f2a0dd` — stable IDs for CurrentOrderPanel actions, discount editor, total/discount values.
- `c27063c0148dc9336b68412e74ebb7b67efc7830` — stable IDs for drive-thru start flow.
- `58eb589ec161a7499b79a6720ab94afa347dde24` — stable IDs for delivery start flow.
- `f50d9996c89b614b040223b3620cc83fc7bb5009` — initial Action-Level E2E coverage for remaining PHASE 3 flows.
- `cdc51c4632a6b6c72e19382cfc3fcaae97424cc6` — corrected asynchronous test assertions for Delivery/Drive-thru start and payment persistence timing.
- `ef2a90c58162e81b1d9f26651103a2663c1de925` — corrected Hold/Complete Sale assertions to wait for the real asynchronous persistence boundaries.

### Safety checkpoint

- `ui-rebuild-phase3-checkpoint-2026-08-13` — named rollback branch preserving the last known-safe PHASE 3 checkpoint before the latest test fixes.
- Checkpoint commit: `b46c29eb10ed085653296c326f3fa3596f8db739`.

### Earlier relevant commits

- `4ebb0ddd8855afe7880cf84ce35ab9bc9f60bc6c` — stable cart quantity IDs.
- `9cf28849332fb079d823a8e8c2f853139a30cef7` — POS quantity test uses stable IDs and verifies `1 → 2`.
- `e7bf73809604d7a97759f75c666ae8b7d9514d5c` — stable payment method/confirmation IDs.
- `ecaf4dd0ea81ac6dd0145343dc9d74d7ddfbd675` — updated POS E2E to assert the actual payment workspace using stable IDs.
- `40a240f28c2299473e8e3736d17722374aff1723` — commit associated with the verified successful Run #110.
- `f7ea1f7bd3caef40c5b1a0d71b646a723f7a1c7c` — stable Dine-in table picker IDs.
- `95485a7fe325db5673e302133e427a57b70e6347` — stable Dine-in table action IDs.
- `310f3546c41b37d8603aa2b27842cb91eb3e46a9` — Browser E2E Dine-in/FloorPlan/Table flow coverage with a mocked vacant table.

## 7. Verified CI — RUN #110

Run #110 completed successfully.

- **Run:** #110
- **Run ID:** `31671565608`
- **Commit checked:** `40a240f28c2299473e8e3736d17722374aff1723`
- **Workflow:** Verify main
- **Overall conclusion:** **SUCCESS**
- Verify: PASS
- Lint: PASS
- Typecheck: PASS
- Unit Tests: PASS
- Build: PASS
- Browser Smoke / Playwright E2E: PASS

The previous Quick Pickup payment blocker is resolved by actual CI evidence.

## 8. PHASE 3 Action-Level Coverage

The tests cover:

- Delivery: phone + address → start order.
- Drive-thru: plate + customer + people → start order.
- Discount: open editor → percent → 10 → total 100 → 90.
- Hold: add product → Hold → `create_order` + `set_order_status(held)`.
- Send to Kitchen: add product → Send to Kitchen → `create_order` + `send_to_kitchen`.
- Complete Sale: add product → Pay → Cash → Confirm → `process_sale`.

## 9. Failure Analysis — RUN #119

### Initial Run #119
- **Run ID:** `31674710094`
- **Initial conclusion:** CANCELLED.
- A rerun was requested because the cancellation was not a code failure.

### Rerun result of #119
- **Overall:** FAILURE
- **Verify job:** PASS
- **Browser Smoke / Playwright E2E:** FAIL
- **50 Playwright tests executed:** 46 passed / 4 failed.

Failures were:
1. Drive-thru test expected `create_order`, but the real `CarOrderStep` only collects inputs and calls `onStart`; the parent stores order type/notes locally. Therefore the test expectation was wrong.
2. Delivery test made the same incorrect assumption: the wizard start action sets local workspace state and does not persist an order until cart persistence is requested.
3. Send to Kitchen reached `create_order` but the test did not account for the asynchronous persistence/state transition before asserting the kitchen RPC.
4. Complete Sale asserted `process_sale` immediately after Pay/Confirm without first waiting for the persisted order/payment workspace state.

Evidence from the real implementation confirms `CarOrderStep` calls `onStart({ orderType, guestCount, notes })`, while `OrderStartWizard` passes that to the parent; persistence occurs later in `usePosOrder`. The test therefore must distinguish **order-start state transition** from **order persistence**.

This was a **test-contract/timing defect**, not proof of a production business-logic defect. The failures must still be fixed and reverified; PHASE 3 remains open.

## 10. Failure Analysis — RUN #123

- **Run:** #123
- **Run ID:** `31679150983`
- **Verify:** PASS
- **Build:** PASS
- **Browser E2E:** FAIL
- **Result:** **48 passed / 2 failed** out of 50.

### Failure 1 — Hold
The first attempt checked `rpcCalls` immediately after clicking Hold and observed only login/setup RPCs. On retry, `create_order` appeared but `set_order_status` had not yet appeared at the assertion point.

Root cause: the test did not wait for the application's asynchronous persistence chain. This is a test synchronization defect, not evidence that Hold is broken.

### Failure 2 — Complete Sale
The test waited for `create_order` immediately after opening the Payment workspace. The real flow does not guarantee that persistence occurs at that boundary. The correct boundary is the payment confirmation action, after which the test should wait for the actual persistence/sale RPCs.

Root cause: incorrect lifecycle boundary in the test.

## 11. Current Fix — Commit `ef2a90c58162e81b1d9f26651103a2663c1de925`

Corrected `tests/e2e/pos-actions.spec.ts`:

- Hold now waits up to 10 seconds for `create_order`, then independently waits for `set_order_status` before validating `p_status = held`.
- Complete Sale no longer assumes `create_order` exists when the payment panel opens. It performs Cash + Confirm first, then waits for `create_order` and `process_sale`.
- The assertions remain action-level and continue to validate real RPC names/payloads.
- No production business logic was bypassed or weakened.

## 12. PRE-CI VALIDATION GATE / Checkpoint Procedure

From this point forward every PHASE 3 change follows:

```text
Change
 ↓
Typecheck / Lint
 ↓
Unit Tests
 ↓
Affected Playwright test
 ↓
Full PHASE 3 E2E
 ↓
Review failures/artifacts
 ↓
CI
 ↓
Record result
```

A failed CI result must be classified before another change:
- Infrastructure/cancellation → rerun, no code change.
- Test-contract/timing → fix test boundary.
- Production behavior defect → fix application root cause.
- Regression → compare with checkpoint and restore if necessary.

The named rollback checkpoint is `ui-rebuild-phase3-checkpoint-2026-08-13` at `b46c29eb10ed085653296c326f3fa3596f8db739`.

## 13. Current CI Status

**Latest code commit:** `ef2a90c58162e81b1d9f26651103a2663c1de925`

**Latest verified CI before this fix:** Run #123 — FAILURE, 48/50 Browser E2E passed.

**Current status:** PENDING CI verification for the new fix.

Do not claim PHASE 3 success until the corrected commit has green Browser E2E evidence.

## 14. Exact Next Action — DO NOT SKIP

1. Run/inspect CI for `ef2a90c58162e81b1d9f26651103a2663c1de925`.
2. If Browser E2E fails, read the exact failing test/log/artifact before changing anything.
3. Fix only the root cause.
4. Repeat the PRE-CI VALIDATION GATE.
5. Re-run CI.
6. Continue until all PHASE 3 critical flows have green CI evidence.
7. Then close PHASE 3 and only then begin PHASE 4.

## 15. Session Update Rule

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

## 16. Definition of Done

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

## 17. Maintainability / Extensibility Requirement

The rebuilt UI must remain safely editable and extensible.

Future visual rearrangement, component replacement, menu reordering, or addition of controls must not require rewriting underlying business logic merely because the UI changed position.

Required mechanisms:
- Stable element/action identities.
- Shared UI components.
- Centralized navigation.
- Separation of UI, action, route/state, permission, and service/data layers.
- E2E selectors that do not depend on DOM position.

This is a core requirement of the original rebuild objective, not an optional future enhancement.
