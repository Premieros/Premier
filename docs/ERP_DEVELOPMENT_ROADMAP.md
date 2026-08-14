# Premier ERP Development Roadmap

> Official long-term ERP roadmap. ERP phases are intentionally separated from the completed visual rebuild and from active feature branches so future ERP work does not interfere with production or parallel OpenCode work.

## Safety Contract

- Never modify `main` directly.
- Never modify `ui-visual-rebuild-6h` while ERP work is being developed.
- Each ERP phase must use a dedicated feature branch from the approved ERP baseline.
- Preserve existing routes, authentication, RBAC, branch isolation, Supabase contracts, POS transaction logic, accounting behavior, and existing workflows unless a separately approved change is required.
- Reuse existing modules, hooks, RPCs, tables, permissions, and patterns wherever possible.
- Every database change requires a migration and appropriate RLS/security review.
- Every important workflow requires regression/contract tests.
- Do not duplicate authoritative business logic between UI and RPC/database functions.
- Do not delete or replace existing functionality without a verified replacement and migration plan.
- No ERP phase is complete until its implementation, tests, CI, documentation, and rollback notes are recorded.
- Payroll is deliberately deferred until employee and attendance foundations are stable.
- Costing must be authoritative before profitability/menu-engineering claims are introduced.

# P0 — Essential ERP Foundation

## ERP-01 — Inventory Control + Settings Control Center

**Scope:** Settings organization, real settings consumers, inventory control, POS organization, payment/receipt UX, and unified report center.

### Settings Control Center

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

Only expose settings that have real storage and real consumers. Unsupported future controls remain explicitly marked planned.

### Inventory Control

- Physical Stock Count / Stocktake.
- Partial and periodic counts.
- Variance calculation.
- Count approval.
- Automatic variance adjustment after approval.
- Adjustment reasons and audit trail.
- Complete inventory movement ledger.
- Lot/Batch tracking where applicable.
- Expiry dates where applicable.
- Minimum/Maximum stock.
- Reorder Point.
- Low-stock alerts.
- Stock valuation.
- Branch/warehouse-specific inventory controls.

### POS / Operations included in ERP-01

- Open POS directly on Takeaway/External Order.
- Bottom POS navigation for Active Orders, Delivery, and Tables without unnecessary page navigation.
- Preserve current order state while opening drawers/panels.
- Resume orders without resending previously sent kitchen items.
- Send only genuinely new/unsent kitchen items to KDS.
- Keep payment methods and POS context visible.
- Show the complete receipt/order details for customer review before payment completion.
- After successful payment, prepare a new order directly on Takeaway.
- Unified report center with real contextual filters and supported export formats.

### ERP-01 completion gate

ERP-01 remains `VERIFICATION PENDING` until local clean-install gates, live integration tests, and required E2E/browser checks are complete or explicitly documented as CI-only due to unavailable environment credentials.

## ERP-02 — Product & Recipe Costing

- Current recipe cost.
- Component/raw-material unit cost.
- Product cost.
- Food Cost %.
- Theoretical vs actual cost.
- Gross margin.
- Profit per product/order/branch.
- Actual vs recipe cost comparison.
- Supplier-price impact on product cost.
- Cost history.

**Dependency:** ERP-01 inventory data and authoritative purchase costs must be stable first.

## ERP-03 — Purchasing Workflow

- Purchase Request.
- RFQ.
- Supplier Quotation.
- Purchase Order.
- Partial/full receiving.
- Backorders.
- Last and average purchase price.
- Supplier price history.
- Supplier evaluation.
- Purchase approval workflow.

## ERP-04 — Unified Accounting Posting

- One authoritative posting path for sales.
- Revenue, COGS, inventory, tax, customer/cash postings.
- Purchasing to inventory/expense, AP, and tax.
- Returns and reversals.
- Treasury transfers.
- Inventory adjustments.
- Correction/reversal workflow.
- Preserve existing financial reports and permissions.

**Dependency:** ERP-02 costing and ERP-03 purchasing must expose authoritative values before final COGS/AP behavior is standardized.

# P1 — Restaurant Operations

## ERP-05 — Waste Center

- Raw material waste.
- Product waste.
- Expired items.
- Damaged items.
- Kitchen waste.
- Production waste.
- Reason, quantity, cost, employee, branch.
- Approval.
- Waste reports.
- Food Cost impact.

## ERP-06 — Production Planning & Variance

- BOM/Recipe versioning.
- Recipe approval.
- Yield.
- Batch size.
- Production cost.
- Planned vs actual consumption.
- Production variance.
- Waste/by-products.

## ERP-07 — Independent Kitchen Display System

- New.
- Accepted.
- Preparing.
- Ready.
- Served.
- Delayed.
- Priority.
- Station routing.
- Preparation timers.
- Kitchen performance.

Preserve the existing POS/KDS contracts while replacing redirects or incomplete surfaces only when a verified independent KDS implementation exists.

## ERP-08 — Delivery & Driver Management

- Delivery zones.
- Delivery fees.
- Driver assignment.
- Delivery lifecycle/status.
- Driver cash collection.
- Driver debt/settlement.
- Driver performance.
- Delivery reports.

# P1 — Customer & Sales Growth

## ERP-09 — Customer 360

- Customer profile.
- Complete purchase history.
- Total purchases.
- Average order value.
- Last order.
- Favorite products.
- Branch activity.
- Payment history.
- Outstanding balance.
- Notes/tags.

## ERP-10 — Loyalty

- Points earning rules.
- Points redemption.
- Membership tiers.
- Rewards.
- Customer wallet.
- Expiry.
- Loyalty transaction history.
- POS integration.

## ERP-11 — Promotions Engine

- Percentage discount.
- Fixed discount.
- Buy X Get Y.
- Combos.
- Product promotion.
- Category promotion.
- Happy hour.
- Branch-specific promotion.
- Customer-specific promotion.
- Date/time restrictions.
- Usage limits.

Promotion rules must live in a central engine consumed by POS, not be duplicated inside POS components.

## ERP-12 — Menu Engineering

- Sales volume.
- Food cost.
- Gross profit.
- Margin %.
- Popularity.
- Contribution margin.
- Star / Plow Horse / Puzzle / Dog classification.

**Dependency:** ERP-02 authoritative costing is required before profitability classifications are considered reliable.

# P2 — Finance & Workforce

## ERP-13 — Budgeting

- Branch budgets.
- Expense budgets.
- Monthly budgets.
- Actual vs Budget.
- Variance.
- Approval.

## ERP-14 — Fixed Assets

- Asset register.
- Acquisition/purchase.
- Depreciation.
- Disposal.
- Branch transfer.
- Asset history.

## ERP-15 — Configurable Tax Center

- VAT/tax configuration.
- Tax rates.
- Tax-inclusive/exclusive behavior.
- Sales tax report.
- Purchase tax report.
- Tax liability.
- Tax periods.
- Export-ready reports.

Tax behavior must be configurable for jurisdiction requirements and must not be hardcoded to a single tax model.

## ERP-16 — Employee Master Data

- Employee profile.
- Employee code.
- Department.
- Job title.
- Salary/compensation metadata.
- Commission metadata.
- Branch assignment.
- Employment status.
- Join date.
- Emergency contact.
- Documents.
- Bank/account metadata where appropriate.

Payroll is not included in this phase.

## ERP-17 — Attendance & Leave

- Clock in/out.
- Late.
- Early leave.
- Overtime.
- Absence.
- Attendance by branch.
- Employee shift history.
- Daily attendance report.
- Leave balances and approvals.

Integrate with the existing shifts model where appropriate instead of creating duplicate shift logic.

## ERP-18 — Payroll — Later Phase

- Salary structure.
- Basic salary.
- Allowances.
- Deductions.
- Overtime.
- Commission.
- Bonuses.
- Advances.
- Payroll period.
- Payroll approval.
- Payslip.
- Payroll journal posting.

**Explicitly deferred** until ERP-16 and ERP-17 are stable.

# P3 — Enterprise Controls & Intelligence

## ERP-19 — Approval Engine

- Purchase approvals above configurable thresholds.
- Discount approvals above configurable thresholds.
- Stock adjustment approvals.
- Expense approvals.
- Refund approvals.
- Role/branch-aware approval chains.

Reuse the existing permission model and branch isolation.

## ERP-20 — Advanced Audit Center

- Who.
- What.
- When.
- Branch.
- Before/After values.
- Document history.
- Approval chain.
- Device/IP metadata where appropriate and legally permitted.

## ERP-21 — Head Office / Multi-Branch Intelligence

- Branch comparison.
- Sales ranking.
- Food Cost ranking.
- Waste ranking.
- Labor cost.
- Gross margin.
- Inventory variance.
- Branch profitability.
- Best/worst products.
- Branch benchmarking.

Must respect the existing branch-isolation architecture and use authorized cross-branch access only for permitted head-office roles.

# Dependency Order

The roadmap is intentionally dependency-driven:

**ERP-01 Inventory/Settings → ERP-02 Costing → ERP-03 Purchasing → ERP-04 Accounting → ERP-05 Waste → ERP-06 Production → ERP-07 KDS → ERP-08 Delivery → ERP-09 Customer 360 → ERP-10 Loyalty → ERP-11 Promotions → ERP-12 Menu Engineering → ERP-13 Budgeting → ERP-14 Fixed Assets → ERP-15 Tax → ERP-16 Employee → ERP-17 Attendance → ERP-18 Payroll → ERP-19 Approvals → ERP-20 Audit → ERP-21 Head Office Intelligence**

# Recommended Priority

1. ERP-01 — Inventory Control + Settings Control Center
2. ERP-02 — Product & Recipe Costing
3. ERP-03 — Purchasing Workflow
4. ERP-04 — Unified Accounting Posting
5. ERP-05 — Waste Center
6. ERP-06 — Production Planning & Variance
7. ERP-07 — Independent KDS
8. ERP-08 — Delivery & Driver Management
9. ERP-09 — Customer 360
10. ERP-10 — Loyalty
11. ERP-11 — Promotions Engine
12. ERP-12 — Menu Engineering
13. ERP-13 — Budgeting
14. ERP-14 — Fixed Assets
15. ERP-15 — Configurable Tax Center
16. ERP-16 — Employee Master Data
17. ERP-17 — Attendance & Leave
18. ERP-18 — Payroll (later)
19. ERP-19 — Approval Engine
20. ERP-20 — Advanced Audit Center
21. ERP-21 — Head Office / Multi-Branch Intelligence

# Implementation Status

- Roadmap formalized: 2026-08-14.
- ERP-01: implementation underway on dedicated ERP branch; current status must be tracked separately in `docs/ERP-01_EXECUTION_PLAN.md`.
- ERP-02 through ERP-21: PLANNED.
- No ERP-02 implementation should begin until ERP-01 reaches VERIFIED/merged status.
- Production/main must remain untouched by roadmap documentation changes.
