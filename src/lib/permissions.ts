import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Role } from './types';

/**
 * Enterprise permission model — dotted `module.action` permissions.
 * Admins (super_admin / owner) implicitly have every permission.
 * Other roles fall back to DEFAULT_ROLE_PERMISSIONS unless a custom
 * permissions map is stored on the user (users.permissions jsonb).
 */

export type Permission =
  | 'dashboard.view'
  | 'pos.sell'
  | 'products.view' | 'products.manage'
  | 'categories.view' | 'categories.manage'
  | 'components.view' | 'components.manage'
  | 'purchases.view' | 'purchases.manage'
  | 'inventory.view' | 'inventory.manage'
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
    permissions: ['inventory.view', 'inventory.manage'],
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
  kitchen: [
    'dashboard.view',
    'products.view',
    'components.view',
    'inventory.view',
    'sales.view',
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
  customer_display: [
    'dashboard.view',
    'products.view',
    'sales.view',
  ],
};

export function isAdminRole(role?: Role | null): boolean {
  return role === 'super_admin' || role === 'owner';
}

/**
 * Resolves whether a user has a permission. Admins always have everything.
 * A stored permissions map overrides (or revokes) the role defaults.
 */
export function hasPermission(
  role: Role | null | undefined,
  userPermissions: Record<string, boolean> | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  if (isAdminRole(role)) return true;
  if (userPermissions && typeof userPermissions === 'object' && permission in userPermissions) {
    return userPermissions[permission] === true;
  }
  return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Hook: true when the current user has the permission. */
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return hasPermission(user?.role, user?.permissions, permission);
}

/** Hook: memoized can(permission) checker for the current user. */
export function useCan(): (permission: Permission) => boolean {
  const { user } = useAuth();
  return useCallback(
    (permission: Permission) => hasPermission(user?.role, user?.permissions, permission),
    [user]
  );
}
