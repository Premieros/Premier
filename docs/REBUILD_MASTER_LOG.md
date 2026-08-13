# Premier UI Rebuild — Master Plan & Progress Log

> Persistent source of truth. Read before every session and update after every meaningful fix, CI result, phase change, or architectural decision.

## Current Execution

**Branch:** `ui-rebuild-foodics-2026`  
**PR #3:** Open, not merged.  
**Latest verified gate:** Run #151 — SUCCESS.  
**PHASE 0–5:** VERIFIED / CLOSED.  
**6A:** VERIFIED / CLOSED.  
**6B:** VERIFIED / CLOSED.  
**6C:** VERIFIED / CLOSED — Run #151.  
**6D–6G:** IMPLEMENTED — commit pending, CI verification pending.

## Next Bundle: PHASE 6D–6G

The user approved bundling multiple independent design-completion stages to reduce unnecessary CI cycles, provided each stage remains behavior-preserving and the combined regression passes.

**Status: IMPLEMENTED (pending commit + CI).** All list/filter/table pages now use the unified `Design*` surface package (`DesignSurface`, `DesignPageHeader`, `DesignFilterBar`, `DesignSearch`, `DesignPanel`, `DesignPagination`, `DesignLoadingState`, `DesignEmptyState`, `DesignErrorState`). Canonical primitives gained stable test IDs (`data-table`, `table-loading`, `table-empty`, `table-error`, `pagination-bar`, `design-*`), and `DataTable` accepts an `error` prop wired from `usePaginatedRows`. Local gates green: lint (0 errors), typecheck, `typecheck:all`, `test:unit` (139 tests incl. 17-page design-surface contract + 31 page smoke tests), `build`.

### 6D — Page Headers & Action Toolbars
- Standardize page headers, titles, breadcrumbs and primary action areas.
- Stable semantic/test IDs for important actions.
- Preserve existing handlers, routes and permissions.

### 6E — Filters / Search / Tables
- Standardize search/filter bars, table headers, empty/loading/error states and pagination surfaces.
- Preserve query/data contracts and branch isolation.

### 6F — Cards / Panels / Shared States
- Consolidate repeated visual cards/panels and common state surfaces where safe.
- Do not alter business logic or data fetching behavior.

### 6G — Responsive / Visual Consistency
- Complete responsive behavior and visual consistency across the rebuilt surfaces.
- Ensure desktop/mobile rearrangement does not change interaction identity or behavior.

### Bundle execution rules
1. Create/preserve a rollback checkpoint before risky changes.
2. Implement 6D–6G as one coherent package where technically safe.
3. Never weaken previous tests to accommodate the new design.
4. Preserve PHASE 0–5, 6A, 6B and 6C behavior.
5. Add focused tests only for newly stabilized critical interactions.
6. Before closure, run Verify + DB/RLS + Browser E2E and the full regression from PHASE 0 through 6G.
7. If a regression appears, stop, identify the responsible stage, fix the root cause, and rerun the affected and full regression gates.
8. Close only the stages whose implementation and evidence are both complete.

## 6D–6G Implementation Progress — Current Session

Implementation is complete and reconciled with the parallel run. The design surface package unifies all list/filter/table pages, dashboards, app shell and login surfaces.

Completed:
- Shared `DesignSurface`, `DesignPageHeader`, and `DesignFilterBar` in `src/components/design/DesignSurface.tsx`; `DesignPageHeader` delegates to the canonical `PageHeader` (breadcrumbs/testIDs/subtitle).
- `DesignPanel`, `DesignSearch`, `DesignPagination`, `DesignLoadingState`, `DesignEmptyState`, and `DesignErrorState` in `src/components/design/`.
- All list/filter/table pages migrated to the `Design*` surfaces; `DataTable` gained an `error` prop (wired from `usePaginatedRows`) and stable test IDs (`data-table`, `table-loading`, `table-empty`, `table-error`); `PaginationBar` has `pagination-bar` identity.
- Dashboard variants keep the passthrough `DashboardChrome` adapter (nav/shell contract preserved); the enhanced dashboard retains its own `dashboard-surface` identity.
- Protected application content has a stable responsive `design-content-surface` wrapper in `Layout` without changing routing, permissions, data fetching, or business logic.
- Login consumes the shared `DesignSurface` with stable identities for the login surface, language toggle, mode toggle, form, and submit action.
- Added `tests/components/design-surfaces.test.tsx` locking primitives' test IDs and page-surface wiring for 17 pages.

**Status:** implementation complete. No 6D–6G stage is closed yet; CI verification is required before closure.

## Verified CI Evidence

### Run #151 — 6C Final Verification
**Run ID:** `31698574739`  
**Overall:** SUCCESS
- Verify: SUCCESS — lint, typecheck, Playwright suite typecheck, unit tests, build.
- DB: SUCCESS — migrations, schema verification, integration, security/RLS regression.
- Browser Smoke: SUCCESS — Chromium, build, Playwright E2E.

**Conclusion:** 6C is officially verified and closed. The earlier Run #149 cancellation is not treated as a code failure.

## Earlier Verified Phases

- PHASE 3 — Run #126 — SUCCESS — Browser 50/50.
- PHASE 0–4 Combined Regression — Run #136 — SUCCESS.
- PHASE 5 — Run #141 — SUCCESS.
- 6A — Run #144 — SUCCESS.
- 6B — Run #147 — SUCCESS.
- 6C — Run #151 — SUCCESS.

## Safety Checkpoints

- PHASE 3 rollback point: `ui-rebuild-phase3-checkpoint-2026-08-13`.
- PHASE 4 rollback point: `ui-rebuild-phase4-checkpoint-2026-08-13`.
- PHASE 5 rollback point: `ui-rebuild-phase5-checkpoint-2026-08-13` at `e416f4bf34fc9cf985fa77fe6ad177f852fbda03`.
- 6A verified commit: `ed56e4a57202125d377b13facd58db2640084cc5`.
- 6B verified commit: `8380c82ff954b8faf3da49cc7ea70bd92dc5f537`.
- 6C implementation commit: `77fe2606746b18f44e79ec42b2d54f3e789e191b`.
- 6C verified gate: Run #151 / `31698574739`.
- 6D–6G base checkpoint: `e455295372aa20b5552aed511ee80a463130d8ca`.

## Deferred Relationship Audit

Per user decision, the independent Relationship Integrity Gate remains deferred until the rebuild plan is completed. It will be executed before final merge.

## Definition of Done

The rebuild is complete only when the reference design is the intended production UI, critical controls have stable identities independent of layout, dashboard/navigation and POS/FloorPlan/Kitchen/payment flows are verified, RBAC/branch isolation is verified, build/typecheck/lint/unit/browser/regression checks pass, no critical blocker remains, the deferred relationship audit passes, and PR #3 is reviewed before merge to `main`.
