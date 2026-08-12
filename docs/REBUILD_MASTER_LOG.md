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

## 5. Completed Work / Evidence

- C1 data-safety fix: migration 045.
- C2 hold-order duplication fix: migration 046.
- Unified application shell / Foodics-oriented UI foundation implemented on the rebuild branch.
- Stable navigation/menu foundation implemented.
- Dashboard/navigation E2E verification completed.
- Login E2E mocking was corrected so the POS tests reach the application instead of being blocked at `/login`.
- POS tests were corrected to use the actual UI's stable test IDs instead of assumed text/DOM positions.
- POS order-type action test is now passing in the latest Browser E2E run.

## 6. Current State — 2026-08-13

**Current branch:** `ui-rebuild-foodics-2026`

**Current phase:** PHASE 3 — POS / FloorPlan / Order Workspace

**Current PR head:** `bc33c9cdec4835966f65fe2256efd115504c6781`

**PR #3 status:** Open, not merged. The PR merge ref used by CI is `b0fda806b0e006a7671ce8aa80041ddb4e3041ed`.

### Latest CI — Run #98

Run #98 was executed against the PR merge ref containing the current head and completed with:

- Verify: **PASS**
- Build: **PASS**
- Browser E2E: **FAIL**
- Browser E2E result: **42 passed / 1 failed**

The passing tests include Dashboard/Navigation, Public Smoke, and the POS order-type flow.

### Exact remaining failure

The only failing test is:

`tests/e2e/pos-actions.spec.ts:70` — `starts quick pickup, adds product, changes quantity, and opens payment`

Failure occurs at the quantity-increase click. The test currently uses a fragile DOM traversal/position selector:

`getByText('E2E Burger').last().locator('../..').getByRole('button').filter({ has: page.locator('svg') }).nth(1)`

It timed out after 30 seconds. This is precisely the type of selector the rebuild rules prohibit: the action is coupled to DOM structure/position instead of a stable control identity.

**Important:** this failure is now isolated to the E2E selector/interaction layer. The application build, typecheck, lint, unit tests, navigation tests, public smoke tests, and order-type POS test all pass in Run #98.

### Note about commit history

Commit `6717c9de...` received a cancelled Run #97 because a newer push superseded it. The branch then advanced to `bc33c9c...` when `REBUILD_MASTER_LOG.md` was added. Therefore the current source of truth is the current PR head above, not `6717c9de...`.

## 7. Next Action — DO NOT SKIP

1. Fix the single failing POS quantity interaction by using a stable test ID/semantic control identity in the actual cart quantity button. Do not weaken the assertion and do not use `nth()`/DOM position as the final solution.
2. Run CI again and record the new run number/result here.
3. If Browser E2E becomes fully green, close the current POS smoke blocker and continue with the next unverified POS flow: Dine-in/Tables.
4. Then verify Delivery/Drive-thru, Hold/Resume, Kitchen, Discount, Payment, and Complete Sale.
5. Do not move to PHASE 4 until PHASE 3's required POS/FloorPlan action-level verification is closed.

## 8. Session Update Template

Every future session must append/update this section with:

- Date/time
- Current branch
- Current phase
- Last commit
- CI run and result
- What was verified
- What failed
- Root cause
- Fix/commit
- Remaining blockers
- Exact next action

## 9. Definition of Done

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
