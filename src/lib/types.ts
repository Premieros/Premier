export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark';

export type Role =
  | 'super_admin'
  | 'owner'
  | 'branch_manager'
  | 'cashier'
  | 'warehouse_manager'
  | 'accountant'
  | 'production_manager';

export type ShiftStatus = 'open' | 'closed';
export type ShiftOperationType = 'sale' | 'refund' | 'expense' | 'cash_in' | 'cash_out' | 'opening';

export interface Branch {
  id: string;
  name: string;
  name_en: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  branch_id: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  branch_id: string;
  created_at: string;
}

export type ProductType = 'ready' | 'manufactured';

export interface Product {
  id: string;
  name: string;
  name_en: string | null;
  barcode: string | null;
  sku: string | null;
  category_id: string | null;
  description: string | null;
  cost_price: number;
  sale_price: number;
  wholesale_price: number;
  image_url: string | null;
  is_active: boolean;
  low_stock_threshold: number;
  product_type: ProductType;
  branch_id: string;
  created_at: string;
  category?: Category;
}

export interface ProductUnit {
  id: string;
  product_id: string;
  unit_name: string;
  unit_name_en: string | null;
  conversion_factor: number;
  sale_price: number;
  cost_price: number;
  barcode: string | null;
  is_base: boolean;
  created_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  updated_at: string;
  product?: Product;
  warehouse?: Warehouse;
}

export interface Customer {
  id: string;
  name: string;
  name_en: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_number: string | null;
  balance: number;
  notes: string | null;
  branch_id: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  name_en: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_number: string | null;
  balance: number;
  notes: string | null;
  branch_id: string;
  created_at: string;
}

export interface Sale {
  id: string;
  invoice_number: string;
  branch_id: string | null;
  warehouse_id: string | null;
  customer_id: string | null;
  cashier_id: string | null;
  salesperson_id: string | null;
  subtotal: number;
  discount_amount: number;
  discount_type: string;
  tax_amount: number;
  bonus_amount: number;
  total: number;
  paid_amount: number;
  payment_method: string;
  status: string;
  order_type: string;
  table_id: string | null;
  notes: string | null;
  created_at: string;
  customer?: Customer;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  unit_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  bonus_quantity: number;
  total: number;
  created_at: string;
  product?: Product;
}

export interface Purchase {
  id: string;
  invoice_number: string;
  supplier_id: string | null;
  branch_id: string | null;
  warehouse_id: string | null;
  buyer_id: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  payment_method: string;
  status: string;
  notes: string | null;
  created_at: string;
  supplier?: Supplier;
  purchase_items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string | null;
  unit_name: string;
  quantity: number;
  unit_cost: number;
  total: number;
  created_at: string;
  product?: Product;
}

export interface Expense {
  id: string;
  category: string | null;
  description: string | null;
  amount: number;
  branch_id: string | null;
  payment_method: string;
  expense_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AppUser {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  role: Role;
  branch_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  branch_id: string | null;
  created_at: string;
}

export interface Shift {
  id: string;
  branch_id: string;
  cashier_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  expected_amount: number;
  actual_amount: number | null;
  difference: number;
  status: ShiftStatus;
  notes: string | null;
  created_at: string;
  branch?: Branch;
  cashier?: AppUser;
}

export interface ShiftOperation {
  id: string;
  shift_id: string;
  operation_type: ShiftOperationType;
  amount: number;
  payment_method: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Settings {
  id: string;
  store_name: string;
  store_name_en: string | null;
  store_address: string | null;
  store_phone: string | null;
  currency: string;
  tax_rate: number;
  tax_enabled: boolean;
  receipt_footer: string | null;
  receipt_header: string | null;
  logo_url: string | null;
  language: string;
  theme: string;
  brand_color: string | null;
  pos_default_payment_method: string;
  pos_barcode_autofocus: boolean;
  pos_line_discount: boolean;
  invoice_prefix: string;
  invoice_next_number: number;
  invoice_decimal_places: number;
  receipt_width_mm: number;
  receipt_copies: number;
  receipt_auto_print: boolean;
  receipt_show_tax: boolean;
  receipt_show_qr: boolean;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface BranchSettings {
  branch_id: string;
  receipt_header: string | null;
  receipt_footer: string | null;
  logo_url: string | null;
  tax_rate: number | null;
  tax_enabled: boolean | null;
  currency: string | null;
  low_stock_threshold: number | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  unit_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  bonus_quantity: number;
}

// ---- Phase 3: Restaurant floor plan + open orders ----
export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'drive_thru';
export type DiningTableStatus = 'vacant' | 'occupied' | 'reserved' | 'closed';
export type OrderStatus = 'open' | 'held' | 'completed' | 'cancelled';

export interface PosSummary {
  occupiedTables: number;
  heldOrders: number;
  deliveryOrders: number;
  takeawayOrders: number;
  activeOrders: number;
}

export interface DiningArea {
  id: string;
  branch_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DiningTableLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DiningTable {
  id: string;
  branch_id: string;
  area_id: string | null;
  name: string;
  capacity: number;
  status: DiningTableStatus;
  shape: string;
  layout: DiningTableLayout;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  branch_id: string;
  order_type: OrderType;
  status: OrderStatus;
  table_id: string | null;
  customer_id: string | null;
  cashier_id: string | null;
  guest_count: number | null;
  notes: string | null;
  subtotal: number;
  discount_amount: number;
  discount_type: string;
  tax_amount: number;
  total: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  table?: DiningTable;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  unit_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  bonus_quantity: number;
  total: number;
  notes: string | null;
  created_at: string;
  product?: Product;
}

export interface ProductComponent {
  id: string;
  product_id: string;
  component_product_id: string;
  quantity: number;
  created_at: string;
  component_product?: Product;
}

export interface ProductComponentInput {
  component_product_id: string;
  quantity: number;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  unit_id: string | null;
  category: string | null;
  min_stock: number;
  default_cost: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  unit?: Unit;
}

export interface RawMaterialInventory {
  id: string;
  raw_material_id: string;
  branch_id: string;
  quantity: number;
  avg_cost: number;
  min_stock: number;
  updated_at: string;
  raw_material?: RawMaterial;
  branch?: Branch;
}

export interface RawMaterialBatch {
  id: string;
  raw_material_id: string;
  branch_id: string;
  batch_number: string | null;
  quantity: number;
  unit_cost: number;
  production_date: string | null;
  expiry_date: string | null;
  source_type: string;
  source_id: string | null;
  created_at: string;
  raw_material?: RawMaterial;
  branch?: Branch;
}

export interface Recipe {
  id: string;
  product_id: string;
  branch_id: string;
  name: string | null;
  yield_quantity: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  product?: Product;
  branch?: Branch;
  items?: RecipeItem[];
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  raw_material_id: string;
  quantity: number;
  wastage_percent: number;
  note: string | null;
  raw_material?: RawMaterial;
}

export interface RecipeItemInput {
  raw_material_id: string;
  quantity: number;
  wastage_percent: number;
  note?: string | null;
}

export type ProductionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface ProductionOrder {
  id: string;
  order_number: string;
  product_id: string;
  branch_id: string;
  warehouse_id: string | null;
  quantity: number;
  batch_number: string | null;
  status: ProductionStatus;
  total_cost: number;
  planned_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  product?: Product;
  warehouse?: Warehouse;
  branch?: Branch;
  creator?: AppUser;
}

export interface ProductionWaste {
  id: string;
  order_id: string;
  branch_id: string;
  raw_material_id: string | null;
  product_id: string | null;
  quantity: number;
  reason: string | null;
  created_at: string;
  raw_material?: RawMaterial;
  product?: Product;
}

export interface WasteInput {
  raw_material_id: string;
  quantity: number;
  reason?: string;
}

export type TransferStatus = 'pending' | 'approved' | 'rejected';

export interface WarehouseTransfer {
  id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  branch_id: string;
  status: TransferStatus;
  reason: string | null;
  notes: string | null;
  requested_by: string | null;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
  branch?: Branch;
  requester?: AppUser;
  approver?: AppUser;
  items?: WarehouseTransferItem[];
}

export interface WarehouseTransferItem {
  id: string;
  transfer_id: string;
  product_id: string | null;
  quantity: number;
  unit_cost: number;
  created_at: string;
  product?: Product;
}

export interface TransferItemInput {
  product_id: string;
  quantity: number;
  unit_cost: number;
}

export interface InventoryBatch {
  id: string;
  product_id: string;
  warehouse_id: string;
  branch_id: string;
  batch_number: string | null;
  quantity: number;
  unit_cost: number;
  production_date: string | null;
  expiry_date: string | null;
  source_type: string;
  source_id: string | null;
  created_at: string;
  product?: Product;
  warehouse?: Warehouse;
}

export type LedgerEntryType =
  | 'opening'
  | 'purchase'
  | 'sale'
  | 'refund'
  | 'production'
  | 'waste'
  | 'transfer'
  | 'adjustment';

export interface InventoryLedgerEntry {
  id: number;
  product_id: string | null;
  raw_material_id: string | null;
  branch_id: string;
  warehouse_id: string | null;
  batch_number: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  before_qty: number | null;
  after_qty: number | null;
  entry_type: LedgerEntryType;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  created_by: string | null;
  created_at: string;
  product?: Product;
  raw_material?: RawMaterial;
  warehouse?: Warehouse;
  branch?: Branch;
}

export interface StockTransaction {
  product_id: string;
  warehouse_id: string | null;
  branch_id: string | null;
  transaction_type: 'sale' | 'purchase' | 'adjustment';
  component_flow: boolean;
  reference_type: string;
  reference_id: string | null;
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  unit_cost: number | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  product?: Product;
  warehouse?: Warehouse;
}

export interface RpcResult {
  success: boolean;
  error?: string;
  detail?: string;
  sale_id?: string;
  purchase_id?: string;
  invoice_number?: string;
  order_id?: string;
  order_number?: string;
  table_id?: string;
  status?: string;
  batch_number?: string;
  transfer_id?: string;
  transfer_number?: string;
  total_cost?: number;
  unit_cost?: number;
  no_change?: boolean;
  open?: boolean;
  shift_id?: string;
  expected?: number;
  actual?: number;
  difference?: number;
  shift?: {
    id: string;
    branch_id: string;
    cashier_id: string;
    opened_at: string;
    opening_amount: number;
    expected: number;
    cash_sales: number;
    total_sales: number;
    notes: string | null;
  };
}

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export interface ChartOfAccount {
  id: string;
  branch_id: string;
  code: string;
  name: string;
  name_en: string | null;
  account_type: AccountType;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  branch_id: string;
  entry_date: string;
  reference_type: string;
  reference_id: string | null;
  reference_number: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  customer_id: string | null;
  supplier_id: string | null;
  note: string | null;
  created_at: string;
  account?: ChartOfAccount;
}

export interface CustomerPayment {
  id: string;
  customer_id: string;
  branch_id: string;
  amount: number;
  payment_method: string;
  sale_id: string | null;
  reference_number: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  customer?: Pick<Customer, 'name'>;
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  name_en: string | null;
  account_type: AccountType;
  debit: number;
  credit: number;
  balance: number;
}

export interface GeneralLedgerRow {
  line_id: string;
  entry_date: string;
  entry_number: string;
  description: string | null;
  reference_number: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface IncomeStatementResult {
  revenue: number;
  discount: number;
  net_revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_income: number;
}

export interface BalanceSheetResult {
  assets: number;
  liabilities: number;
  capital: number;
  retained: number;
  net_income: number;
  equity: number;
  balanced: boolean;
}

export interface ArAgingRow {
  id?: string;
  customer_id: string;
  name: string;
  phone: string | null;
  open_amount: number;
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
}

// ---- Phase D: Accounts Payable ----
export interface ApAgingRow {
  id?: string;
  supplier_id: string;
  name: string;
  phone: string | null;
  open_amount: number;
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
}

export interface OpenInvoice {
  invoice_id: string;
  invoice_number: string;
  party_id: string;
  party_name: string;
  party_phone: string | null;
  invoice_date: string;
  due_date: string;
  days_overdue: number;
  invoice_total: number;
  paid: number;
  returned: number;
  open_amount: number;
}

export interface AgingBucket {
  '0_30': number;
  '31_60': number;
  '61_90': number;
  '90_plus': number;
}

export interface AgingSummaryResult {
  as_of: string;
  ar_open: number;
  ap_open: number;
  ar: AgingBucket;
  ap: AgingBucket;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  branch_id: string;
  amount: number;
  payment_method: string;
  purchase_id: string | null;
  reference_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  supplier?: Pick<Supplier, 'name'>;
}

// ---- Phase D: Treasury ----
export interface TreasuryAccount {
  id: string;
  branch_id: string;
  account_id: string;
  account_type: 'cash' | 'bank';
  account_name: string;
  account_number: string | null;
  is_active: boolean;
  opening_balance: number;
  created_at: string;
  updated_at: string;
}

export interface TreasuryBalance {
  id: string;
  account_type: 'cash' | 'bank';
  account_name: string;
  account_number: string | null;
  code: string;
  is_active: boolean;
  opening_balance: number;
  balance: number;
}

export type TreasuryTransactionType = 'transfer' | 'deposit' | 'withdrawal';

export interface TreasuryTransaction {
  id: string;
  branch_id: string;
  transaction_type: TreasuryTransactionType;
  from_account_id: string | null;
  to_account_id: string | null;
  amount: number;
  reference_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  from_account?: Pick<TreasuryAccount, 'account_name'>;
  to_account?: Pick<TreasuryAccount, 'account_name'>;
}

// ---- Phase D: Bank Reconciliation ----
export type ReconciliationStatus = 'open' | 'completed' | 'cancelled';

export interface BankReconciliation {
  id: string;
  branch_id: string;
  treasury_account_id: string;
  statement_date: string;
  statement_balance: number;
  book_balance: number;
  difference: number;
  status: ReconciliationStatus;
  created_by: string | null;
  closed_at: string | null;
  created_at: string;
  treasury_account?: Pick<TreasuryAccount, 'account_name' | 'account_type'>;
}

export interface BankStatementLine {
  id: string;
  reconciliation_id: string;
  statement_date: string;
  description: string | null;
  reference: string | null;
  amount: number;
  matched_journal_entry_id: string | null;
  created_at: string;
}

export interface BookCandidate {
  id: string;
  entry_number: string;
  entry_date: string;
  reference_type: string;
  reference_number: string | null;
  description: string | null;
  amount: number;
}

export interface ReconciliationDetail {
  success: boolean;
  error?: string;
  header: (BankReconciliation & { account_name: string; code: string }) | null;
  statement_lines: BankStatementLine[];
  book_candidates: BookCandidate[];
}

// ---- Phase D: Journals DTO ----
export interface JournalLineDto {
  id: string;
  code: string;
  account_name: string;
  account_type: AccountType;
  debit: number;
  credit: number;
  note: string | null;
  customer_id: string | null;
  supplier_id: string | null;
}

export interface JournalDto {
  id: string;
  entry_number: string;
  entry_date: string;
  reference_type: string;
  reference_id: string | null;
  reference_number: string | null;
  description: string | null;
  created_at: string;
  debit_total: number;
  credit_total: number;
  lines: JournalLineDto[];
}

// ---- Phase D: Audit trail (RPC read) ----
export interface AuditTrailRow {
  id: string;
  created_at: string;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  branch_id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
}

// ---- Phase D: Reporting ----
export interface CashFlowRow {
  treasury_account_id: string;
  account_name: string;
  account_type: 'cash' | 'bank';
  code: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface PartyStatementRow {
  line_id: string;
  entry_date: string;
  entry_number: string;
  reference_type: string;
  reference_number: string | null;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface PartyStatementResult {
  party_id: string;
  side: string;
  opening: number;
  rows: PartyStatementRow[];
}

export interface TrialBalanceSummary {
  to_date: string;
  total_debit: number;
  total_credit: number;
  balanced: boolean;
}
