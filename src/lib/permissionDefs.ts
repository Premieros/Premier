import type { Role } from './types';

export type { Role };

/**
 * Pure enterprise permission model — dotted `module.action` permissions.
 * Admins (super_admin / owner) implicitly have every permission.
 * Non-admin roles resolve permissions from the DB-backed `roles` table
 * (exposed through RolesContext) and fall back to DEFAULT_ROLE_PERMISSIONS
 * while the table is still loading or unavailable.
 */

export type Permission =
  | 'dashboard.view'
  | 'pos.sell'
  | 'products.view' | 'products.manage'
  | 'categories.view' | 'categories.manage'
  | 'components.view' | 'components.manage'
  | 'purchases.view' | 'purchases.manage'
  | 'inventory.view' | 'inventory.manage'
  | 'inventory.transfers' | 'inventory.transfers.approve'
  | 'inventory.ledger.view'
  | 'raw_materials.view' | 'raw_materials.manage'
  | 'recipes.view' | 'recipes.manage'
  | 'production.view' | 'production.manage' | 'production.waste'
  | 'warehouses.view' | 'warehouses.manage'
  | 'customers.view' | 'customers.manage'
  | 'suppliers.view' | 'suppliers.manage'
  | 'expenses.view' | 'expenses.manage'
  | 'sales.view'
  | 'refunds.approve'
  | 'reports.view'
  | 'shifts.view' | 'shifts.open' | 'shifts.close' | 'shifts.manage'
  | 'users.view' | 'users.manage'
  | 'audit.view'
  | 'settings.manage'
  | 'branches.manage';

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'pos.sell',
  'products.view', 'products.manage',
  'categories.view', 'categories.manage',
  'components.view', 'components.manage',
  'purchases.view', 'purchases.manage',
  'inventory.view', 'inventory.manage',
  'inventory.transfers', 'inventory.transfers.approve',
  'inventory.ledger.view',
  'raw_materials.view', 'raw_materials.manage',
  'recipes.view', 'recipes.manage',
  'production.view', 'production.manage', 'production.waste',
  'warehouses.view', 'warehouses.manage',
  'customers.view', 'customers.manage',
  'suppliers.view', 'suppliers.manage',
  'expenses.view', 'expenses.manage',
  'sales.view',
  'refunds.approve',
  'reports.view',
  'shifts.view', 'shifts.open', 'shifts.close', 'shifts.manage',
  'users.view', 'users.manage',
  'audit.view',
  'settings.manage',
  'branches.manage',
];

export const PERMISSION_LABELS: Record<Permission, { ar: string; en: string }> = {
  'dashboard.view': { ar: 'عرض لوحة التحكم', en: 'View Dashboard' },
  'pos.sell': { ar: 'البيع من نقطة البيع', en: 'Sell from POS' },
  'products.view': { ar: 'عرض المنتجات', en: 'View Products' },
  'products.manage': { ar: 'إدارة المنتجات', en: 'Manage Products' },
  'categories.view': { ar: 'عرض الأصناف', en: 'View Categories' },
  'categories.manage': { ar: 'إدارة الأصناف', en: 'Manage Categories' },
  'components.view': { ar: 'عرض مكونات المنتجات', en: 'View Components' },
  'components.manage': { ar: 'إدارة مكونات المنتجات', en: 'Manage Components' },
  'purchases.view': { ar: 'عرض المشتريات', en: 'View Purchases' },
  'purchases.manage': { ar: 'إدارة المشتريات', en: 'Manage Purchases' },
  'inventory.view': { ar: 'عرض المخزون', en: 'View Inventory' },
  'inventory.manage': { ar: 'إدارة المخزون', en: 'Manage Inventory' },
  'inventory.transfers': { ar: 'إنشاء تحويلات المخازن', en: 'Create Warehouse Transfers' },
  'inventory.transfers.approve': { ar: 'اعتماد تحويلات المخازن', en: 'Approve Warehouse Transfers' },
  'inventory.ledger.view': { ar: 'عرض دفتر المخزون', en: 'View Inventory Ledger' },
  'raw_materials.view': { ar: 'عرض المواد الخام', en: 'View Raw Materials' },
  'raw_materials.manage': { ar: 'إدارة المواد الخام', en: 'Manage Raw Materials' },
  'recipes.view': { ar: 'عرض الوصفات', en: 'View Recipes' },
  'recipes.manage': { ar: 'إدارة الوصفات', en: 'Manage Recipes' },
  'production.view': { ar: 'عرض أوامر الإنتاج', en: 'View Production Orders' },
  'production.manage': { ar: 'إدارة أوامر الإنتاج', en: 'Manage Production Orders' },
  'production.waste': { ar: 'تسجيل هالك الإنتاج', en: 'Record Production Waste' },
  'warehouses.view': { ar: 'عرض المخازن', en: 'View Warehouses' },
  'warehouses.manage': { ar: 'إدارة المخازن', en: 'Manage Warehouses' },
  'customers.view': { ar: 'عرض العملاء', en: 'View Customers' },
  'customers.manage': { ar: 'إدارة العملاء', en: 'Manage Customers' },
  'suppliers.view': { ar: 'عرض الموردين', en: 'View Suppliers' },
  'suppliers.manage': { ar: 'إدارة الموردين', en: 'Manage Suppliers' },
  'expenses.view': { ar: 'عرض المصروفات', en: 'View Expenses' },
  'expenses.manage': { ar: 'إدارة المصروفات', en: 'Manage Expenses' },
  'sales.view': { ar: 'عرض فواتير المبيعات', en: 'View Sales Invoices' },
  'refunds.approve': { ar: 'الموافقة على المرتجعات', en: 'Approve Refunds' },
  'reports.view': { ar: 'عرض التقارير', en: 'View Reports' },
  'shifts.view': { ar: 'عرض الشيفتات', en: 'View Shifts' },
  'shifts.open': { ar: 'فتح شيفت', en: 'Open Shift' },
  'shifts.close': { ar: 'إغلاق شيفت', en: 'Close Shift' },
  'shifts.manage': { ar: 'إدارة كل الشيفتات', en: 'Manage All Shifts' },
  'users.view': { ar: 'عرض المستخدمين', en: 'View Users' },
  'users.manage': { ar: 'إدارة المستخدمين', en: 'Manage Users' },
  'audit.view': { ar: 'عرض سجل العمليات', en: 'View Audit Log' },
  'settings.manage': { ar: 'إدارة الإعدادات', en: 'Manage Settings' },
  'branches.manage': { ar: 'إدارة الفروع', en: 'Manage Branches' },
};

export interface PermissionGroup {
  key: string;
  ar: string;
  en: string;
  permissions: Permission[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'dashboard',
    ar: 'لوحة التحكم',
    en: 'Dashboard',
    permissions: ['dashboard.view'],
  },
  {
    key: 'pos',
    ar: 'نقطة البيع',
    en: 'POS',
    permissions: ['pos.sell'],
  },
  {
    key: 'products',
    ar: 'المنتجات',
    en: 'Products',
    permissions: ['products.view', 'products.manage'],
  },
  {
    key: 'categories',
    ar: 'الأصناف',
    en: 'Categories',
    permissions: ['categories.view', 'categories.manage'],
  },
  {
    key: 'components',
    ar: 'المكونات',
    en: 'Components',
    permissions: ['components.view', 'components.manage'],
  },
  {
    key: 'purchases',
    ar: 'المشتريات',
    en: 'Purchases',
    permissions: ['purchases.view', 'purchases.manage'],
  },
  {
    key: 'inventory',
    ar: 'المخزون',
    en: 'Inventory',
    permissions: [
      'inventory.view', 'inventory.manage',
      'inventory.transfers', 'inventory.transfers.approve',
      'inventory.ledger.view',
    ],
  },
  {
    key: 'raw_materials',
    ar: 'المواد الخام',
    en: 'Raw Materials',
    permissions: ['raw_materials.view', 'raw_materials.manage'],
  },
  {
    key: 'recipes',
    ar: 'الوصفات',
    en: 'Recipes',
    permissions: ['recipes.view', 'recipes.manage'],
  },
  {
    key: 'production',
    ar: 'الإنتاج',
    en: 'Production',
    permissions: ['production.view', 'production.manage', 'production.waste'],
  },
  {
    key: 'warehouses',
    ar: 'المخازن',
    en: 'Warehouses',
    permissions: ['warehouses.view', 'warehouses.manage'],
  },
  {
    key: 'customers',
    ar: 'العملاء',
    en: 'Customers',
    permissions: ['customers.view', 'customers.manage'],
  },
  {
    key: 'suppliers',
    ar: 'الموردون',
    en: 'Suppliers',
    permissions: ['suppliers.view', 'suppliers.manage'],
  },
  {
    key: 'sales',
    ar: 'المبيعات',
    en: 'Sales',
    permissions: ['sales.view', 'refunds.approve'],
  },
  {
    key: 'expenses',
    ar: 'المصروفات',
    en: 'Expenses',
    permissions: ['expenses.view', 'expenses.manage'],
  },
  {
    key: 'shifts',
    ar: 'الشيفتات',
    en: 'Shifts',
    permissions: ['shifts.view', 'shifts.open', 'shifts.close', 'shifts.manage'],
  },
  {
    key: 'reports',
    ar: 'التقارير',
    en: 'Reports',
    permissions: ['reports.view'],
  },
  {
    key: 'admin',
    ar: 'الإدارة',
    en: 'Administration',
    permissions: ['users.view', 'users.manage', 'audit.view', 'settings.manage', 'branches.manage'],
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [...ALL_PERMISSIONS],
  owner: [...ALL_PERMISSIONS],
  branch_manager: [
    'dashboard.view', 'pos.sell',
    'products.view', 'products.manage',
    'categories.view', 'categories.manage',
    'components.view', 'components.manage',
    'purchases.view', 'purchases.manage',
    'inventory.view', 'inventory.manage',
    'warehouses.view', 'warehouses.manage',
    'customers.view', 'customers.manage',
    'suppliers.view', 'suppliers.manage',
    'expenses.view', 'expenses.manage',
    'sales.view', 'refunds.approve',
    'shifts.view', 'shifts.open', 'shifts.close', 'shifts.manage',
    'reports.view',
    'users.view', 'users.manage',
  ],
  cashier: [
    'dashboard.view', 'pos.sell',
    'products.view',
    'customers.view', 'customers.manage',
    'inventory.view',
    'sales.view',
    'shifts.view', 'shifts.open', 'shifts.close',
  ],
  warehouse_manager: [
    'dashboard.view',
    'products.view', 'products.manage',
    'categories.view', 'categories.manage',
    'components.view', 'components.manage',
    'inventory.view', 'inventory.manage',
    'warehouses.view', 'warehouses.manage',
    'purchases.view', 'purchases.manage',
    'suppliers.view', 'suppliers.manage',
    'shifts.view',
  ],
  accountant: [
    'dashboard.view',
    'sales.view',
    'purchases.view',
    'expenses.view', 'expenses.manage',
    'inventory.view',
    'customers.view',
    'suppliers.view',
    'reports.view',
    'shifts.view',
  ],
  production_manager: [
    'dashboard.view',
    'products.view', 'products.manage',
    'categories.view', 'categories.manage',
    'raw_materials.view', 'raw_materials.manage',
    'recipes.view', 'recipes.manage',
    'production.view', 'production.manage', 'production.waste',
    'inventory.view', 'inventory.manage',
    'warehouses.view', 'warehouses.manage',
    'inventory.transfers', 'inventory.transfers.approve',
    'purchases.view', 'purchases.manage',
    'suppliers.view', 'suppliers.manage',
    'inventory.ledger.view',
    'shifts.view',
  ],
};

/** DB row of the `roles` table. */
export interface RoleDef {
  role: Role;
  name_ar: string;
  name_en: string;
  permissions: Permission[];
  updated_at?: string;
}

/** Display labels for every role (fallback before the roles table loads). */
export const ROLE_META: Record<Role, { ar: string; en: string }> = {
  super_admin: { ar: 'مدير عام', en: 'Super Admin' },
  owner: { ar: 'مالك', en: 'Owner' },
  branch_manager: { ar: 'مدير فرع', en: 'Branch Manager' },
  cashier: { ar: 'أمين صندوق', en: 'Cashier' },
  warehouse_manager: { ar: 'مدير مخازن', en: 'Warehouse Manager' },
  accountant: { ar: 'محاسب', en: 'Accountant' },
  production_manager: { ar: 'مدير إنتاج', en: 'Production Manager' },
};

export function isAdminRole(role?: Role | null): boolean {
  return role === 'super_admin' || role === 'owner';
}

/**
 * Resolves whether a role has a permission. Admins always have everything.
 * `rolePermissionsMap` (from the DB `roles` table) overrides the code
 * defaults — it should be the source of truth once loaded.
 */
export function hasPermission(
  role: Role | null | undefined,
  rolePermissionsMap: Record<string, Permission[]> | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  if (isAdminRole(role)) return true;
  const list = rolePermissionsMap?.[role] ?? DEFAULT_ROLE_PERMISSIONS[role];
  return list?.includes(permission) ?? false;
}
