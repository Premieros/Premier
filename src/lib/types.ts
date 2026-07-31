export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark';

export type Role = 'admin' | 'manager' | 'cashier' | 'salesperson';

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
  full_name: string | null;
  role: Role;
  branch_id: string | null;
  is_active: boolean;
  permissions: Record<string, boolean> | null;
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

export interface ProductComponent {
  id: string;
  product_id: string;
  component_product_id: string;
  quantity: number;
  created_at: string;
  component_product?: Product;
}

export interface StockTransaction {
  id: string;
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
  no_change?: boolean;
}
