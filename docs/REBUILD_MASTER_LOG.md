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
15. **REGRESSION PROTECTION RULE:** every later phase must preserve every previously verified phase. A phase is not considered successful if its own tests pass while an earlier phase regresses.
16. Before closing any phase, run the current phase suite **and the full regression suite for all previously closed phases**, plus Verify/Build.
17. If a regression appears, stop phase advancement, classify the root cause, fix it at the correct layer, re-run the affected earlier phase, then re-run the full regression gate before continuing.
18. Never weaken, delete, skip, or bypass an earlier test merely to make a later phase green.

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
**CURRENT PHASE — EXECUTION STARTED 2026-08-13**

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

## 7. Safety Checkpoints

PHASE 3 rollback point:
`ui-rebuild-phase3-checkpoint-2026-08-13`

PHASE 3 checkpoint commit:
`b46c29eb10ed085653296c326f3fa3596f8db739`

PHASE 4 rollback point:
`ui-rebuild-phase4-checkpoint-2026-08-13`

PHASE 4 checkpoint is the last fully verified PHASE 3 state before PHASE 4 changes. Use it only if a later change causes regression or unsafe divergence.

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

## 11. PHASE 4 — Security / RBAC / Branch Isolation

**Objective:** verify and harden the existing security model without breaking any previously verified UI/POS behavior.

Required gate:
- Authentication/session behavior.
- Role/permission enforcement at UI and service/data layers.
- Branch isolation at database/RLS level.
- Users cannot read/write another branch's protected data.
- Super Admin remains unrestricted as defined by project rules.
- Owner/Manager/Cashier/Kitchen/Warehouse/Accountant boundaries remain correct.
- Branch assignment is enforced consistently.
- Protected routes/actions cannot be bypassed by changing URL, DOM position, or client state.
- Critical RBAC/RLS operations receive Action-Level tests.
- **Full regression of all previously closed phases is mandatory before PHASE 4 closes.**

### PHASE 4 workflow
1. Create a PHASE 4 checkpoint from the last fully verified state. **DONE:** `ui-rebuild-phase4-checkpoint-2026-08-13`.
2. Inventory auth/RBAC/RLS policies, helper functions, protected routes, and relevant tests. **IN PROGRESS.**
3. Identify gaps/unsafe assumptions before changing code.
4. Add Action-Level security tests for the gaps.
5. Fix root causes only where evidence requires it.
6. Run PRE-CI VALIDATION GATE.
7. Run CI and inspect artifacts.
8. Run full regression suite for PHASE 0–3.
9. Close PHASE 4 only when security tests and all earlier regression tests are green.
10. Record checkpoint, findings, fixes, commits, CI and next action here.

### PHASE 4 finding — CI coverage gap identified

The repository already contains a substantial RLS branch-isolation integration suite (`tests/integration/rls_branch_isolation.test.ts`) covering cross-branch reads/writes, role modes, child-table isolation and deny-by-default behavior. However, the PR verification workflow previously ran only typecheck/lint/unit/build plus Playwright; the DB/RLS integration suite existed in the deploy workflow but was not a required PR gate.

**Action taken:** `.github/workflows/verify-main.yml` was upgraded so PR verification now provisions PostgreSQL, applies the CI auth stub and canonical migrations, verifies the schema, applies the existing CI fixture helpers, and runs `npm run test:integration`. Browser E2E now depends on both application verification and the DB/security integration gate.

Commit:
`0fc866a806a8b536e02ca26eeb57928f1178aabc`

This is a **test/verification infrastructure hardening change**, not a claim that PHASE 4 security is already proven.

### PHASE 4 CI verification — RUN #130

**Date:** 2026-08-13
**Run:** #130
**Run ID:** `31688138736`
**Commit:** `6926888bd2ddcacbbf9df3bc1bc9808638c26b5b`
**Workflow:** Verify main
**Overall:** SUCCESS

- Verify job — PASS
  - npm ci — PASS
  - Lint — PASS
  - Typecheck — PASS
  - Unit Tests — PASS
  - Build — PASS
- DB/Security Gate — PASS
  - PostgreSQL service — PASS
  - CI auth stub — PASS
  - Canonical migrations — PASS
  - Schema verification — PASS
  - CI fixture helpers — PASS
  - Integration and security/RLS regression tests — PASS
- Browser Smoke — PASS
  - Playwright Chromium — PASS

**Conclusion:** the new mandatory DB/RLS security gate is operational and green. This validates the verification infrastructure and existing RLS regression suite; it does **not** close PHASE 4 yet.

### PHASE 4 Action-Level RBAC gap coverage added

Added:
`tests/integration/rbac_hardening.test.ts`

Coverage added for:
- direct EXECUTE revocation of internal journal/audit writers;
- cashier discount denial when `pos.discount` is absent;
- privileged role discount path when `pos.discount` is present;
- branch manager prevention from granting `audit.view`;
- cross-branch audit-trail access denial.

Commit:
`ccc55c4c023ae62f1d75406adf6a3e97d8e6f2e5`

**Status:** CI pending for this new test commit. Do not close any PHASE 4 security item until this commit passes the PRE-CI/CI gate and the full PHASE 0–3 regression remains green.

## 12. Current State

**Branch:** `ui-rebuild-foodics-2026`
**PR #3:** Open, not merged.
**Current phase:** PHASE 4 — Security / RBAC / Branch Isolation.
**Latest fully verified commit:** `6926888bd2ddcacbbf9df3bc1bc9808638c26b5b` (Run #130 — SUCCESS).
**Latest PHASE 4 test commit:** `ccc55c4c023ae62f1d75406adf6a3e97d8e6f2e5` (CI pending).
**Rollback checkpoint:** `ui-rebuild-phase4-checkpoint-2026-08-13`.

## 13. Session Update Rule

Every meaningful action must be recorded here with date/time, branch, phase, previous verified CI, root cause, files changed, fix, commit(s), new CI status/result, remaining blockers, and exact next action.

User explicitly requested to be told every time progress is recorded.

## 14. Definition of Done

The rebuild is complete only when the reference design is the intended production UI, critical controls have stable identities independent of layout, dashboard/navigation and POS/FloorPlan/Kitchen/payment flows are verified, RBAC/branch isolation is verified, build/typecheck/lint/unit/browser/regression checks pass, no critical blocker remains, and PR #3 is reviewed before merge to `main`.

**Do not replace this plan with a new plan unless the user explicitly changes the project objective.**
