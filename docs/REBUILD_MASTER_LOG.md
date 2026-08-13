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

## 6. Current State — 2026-08-13

**Current branch:** `ui-rebuild-foodics-2026`  
**Current phase:** PHASE 3 — POS / FloorPlan / Order Workspace  
**PR #3:** Open, not merged.

### Relevant fix commits

- `4ebb0ddd8855afe7880cf84ce35ab9bc9f60bc6c` — stable cart quantity IDs.
- `9cf28849332fb079d823a8e8c2f853139a30cef7` — POS quantity test uses stable IDs and verifies `1 → 2`.
- `80cdb01a5d28ba41333b53c0c946979f0501875d` — master-log update / CI state.

## 7. Latest Verification — RUN #106

Run #106 completed against the PR #3 merge ref and **FAILED**.

- **Run:** #106
- **Run ID:** `31648584834`
- **Commit tested:** `c3b107f08042faeacd4902a55b90518a318b0510`
- **PR merge ref actually executed:** `c3f76e9a665b0d726ef380611b834aefc6eaa210`
- **Workflow:** Verify main
- **Verify job:** PASS
- **Build:** PASS
- **Browser E2E:** FAIL
- **Browser E2E:** **42 passed / 1 failed**

### Exact failure

The only Browser E2E failure is:

`tests/e2e/pos-actions.spec.ts:83`

Test:
`POS action-level › starts quick pickup, adds product, changes quantity, and opens payment`

After the test clicks the enabled Pay button, it expects:
`/طريقة الدفع|Payment method/i`

but the actual rendered UI does not contain that text. The failure repeated on both retries. The Playwright run executed 43 tests total: **42 passed, 1 failed**.

### Verified successful parts of Run #106

- `npm ci` PASS
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test:unit` PASS
- `npm run build` PASS
- Browser dashboard/navigation actions PASS
- POS order-type actions/back navigation PASS
- Public protected-route smoke suite PASS
- Cart quantity flow reaches the Pay button; the earlier quantity-selector blocker is resolved.

### Current root-cause status

The remaining blocker is specifically the payment-flow assertion. We must inspect the real payment component/state after clicking Pay. Do not assume the UI uses a visible `Payment method` heading and do not weaken the assertion just to make CI green.

## 8. Exact Next Action — DO NOT SKIP

1. Inspect the actual POS payment component and the rendered result after clicking Pay.
2. Determine whether the application opens a payment modal, changes state, navigates, or completes payment inline.
3. If the application behavior is correct, update the test to assert the real stable payment state/control using stable IDs/semantic selectors.
4. If the application behavior is wrong, fix the application root cause instead.
5. Record the diagnosis, files, commit, and new CI result in this file.
6. Re-run CI and require Browser E2E to be fully green before closing this blocker.
7. Then continue to the next unverified POS flow: Dine-in/FloorPlan/Tables.

## 9. Session Update Rule

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

## 10. Definition of Done

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

## 11. Verification Log — 2026-08-13

### Run #103
- Result: **FAILED**
- Verify: PASS
- Build: PASS
- Browser E2E: 42 PASS / 1 FAIL
- Previous cart quantity blocker: resolved
- Current blocker: Quick Pickup payment assertion expects `طريقة الدفع|Payment method`, but the actual payment UI exposes a different state/control.
- Action: remain in PHASE 3; inspect the real payment flow and fix the root cause/test expectation without bypassing behavior.

### Architecture / maintainability clarification
- Confirmed and recorded: the final rebuild must remain safely editable and extensible. Future visual rearrangement, component replacement, menu reordering, or addition of controls must not require rewriting the underlying business logic solely because the UI changed position.
- Stable IDs, centralized navigation, shared UI components, and separation of UI/action/route/permission/service are mandatory mechanisms for this goal.
- This clarification does not change the original plan; it explicitly records an existing requirement of the rebuild.

### Run #106 — latest verification
- Result: **FAILED**
- Verify: PASS
- Build: PASS
- Browser E2E: **42 PASS / 1 FAIL**
- Run ID: `31648584834`
- Tested commit: `c3b107f08042faeacd4902a55b90518a318b0510`
- Executed PR merge ref: `c3f76e9a665b0d726ef380611b834aefc6eaa210`
- Failure: Quick Pickup payment assertion at `tests/e2e/pos-actions.spec.ts:83` expects `طريقة الدفع|Payment method`, but no such element exists after Pay is clicked.
- Quantity-selector issue remains resolved.
- No phase transition: PHASE 3 remains open.
- Next action: inspect actual payment UI/state and correct either the application root cause or the test expectation, then rerun CI.
