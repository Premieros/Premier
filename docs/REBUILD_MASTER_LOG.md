# Premier UI Rebuild — Master Plan & Progress Log

> **Purpose:** This file is the persistent source of truth for the UI rebuild and verification work. Every future session/agent must read this file before making changes and update it after every meaningful phase, fix, CI result, or architectural decision.
>
> **Primary branch:** `ui-rebuild-foodics-2026`
> **Target:** `main` only after final verification and explicit approval.
> **PR:** #3 — UI rebuild / stable extensible design.

## 1. Original Objective

Rebuild the Premier interface to match the approved/reference design while respecting the existing application architecture, database, business logic, permissions, and routes. The rebuilt UI must be extensible and behaviorally stable: moving a button, switch, card, menu item, or control must not change what it does.

Core rule:

`Visual Layout → Stable Component/Element ID → Action → Route/State → Permission → Service/Data`

Functionality must never depend on DOM position, visual placement, or fragile selectors.

## 2. Non-Negotiable Rules

1. Do not work directly on `main`.
2. Do not merge PR #3 until final verification passes.
3. Do not add unrelated features while the rebuild is in progress.
4. Do not make tests pass by bypassing real application behavior.
5. Diagnose the root cause before changing application code or tests.
6. Prefer stable `data-testid`/semantic selectors over DOM position and `nth()`.
7. A phase is closed only after its required CI evidence is green.
8. If a later phase exposes a defect in an earlier phase, return to the earlier phase, fix it, re-verify, then continue.
9. Preserve existing business logic unless the audit proves it is incorrect.
10. Keep this file updated so future sessions cannot drift from the plan.

## 3. Phase Plan

### PHASE 0 — Baseline / Safety
**Status: CLOSED**

Establish the working branch, protect `main`, inspect baseline build/tests/CI, and document the starting point.

### PHASE 1 — Application Shell / Navigation
**Status: CLOSED**

Rebuild the application shell and navigation with stable routes/menu configuration, stable identifiers, and behavior independent of visual position. Dashboard/navigation Browser E2E and CI verification reached green.

### PHASE 2 — Core UI Foundation
**Status: IN PROGRESS / FOUNDATION IMPLEMENTED**

Establish reusable UI patterns: shared layout/components, buttons, dialogs, forms, tables, toolbars, loading/error/empty states, and stable interaction identifiers. The foundation must allow future screens to be changed without coupling actions to layout.

### PHASE 3 — POS / FloorPlan / Order Workspace
**Status: IN PROGRESS — CURRENT PHASE**

Rebuild and verify POS behavior against the actual current UI and reference design. Required action-level flows include:

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

The objective is not merely that `/pos` renders; each critical action must produce the correct state/result.

### PHASE 4 — Security / RBAC / Branch Isolation
**Status: PENDING**

Verify role permissions and branch isolation at UI and backend/RLS levels. UI hiding alone is not security.

### PHASE 5 — Final Stabilization / Regression
**Status: PENDING**

Final audit of migrations, pagination/shared queries where required, duplicated logic, error/loading/empty states, responsive behavior, documentation, and full regression.

### FINAL — PR Review / Merge
**Status: PENDING**

Only after all required CI checks and regression tests pass: review PR #3, verify no critical issues remain, then merge to `main` only with approval.

## 4. Verified Architecture Decisions

- Unified application shell is part of the rebuild.
- Navigation/routes are centralized rather than derived from visual placement.
- Stable IDs are used for critical interactions and E2E tests.
- POS has stable order-type selectors such as `pos-order-type-picker`, `pos-order-type-dine_in`, `pos-order-type-drive_thru`, `pos-order-type-delivery`, and `pos-order-type-takeaway`.
- Moving a control in the layout must not alter its action, permission, route, state, or service behavior.
- Cart quantity controls now have stable IDs based on product identity: `pos-cart-qty-decrease-{productId}`, `pos-cart-qty-{productId}`, and `pos-cart-qty-increase-{productId}`.

## 5. Completed Work / Evidence

- C1 data-safety fix: migration 045.
- C2 hold-order duplication fix: migration 046.
- Unified application shell / Foodics-oriented UI foundation implemented on the rebuild branch.
- Stable navigation/menu foundation implemented.
- Dashboard/navigation E2E verification completed.
- Login E2E mocking was corrected so the POS tests reach the application instead of being blocked at `/login`.
- POS tests were corrected to use the actual UI's stable test IDs instead of assumed text/DOM positions.
- POS order-type action test is passing in the latest Browser E2E run.
- The remaining cart quantity test was corrected to stop traversing DOM parents and using `nth(1)`; it now targets the product-specific stable quantity control ID.

## 6. Current State — 2026-08-13

**Current branch:** `ui-rebuild-foodics-2026`

**Current phase:** PHASE 3 — POS / FloorPlan / Order Workspace

**Latest source commits:**
- `4ebb0ddd8855afe7880cf84ce35ab9bc9f60bc6c` — add stable cart quantity control IDs to `CurrentOrderPanel.tsx`.
- `9cf28849332fb079d823a8e8c2f853139a30cef7` — update `pos-actions.spec.ts` to use the stable quantity IDs and assert quantity `1 → 2`.

**PR #3 status:** Open, not merged.

### Latest completed CI evidence before the current fix — Run #99

Run #99 completed with:

- Verify: **PASS**
- Build: **PASS**
- Browser E2E: **42 passed / 1 failed**

The only failure was the quick-pickup cart quantity increase action. The failure was caused by the test using fragile DOM traversal and `nth(1)` to identify the plus button.

### Root cause

The failing selector was:

`getByText('E2E Burger').last().locator('../..').getByRole('button').filter({ has: page.locator('svg') }).nth(1)`

This violates the project's central architectural/testing rule because it couples the action to DOM structure and visual placement.

### Fix just applied

Application file:

`src/features/pos/components/order/CurrentOrderPanel.tsx`

Added stable product-specific identifiers and semantic labels to the cart quantity controls:

- `pos-cart-qty-decrease-{productId}`
- `pos-cart-qty-{productId}`
- `pos-cart-qty-increase-{productId}`

Test file:

`tests/e2e/pos-actions.spec.ts`

The quick-pickup test now uses:

- `getByTestId(pos-cart-qty-{PRODUCT_ID})`
- `getByTestId(pos-cart-qty-increase-{PRODUCT_ID})`

and verifies the real state transition from quantity `1` to `2` before opening payment.

This is a real stable-identity fix; the application behavior was not bypassed and no assertion was weakened.

## 7. Current Verification State — AFTER FIX

The fix has been committed to the rebuild branch, but **a new CI run has not yet completed for these commits**.

Therefore:

- POS quantity fix: **IMPLEMENTED**
- CI verification of the fix: **PENDING**
- PHASE 3: **OPEN**
- Do not close the blocker until CI proves the result.

## 8. Exact Next Action — DO NOT SKIP

1. Wait for/inspect the CI run triggered by the latest branch commits.
2. Verify Verify + Build + Browser E2E.
3. If the quantity test passes and Browser E2E is fully green, record the run here and close this specific POS smoke blocker.
4. Continue with the next unverified POS flow: Dine-in/FloorPlan/Tables.
5. Then verify Delivery/Drive-thru, Hold/Resume, Kitchen, Discount, Payment, and Complete Sale.
6. Do not move to PHASE 4 until PHASE 3's required POS/FloorPlan action-level verification is closed.

## 9. Session Update Rule

Every meaningful action must be recorded in this file. The record must include:

- Date/time
- Current branch
- Current phase
- Previous verified CI
- Root cause
- Files changed
- Fix applied
- Commit(s)
- New CI status/result
- Remaining blockers
- Exact next action

**User explicitly requested that every time progress is made, this file is updated and the user is told that it was recorded.**

## 10. Definition of Done

The rebuild is complete only when:

- Reference design and current application architecture are aligned.
- Critical UI controls have stable identities and actions independent of layout position.
- Dashboard/navigation behavior is verified.
- POS/FloorPlan/Kitchen/payment critical flows are verified end-to-end.
- RBAC and branch isolation are verified.
- Build, typecheck, lint, unit tests, Browser E2E, and required regression checks pass.
- No critical known blocker remains.
- PR #3 is reviewed and only then merged to `main`.

**Do not replace this plan with a new plan unless the user explicitly changes the project objective.**
