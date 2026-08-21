# Premier — Branch Isolation + Subscriptions + KDS Execution Log

> **Source of truth for this workstream. Update this file after every meaningful implementation, test result, security finding, architectural decision, or phase transition.**
>
> **Never merge into `main` until all required gates are green.**
>
> **No duplicate button/icon/action may be introduced when an existing entry already performs the same result.**

## Current Status

- **Working branch:** `feature/branch-isolation-subscriptions-kds`
- **Production branch:** `main` — untouched by this workstream
- **PR:** #18
- **Current goal:** close branch isolation gaps, make KDS show active kitchen orders, expose Raw Materials correctly, implement branch-level subscription/feature controls, complete Super Admin settings control, and remove duplicate navigation/actions.
- **Current gate:** NOT READY TO MERGE
- **Latest known CI:** integration/security gate previously failed on two RLS expectations for cashier INSERT access to `warehouses` and `inventory`; the policies were corrected and must be re-run.

## Non-Negotiable Rules

1. Branch isolation must be enforced in PostgreSQL/RLS/RPC, not only in React/UI.
2. A branch user must never read, insert, update, delete, or indirectly access another branch's data.
3. Super Admin has global control; branch users are restricted to their assigned branch.
4. Subscription/feature gates must be enforced at database/service and route/UI layers where applicable.
5. Closing a module must block direct route access; hiding a navigation item alone is insufficient.
6. One function = one canonical entry point. No duplicate buttons, icons, tabs, sidebar items, or actions that produce the same result.
7. Reuse existing handlers, hooks, services, RPCs, and data contracts whenever possible.
8. Never weaken or delete a regression/security test to make CI green.
9. No direct production `main` changes for this workstream.

## Phase Plan

### Phase A — Branch Isolation Audit & Hardening

- [x] Audit tables and policies carrying `branch_id`.
- [x] Identify known leaks in `raw_materials`, inventory/warehouse paths, and subscription visibility.
- [x] Tighten `warehouses` INSERT policy to require correct branch + `warehouses.manage`.
- [x] Tighten `inventory` INSERT policy to require correct branch + `inventory.manage` and branch-owned warehouse.
- [ ] Audit UPDATE/DELETE policies for the same tables.
- [ ] Audit `raw_materials`, `product_components`, recipes, stock movements, purchases, reports, users, suppliers, customers, orders, kitchen, and RPCs.
- [ ] Add/verify cross-branch negative tests for SELECT/INSERT/UPDATE/DELETE.
- [ ] Verify branch_id cannot be forged through client payloads.
- [ ] Verify SECURITY DEFINER functions cannot bypass branch isolation.
- [ ] Run full security/RLS integration suite.

### Phase B — Subscription & Feature Entitlements

- [x] Add/verify branch-level feature override storage.
- [x] Add/verify `current_branch_feature_enabled(...)` guard.
- [x] Add/verify Super Admin control for plan/status/features at database level.
- [ ] Build the single canonical Super Admin subscription management UI.
- [ ] Allow Super Admin to define plan price.
- [ ] Allow Super Admin to open/close each module per branch.
- [ ] Ensure disabled modules cannot be reached directly by URL.
- [ ] Ensure feature state is enforced consistently in navigation, routes, and backend/service calls.
- [ ] Add regression tests for enabled/disabled feature access.

### Phase C — Super Admin Settings Control Center

- [ ] Inventory every current Settings capability.
- [ ] Identify capabilities currently missing from Settings UI.
- [ ] Consolidate them into one canonical Super Admin control center.
- [ ] Expose branch management, subscriptions, module entitlements, roles/permissions, system settings, POS/KDS settings, inventory/warehouse controls, and other approved global controls.
- [ ] Hide global controls from non-Super-Admin users.
- [ ] Prevent duplicate Settings entry points.
- [ ] Add route/permission regression tests.

### Phase D — Kitchen Display System

- [x] Locate existing KDS implementation.
- [x] Fix `/kitchen` so it opens the real KDS instead of redirecting to `/pos`.
- [ ] Make KDS show only active/relevant kitchen orders.
- [ ] Preserve item-level kitchen state and newly-added unsent items.
- [ ] Ensure realtime updates remain functional.
- [ ] Enforce branch isolation in KDS queries/subscriptions.
- [ ] Remove duplicate Active Orders/Kitchen navigation if they produce the same result.
- [ ] Add KDS regression/smoke tests.

### Phase E — Raw Materials

- [ ] Expose Raw Materials through one canonical navigation entry.
- [ ] Reuse existing inventory/material logic rather than creating a parallel implementation.
- [ ] Verify branch-scoped raw material reads/writes.
- [ ] Verify recipes/components/production consumption remain consistent.
- [ ] Add branch-isolation regression tests.

### Phase F — Navigation & Duplicate Action Cleanup

- [ ] Audit Header, Sidebar, page headers, cards, tabs, command palette, and contextual actions.
- [ ] Build an interaction identity list for canonical actions.
- [ ] Remove duplicate buttons/icons/tabs leading to the same result.
- [ ] Keep Command Palette as an alternate access mechanism only when it invokes the same canonical action, not a second implementation.
- [ ] Ensure each module has one clear primary navigation entry.
- [ ] Add/extend contract tests so duplicate identities do not return.

### Phase G — Full Verification & Release Gate

- [ ] Lint.
- [ ] Typecheck.
- [ ] Unit tests.
- [ ] Build.
- [ ] Database migrations/schema verification.
- [ ] Full RLS/security integration tests.
- [ ] Browser smoke/e2e for KDS, Raw Materials, subscriptions, Settings, and branch isolation.
- [ ] Manual/automated two-branch access matrix.
- [ ] Verify Super Admin global access vs branch-manager isolation.
- [ ] Verify disabled feature route blocking.
- [ ] Verify no duplicate UI actions.
- [ ] Only after all gates are green: merge PR #18 into `main` and verify deployment.

## Latest Findings / Updates

### 2026-08-22 — Initial workstream log

- Confirmed the existing KDS implementation was being bypassed because `/kitchen` redirected to `/pos`.
- Confirmed Raw Materials functionality exists but is not exposed as a clear canonical navigation entry.
- Confirmed subscription infrastructure exists but requires branch-level feature overrides and a complete Super Admin UI.
- Confirmed branch isolation still had policy gaps.
- Confirmed duplicate navigation/actions exist and must be consolidated rather than duplicated.

### 2026-08-22 — RLS regression

- CI reached the integration/security stage with schema verification successful.
- Two failures showed cashier INSERT access remained too broad for `warehouses` and `inventory`.
- Corrected the policies to require management permission in addition to branch ownership.
- **Required next action:** rerun the full CI/security gate; do not declare success until green.

## Merge Checklist

- [ ] All Phase A–F required items complete.
- [ ] CI fully green.
- [ ] No security test weakened.
- [ ] No duplicate action remains for the same result.
- [ ] Super Admin can control all approved system/branch/subscription settings from the canonical Settings area.
- [ ] Branch manager cannot access another branch through UI, route, API, RPC, or direct database query.
- [ ] KDS shows active kitchen orders correctly.
- [ ] Raw Materials are visible and branch-isolated.
- [ ] Subscription/module gates work end-to-end.
- [ ] Production deployment verified after merge.
