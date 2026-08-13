# Premier UI Rebuild — Master Plan & Progress Log

> Persistent source of truth. Read before every session and update after every meaningful fix, CI result, phase change, or architectural decision.

## 1. Original Objective

Rebuild Premier's interface to match the approved/reference design while respecting the existing architecture, database, business logic, permissions, and routes. The rebuilt UI must be extensible and behaviorally stable: moving a button, switch, card, menu item, or control must not change what it does.

Final objective: after all phases and final verification, the rebuilt/reference UI becomes the production UI on `main`; the old UI is not the intended final fallback. Preserve correct existing business logic, database, routes, permissions and services unless a verified defect requires a change.

Core rule:
`Visual Layout → Stable Component/Element ID → Action → Route/State → Permission → Service/Data`

## 2. Non-Negotiable Rules

1. Never work directly on `main`.
2. Do not merge PR #3 until final verification passes.
3. No unrelated features during rebuild.
4. Never make tests pass by bypassing real application behavior.
5. Diagnose root cause before changing code/tests.
6. Prefer stable `data-testid`/semantic selectors over DOM position and `nth()`.
7. A phase closes only after required CI evidence is green.
8. If a later phase exposes an earlier defect, return to that phase, fix, re-verify, then continue.
9. Preserve business logic unless audit proves it incorrect.
10. Keep this file updated so future sessions cannot drift.
11. UI rearrangement must not alter action, permission, route/state or service behavior.
12. New screens/components use shared UI foundation and stable interaction identities.
13. PRE-CI VALIDATION GATE: typecheck → lint → unit → affected Playwright → full phase E2E → inspect failures/artifacts → CI.
14. CHECKPOINT RULE: preserve a named rollback point before risky phase changes.

## 3. Phase Plan

### PHASE 0 — Baseline / Safety
**CLOSED**

### PHASE 1 — Application Shell / Navigation
**CLOSED**

### PHASE 2 — Core UI Foundation
**FOUNDATION IMPLEMENTED / CONTINUES AS NEEDED**

### PHASE 3 — POS / FloorPlan / Order Workspace
**CLOSED — VERIFIED 2026-08-13**

Required action-level flows verified:
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
**CURRENT PHASE — PENDING EXECUTION**

### PHASE 5 — Final Stabilization / Regression
**PENDING**

### FINAL — PR Review / Merge
**PENDING**

## 4. Architecture / Maintainability Decisions

- Unified application shell and centralized navigation.
- Stable IDs for critical interactions and E2E tests.
- POS order-type selectors: `pos-order-type-picker`, `pos-order-type-dine_in`, `pos-order-type-drive_thru`, `pos-order-type-delivery`, `pos-order-type-takeaway`.
- Cart quantity IDs are product-specific.
- Payment IDs: `pos-payment-method-{method}`, `pos-payment-confirm`.
- Table IDs: `pos-table-{tableId}`, table filter/search/guest/start IDs.
- POS action IDs: `pos-action-discount`, `pos-action-hold`, `pos-action-send-kitchen`, `pos-action-pay`, `pos-discount-editor`, `pos-discount-input`, `pos-total-value`.
- Drive-thru IDs: plate/customer/people/start.
- Delivery IDs: phone/address/notes/start.
- UI layout is independent from action/service logic.
- Shared components and stable action identities make future visual rearrangement safe.

## 5. Earlier Verified Work

- C1 data-safety fix: migration 045.
- C2 hold-order duplication fix: migration 046.
- Unified shell / Foodics-oriented UI foundation.
- Dashboard/navigation E2E completed.
- Login E2E corrected so POS tests reach the application.
- Stable cart/payment/table/action IDs added to real components.
- Dine-in/FloorPlan/Table real flow verified with mocked vacant table.
- Action-Level E2E added for remaining PHASE 3 flows.
- Tests validate real application behavior/RPCs where persistence is part of the action.
- Run #110 was green before the expanded PHASE 3 action coverage.

## 6. PHASE 3 Commit History

- `bb1a9fb4d5161c401dac95b258889366c5f2a0dd` — stable CurrentOrderPanel action IDs.
- `c27063c0148dc9336b68412e74ebb7b67efc7830` — drive-thru IDs.
- `58eb589ec161a7499b79a6720ab94afa347dde24` — delivery IDs.
- `f50d9996c89b614b040223b3620cc83fc7bb5009` — initial remaining PHASE 3 Action-Level E2E.
- `cdc51c4632a6b6c72e19382cfc3fcaae97424cc6` — corrected Delivery/Drive-thru/payment async assertions.
- `ef2a90c58162e81b1d9f26651103a2663c1de925` — corrected Hold/Complete Sale persistence boundaries.
- `9db50b6b8e4d59a62f2faa394db8b3c8003fff3c` — Complete Sale test corrected to assert the actual payment completion boundary and `process_sale`.

## 7. Safety Checkpoint

Named rollback point:
`ui-rebuild-phase3-checkpoint-2026-08-13`

Checkpoint commit:
`b46c29eb10ed085653296c326f3fa3596f8db739`

Use it only if a later change causes regression or unsafe divergence.

## 8. Failure Analysis

### Run #119
50 E2E executed: 46 passed / 4 failed.
Failures were test-contract/timing issues: Delivery/Drive-thru incorrectly expected persistence at wizard start; Send to Kitchen and Complete Sale did not respect asynchronous persistence boundaries.

### Run #123
50 E2E: 48 passed / 2 failed.
Hold and Complete Sale still had incorrect asynchronous lifecycle boundaries. Fixed in `ef2a90c...`.

### Run #124
50 E2E: 49 passed / 1 failed.
Only Complete Sale remained. The test incorrectly waited for `create_order` after payment confirmation. The real completion contract is the confirmed payment and `process_sale`; test corrected in `9db50b6...`.

Cancelled runs were treated as infrastructure/cancellation events and were not used as code-failure evidence.

## 9. FINAL PHASE 3 VERIFICATION — RUN #126

**Date:** 2026-08-13
**Run:** #126
**Run ID:** `31686015991`
**Commit:** `9db50b6b8e4d59a62f2faa394db8b3c8003fff3c`
**Workflow:** Verify main
**Overall:** SUCCESS

Verify job:
- npm ci — PASS
- Lint — PASS
- Typecheck — PASS
- Unit Tests — PASS
- Build — PASS

Browser Smoke / Playwright:
- **50/50 tests passed**
- Build — PASS
- Playwright Chromium — PASS
- Artifact `verify-playwright-report` uploaded successfully.

Critical PHASE 3 tests observed green in Run #126:
- Quick Pickup + product + quantity + payment
- Dine-in / FloorPlan / Tables
- Drive-thru
- Delivery
- Discount
- Hold
- Send to Kitchen
- Complete Sale / `process_sale`
- Order type actions and back navigation
- Public/protected route smoke coverage

**PHASE 3 is officially CLOSED based on real CI evidence.**

## 10. PRE-CI VALIDATION GATE — MANDATORY GOING FORWARD

Every change must follow:

`Change → Typecheck/Lint → Unit → affected Playwright → full phase E2E → inspect failure/artifacts → CI → record result`

Failure classification before another code change:
- Infrastructure/cancellation → rerun, no code change.
- Test-contract/timing → fix test boundary.
- Production behavior defect → fix application root cause.
- Regression → compare with checkpoint and restore if necessary.

## 11. PHASE 4 — Next Objective

Now that PHASE 3 is green, PHASE 4 begins. Its purpose is **Security / RBAC / Branch Isolation**, without redesigning or weakening the UI behavior already verified.

PHASE 4 gate must verify:
- Authentication and session behavior.
- Role/permission enforcement at UI and service/data layers.
- Branch isolation at database/RLS level.
- Users cannot read/write another branch's protected data.
- Super Admin behavior remains unrestricted as defined by the project rules.
- Owner/Manager/Cashier/Kitchen/Warehouse/Accountant boundaries remain correct.
- Branch assignment is enforced consistently.
- Protected routes/actions cannot be bypassed by changing URL, DOM position, or client state.
- Critical RBAC/RLS operations receive Action-Level tests.
- No PHASE 3 regression after security changes.

PHASE 4 must use the same stable IDs, architecture separation, checkpoint rule and PRE-CI validation gate.

## 12. Current State

**Branch:** `ui-rebuild-foodics-2026`
**PR #3:** Open, not merged.
**Current phase:** PHASE 4 — Security / RBAC / Branch Isolation.
**Latest verified commit:** `9db50b6b8e4d59a62f2faa394db8b3c8003fff3c`.
**Latest CI:** Run #126 — SUCCESS, 50/50 E2E.
**Rollback checkpoint:** `ui-rebuild-phase3-checkpoint-2026-08-13` / `b46c29e...`.

## 13. Session Update Rule

Every meaningful action must be recorded here with date/time, branch, phase, previous verified CI, root cause, files changed, fix, commit(s), new CI status/result, remaining blockers, and exact next action.

User explicitly requested to be told every time progress is recorded.

## 14. Definition of Done

The rebuild is complete only when the reference design is the intended production UI, critical controls have stable identities independent of layout, dashboard/navigation and POS/FloorPlan/Kitchen/payment flows are verified, RBAC/branch isolation is verified, build/typecheck/lint/unit/browser/regression checks pass, no critical blocker remains, and PR #3 is reviewed before merge to `main`.

**Do not replace this plan with a new plan unless the user explicitly changes the project objective.**
