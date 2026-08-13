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
15. REGRESSION PROTECTION RULE: every later phase must preserve every previously verified phase.
16. Before closing any phase, run the current phase suite and the full regression suite for all previously closed phases, plus Verify/Build.
17. If a regression appears, stop phase advancement, classify the root cause, fix it at the correct layer, re-run the affected earlier phase, then re-run the full regression gate before continuing.
18. Never weaken, delete, skip, or bypass an earlier test merely to make a later phase green.
19. BATCH EXECUTION RULE: each remaining phase will be implemented as one coherent package whenever practical.
20. MULTI-PHASE EFFICIENCY RULE: independent consecutive phases may be bundled, but each included phase requires evidence in the combined gate before closure.

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
**CLOSED — VERIFIED by Run #141**

### PHASE 6+ — Remaining rebuild/design completion packages
**IN PROGRESS — 6A verified by Run #144; 6B verified by Run #147; 6C implementation started**

### FINAL — PR Review / Merge
**PENDING**

## 4. Architecture / Maintainability Decisions

- Unified application shell and centralized navigation.
- Stable IDs for critical interactions and E2E tests.
- POS order-type selectors: `pos-order-type-picker`, `pos-order-type_dine_in`, `pos-order-type-drive_thru`, `pos-order-type-delivery`, `pos-order-type-takeaway`.
- Cart quantity IDs are product-specific.
- Payment IDs: `pos-payment-method-{method}`, `pos-payment-confirm`.
- Table IDs: `pos-table-{tableId}`, table filter/search/guest/start IDs.
- POS action IDs: `pos-action-discount`, `pos-action-hold`, `pos-action-send-kitchen`, `pos-action-pay`, `pos-discount-editor`, `pos-discount-input`, `pos-total-value`.
- Drive-thru IDs: plate/customer/people/start.
- Delivery IDs: phone/address/notes/start.
- UI layout is independent from action/service logic.
- Shared components and stable action identities make future visual rearrangement safe.
- `src/core/navigation/routes.ts` remains the canonical route map.
- `src/core/navigation/menu.config.ts` remains the canonical navigation model.
- Navigation contract tests protect route uniqueness, menu identity uniqueness, canonical targets, and explicit permissions.

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

## 6. Safety Checkpoints

PHASE 3 rollback point: `ui-rebuild-phase3-checkpoint-2026-08-13`.
PHASE 3 checkpoint commit: `b46c29eb10ed085653296c326f3fa3596f8db739`.
PHASE 4 rollback point: `ui-rebuild-phase4-checkpoint-2026-08-13`.
PHASE 5 rollback point: `ui-rebuild-phase5-checkpoint-2026-08-13` at `e416f4bf34fc9cf985fa77fe6ad177f852fbda03`.
PHASE 6A verified commit: `ed56e4a57202125d377b13facd58db2640084cc5`.
PHASE 6B implementation commit: `7b121cea21c7c1141403f30db069320e69593bc8`.
PHASE 6B verification commit: `8380c82ff954b8faf3da49cc7ea70bd92dc5f537`.
PHASE 6C implementation commit: `77fe2606746b18f44e79ec42b2d54f3e789e191b`.

## 7. Verified CI Evidence

### PHASE 3 — Run #126
**Commit:** `9db50b6b8e4d59a62f2faa394db8b3c8003fff3c`
**Overall:** SUCCESS
- Verify/Lint/Typecheck/Unit/Build — PASS
- Browser Smoke / Playwright — 50/50 PASS

### PHASE 0–4 Combined Regression — Run #136
**Commit:** `e416f4bf34fc9cf985fa77fe6ad177f852fbda03`
**Overall:** SUCCESS
- Verify — PASS
- DB / migrations / schema / integration / Security/RLS — PASS
- Browser E2E — PASS

### PHASE 5 Verification Gate — Run #141
**Commit:** `5e02ee1e26b7e888b9ad411515e02841f3fcc67d`
**Run ID:** `31692603251`
**Overall:** SUCCESS
- Verify — SUCCESS, including application typecheck, Playwright test-suite typecheck, unit tests and build.
- DB — SUCCESS, including auth stub, canonical migrations, schema verification, integration/security/RLS regression.
- Browser Smoke — SUCCESS, including Chromium installation, build and Playwright E2E.

### PHASE 6A — Run #144
**Commit:** `ed56e4a57202125d377b13facd58db2640084cc5`
**Run ID:** `31693369805`
**Overall:** SUCCESS
- Verify — SUCCESS: lint, application typecheck, Playwright test-suite typecheck, unit tests, build.
- DB — SUCCESS: PostgreSQL, auth stub, migrations, schema verification, integration/security/RLS regression.
- Browser Smoke — SUCCESS: Chromium install, build, Playwright E2E.

**Conclusion:** Package 6A is VERIFIED. Run #143 was cancelled and is not treated as a code failure; Run #144 is the authoritative successful verification for 6A.

### PHASE 6B — Run #147
**Commit:** `8380c82ff954b8faf3da49cc7ea70bd92dc5f537`
**Run ID:** `31695256665`
**Overall:** SUCCESS
- Verify — SUCCESS: lint, application typecheck, Playwright test-suite typecheck, unit tests, build.
- DB — SUCCESS: PostgreSQL, auth stub, canonical migrations, schema verification, integration/security/RLS regression.
- Browser Smoke — SUCCESS: Chromium install, build, Playwright E2E.

**Conclusion:** Package 6B is VERIFIED and officially CLOSED. Run #146 was cancelled and is not treated as a code failure; Run #147 is the authoritative successful verification for 6B.

### Latest baseline — Run #148
**Run ID:** `31695863655`
**Overall:** SUCCESS
- Verify — PASS
- DB / migrations / schema / integration / Security/RLS — PASS
- Browser Smoke / Playwright E2E — PASS

Run #148 validates the 6B-closed baseline before 6C implementation. It is not evidence for 6C because 6C code was committed afterward.

## 8. PHASE 5 — FINAL STABILIZATION / REGRESSION

Objective: strengthen the verification contract and finish stabilization without changing verified business behavior.

Completed package actions:
1. Rollback checkpoint created.
2. Verification contract audited for application and test suites.
3. `.github/workflows/verify-main.yml` strengthened to install `@playwright/test@1.55.0` before `npm run typecheck:all`.
4. DB/RLS and Browser E2E remain mandatory downstream gates.
5. Comprehensive verification passed in Run #141.

**PHASE 5 OFFICIALLY CLOSED.**

## 9. Deferred Final Relationship Audit

Per user decision, the independent Relationship Integrity Gate is intentionally deferred until after the current rebuild plan is completed. It must not block the current phase progression.

After the rebuild plan, perform a dedicated final database/relationship audit covering Foreign Keys, relationship paths, orphan records, constraints, delete/update behavior, RLS through relationships, branch isolation, and RPC dependencies.

## 10. PHASE 6+ — CURRENT REBUILD/DESIGN COMPLETION

### Package 6A — Navigation/UI contract hardening

Objective: make the remaining UI rebuild safer to continue by locking the canonical navigation contract independently of visual placement.

Completed:
- Added `tests/unit/navigation-contract.test.ts`.
- Verifies canonical route values are unique.
- Verifies menu item IDs are unique and stable.
- Verifies every menu target belongs to `APP_ROUTES`.
- Verifies protected navigation items carry explicit permissions.
- No business logic, permissions, routes, or visual behavior were changed.

Commit: `8241281dfee078e8a5beac7f3079eaa25aad076f4`

**6A VERIFIED — Run #144.**

### Package 6B — Design Surface Completion

Objective: continue the approved/reference-design rebuild while making visual surfaces safe to rearrange independently of behavior.

Implemented in commit `7b121cea21c7c1141403f30db069320e69593bc8`:
- Added stable `data-testid` identities to the protected application shell.
- Added stable identities for sidebar open/close, navigation container, navigation groups, each canonical menu item, assistant card, mobile backdrop, header, top navigation/tabs, active-orders action/count, user menu, language toggle, theme toggle, sign-out, and main content.
- Preserved all existing action handlers, routes, permissions, data hooks, and branch filtering.
- No business logic or database behavior changed.

Run #146 was cancelled during Playwright setup and did not execute a complete regression.

Run #147 subsequently verified the 6B implementation and the complete verification pipeline successfully.

**6B OFFICIALLY CLOSED — Run #147 SUCCESS.**

### Package 6C — Dashboard Surface Contract

Objective: begin the next high-impact design surface without coupling presentation changes to the dashboard's existing data/business implementation.

Implemented in commit `77fe2606746b18f44e79ec42b2d54f3e789e191b`:
- Added a stable `dashboard-surface` semantic boundary around the existing dashboard implementation.
- Added a stable `dashboard-content` container for future reference-layout work.
- Kept `DashboardFoodicsPage` as the existing data/query/business implementation.
- Preserved routes, permissions, Supabase queries, branch filtering, dashboard actions and existing visual implementation.
- No database or business logic changes.

**6C STATUS: IMPLEMENTED — AWAITING CI.**

## 11. CURRENT EXECUTION

**Branch:** `ui-rebuild-foodics-2026`
**PR #3:** Open, not merged.
**Current phase:** PHASE 6+ — Remaining rebuild/design completion packages.
**Latest verified gate:** Run #148 — SUCCESS (baseline before 6C).
**PHASE 0–5 status:** VERIFIED / CLOSED.
**Package 6A:** VERIFIED / CLOSED.
**Package 6B:** VERIFIED / CLOSED.
**Current package:** 6C — Dashboard Surface Contract.
**Current 6C commit:** `77fe2606746b18f44e79ec42b2d54f3e789e191b`.

### Execution rule
Implement the next remaining design/rebuild work as the largest safe coherent package. If consecutive packages are independent, bundle them. Before closing any included package/phase, run the combined regression for every phase from 0 through the latest included package.

## 12. Session Update Rule

Every meaningful action must be recorded here with date/time, branch, phase, previous verified CI, root cause, files changed, fix, commit(s), new CI status/result, remaining blockers, and exact next action.

User explicitly requested to be told every time progress is recorded.

## 13. Definition of Done

The rebuild is complete only when the reference design is the intended production UI, critical controls have stable identities independent of layout, dashboard/navigation and POS/FloorPlan/Kitchen/payment flows are verified, RBAC/branch isolation is verified, build/typecheck/lint/unit/browser/regression checks pass, no critical blocker remains, the deferred relationship audit passes, and PR #3 is reviewed before merge to `main`.

**Do not replace this plan with a new plan unless the user explicitly changes the project objective.**