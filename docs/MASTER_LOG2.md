# MASTER LOG 2

## Mandatory development rules
- Development branch: `development/master-log2`. Never develop directly on `main`.
- Baseline must remain recoverable; changes are incremental and reversible.
- Existing design is the baseline. Improve behavior without redesigning completed UI unless explicitly required.
- Every visible control/button must have a real, independently testable action; functionality must not depend on visual position.
- Every phase follows: inspect -> implement -> unit/integration/E2E test -> CI -> fix -> retest -> document -> close.
- A phase cannot close unless all prior phases still pass regression checks.
- Never weaken, delete, skip, or rewrite assertions merely to obtain green CI.
- No fake data or fake success paths in production code. CI-only stubs must remain CI-only.
- Database changes use additive migrations; never edit an applied migration.
- Keep data access behind the project's API boundaries and preserve RLS/RBAC.
- Optimize for speed with lazy loading, pagination, bounded queries, memoization, and minimal rerenders; never trade correctness/security for speed.
- Supabase remains the existing project/environment unless explicit approval is given for a separate project/branch.

## Unified screen capabilities
All operational list/detail screens should use reusable controls for:
- branch selection and branch-aware filtering
- date/range filters, search, sorting, grouping
- configurable columns and multiple saved views
- import/upload and export/download
- print where operationally appropriate
- persisted user preferences

## Phase reporting rule
At every phase closure report exactly:
- DONE: completed and verified items.
- REMAINING: items not yet completed.
- BLOCKED/RISKS: blockers or risks, with reason.
- EVIDENCE: commit/CI/test evidence.
- NEXT: the next phase or slice only after the gate passes.

## Current execution
- Baseline source is current `main` (`e9af268f51b9ccb013f537adcd0ee85ced9a6ff1`).
- Development branch is `development/master-log2`.
- Supabase is the existing project; no Supabase branch/project is being created.
- POS Core is the active phase.
- Actual POS source path confirmed from the repository tree: `src/features/pos/pages/PosWorkspacePage.tsx`, with `ActiveOrdersPage.tsx` alongside it.
- The previous CODEMAP path mismatch is resolved: do not use stale path assumptions.
- CI evidence for the baseline is green on run `31844626967` (verify, db, browser-smoke). A new run must be associated with the current head before this development phase can be closed.
