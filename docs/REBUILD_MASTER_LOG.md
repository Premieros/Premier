# Premier UI Rebuild — Master Plan & Progress Log

> Persistent source of truth for the UI rebuild. Read before every session and update after every meaningful fix, CI result, phase change, or architectural decision.

**Primary branch:** `ui-rebuild-foodics-2026`  
**PR:** #3 — UI rebuild / stable extensible design  
**Target:** `main` only after final verification and explicit approval.

## 1. Original Objective

Rebuild Premier's interface to match the approved/reference design while respecting the existing architecture, database, business logic, permissions, and routes. The rebuilt UI must be extensible and behaviorally stable: moving a button, switch, card, menu item, or control must not change what it does.

**Final UI outcome:** when all phases and final verification are complete, the rebuilt/reference design is intended to become the production UI on `main`. This is a full UI rebuild/replacement of the old visual/application-shell experience, not merely a collection of small cosmetic changes. The existing database, business logic, permissions, routes, and verified business behavior are preserved unless a real defect is found and intentionally fixed. The old UI is not retained as the final production design as a fallback.

The process is deliberately staged: rebuild the UI foundation and screens, verify their real behavior, fix defects, complete regression, then merge the rebuilt UI to `main`. We do not merge or declare the new design final until the required verification passes.

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
11. The final result must be the rebuilt/reference UI on `main`; do not silently revert to the old UI merely to obtain passing tests.

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

## 7. Latest Verification — RUN #103

Run #103 completed against PR #3 merge ref.

- **Run:** #103
- **Run ID:** `31645073329`
- **Merge ref tested:** `732d337374de51f88f10a82e0a3ea171e3116780`
- **Workflow:** Verify main
- **Verify job:** PASS
- **Build:** PASS
- **Browser E2E:** FAIL
- **Browser E2E:** **42 passed / 1 failed**

The failure is now specifically at the end of the Quick Pickup flow: after clicking the enabled Pay button, the test expects `/طريقة الدفع|Payment method/`, but no such text exists in the rendered UI. The test failure is at `tests/e2e/pos-actions.spec.ts:83`.

### Root cause status

The previous cart selector problem is no longer the reported blocker. The current blocker is an incorrect/unstable expectation about the payment UI. We must inspect the actual payment component/flow before changing the test or application.

### Important evidence

- Order-type test passes.
- Public protected-route smoke tests pass.
- Build passes.
- The remaining failure is only the payment assertion in the Quick Pickup action test.
- Do **not** weaken the assertion or bypass payment behavior merely to get green CI.

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
- The rebuilt/reference UI is the final production UI on `main`; the old UI is not retained as the final visual fallback.
- Critical UI controls have stable identities and actions independent of layout position.
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

### 2026-08-13 — Final UI outcome clarification
- User asked whether completing all phases means the new/reference design will fully replace the old design.
- Clarification added: **Yes.** The intended final production outcome is the rebuilt/reference UI on `main`, with the existing verified business logic, database, routes, permissions, and data preserved. The old UI is not the final fallback.
- This clarification does not change the phase plan; it makes the original objective explicit.
