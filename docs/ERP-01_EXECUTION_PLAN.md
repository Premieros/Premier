# ERP-01 — Settings, POS Organization, Payment Flow & Report Center

## Status

- Status: READY FOR IMPLEMENTATION
- Branch: `erp-01-settings-organization`
- Base: production `main` after P7 merge
- Scope: ERP-01 only
- Do not modify `main` directly.
- Do not modify or interfere with other OpenCode workflows/branches.
- Do not start ERP-02 or any unrelated phase until ERP-01 is completed and verified.

## Objective

Organize the application into a coherent ERP control structure and make Settings the real control center of the system. At the same time, improve the POS workflow, resume-order kitchen behavior, payment/receipt review, and report generation while preserving all existing business logic, RBAC/RLS, Supabase contracts, routes, and working functionality.

## NON-NEGOTIABLE SAFETY CONTRACT

1. Preserve existing POS business logic unless a listed ERP-01 bug requires a targeted fix.
2. Preserve authentication, RBAC, branch isolation, RLS, database constraints, Supabase RPC contracts, and route contracts.
3. Do not create UI-only settings. Every setting must have a real consumer or be explicitly marked planned/not implemented.
4. Reuse existing SettingsContext/API/database fields before creating new schema.
5. Any new database field/table/RPC requires a migration, RLS review, types update, audit consideration, and regression tests.
6. Do not duplicate business logic in React if the authoritative behavior belongs in the database/API.
7. Never delete existing functionality merely to simplify the UI.
8. Do not change production data manually as part of frontend work.
9. Every behavioral change requires a regression test.
10. Keep ERP-01 commits small and descriptive; update this plan and the master log after each completed sub-phase.
11. If an existing contract is unclear, stop and inspect consumers/tests/database before changing it.
12. A phase is not complete because the UI renders; it is complete only when the setting/feature actually affects its consumer and passes its tests.

# PHASE A — Settings Control Center Audit

## A1 — Inventory the existing Settings system

Audit before coding:

- `SettingsPage`
- `SettingsContext`
- branch settings
- company settings
- existing database settings tables/columns
- existing settings hooks/API/RPCs
- existing consumers
- existing permissions
- existing tests

Produce a mapping:

`Setting → storage → API/context → consumer → permission → test`

Do not create duplicates.

## A2 — Reorganize Settings UI

Create a clear Settings Control Center with grouped navigation/sections:

1. Company & Identity
2. Branches & Locations
3. POS & Sales
4. Orders & Tables
5. Products & Catalog
6. Inventory & Warehouses
7. Purchasing & Suppliers
8. Production & Recipes
9. Kitchen / KDS
10. Delivery
11. Customers & Loyalty
12. Discounts & Promotions
13. Invoices / Tax
14. Receipts & Printing
15. Accounting & Finance
16. Employees / Roles / Security
17. Notifications
18. System / Integrations

Only expose sections/settings that have a real implementation or are clearly labelled planned.

## A3 — Company & Identity

Where supported by current architecture:

- company name
- legal name
- logo
- phone/email
- address
- currency
- timezone
- language
- date/time format
- fiscal year configuration
- default branch

Respect existing `effectiveSettings` behavior.

## A4 — Branch & Location Controls

- active/default branch
- branch identity
- branch contact information
- branch operating status
- branch-specific POS settings
- branch-specific receipt settings
- branch-specific inventory settings
- branch-specific order settings

Never weaken branch isolation.

## A5 — POS & Sales Settings

Expose only settings that have real consumers:

- default order type
- default payment behavior
- allow/deny negative stock
- discount behavior
- price/tax behavior
- receipt behavior
- cashier workflow options
- active order behavior
- table/order behavior

Default POS opening state must become:

**Takeaway / External Order**

The cashier should enter the sale immediately without an obligatory order-type selection screen.

Order type remains changeable at any time.

## A6 — Orders & Tables

- table behavior
- table capacity rules where supported
- order start behavior
- active-order behavior
- hold/resume behavior
- order numbering/reference behavior

Do not change existing table-floor-plan functionality unless required by the listed UX behavior.

## A7 — Inventory Settings (ERP-01 Core)

Implement real settings for:

- low-stock alerts
- reorder point
- minimum stock
- maximum stock
- negative stock policy
- stock adjustment permissions/reasons
- stocktake behavior
- batch/lot tracking where supported
- expiry tracking where supported
- valuation method where supported
- branch/warehouse overrides

Every setting must have a real consumer.

## A8 — Purchasing / Production / Kitchen / Delivery Settings

Where existing architecture supports them, organize controls for:

- purchasing defaults
- supplier workflow
- receiving
- recipe/production behavior
- kitchen routing
- preparation-time settings
- delivery zones/fees
- driver assignment behavior

Do not invent unsupported backend functionality simply to fill the UI.

## A9 — Customers / Loyalty / Promotions

Prepare real control points for:

- customer defaults
- loyalty rules
- points behavior
- promotion/discount behavior
- customer/order restrictions

Only implement backend behavior when required and testable in ERP-01.

## A10 — Tax / Receipts / Accounting

Organize existing controls for:

- tax mode/rates where supported
- invoice numbering
- receipt numbering
- receipt layout/options
- print behavior
- accounting defaults
- payment/tender configuration

Do not alter accounting posting logic unless explicitly required by a tested ERP-01 issue.

## A11 — Security / Roles / Notifications / Integrations

Settings must respect roles and permissions.

- Super Admin remains unrestricted.
- Branch users remain branch-isolated.
- Managers see only settings permitted to their role.
- Cashier settings must not expose administrative controls.
- Audit setting changes.
- Organize notification and integration controls that already exist.

# PHASE B — POS Screen Organization

## B1 — Remove forced order-type selection

When `/pos` opens:

- start directly on Takeaway/External Order.
- show the product browser and current order immediately.
- keep order type change available.
- preserve all existing `pos-*` test IDs and interaction contracts.

## B2 — Bottom POS navigation

Create a persistent bottom action/navigation area containing:

- Active Orders
- Delivery
- Tables
- Takeaway / Quick Order if appropriate

These should open as drawers, popovers, panels, or same-screen sections.

Rules:

- do not navigate away from POS unnecessarily.
- preserve current order state.
- opening a panel must not clear the basket.
- closing a panel returns to the same order.
- preserve accessibility labels and keyboard behavior.

## B3 — Active Orders

Active orders should be accessible without leaving POS.

Support:

- view
- search/filter where already supported
- resume
- inspect status

# PHASE C — Resume Order / Kitchen Incremental Sending

This is a behavioral fix and must be treated as high priority.

## C1 — Item lifecycle

Audit current order-item state and kitchen-send logic.

Target conceptual states:

- new
- sent
- preparing
- ready
- served
- cancelled

Use existing schema/status concepts when available; do not duplicate them.

## C2 — Resume behavior

When an existing order is resumed:

- previously sent items must remain sent.
- newly added items must be identifiable as new.
- saving/resuming must not resend old items.
- only unsent/new kitchen items should be sent to KDS/kitchen.
- the kitchen must retain the full order context.

Prevent:

- duplicate kitchen tickets
- duplicate item sending
- old item re-send
- lost item status
- POS/KDS state divergence

## C3 — Regression tests

Add tests for:

1. create order → send item → resume → add item → send only new item.
2. resume without changes → send nothing new.
3. resume → modify quantity according to existing business rules.
4. repeated resume does not duplicate kitchen output.
5. old items remain in original kitchen state.

# PHASE D — Payment & Full Receipt Review

## D1 — Payment layout

Payment must not hide the entire sale screen.

Use a same-screen payment experience:

- POS/order remains visible.
- payment methods remain visible.
- receipt preview remains visible.
- customer can review the full order with the cashier.

## D2 — Full Receipt Preview

Show:

- products
- quantities
- unit prices
- discounts
- subtotal
- tax
- service charge where applicable
- delivery charge where applicable
- total
- customer
- order type
- table/vehicle/delivery details where applicable
- amount paid
- remaining/change
- payment method(s)

Do not hide payment methods because of receipt display.

## D3 — Payment methods

Preserve existing payment methods and contracts.

Support existing:

- cash
- card
- mixed payment
- other configured methods

Do not add a method without backend/accounting support.

## D4 — New order after payment

After successful payment:

- finalize current order using existing authoritative process.
- show completion/receipt state.
- make POS immediately ready for a new order.
- default the new order to Takeaway/External Order.

# PHASE E — Report Center / Report Builder

## E1 — Unified report selector

All supported reports should be selectable from one Report Center filter.

Categories:

### Sales

- Sales Summary
- Sales by Product
- Sales by Category
- Sales by Branch
- Sales by Employee
- Sales by Order Type
- Sales by Payment Method
- Discounts
- Refunds
- Voids

### Inventory

- Stock
- Stock Movement
- Stock Valuation
- Stock Variance
- Low Stock
- Expiry
- Transfers
- Waste

### Purchasing

- Purchases
- Purchases by Supplier
- Purchase Items
- Supplier Price History
- Receiving

### Production

- Production
- Consumption
- Production Variance
- Recipe Cost
- Waste

### Financial

- General Ledger
- Trial Balance
- Profit & Loss
- Balance Sheet
- Cash Flow
- Accounts Receivable
- Accounts Payable
- Treasury
- Payments
- Bank Reconciliation

### Operations

- Shifts
- Cashier
- Tables
- Delivery
- Drivers
- Kitchen
- Preparation Time

Only list reports that actually exist or are implemented in the current ERP-01 scope. Do not create fake report entries.

## E2 — Dynamic filters

After selecting a report, expose relevant filters:

- date from/to
- branch
- warehouse
- employee
- cashier
- customer
- supplier
- product
- category
- order type
- payment method
- table
- driver
- status
- shift
- recipe
- production order

Filters must actually affect the query/data source.

## E3 — Multiple analysis modes

Where supported, allow:

- summary
- detailed rows
- grouped by branch
- grouped by product
- grouped by category
- grouped by employee
- grouped by payment method
- grouped by order type
- trend/time series

Do not fabricate calculations; use authoritative database/API data.

## E4 — Export

Support existing infrastructure for:

- Print
- PDF
- Excel
- CSV

Exports must match the selected filters and displayed report.

# PHASE F — Tests & Verification

For every sub-phase:

- unit tests
- component contract tests
- page smoke tests where applicable
- regression tests for changed behavior

Full gate before ERP-01 completion:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run typecheck:all`
5. `npm run test:unit`
6. build
7. database/schema checks
8. RLS/security tests
9. browser smoke/E2E

If CI differs from local results, CI is authoritative.

# PHASE G — Documentation & Audit

Update:

- `docs/ERP-01_EXECUTION_PLAN.md`
- `docs/ERP_DEVELOPMENT_ROADMAP.md`
- `docs/REBUILD_MASTER_LOG.md` only with a concise ERP-01 status entry if appropriate

Record:

- files changed
- migrations
- RPCs/API changes
- settings added
- real consumers
- tests
- CI runs
- known limitations
- technical debt
- rollback notes

# DEFINITION OF DONE

ERP-01 is complete only when:

- Settings is organized as a coherent control center.
- Every implemented setting has real storage and a real consumer.
- POS opens directly on Takeaway/External Order.
- Bottom POS navigation exposes Active Orders, Delivery, and Tables without unnecessary page navigation.
- Resume Order no longer duplicates kitchen sends and sends only genuinely new kitchen items.
- Payment shows the complete receipt while keeping payment methods and POS context visible.
- After payment, POS is immediately ready for a new order.
- Report Center has a unified report selector and dynamic real filters.
- Report output respects all selected filters.
- Existing routes, business logic, RBAC/RLS, Supabase contracts, and critical interaction identities remain intact.
- No fake settings or fake reports were introduced.
- All regression/unit/contract/DB/RLS/browser tests pass.
- Full CI is green on the final ERP-01 HEAD.
- Documentation is updated.

# IMPLEMENTATION ORDER

1. A1 — Settings audit
2. A2 — Settings organization
3. A3–A11 — Real settings wiring
4. B1–B3 — POS organization/default order flow
5. C1–C3 — Resume/Kitchen fix + regression tests
6. D1–D4 — Payment/receipt review
7. E1–E4 — Report Center/filtering/export
8. F — Full verification
9. G — Documentation
10. Final review and PR

# STOP CONDITIONS

Stop and report before proceeding if:

- a requested setting has no authoritative storage/consumer;
- implementing it requires changing RBAC/RLS unexpectedly;
- an existing RPC contract must be broken;
- POS transaction behavior is unclear;
- resume/kitchen state cannot be proven safe;
- report filters cannot be applied authoritatively;
- a test exposes a regression in existing functionality.

Never bypass a stop condition just to make the UI appear complete.

# CURRENT STATUS

- ERP-01 branch created: `erp-01-settings-organization`
- Plan: READY
- Implementation: NOT STARTED
- Production/main: untouched by ERP-01
