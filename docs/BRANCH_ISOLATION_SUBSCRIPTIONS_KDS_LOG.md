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
- **Latest implementation:** `3d7e592d9bdb2ad6832673e063b9074cf4ef8c7e`
- **Previous CI-verified head:** `22eb20872fb96da34e167d9ffa1b5166f82cd289`
- **Latest verified CI:** Run #379 passed lint, typecheck, unit, build, schema, integration/security/RLS, and browser smoke on `22eb208...`.
- **Latest security finding:** Kitchen `SECURITY DEFINER` RPCs trusted caller-supplied branch/order identifiers and the queue excluded `ready` orders. Both were hardened in the latest implementation and require a fresh CI/security run.

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
- [x] Harden kitchen SECURITY DEFINER RPCs against caller-supplied cross-branch identifiers.
- [x] Include `ready` in the active kitchen queue.
- [x] Run current full security/RLS integration suite — Run #379 green before latest kitchen hardening.
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
- [x] Queue RPC now returns `sent`, `cooking`, and `ready` active kitchen orders.
- [x] Queue/route RPCs enforce branch ownership for non-admin users.
- [ ] Preserve item-level kitchen state and newly-added unsent items.
- [ ] Ensure realtime updates.
- [ ] Remove duplicate Active Orders/Kitchen navigation.
- [x] Add KDS branch-isolation regression coverage.
- [ ] Add explicit newly-added-unsent-item regression coverage.

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
- [x] Inventory Units removed from the Sidebar so Raw Materials is the canonical material entry.
- [ ] Ensure each module has one clear primary navigation entry.
- [x] Updated navigation contract tests to assert the canonical Raw Materials entry and intentional absence of the duplicate Inventory Units menu item.
- [ ] Add/extend duplicate-action contract tests.

### Phase G — Full Verification & Release Gate
- [x] Previous CI lint/typecheck/unit/build green on Run #379.
- [x] Previous database migrations/schema verification green on Run #379.
- [x] Previous RLS/security integration tests green on Run #379.
- [x] Previous browser smoke green on Run #379.
- [ ] Re-run all gates after latest kitchen security migration.
- [ ] Browser smoke/e2e for KDS, Raw Materials, subscriptions, Settings, branch isolation.
- [ ] Two-branch access matrix.
- [ ] Super Admin global access vs branch-manager isolation.
- [x] Disabled feature route blocking implemented; test still required.
- [ ] No duplicate UI actions.
- [ ] Only after all gates are green: merge PR #18 into `main` and verify deployment.

## Latest Findings / Updates

### 2026-08-22 — Kitchen RPC security finding and fix
- Reviewed the existing `get_kitchen_queue` and `route_to_station` SECURITY DEFINER functions.
- Found that `get_kitchen_queue(p_branch_id)` trusted a caller-supplied branch UUID, allowing a branch user to request another branch's kitchen queue through the RPC even if the UI was branch-filtered.
- Found that `route_to_station(p_order_id, ...)` updated an order without checking that the order belonged to the caller's branch.
- Found that `get_kitchen_queue` excluded `ready` orders even though the KDS UI provides a `ready -> served` action; this caused ready orders to disappear from the KDS.
- Added `supabase/migrations/20260822010000_kitchen_branch_security.sql`.
- Non-admin callers are now forced to their `get_branch_id()` branch; enterprise admins may explicitly select a branch.
- `get_kitchen_queue` now includes `sent`, `cooking`, and `ready`.
- Added/updated integration tests to require cross-branch rejection and verify ready orders remain visible.
- Latest implementation commit: `3d7e592d9bdb2ad6832673e063b9074cf4ef8c7e`.
- **Required next action:** fresh CI/security run and then continue the remaining branch-isolation audit.

### 2026-08-22 — Previous CI verification
- Run #379 on `22eb208...` was fully successful: verify, db, and browser-smoke jobs all passed.
- This is a valid baseline only; the new kitchen security migration must be verified independently.

### 2026-08-22 — Subscription control implementation
- Added Super Admin-only `subscription_plan_update(...)` RPC for monthly/yearly pricing, feature flags, and activation state.
- Added API methods for branch subscription controls and plan updates.
- Changed subscription feature typing to `Record<string, boolean>` feature flags.
- Normalized existing plans into explicit module flags.
- Rebuilt canonical subscription admin screen to control plan pricing, plan modules, branch plan/status, per-branch module overrides, global subscription settings, and pending-payment approval.

### 2026-08-22 — Direct route feature gates implemented
- Added canonical feature-key mapping to `ProtectedRoute` based on the existing permission namespace.
- `/kitchen` is explicitly mapped to the `kitchen` feature instead of inheriting the POS feature.
- A branch user with an explicitly disabled effective subscription feature is redirected to the subscription page even when navigating directly to the route URL.
- Super Admin bypasses subscription feature gates as intended.
- Existing permission/RBAC checks remain in place; subscription gating is an additional layer.

### 2026-08-22 — Raw Materials canonical navigation
- Confirmed `APP_ROUTES.rawMaterials` already exists.
- Added a single canonical Sidebar/menu entry using the existing `raw_materials.view` permission and `rawMaterials` icon.
- Removed the old duplicate `inventory-units` Sidebar entry instead of keeping two entries for the same material-management destination.

### 2026-08-22 — Navigation contract failure found and corrected
- Run #377 failed `npm run test:unit` with 2 failures in `tests/unit/navigation-contract.test.ts`.
- The failures were stale assertions requiring `inventory-units` to remain in the Sidebar and requiring `/inventory-units` to be discoverable.
- Updated the regression contract to require `raw-materials` as the canonical Sidebar entry and explicitly require `inventory-units` to be absent from `MENU_ITEMS`.

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
