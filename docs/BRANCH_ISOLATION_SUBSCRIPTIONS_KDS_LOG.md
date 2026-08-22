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
- **Latest implementation:** `3ca20645d32b7fa685589e0a402163707c7d1469`
- **Previous CI-verified head:** `22eb20872fb96da34e167d9ffa1b5166f82cd289`
- **Latest verified CI:** Run #379 / GitHub Actions run `32531787898` passed verify, database/schema, integration/security/RLS, and browser-smoke on `22eb208...`.
- **Current focus:** Phase A — complete the remaining branch-isolation/RLS/RPC audit, then obtain a fresh CI gate on the latest head.
- **Merge policy:** No merge/release action is permitted until Phases A–F and the full verification gate are complete.

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
- [x] Tighten `warehouses` INSERT/UPDATE/DELETE policies to require branch ownership + permission unless admin.
- [x] Tighten `inventory` INSERT/UPDATE/DELETE policies to require branch ownership + permission and branch-owned warehouse unless admin.
- [x] Harden kitchen SECURITY DEFINER RPCs against caller-supplied cross-branch identifiers.
- [x] Include `ready` in the active kitchen queue.
- [x] Add/verify basic branch visibility regression coverage.
- [x] Detect and patch the `raw_materials` SELECT policy regression that had become `USING (true)`.
- [x] Add a dedicated raw-material branch-isolation regression test covering SELECT, UPDATE, and forged-branch INSERT.
- [ ] Audit remaining RPCs and sensitive paths for `raw_materials`, `product_components`, recipes, stock movements, purchases, reports, users, suppliers, customers, orders, kitchen, and other SECURITY DEFINER functions.
- [ ] Add/verify cross-branch negative tests for SELECT/INSERT/UPDATE/DELETE across all sensitive modules.
- [ ] Verify `branch_id` cannot be forged through every relevant client/API/RPC payload.
- [ ] Re-run the full security/RLS suite on the current head and close Phase A only after it passes.

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
- [x] Queue RPC returns `sent`, `cooking`, and `ready` active kitchen orders.
- [x] Queue/route RPCs enforce branch ownership for non-admin users.
- [x] Add KDS branch-isolation regression coverage.
- [ ] Preserve item-level kitchen state and newly-added unsent items.
- [ ] Ensure realtime updates.
- [ ] Remove duplicate Active Orders/Kitchen navigation.
- [ ] Add explicit newly-added-unsent-item regression coverage.

### Phase E — Raw Materials
- [x] Confirm existing Raw Materials page and route.
- [x] Add one canonical Raw Materials entry to main navigation using `APP_ROUTES.rawMaterials` and `raw_materials.view`.
- [x] Restore branch-isolated SELECT/INSERT/UPDATE/DELETE policies after detecting the later policy regression.
- [ ] Reuse existing inventory/material logic.
- [ ] Verify recipes/components/production consumption.
- [ ] Run and pass dedicated branch-isolation regression tests on CI.

### Phase F — Navigation & Duplicate Action Cleanup
- [ ] Audit Header, Sidebar, page headers, cards, tabs, command palette, contextual actions.
- [ ] Build interaction identity list.
- [ ] Remove duplicate buttons/icons/tabs producing the same result.
- [ ] Command Palette remains an alternate access path to the same canonical action only.
- [x] Inventory Units removed from the Sidebar so Raw Materials is the canonical material entry.
- [x] Navigation contract updated to require Raw Materials and reject the duplicate Inventory Units entry.
- [ ] Ensure each module has one clear primary navigation entry.
- [ ] Add/extend duplicate-action contract tests.

### Phase G — Full Verification & Release Gate
- [x] Previous CI lint/typecheck/unit/build green on Run #379.
- [x] Previous database migrations/schema verification green on Run #379.
- [x] Previous RLS/security integration tests green on Run #379.
- [x] Previous browser smoke green on Run #379.
- [ ] Fresh CI on the current implementation head.
- [ ] Browser smoke/e2e for KDS, Raw Materials, subscriptions, Settings, branch isolation.
- [ ] Two-branch access matrix.
- [ ] Super Admin global access vs branch-manager isolation.
- [x] Disabled feature route blocking implemented; test still required.
- [ ] No duplicate UI actions.
- [ ] Only after all gates are green: merge PR #18 into `main` and verify deployment.

## Latest Findings / Updates

### 2026-08-22 — Raw Materials branch-isolation regression found and fixed
- Audit of `supabase/migrations/20260821010000_tenant_data_isolation.sql` found that the `raw_materials` SELECT policy had been replaced with `USING (true)`, which violated the workstream requirement that a branch manager must not read another branch's raw materials.
- The earlier `060_branch_isolate_raw_materials.sql` correctly established `branch_id NOT NULL` and branch-scoped policies, but the later tenant-isolation migration accidentally weakened the SELECT policy.
- Added `supabase/migrations/20260822020000_raw_material_branch_isolation_hardening.sql` to restore canonical `user_may_access_branch(branch_id)` enforcement for SELECT/INSERT/UPDATE/DELETE.
- Added `tests/integration/raw_material_branch_isolation.test.ts` covering own-branch visibility, cross-branch UPDATE rejection, and forged-branch INSERT rejection.
- This is a real security finding; Phase A remains open until CI proves the fix and the wider RPC audit is complete.

### 2026-08-22 — Kitchen RPC security finding and fix
- `get_kitchen_queue(p_branch_id)` previously trusted caller-supplied branch IDs and `route_to_station(p_order_id, ...)` did not verify the order's branch.
- Added `supabase/migrations/20260822010000_kitchen_branch_security.sql`.
- Non-admin callers are forced to their own branch; `get_kitchen_queue` now includes `sent`, `cooking`, and `ready`.
- Added/updated integration tests to require cross-branch rejection and verify ready orders remain visible.
- Latest kitchen hardening commit: `3d7e592...`.

### 2026-08-22 — Previous CI verification
- Run #379 (`32531787898`) on `22eb208...` was fully successful: verify, db, and browser-smoke jobs all passed.
- This is a baseline only; all later migrations/tests require fresh verification.

### 2026-08-22 — Subscription control implementation
- Added Super Admin-only subscription plan pricing/module/status controls.
- Added branch-level feature overrides and canonical feature flags.
- Added direct-route feature gates through the effective branch subscription state.
- Super Admin bypass remains explicit.
- Backend/service enforcement and complete navigation enforcement remain open.

### 2026-08-22 — Raw Materials canonical navigation
- Confirmed `APP_ROUTES.rawMaterials` and `RawMaterialsPage` are wired in `src/app/routes.tsx`.
- Added a single canonical Sidebar/menu entry using `raw_materials.view`.
- Removed the duplicate `inventory-units` Sidebar entry.

### 2026-08-22 — Current branch-vs-plan reconciliation
- Working branch is `feature/branch-isolation-subscriptions-kds`; `main` remains Production.
- The authoritative workstream log is this file: `docs/BRANCH_ISOLATION_SUBSCRIPTIONS_KDS_LOG.md`.
- The branch contains dedicated migrations for tenant/branch isolation, kitchen security, subscription feature controls, Super Admin subscription controls, normalized feature flags, owner/organization scope, raw-material isolation, and branch visibility.
- The workflow file `.github/workflows/verify-main.yml` is configured for `main` push/PR plus manual dispatch. PR #18 can therefore provide verification, but a historical green run is never evidence for a later head.
- Latest implementation commits after the previous verified head are not considered CI-verified until a fresh successful run is attached.

## Merge Checklist
- [ ] All Phase A–F required items complete.
- [ ] CI fully green on latest commit.
- [ ] No security test weakened.
- [ ] No duplicate action remains for the same result.
- [ ] Super Admin controls all approved system/branch/subscription settings from canonical Settings.
- [ ] Branch manager cannot access another branch through UI, route, API, RPC, or direct database query.
- [ ] KDS shows active kitchen orders correctly, including newly added unsent items.
- [ ] Raw Materials are visible and branch-isolated.
- [ ] Subscription/module gates work end-to-end.
- [ ] Production deployment verified after merge.

## NEXT
**Phase A — continue the remaining RLS/RPC audit.** Prioritize SECURITY DEFINER and service/RPC paths that can accept branch IDs or object IDs, then add negative cross-branch tests. After the audit passes, run the complete CI/security gate on the latest head. Do not merge to `main` before the entire Phase A–G plan is complete and all gates are green.
