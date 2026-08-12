# Premier UI Rebuild — Master Plan & Progress Log

> **Purpose:** This file is the persistent source of truth for the UI rebuild and verification work. Every future session/agent must read this file before making changes and update it after every meaningful phase, fix, CI result, or architectural decision.
>
> **Primary branch:** `ui-rebuild-foodics-2026`
> **Target:** `main` only after final verification and explicit approval.
> **PR:** #3 — UI rebuild / stable extensible design.
>
> ## 1. Original Objective
>
> Rebuild the Premier interface to match the approved/reference design while respecting the existing application architecture, database, business logic, permissions, and routes. The rebuilt UI must be extensible and behaviorally stable: moving a button, switch, card, menu item, or control must not change what it does.
>
> Core rule:
>
> `Visual Layout → Stable Component/Element ID → Action → Route/State → Permission → Service/Data`
>
> Functionality must never depend on DOM position, visual placement, or fragile selectors.
>
> ## 2. Non-Negotiable Rules
>
> 1. Do not work directly on `main`.
> 2. Do not merge PR #3 until final verification passes.
> 3. Do not add unrelated features while the rebuild is in progress.
> 4. Do not make tests pass by bypassing real application behavior.
> 5. Diagnose the root cause before changing application code or tests.
> 6. Prefer stable `data-testid`/semantic selectors over DOM position and `nth()`.
> 7. A phase is closed only after its required CI evidence is green.
> 8. If a later phase exposes a defect in an earlier phase, return to the earlier phase, fix it, re-verify, then continue.
> 9. Preserve existing business logic unless the audit proves it is incorrect.
> 10. Keep this file updated so future sessions cannot drift from the plan.
>
> ## 3. Phase Plan
>
> ### PHASE 0 — Baseline / Safety
> **Status: CLOSED**
>
> Establish the working branch, protect `main`, inspect baseline build/tests/CI, and document the starting point.
>
> ### PHASE 1 — Application Shell / Navigation
> **Status: CLOSED**
>
> Rebuild the application shell and navigation with stable routes/menu configuration, stable identifiers, and behavior independent of visual position. Dashboard/navigation Browser E2E and CI verification reached green.
>
> ### PHASE 2 — Core UI Foundation
> **Status: IN PROGRESS / FOUNDATION IMPLEMENTED**
>
> Establish reusable UI patterns: shared layout/components, buttons, dialogs, forms, tables, toolbars, loading/error/empty states, and stable interaction identifiers. The foundation must allow future screens to be changed without coupling actions to layout.
>
> ### PHASE 3 — POS / FloorPlan / Order Workspace
> **Status: IN PROGRESS — CURRENT PHASE**
>
> Rebuild and verify POS behavior against the actual current UI and reference design. Required action-level flows include:
>
> - Order type picker
> - Dine-in / FloorPlan / Tables
> - Delivery
> - Drive-thru
> - Takeaway / Quick Pickup
> - Product selection
> - Cart and quantity changes
> - Hold / Resume
> - Send to Kitchen
> - Discount
> - Payment
> - Complete Sale
> - Back/navigation behavior
>
> The objective is not merely that `/pos` renders; each critical action must produce the correct state/result.
>
> ### PHASE 4 — Security / RBAC / Branch Isolation
> **Status: PENDING**
>
> Verify role permissions and branch isolation at UI and backend/RLS levels. UI hiding alone is not security.
>
> ### PHASE 5 — Final Stabilization / Regression
> **Status: PENDING**
>
> Final audit of migrations, pagination/shared queries where required, duplicated logic, error/loading/empty states, responsive behavior, documentation, and full regression.
>
> ### FINAL — PR Review / Merge
> **Status: PENDING**
>
> Only after all required CI checks and regression tests pass: review PR #3, verify no critical issues remain, then merge to `main` only with approval.
>
> ## 4. Verified Architecture Decisions
>
> - Unified application shell is part of the rebuild.
> - Navigation/routes are centralized rather than derived from visual placement.
> - Stable IDs are used for critical interactions and E2E tests.
> - POS has stable order-type selectors such as `pos-order-type-picker`, `pos-order-type-dine_in`, `pos-order-type-drive_thru`, `pos-order-type-delivery`, and `pos-order-type-takeaway`.
> - Moving a control in the layout must not alter its action, permission, route, state, or service behavior.
>
> ## 5. Completed Work / Evidence
>
> - C1 data-safety fix: migration 045.
> - C2 hold-order duplication fix: migration 046.
> - Unified application shell / Foodics-oriented UI foundation implemented on the rebuild branch.
> - Stable navigation/menu foundation implemented.
> - Dashboard/navigation E2E verification completed.
> - Login E2E mocking was corrected so the POS tests reach the application instead of being blocked at `/login`.
> - POS tests were corrected to use the actual UI's stable test IDs instead of assumed text/DOM positions.
>
> ## 6. Current State — 2026-08-13
>
> **Current branch:** `ui-rebuild-foodics-2026`
>
> **Current phase:** PHASE 3 — POS / FloorPlan / Order Workspace
>
> **Latest working commit:** `6717c9de049a48f1eb716b967ecdf28a436248b8`
>
> **Latest verified CI before the current commit:** Run #96 on commit `5e4489ee1bfb54aab8c09ec4bb1f302c24618817`.
>
> **Run #96 result:** Verify/Build passed; Browser E2E remained at 41 passed / 2 failed. The failure investigation showed the POS tests were reaching Dashboard before asserting the POS order-type picker. The latest change therefore routes the POS test through the real Dashboard → POS navigation path instead of directly navigating to `/#/pos`.
>
> **Current commit `6717c9d...`:** POS E2E setup updated to enter POS through the real Dashboard navigation path. CI has not yet produced a run for this commit at the time this log was written.
>
> ## 7. Next Action — DO NOT SKIP
>
> 1. Check CI for commit `6717c9de049a48f1eb716b967ecdf28a436248b8`.
> 2. If CI fails, inspect the exact failing job/log and fix the root cause only.
> 3. Re-run CI and record the new run number/result here.
> 4. Once the current POS smoke/action-level blockers are green, continue with the next unverified POS flow (Dine-in/Tables, then Delivery/Drive-thru, then Hold/Resume, Kitchen, Discount, Payment, Complete Sale).
> 5. Do not move to PHASE 4 until PHASE 3's required POS/FloorPlan action-level verification is closed.
>
> ## 8. Session Update Template
>
> Every future session must append/update this section with:
>
> - Date/time
> - Current branch
> - Current phase
> - Last commit
> - CI run and result
> - What was verified
> - What failed
> - Root cause
> - Fix/commit
> - Remaining blockers
> - Exact next action
>
> ## 9. Definition of Done
>
> The rebuild is complete only when:
>
> - Reference design and current application architecture are aligned.
> - Critical UI controls have stable identities and actions independent of layout position.
> - Dashboard/navigation behavior is verified.
> - POS/FloorPlan/Kitchen/payment critical flows are verified end-to-end.
> - RBAC and branch isolation are verified.
> - Build, typecheck, lint, unit tests, Browser E2E, and required regression checks pass.
> - No critical known blocker remains.
> - PR #3 is reviewed and only then merged to `main`.
>
> **Do not replace this plan with a new plan unless the user explicitly changes the project objective.**
