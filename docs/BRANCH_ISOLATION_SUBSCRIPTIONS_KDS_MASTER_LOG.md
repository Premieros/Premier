# BRANCH ISOLATION + SUBSCRIPTIONS + KDS — MASTER LOG

> This log is mandatory for the current workstream. Update it after every implementation, verification, repair, CI result, and decision. Do not close a phase without evidence.

## 1. Non-negotiable rules
- Current workstream: `feature/branch-isolation-subscriptions-kds`.
- Do not merge to `main` until the complete workstream passes its gates.
- Preserve existing working functionality; use additive migrations for database changes.
- Never weaken/delete/rewrite tests just to make CI green.
- Never claim success without CI evidence.
- One action = one visible control. Do not add duplicate buttons/icons for the same result.
- Branch isolation is enforced server-side/RLS; UI filtering is defense-in-depth only.
- Super Admin is the only role with platform-wide visibility/control.
- Owner/Admin is scoped to their organization; Branch Manager/Staff is scoped to their branch.
- Feature/module closure must block UI, direct route access, and sensitive backend operations.

## 2. Required business scope
### A. Branch isolation
- Super Admin: all organizations/branches.
- Owner/Admin: only branches of their organization.
- Branch Manager/Staff: only their `branch_id`.
- A `member` relationship in another organization must not grant branch visibility.
- `organization_id` on a branch must not be movable after creation.
- Verify warehouses, inventory, raw-material inventory/batches, purchases, products, production, waste, expenses, reports and related RPCs.

### B. Subscription system
- Super Admin can create/edit plans.
- Super Admin can set monthly/yearly prices.
- Super Admin can enable/disable plans.
- Super Admin can enable/disable individual modules per plan.
- Branch subscription and branch-level overrides are supported.
- Effective access must be enforced at UI + route + backend/RPC level.
- Expired/inactive subscription must not grant module access.
- `feature_override=false` must be authoritative for that branch.
- Module keys must have one canonical mapping; no `warehouses` vs `inventory` split that creates bypasses.

### C. Kitchen / KDS
- Kitchen screen displays active orders only.
- Newly added items to an already-sent order remain pending and can be sent independently.
- Sending one item must not mark all order items as sent.
- Kitchen status must reflect item-level state.

### D. Raw materials
- Raw-material catalog can be shown according to product/master-data rules.
- Actual raw-material stock, batches and quantities are branch-isolated.
- Branch Manager must never see another branch's quantities/batches.
- Purchases/receiving and movements must preserve branch isolation.

### E. Super Admin Settings
- One central Super Admin control surface.
- Must expose all platform-level settings that already exist in the database/code.
- No duplicate screens/buttons/icons for the same setting or result.
- Module access, subscriptions, branch/org controls and platform administration should have a single authoritative path.

## 3. Verified baseline before this workstream
- Run #409 on commit `5d97e243bf5b80d1b3ac5e0cb3a0e16e08961908`: SUCCESS.
- Verify/Lint/TypeScript/Unit/Build: PASS.
- Schema verification: PASS (60/60 tables, 65/65 functions, 92/92 RPCs as reported by CI).
- Integration/RLS/Security: PASS.
- Browser Smoke/Playwright: PASS.
- Branch Manager branch visibility behavior: PASS.
- Owner organization-scope remained the final issue under the preceding policy hardening iterations; do not assume future changes preserve it without regression testing.

## 4. Important commits in this workstream
- `a7a5660c7c743d8405b5407a6a479d187a18470b` — initial central subscription gate helper.
- Earlier branch-isolation hardening commits include `5d97e243bf5b80d1b3ac5e0cb3a0e16e08961908` and preceding policy migrations. Treat the latest CI-verified commit as the current safety baseline.

## 5. Current status
### DONE
- Branch isolation hardening reached a CI-green baseline at Run #409.
- Subscription admin screen exists and supports plan prices, enable/disable, module selection, branch subscriptions/overrides and Super Admin access.
- Route-level feature gating exists and protects direct route access for gated modules.
- Central subscription gate helper was added in `src/lib/subscriptionGate.ts` at `a7a5660c...`.

### IN PROGRESS
1. Wire the central subscription gate to the actual route/protected-route implementation.
2. Add backend/RPC enforcement for sensitive operations, not only UI/route hiding.
3. Canonicalize module keys (`inventory` / `warehouses` and all other modules) so one module cannot be bypassed through an alternate route/key.
4. Add focused tests for enabled/disabled/expired/override-false/Super-Admin behavior.
5. Run full CI and record evidence.

### REMAINING AFTER FEATURE-GATE GATE
1. KDS active-order screen verification and item-level pending/send behavior.
2. Raw Materials screen verification and branch-isolated stock/batches.
3. Super Admin Settings completeness audit.
4. Duplicate control/icon audit across affected screens.
5. Final full regression/CI and publish/deploy verification.

## 6. Required execution cycle
For every item:
1. Inspect existing implementation.
2. Implement the smallest coherent change.
3. Run focused tests/smoke checks.
4. Repair failures.
5. Run CI.
6. Verify the deployed/published behavior when applicable.
7. Update this log with commit + test/CI evidence.
8. Only then move to the next item.

## 7. No-drift checkpoint
Before any new implementation, read this file and confirm the work is still within sections 2 and 5. If a proposed change is outside scope, record the reason in this log before implementing it.

## 8. Change log
| Date | Commit | Change | Verification | Status |
|---|---|---|---|---|
| 2026-08-22 | `a7a5660c7c743d8405b5407a6a479d187a18470b` | Added central subscription module gate helper | Pending route/backend integration CI | IN PROGRESS |
| 2026-08-22 | `5d97e243bf5b80d1b3ac5e0cb3a0e16e08961908` | Branch scope precedence hardening | Run #409 SUCCESS | BASELINE |

## 9. Phase closure format
At closure report exactly:
- DONE
- REMAINING
- BLOCKED/RISKS
- EVIDENCE
- NEXT
