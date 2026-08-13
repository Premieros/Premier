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
19. **BATCH EXECUTION RULE:** each remaining phase will be implemented as one coherent package whenever practical; do not split a phase into unnecessary micro-cycles. After the package, run one comprehensive PRE-CI/CI regression gate.
20. **MULTI-PHASE EFFICIENCY RULE:** if two or more consecutive phases have no dependency that requires separate verification, they may be implemented in one package, but they cannot be declared closed until the combined gate proves every included phase and all prior phases.

## 3. Phase Plan

### PHASE 0 — Baseline / Safety
**CLOSED**

### PHASE 1 — Application Shell / Navigation
**CLOSED**

### PHASE 2 — Core UI Foundation
**FOUNDATION IMPLEMENTED / CONTINUES AS NEEDED**

### PHASE 3 — POS / FloorPlan / Order Workspace
**CLOSED — VERIFIED 2026-08-13**

### PHASE 4 — Security / RBAC / Branch Isolation
**CLOSED — VERIFIED 2026-08-13 by combined Regression Run #136**

### PHASE 5 — Final Stabilization / Regression
**NEXT — EXECUTION STARTED AS A SINGLE PACKAGE**

### PHASE 6+ — Remaining rebuild/design completion packages
**PENDING — may be bundled when dependencies allow**

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
50 E2E executed: 46 passed / 4 failed. Failures were test-contract/timing issues.

### Run #123
50 E2E: 48 passed / 2 failed. Hold and Complete Sale had incorrect asynchronous lifecycle boundaries.

### Run #124
50 E2E: 49 passed / 1 failed. Complete Sale was corrected in `9db50b6...`.

Cancelled runs were treated as infrastructure/cancellation events and were not used as code-failure evidence.

## 9. FINAL PHASE 3 VERIFICATION — RUN #126

**Date:** 2026-08-13
**Run:** #126
**Run ID:** `31686015991`
**Commit:** `9db50b6b8e4d59a62f2faa394db8b3c8003fff3c`
**Overall:** SUCCESS

- Verify/Lint/Typecheck/Unit/Build — PASS
- Browser Smoke / Playwright — **50/50 PASS**
- Critical POS/FloorPlan/Delivery/Drive-thru/Hold/Kitchen/Discount/Payment/Complete Sale flows — PASS

**PHASE 3 officially CLOSED.**

## 10. PRE-CI VALIDATION GATE — MANDATORY GOING FORWARD

Every change must follow:

`Change → Typecheck/Lint → Unit → affected Playwright → full phase E2E → inspect failure/artifacts → CI → record result`

Failure classification:
- Infrastructure/cancellation → rerun, no code change.
- Test-contract/timing → fix test boundary.
- Production behavior defect → fix application root cause.
- Regression → compare with checkpoint and restore if necessary.

## 11. PHASE 4 — Security / RBAC / Branch Isolation

Objective: verify and harden the existing security model without breaking previously verified UI/POS behavior.

The PR verification workflow was upgraded to include PostgreSQL, CI auth stub, canonical migrations, schema verification, fixture helpers, and mandatory integration/security/RLS tests before Browser E2E.

Security/RBAC Action-Level coverage was added for internal function EXECUTE protection, discount permission enforcement, privileged discount path, branch-manager role permission protection, and cross-branch audit access.

Relevant commits:
- `0fc866a806a8b536e02ca26eeb57928f1178aabc` — mandatory DB/RLS gate.
- `ccc55c4c023ae62f1d75406adf6a3e97d8e6f2e5` — RBAC hardening tests.
- `ddc51bc5336a36bd91f8881b3eaa575f8eb5e928` — corrected `runAs()` success assertions.
- `e416f4bf34fc9cf985fa77fe6ad177f852fbda03` — corrected RBAC test contract/fixture and reached the combined green regression gate.

## 12. COMBINED PHASE 0–4 REGRESSION — RUN #136

**Date:** 2026-08-13
**Run:** #136
**Run ID:** `31689738911`
**Commit:** `e416f4bf34fc9cf985fa77fe6ad177f852fbda03`
**Workflow:** Verify main
**Overall:** SUCCESS

### Verify
- npm ci — PASS
- Lint — PASS
- Typecheck — PASS
- Unit Tests — PASS
- Build — PASS

### DB / Security
- PostgreSQL service — PASS
- CI auth stub — PASS
- Canonical migrations — PASS
- Schema verification — PASS
- Integration + Security/RLS regression — PASS

### Browser Regression
- Playwright Chromium — PASS
- Browser E2E — PASS

**Conclusion:** PHASE 0–4 all passed the same CI verification cycle with no observed regression. PHASE 4 is officially CLOSED.

## 13. CURRENT EXECUTION PACKAGE — PHASE 5

### PHASE 5 objective
Final stabilization package before final UI/design completion and merge preparation.

This package must consolidate:
- regression hardening;
- critical route/action coverage;
- stable interaction identity audit;
- UI/service separation checks;
- removal of fragile DOM-position selectors from critical flows;
- final smoke coverage for dashboard/navigation/POS;
- build/typecheck/lint/unit/integration/browser gates;
- full PHASE 0–4 regression.

### Phase 5 rules
- Implement as one coherent package where possible.
- Do not alter working business logic unless a verified defect is found.
- Do not reopen PHASE 0–4 unless a regression or proven defect requires it.
- Create a PHASE 5 checkpoint before risky modifications.
- Close PHASE 5 only after a single comprehensive CI cycle proves PHASE 0–5.

## 14. Current State

**Branch:** `ui-rebuild-foodics-2026`
**PR #3:** Open, not merged.
**Latest fully verified commit:** `e416f4bf34fc9cf985fa77fe6ad177f852fbda03` (Run #136 — SUCCESS).
**Current phase:** PHASE 5 — Final Stabilization / Regression.
**Rollback checkpoint:** `ui-rebuild-phase4-checkpoint-2026-08-13`.

## 15. Session Update Rule

Every meaningful action must be recorded here with date/time, branch, phase, previous verified CI, root cause, files changed, fix, commit(s), new CI status/result, remaining blockers, and exact next action.

User explicitly requested to be told every time progress is recorded.

## 16. Definition of Done

The rebuild is complete only when the reference design is the intended production UI, critical controls have stable identities independent of layout, dashboard/navigation and POS/FloorPlan/Kitchen/payment flows are verified, RBAC/branch isolation is verified, build/typecheck/lint/unit/browser/regression checks pass, no critical blocker remains, and PR #3 is reviewed before merge to `main`.

**Do not replace this plan with a new plan unless the user explicitly changes the project objective.**
