# Premier UI Rebuild — Master Plan & Progress Log

> **Persistent source of truth. READ THIS FILE BEFORE EVERY SESSION AND BEFORE EVERY EDIT, and update it after every meaningful fix, CI result, phase change, or architectural decision.**

## Current Execution

**Branch:** `ui-visual-rebuild-6h`
**Base:** `main` after PR #3 merge (`15847d1`)
**Bundle:** 6H + 6I — Full Visual Rebuild (Security + App Shell + Design System + Dashboard + Reports Center + POS)
**Deployment:** GitHub Pages auto-deploys from `main` via `.github/workflows/deploy.yml` (build + DB/RLS + e2e gates). The deployed site always reflects green `main` only.
**Status:** IN PROGRESS. Baseline green: lint 0 errors (16 pre-existing warnings), typecheck:all pass, 139 unit tests pass, build pass. Rollback tag `rb-6h-base` created.

## Deployment & Branch Workflow (locked decision — user approved)

1. All visual + security work happens **ONLY** on `ui-visual-rebuild-6h` (the trial branch). **Never** develop directly against the published site (production Supabase data).
2. CI verification on the branch runs through a **PR into `main`** (verify-main.yml triggers on PR). Each push to the branch refreshes PR checks.
3. Merge the PR into `main` only at green checkpoints → `main` push auto-deploys to GitHub Pages.
4. `netlify.toml` is dormant/legacy; GitHub Pages is the active host (do not touch).
5. Local git fetch refspec was fixed to `+refs/heads/*:refs/remotes/origin/*` so all remote branches are visible.

## Non-Negotiable Safety Contract

- Preserve all existing business logic, data fetching, mutations, API contracts, routes, authentication, permissions, RBAC, branch isolation, POS transaction logic, tables/orders/delivery/takeaway/car/quick-order flows, payments, printing, discounts, split/hold/send/close/save actions, kitchen integration, and customer display behavior.
- **Buttons/actions never lose their identity or function wherever they move** — every stable `data-testid` and handler contract must survive the redesign, locked by a contract test.
- UI changes must reuse existing hooks, queries, mutations, and handlers wherever possible.
- **No Supabase schema/RLS change except as a separate, approved, tested migration** (see P0). Never ship a DB change inside a visual commit.
- Do not delete legacy UI until all consumers are identified and the replacement is verified.
- Never weaken or remove existing tests to accommodate the new design.
- Create rollback-safe commits/checkpoints (`rb-*` tags) before risky migrations or deletions.
- Every meaningful implementation, decision, fix, CI result, and phase transition must be recorded here.

## P0 — Security & Branch Isolation (approved — highest priority)

Fixing all audit gaps before/alongside the visual work. Each item is a DB migration + integration/RLS test.

Audited gaps (from the completed branch-isolation audit):

| # | Severity | Gap | Fix |
|---|----------|-----|-----|
| 1 | CRITICAL | `process_sale` executable by `anon`, SECURITY DEFINER, branch guard passes when `auth.uid()` is NULL → cross-branch write | Revoke from `anon`/`public` (keep `authenticated`), harden guard to require `auth.uid()` |
| 2 | Read leak | `raw_materials` RLS `USING (true)` → cross-branch read | Scope to branch |
| 3 | Read leak | `product_components` RLS `USING (true)` → cross-branch read | Scope to branch |
| 4 | LOW | `subscription_status` readable by `anon` for any branch | Restrict to `authenticated` |
| 5 | App leak | `recipe_costs` RPC has no branch filter | Enforce branch scope for non-admins |

## 6D–6G — VERIFIED / CLOSED

6D–6G was completed on the previous rebuild branch and verified by Run #160. The unified `Design*` surface package, list/filter/table migrations, stable test IDs, shell/login/dashboard reconciliation, DB/RLS checks, and browser smoke passed.

## 6H + 6I — Full Visual Rebuild Bundle

### P1 (6H-A) — Design Tokens — DONE
- Established the new visual language via CSS variables + Tailwind config, linked to the brand-color engine.
- `src/index.css`: expanded `--ui-*` token set (primary violet `#5b2bd8` + hover/active/soft/fg, `--ui-accent` = `var(--brand-600)` so accents/charts follow the merchant brand engine, surface/raised, page/page-alt, border/strong, text/muted/subtle, success/warning/danger/info, radius scale `sm/…/2xl`, shadow scale `sm/xl`, focus ring) + `.dark` token overrides for neutrals.
- `tailwind.config.js`: new `ui` color namespace (`bg-ui-page`, `text-ui-text`, `bg-ui-primary`, `text-ui-muted`, …), `shadow-ui-*` scale, `rounded-ui*` scale.
- `body` now uses `bg-ui-page text-ui-text`; `.ui-surface` uses `var(--ui-shadow)`.
- Brand linkage: primary stays violet by default (approved identity); `--ui-accent` follows the brand engine (`--brand-600`), so merchant brand still drives highlights/charts. Decision recorded for future phases.
- Keep semantic identities and interaction behavior unchanged.

### P2 (6H-B) — App Shell
- Rebuild Sidebar, Header, navigation hierarchy, content surface and responsive shell.
- Add a global **active-branch indicator** (and branch switcher for admins) in the shell.
- Preserve all route guards, permissions, active navigation behavior, existing handlers, and the stable IDs (`app-sidebar`, `nav-item-{id}`, `nav-group-{group}`, `mobile-sidebar-backdrop`, `design-content-surface`).

### P3 (6H-C) — Dashboard
- Complete the `VisualDashboardPage` contract, restoring everything the old `DashboardFoodicsPage` had:
  - Currency from `effectiveSettings().currency` (not hardcoded `EGP`).
  - Admin branch picker (current `isAdminRole(...) ? branchFilter : branchFilter` is a no-op).
  - KPI report deep links `to="/reports?reportType=…"` (sales, sales_by_payment, sales_by_product, detailed_invoices).
  - Year range, previous-period comparison, order-type filter, export.
- Preserve all existing Supabase data, filters, metrics and chart data contracts.

### P4 — Reports Center (two dropdowns)
- Dropdown 1 = report type (all 14 operational + 9 financial).
- Dropdown 2 = contextual filter (branch / product / payment method / employee / period) — new capability.
- Financial reports hidden without the `reports.financial` permission.
- **Preserve the contract:** `button[data-report-type="<key>"]` + `/reports?reportType=…` deep links.

### P5 (6H-D) — Shared Components + Full Sweep
- New visual treatment for cards, buttons, inputs, search, filters, tables, states, modals and drawers (no business logic inside presentation components).
- **Interaction-Identity Registry:** central list of every stable `data-testid`/handler contract + a contract test that fails if any registered identity or its function is removed/renamed.

### P6 (6I-A..D) — POS Visual
- 6I-A POS Workspace layout; 6I-B Product Browser / Order Panel; 6I-C Order Types / Tables (Table, Delivery, Takeaway, Car, Quick); 6I-D Active Orders / Kitchen integration UI.
- Presentation only — preserve every existing handler, data contract, table availability, occupied-table, guest-count and order-selection logic.

### P7 — Safe Legacy Removal + Final CI + PR
1. Consumer audit: identify every import/route of `DashboardFoodicsPage`, orphan POS components (`TypeChangePicker`, `OrderTypeQuickPicker`, unused `src/ui`), and any legacy surfaces.
2. Remove them only after the replacement is fully verified by tests.
3. Full gate: lint, typecheck:all, unit/smoke, build, DB/RLS integration/security, browser e2e.
4. Merge PR into `main` → auto-deploy. Update this log.

## 6H–6I Execution Rules

1. Work only on `ui-visual-rebuild-6h`; `main` is protected from direct UI changes.
2. Bundle related stages into CI batches, but keep clear internal checkpoints: Batch 1 = P0 (DB), Batch 2 = P1+P2+P3, Batch 3 = P4, Batch 4 = P5+P6, Batch 5 = P7.
3. Preserve every existing functional contract; run the contract tests before and after each batch.
4. Add focused regression/contract tests for critical interactions when needed (never weaken existing ones).
5. Do not delete legacy UI until replacement consumers are verified.
6. If any regression appears, **stop**, fix the root cause, and rerun the affected + full gates before continuing.
7. The bundle is complete only when the new UI is visibly different, functional behavior is preserved, tests pass, and the legacy surface has a safe removal plan.

## Implementation Progress — 6H + 6I

### Completed
- Created isolated branch `ui-visual-rebuild-6h` from `main`.
- Began the genuinely new Dashboard visual surface on the isolated branch.
- Recorded this bundle and its safety contract in the master log before continuing implementation.
- Fixed 6h-branch baseline: removed unused `APP_ROUTES` import; aligned recharts `Tooltip formatter` typing with repo convention (`Number(value ?? 0)`).
- Baseline gates green locally: lint (0 errors), typecheck:all, test:unit (139 passed), build.
- Rollback tag `rb-6h-base` created.
- Fixed local git fetch refspec so all remote branches are visible.
- **P0 (security) done & pushed** — migration `068_security_harden_audit_gaps.sql` (revoke `process_sale` from anon/public, restrict `subscription_status`, branch-scope `product_components` SELECT via parent product), `ReportsPage.tsx` `recipe_costs` branch filter, integration tests `tests/integration/p0_security_hardening.test.ts`. Local gates green; pushed to PR #4 for CI. Commit `690eb71`.
- **P1 (design tokens) done** — expanded `--ui-*` tokens + `.dark` overrides in `src/index.css`, `ui` color namespace + shadow/radius scales in `tailwind.config.js`. Local gates green (lint 0 errors, typecheck:all, 139 unit tests, build).

### Pending
- P2 app shell; P3 dashboard contract; P4 reports center; P5 shared components + identity registry; P6 POS visual; P7 safe removal + final CI + PR.
- Verify PR #4 CI after each pushed batch (last check: P0 pushed).

## Relationship Audit Note

The production Supabase schema had a duplicate FK on `users.branch_id`. The duplicate `users_branch_id_fkey` was removed manually after verification, leaving only `users_branch_fk_strict`. A migration was added on the previous rebuild branch to preserve the fix for schema recreation. This relationship fix is separate from the visual rebuild and must remain behavior-preserving.

## Definition of Done — 6H + 6I

The bundle is complete only when the new App Shell + Dashboard + Reports Center + POS visual surfaces are clearly distinguishable from the old design, all existing functionality remains intact (contract tests green), legacy consumers are audited, P0 security gaps are closed with passing RLS tests, focused tests and full CI pass, DB/RLS/security/browser checks pass, and the work is ready for a dedicated PR into `main`.
