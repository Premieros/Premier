# MASTER LOG 2 — Branch Isolation Addendum

Date: 2026-08-22
Branch: `feature/branch-isolation-subscriptions-kds`

## DONE
- Hardened `branches` SELECT/UPDATE RLS so ordinary branch users, including branch managers, can only see/update their assigned branch.
- Organization owners/admins retain visibility/manageability within their organization.
- Platform Super Admin retains global branch visibility.
- Added regression coverage proving Branch A manager cannot see or update Branch B.
- Kept `organization_id` immutable and preserved existing tenant/branch boundaries.

## EVIDENCE
- Migration: `20260822160000_branch_visibility_hardening.sql`
- Test: `tests/integration/branch_visibility.test.ts`
- Migration commit: `6811674469d89263dc89908dab37091ccfb7fd2c`
- Test commit: `c0deb93ee7df5fcbedfcc0c5f67f32bea13ada77`

## REMAINING
- Run CI on the new migration and regression test.
- Continue audit of module-level feature gates, Super Admin settings coverage, KDS UI/realtime behavior, and duplicate navigation/actions.

## RULE
Never weaken RLS or remove assertions merely to obtain green CI. Main remains untouched.
