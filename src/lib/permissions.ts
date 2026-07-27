import type { Role } from './types';

export type Permission =
  | 'products_view' | 'products_manage'
  | 'purchases_view' | 'purchases_manage'
  | 'expenses_view' | 'expenses_manage'
  | 'inventory_view' | 'inventory_manage'
  | 'sales_view' | 'sales_manage'
  | 'reports_view'
  | 'users_manage'
  | 'settings_manage'
  | 'branches_manage';

export const ALL_PERMISSIONS: Permission[] = [
  'products_view', 'products_manage',
  'purchases_view', 'purchases_manage',
  'expenses_view', 'expenses_manage',
  'inventory_view', 'inventory_manage',
  'sales_view', 'sales_manage',
  'reports_view',
  'users_manage',
  'settings_manage',
  'branches_manage',
];

export const PERMISSION_LABELS: Record<Permission, { ar: string; en: string }> = {
  products_view: { ar: 'عرض المنتجات', en: 'View Products' },
  products_manage: { ar: 'إدارة المنتجات', en: 'Manage Products' },
  purchases_view: { ar: 'عرض المشتريات', en: 'View Purchases' },
  purchases_manage: { ar: 'إدارة المشتريات', en: 'Manage Purchases' },
  expenses_view: { ar: 'عرض المصروفات', en: 'View Expenses' },
  expenses_manage: { ar: 'إدارة المصروفات', en: 'Manage Expenses' },
  inventory_view: { ar: 'عرض المخزون', en: 'View Inventory' },
  inventory_manage: { ar: 'إدارة المخزون', en: 'Manage Inventory' },
  sales_view: { ar: 'عرض المبيعات', en: 'View Sales' },
  sales_manage: { ar: 'إدارة المبيعات', en: 'Manage Sales' },
  reports_view: { ar: 'عرض التقارير', en: 'View Reports' },
  users_manage: { ar: 'إدارة المستخدمين', en: 'Manage Users' },
  settings_manage: { ar: 'إدارة الإعدادات', en: 'Manage Settings' },
  branches_manage: { ar: 'إدارة الفروع', en: 'Manage Branches' },
};

export const PERMISSION_GROUPS = [
  {
    key: 'sales',
    ar: 'المبيعات',
    en: 'Sales',
    permissions: ['sales_view', 'sales_manage'] as Permission[],
  },
  {
    key: 'products',
    ar: 'المنتجات',
    en: 'Products',
    permissions: ['products_view', 'products_manage'] as Permission[],
  },
  {
    key: 'purchases',
    ar: 'المشتريات',
    en: 'Purchases',
    permissions: ['purchases_view', 'purchases_manage'] as Permission[],
  },
  {
    key: 'inventory',
    ar: 'المخزون',
    en: 'Inventory',
    permissions: ['inventory_view', 'inventory_manage'] as Permission[],
  },
  {
    key: 'expenses',
    ar: 'المصروفات',
    en: 'Expenses',
    permissions: ['expenses_view', 'expenses_manage'] as Permission[],
  },
  {
    key: 'reports',
    ar: 'التقارير',
    en: 'Reports',
    permissions: ['reports_view'] as Permission[],
  },
  {
    key: 'admin',
    ar: 'الإدارة',
    en: 'Administration',
    permissions: ['users_manage', 'settings_manage', 'branches_manage'] as Permission[],
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [...ALL_PERMISSIONS],
  manager: [
    'products_view', 'products_manage',
    'purchases_view', 'purchases_manage',
    'expenses_view', 'expenses_manage',
    'inventory_view', 'inventory_manage',
    'sales_view', 'sales_manage',
    'reports_view',
  ],
  cashier: [
    'products_view',
    'purchases_view',
    'inventory_view',
    'sales_view', 'sales_manage',
  ],
  salesperson: [
    'products_view',
    'sales_view', 'sales_manage',
  ],
};

export function hasPermission(
  userPermissions: Record<string, boolean> | null | undefined,
  role: Role,
  permission: Permission
): boolean {
  if (userPermissions && typeof userPermissions === 'object' && permission in userPermissions) {
    return userPermissions[permission] === true;
  }
  return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
