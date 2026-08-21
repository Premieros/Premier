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
- **Current gate:** NOT READY TO MERGE
- **Latest code fix:** `cf619b2aac05e1b9cd195372bb0c229017b67099`
- **Latest verified CI:** `3cd1b28a306d3a52a9a5ef634371048769de15ec` passed lint, typecheck, unit, build, schema verification, integration/security/RLS, and browser smoke.
- **Latest CI issue fixed:** run #371 failed at lint because `SubscriptionsAdminPage.tsx` called `useMemo` after a conditional return; fixed in `751a074...`.
- **Current verification required:** fresh CI for the latest navigation commit and subsequent functional/security tests.

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
- [x] Tighten `warehouses` INSERT/UPDATE/DELETE policies to require branch ownership + `warehouses.manage` unless admin.
- [x] Tighten `inventory` INSERT/UPDATE/DELETE policies to require branch ownership + `inventory.manage` and branch-owned warehouse unless admin.
- [ ] Audit `raw_materials`, `product_components`, recipes, stock movements, purchases, reports, users, suppliers, customers, orders, kitchen, and RPCs.
- [ ] Add/verify cross-branch negative tests for SELECT/INSERT/UPDATE/DELETE across all sensitive modules.
- [ ] Verify branch_id cannot be forged through client payloads.
- [ ] Verify SECURITY DEFINER functions cannot bypass branch isolation.
- [x] Run current full security/RLS integration suite — green on verified commit.
- [ ] Re-run after newest changes.

### Phase B — Subscription & Feature Entitlements
- [x] Branch-level feature override storage.
- [x] `current_branch_feature_enabled(...)` guard.
- [x] Super Admin branch plan/status/features database control.
- [x] Super Admin plan price editing RPC.
- [x] Canonical module feature flags.
- [x] Canonical Super Admin subscription UI with plan pricing and per-branch module toggles.
- [x] Enforce disabled modules on direct routes using the branch subscription's effective feature state.
- [ ] Enforce feature state consistently in all navigation and backend/service calls.
- [ ] Add regression tests for enabled/disabled feature access.

### Phase C — Super Admin Settings Control Center
- [ ] Inventory every current Settings capability.
- [ ] Identify missing capabilities.
- [ ] Consolidate global controls into one canonical Super Admin control center.
- [ ] Expose branch management, subscriptions, module entitlements, roles/permissions, system settings, POS/KDS settings, inventory/warehouse controls, and approved global controls.
- [ ] Hide global controls from non-Super-Admin users.
- [ ] Prevent duplicate Settings entry points.
- [ ] Add route/permission regression tests.

### Phase D — Kitchen Display System
- [x] Locate existing KDS.
- [x] Fix `/kitchen` to open real KDS instead of POS.
- [ ] Show only active/relevant kitchen orders.
- [ ] Preserve item-level kitchen state and newly-added unsent items.
- [ ] Ensure realtime updates.
- [ ] Enforce branch isolation in KDS queries/subscriptions.
- [ ] Remove duplicate Active Orders/Kitchen navigation.
- [ ] Add KDS regression/smoke tests.

### Phase E — Raw Materials
- [x] Confirm existing Raw Materials page and route.
- [x] Add one canonical Raw Materials entry to the main navigation using `APP_ROUTES.rawMaterials` and `raw_materials.view`.
- [ ] Reuse existing inventory/material logic.
- [ ] Verify branch-scoped reads/writes.
- [ ] Verify recipes/components/production consumption.
- [ ] Add branch-isolation regression tests.

### Phase F — Navigation & Duplicate Action Cleanup
- [ ] Audit Header, Sidebar, page headers, cards, tabs, command palette, contextual actions.
- [ ] Build interaction identity list.
- [ ] Remove duplicate buttons/icons/tabs producing the same result.
- [ ] Command Palette remains an alternate access path to the same canonical action only.
- [ ] Ensure each module has one clear primary navigation entry.
- [ ] Add/extend duplicate-action contract tests.

### Phase G — Full Verification & Release Gate
- [ ] Lint.
- [ ] Typecheck.
- [ ] Unit tests.
- [ ] Build.
- [ ] Database migrations/schema verification.
- [ ] Full RLS/security integration tests after latest changes.
- [ ] Browser smoke/e2e for KDS, Raw Materials, subscriptions, Settings, branch isolation.
- [ ] Two-branch access matrix.
- [ ] Super Admin global access vs branch-manager isolation.
- [x] Disabled feature route blocking implemented; test still required.
- [ ] No duplicate UI actions.
- [ ] Only after all gates are green: merge PR #18 into `main` and verify deployment.

## Latest Findings / Updates

### 2026-08-22 — RLS regression resolved
- CI initially found two cashier INSERT permission gaps for `warehouses` and `inventory`.
- Policies were corrected to require the corresponding manage permission plus branch ownership.
- Verified commit `3cd1b28...` passed the full verify/db/browser-smoke workflow.

### 2026-08-22 — Subscription control implementation
- Added Super Admin-only `subscription_plan_update(...)` RPC for monthly/yearly pricing, feature flags, and activation state.
- Added API methods for branch subscription controls and plan updates.
- Changed subscription feature typing to `Record<string, boolean>` feature flags.
- Normalized existing plans into explicit module flags.
- Rebuilt canonical subscription admin screen to control plan pricing, plan modules, branch plan/status, per-branch module overrides, global subscription settings, and pending-payment approval.

### 2026-08-22 — CI failure found and fixed
- PR workflow run #371 failed at `npm run lint`.
- Exact error: `React Hook "useMemo" is called conditionally` in `src/features/admin/pages/SubscriptionsAdminPage.tsx`.
- Cause: `activePlans = useMemo(...)` was declared after the Super Admin conditional return.
- Fix: moved `useMemo` and `field` declarations before the conditional return, preserving hook order for every render.
- Fix commit: `751a074fc950489089011ccad838a10b5c0c7de5`.

### 2026-08-22 — Direct route feature gates implemented
- Added canonical feature-key mapping to `ProtectedRoute` based on the existing permission namespace.
- `/kitchen` is explicitly mapped to the `kitchen` feature instead of inheriting the POS feature.
- A branch user with an explicitly disabled effective subscription feature is redirected to the subscription page even when navigating directly to the route URL.
- Super Admin bypasses subscription feature gates as intended.
- Existing permission/RBAC checks remain in place; subscription gating is an additional layer.
- Commit: `3cc0936ab5b0f4109199ede0f5b6a147987d029a`.

### 2026-08-22 — Raw Materials canonical navigation
- Confirmed `APP_ROUTES.rawMaterials` already exists.
- Added a single canonical Sidebar/menu entry using the existing `raw_materials.view` permission and `rawMaterials` icon.
- Avoided adding another entry for the same destination.
- Commit: `cf619b2aac05e1b9cd195372bb0c229017b67099`.
- **Required next action:** verify the raw-material route is branch-scoped and included in subscription/navigation gates.

## Merge Checklist
- [ ] All Phase A–F required items complete.
- [ ] CI fully green on latest commit.
- [ ] No security test weakened.
- [ ] No duplicate action remains for the same result.
- [ ] Super Admin controls all approved system/branch/subscription settings from canonical Settings.
- [ ] Branch manager cannot access another branch through UI, route, API, RPC, or direct database query.
- [ ] KDS shows active kitchen orders correctly.
- [ ] Raw Materials are visible and branch-isolated.
- [ ] Subscription/module gates work end-to-end.
- [ ] Production deployment verified after merge.
