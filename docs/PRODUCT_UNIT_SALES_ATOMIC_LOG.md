# Product -> Unit -> Manufacturing -> Sale — Atomic Sales Log

## 2026-08-19 — Root-cause fix

### DONE
- Product components are units only; raw materials are not sale components.
- Manufactured units consume raw materials only during manufacturing.
- POS sale deduction is now backed by `public.deduct_sale_unit_inventory(...)`.
- Unit deduction validates the complete demand before writes, locks FIFO unit batches with `FOR UPDATE`, updates unit batches, and writes unit ledger entries in the same transaction.
- `public.process_sale(...)` is routed to the unit RPC and no longer calls `_product_inv_remove_fifo` or reads `inventory_batches` for POS stock deduction.
- Unit sale deduction rejects products without active branch-local unit links and requires a warehouse.
- Frontend `deductSaleInventory()` is now a thin RPC adapter; no frontend batch mutation remains.
- Unit-sale tests now verify the RPC contract and the absence of raw-material deductions.

## 2026-08-19 — CI integration contract alignment

### DONE
- Added an additive migration `20260819124000_enforce_product_units_for_sale.sql` so a product without active branch-local unit links cannot complete a sale.
- Updated linked-order settlement integration fixtures to seed `inventory_units`, `product_unit_links`, and `inventory_unit_batches` and to assert unit-batch deduction instead of legacy `inventory_batches` deduction.
- Updated authoritative-pricing integration fixtures to use the same unit-based stock contract and to verify `inventory_unit_entries` for the sale.

### EVIDENCE
- Run #276: all canonical migrations + schema verification passed; 211/215 integration tests passed. The four failures were the two legacy sale fixtures still asserting `inventory_batches` and the pricing discount fixture with a product lacking unit stock.
- Follow-up commits on `agent/product-setup-flow`: additive unit-link enforcement, settlement fixture migration, pricing fixture migration.

### REMAINING
- Run the full CI on the new head.
- Verify the live flow: manufacture unit -> add unit to product -> sell product -> unit decreases, raw material does not decrease again.

### GATE
Do not close this phase until Verify CI is fully green and the live stock-flow scenario passes.
