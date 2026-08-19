# Product -> Unit -> Manufacturing -> Sale — Atomic Sales Log

## 2026-08-19 — Root-cause fix

### DONE
- Product components are units only; raw materials are not sale components.
- Manufactured units consume raw materials only during manufacturing.
- POS sale deduction is backed by `public.deduct_sale_unit_inventory(...)`.
- Unit deduction validates complete demand before writes, locks FIFO unit batches with `FOR UPDATE`, updates unit batches, and writes unit ledger entries in the same transaction.
- `public.process_sale(...)` is routed to the unit RPC and no longer uses `_product_inv_remove_fifo` or `inventory_batches` for POS stock deduction.
- Unit sale deduction rejects products without active branch-local unit links and requires a warehouse.
- Frontend `deductSaleInventory()` is a thin RPC adapter.

## 2026-08-19 — CI integration contract alignment

### DONE
- Added additive migration `20260819124000_enforce_product_units_for_sale.sql` so a product without active branch-local unit links cannot complete a sale.
- Updated linked-order settlement fixtures to use `inventory_units`, `product_unit_links`, and `inventory_unit_batches`.
- Updated authoritative-pricing fixtures to use the same unit stock contract and `inventory_unit_entries` ledger.

### EVIDENCE
- Run #276: migrations and schema verification passed; 211/215 integration tests passed. Four failures were legacy fixtures still asserting product `inventory_batches`.
- Follow-up commits: `4eb275f`, `257868f`, `06bbfc0`.

### REMAINING
- Full CI on newest head.
- Live flow: manufacture unit -> add unit to product -> sell product -> unit decreases, raw material does not decrease again.

### GATE
Do not close this phase until Verify CI is fully green and the live stock-flow scenario passes.
