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
- **Latest verified CI:** commit `3cd1b28a306d3a52a9a5ef634371048769de15ec` passed lint, typecheck, unit, build, schema verification, integration/security/RLS, and browser smoke. A newer subscription-control commit has started a new CI run and is pending.

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
- [x] Run the current full security/RLS integration suite — green on the verified commit.
- [ ] Re-run after the newest subscription migrations complete CI.

### Phase B — Subscription & Feature Entitlements

- [x] Add/verify branch-level feature override storage.
- [x] Add/verify `current_branch_feature_enabled(...)` guard.
- [x] Add/verify Super Admin control for branch plan/status/features at database level.
- [x] Add Super Admin plan price editing RPC.
- [x] Normalize legacy plan feature arrays into canonical module feature flags.
- [x] Build the canonical Super Admin subscription control UI with plan pricing and per-branch module toggles.
- [ ] Enforce disabled modules on direct routes.
- [ ] Enforce feature state consistently in navigation and backend/service calls.
- [ ] Add regression tests for enabled/disabled feature access.

### Phase C — Super Admin Settings Control Center

- [ ] Inventory every current Settings capability.
- [ ] Identify capabilities currently missing from Settings UI.
- [ ] Consolidate global controls into one canonical Super Admin control center.
- [ ] Expose branch management, subscriptions, module entitlements, roles/permissions, system settings, POS/KDS settings, inventory/warehouse controls, and other approved global controls.
- [ ] Hide global controls from non-Super-Admin users.
- [ ] Prevent duplicate Settings entry points.
- [ ] Add route/permission regression tests.

### Phase D — Kitchen Display System

- [x] Locate existing KDS implementation.
- [x] Fix `/kitchen` so it opens the real Kitchen Display instead of POS.
- [ ] Make KDS show only active/relevant kitchen orders.
- [ ] Preserve item-level kitchen state and newly-added unsent items.
- [ ] Ensure realtime updates remain functional.
- [ ] Enforce branch isolation in KDS queries/subscriptions.
- [ ] Remove duplicate Active Orders/Kitchen navigation if they produce the same result.
- [ ] Add KDS regression/smoke tests.

### Phase E — Raw Materials

- [x] Confirm existing Raw Materials page and route.
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
- [ ] Full RLS/security integration tests after latest changes.
- [ ] Browser smoke/e2e for KDS, Raw Materials, subscriptions, Settings, and branch isolation.
- [ ] Manual/automated two-branch access matrix.
- [ ] Verify Super Admin global access vs branch-manager isolation.
- [ ] Verify disabled feature route blocking.
- [ ] Verify no duplicate UI actions.
- [ ] Only after all gates are green: merge PR #18 into `main` and verify deployment.

## Latest Findings / Updates

### 2026-08-22 — RLS regression resolved

- CI initially found two cashier INSERT permission gaps for `warehouses` and `inventory`.
- Policies were corrected to require the corresponding manage permission plus branch ownership.
- Verified commit `3cd1b28...` then passed the full verify/db/browser-smoke workflow.

### 2026-08-22 — Subscription control implementation

- Added Super Admin-only `subscription_plan_update(...)` RPC for monthly/yearly pricing, feature flags, and activation state.
- Added API methods for branch subscription controls and plan updates.
- Changed subscription feature typing from descriptive string arrays to `Record<string, boolean>` feature flags.
- Normalized existing Basic/Standard/Enterprise plan definitions into explicit module flags.
- Rebuilt the canonical subscription admin screen to control plan pricing, plan modules, branch plan/status, and per-branch module overrides, while retaining global subscription settings and pending-payment approval.
- Latest CI for the new UI/migrations is pending and must be green before proceeding.

## Merge Checklist

- [ ] All Phase A–F required items complete.
- [ ] CI fully green on the latest commit.
- [ ] No security test weakened.
- [ ] No duplicate action remains for the same result.
- [ ] Super Admin can control all approved system/branch/subscription settings from the canonical Settings area.
- [ ] Branch manager cannot access another branch through UI, route, API, RPC, or direct database query.
- [ ] KDS shows active kitchen orders correctly.
- [ ] Raw Materials are visible and branch-isolated.
- [ ] Subscription/module gates work end-to-end.
- [ ] Production deployment verified after merge.
