# Premier UI Rebuild — Master Plan & Progress Log

> Persistent source of truth. Update after every meaningful fix, CI result, phase change, or architectural decision.

## Current Execution

**Branch:** `ui-visual-rebuild-6h`  
**Base:** `main` after PR #3 merge  
**Bundle:** 6H + 6I — Full Visual Rebuild (App Shell + Design System + Dashboard + POS)  
**Status:** IN PROGRESS — behavior-preserving visual rebuild.

## Non-Negotiable Safety Contract

- Preserve all existing business logic, data fetching, mutations, API contracts, routes, authentication, permissions, RBAC, branch isolation, POS transaction logic, tables/orders/delivery/takeaway/car/quick-order flows, payments, printing, discounts, split/hold/send/close/save actions, kitchen integration, and customer display behavior.
- UI changes must reuse existing hooks, queries, mutations, and handlers wherever possible.
- Do not alter Supabase data/schema/RLS as part of visual work unless a separate approved migration is explicitly required.
- Do not delete legacy UI until all consumers are identified and the replacement is verified.
- Never weaken or remove existing tests to accommodate the new design.
- Every meaningful implementation, decision, fix, CI result, and phase transition must be recorded here.
- Create rollback-safe commits/checkpoints before risky migrations or deletions.

## 6D–6G — VERIFIED / CLOSED

6D–6G was completed on the previous rebuild branch and verified by Run #160. The unified `Design*` surface package, list/filter/table migrations, stable test IDs, shell/login/dashboard reconciliation, DB/RLS checks, and browser smoke passed.

## 6H + 6I — Full Visual Rebuild Bundle

### 6H-A — Design Tokens
- Establish the new visual language: color, typography, spacing, radius, shadows, density, RTL/LTR and dark mode.
- Keep semantic identities and interaction behavior unchanged.

### 6H-B — App Shell
- Rebuild Sidebar, Header, navigation hierarchy, content surface and responsive shell.
- Preserve route guards, permissions, active navigation behavior and existing handlers.

### 6H-C — Dashboard
- Replace the legacy visual composition with a genuinely new dashboard surface.
- Preserve all existing Supabase data, filters, metrics and chart data contracts.

### 6H-D — Shared Components
- Establish the new visual treatment for cards, buttons, inputs, search, filters, tables, states, modals and drawers.
- Avoid duplicating business logic inside presentation components.

### 6I-A — POS Workspace
- Rebuild POS workspace layout and visual hierarchy without changing transaction behavior.

### 6I-B — Product Browser / Order Panel
- Rebuild product browsing, current order and totals presentation while preserving existing handlers and data contracts.

### 6I-C — Order Types / Tables
- Rebuild visual workflow for Table, Delivery, Takeaway, Car and Quick Order.
- Preserve existing table availability, occupied-table, guest-count and order-selection logic.

### 6I-D — Active Orders / Kitchen Integration UI
- Rebuild presentation only; preserve active-order and kitchen integration behavior.

## 6H–6I Execution Rules

1. Work only on `ui-visual-rebuild-6h`; `main` is protected from direct UI changes.
2. Bundle related visual stages to reduce CI cycles, but keep clear internal checkpoints.
3. Preserve every existing functional contract.
4. Add focused regression/contract tests for critical interactions when needed.
5. Do not delete legacy UI until replacement consumers are verified.
6. Run full verification after the bundle: lint, typecheck, unit/smoke, build, DB/RLS, browser smoke/E2E.
7. If any regression appears, stop and fix the root cause before continuing.
8. The bundle is complete only when the new UI is visibly different, functional behavior is preserved, tests pass, and the legacy surface has a safe removal plan.

## Implementation Progress — 6H + 6I

### Completed
- Created isolated branch `ui-visual-rebuild-6h` from `main`.
- Began the genuinely new Dashboard visual surface on the isolated branch.
- Existing Dashboard data/logic contracts are preserved; the new surface is presentation-focused.
- Recorded this bundle and its safety contract in the master log before continuing implementation.

### Pending
- App Shell visual rebuild.
- Design token refinement.
- Shared component visual treatment.
- POS workspace redesign.
- Product browser/order panel redesign.
- Order-type/table visual redesign.
- Active orders/kitchen UI redesign.
- Focused regression tests.
- Full CI verification.
- Legacy UI consumer audit and eventual removal.

## Relationship Audit Note

The production Supabase schema had a duplicate FK on `users.branch_id`. The duplicate `users_branch_id_fkey` was removed manually after verification, leaving only `users_branch_fk_strict`. A migration was added on the previous rebuild branch to preserve the fix for schema recreation. This relationship fix is separate from the visual rebuild and must remain behavior-preserving.

## Definition of Done — 6H + 6I

The bundle is complete only when the new App Shell + Dashboard + POS visual surfaces are clearly distinguishable from the old design, all existing functionality remains intact, legacy consumers are audited, focused tests and full CI pass, DB/RLS/security/browser checks pass, and the work is ready for a dedicated PR into `main`.
