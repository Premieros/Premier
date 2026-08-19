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

### REMAINING
- Full GitHub CI must pass on the final head.
- A live POS scenario should be verified after CI: manufacture unit -> add unit to product -> sell product -> confirm unit decreases and raw material does not decrease again.

### EVIDENCE
- Atomic unit RPC migration: `20260819090356_atomic_unit_sale_deduction.sql`
- POS routing migration: `20260819120400_rewrite_process_sale_unit_path.sql`
- Frontend adapter commit: `b5163b7`
- Unit-sale test commit: `0509e15`
- Final process-sale migration commit: `029e35e`

### GATE
Do not close this phase until Verify CI is fully green and the live stock-flow scenario passes.
