/**
 * Single source of truth for application routes.
 *
 * Navigation components must reference these constants instead of repeating
 * route strings. This keeps links stable when screens move or are renamed.
 */
export const APP_ROUTES = {
  login: '/login', register: '/register', dashboard: '/dashboard', subscription: '/subscription', subscriptions: '/subscriptions', pos: '/pos', operationsCenter: '/operations', inventoryCenter: '/inventory-center', procurementCenter: '/procurement-center', floorPlan: '/floor-plan', products: '/products', categories: '/categories', components: '/components', inventory: '/inventory', warehouses: '/warehouses', rawMaterials: '/raw-materials', recipes: '/recipes', production: '/production', transfers: '/transfers', inventoryLedger: '/inventory-ledger', stockCounts: '/stock-counts', inventoryBatches: '/inventory-batches', stockValuation: '/stock-valuation', lowStockAlerts: '/low-stock-alerts', costingCenter: '/costing', branches: '/branches', purchases: '/purchases', purchaseRequests: '/purchases/requests', rfqs: '/purchases/rfqs', receiving: '/purchases/receiving', customers: '/customers', suppliers: '/suppliers', expenses: '/expenses', sales: '/sales', shifts: '/shifts', reports: '/reports', financialReports: '/financial-reports', accounting: '/accounting', accounts: '/accounts', payments: '/payments', journal: '/journal', treasury: '/treasury', reconciliation: '/reconciliation', users: '/users', employees: '/employees', auditLog: '/audit-log', settings: '/settings', basicSettings: '/settings/basic', systemHealth: '/system-health',
} as const;
export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES];
export function posOrderRoute(orderId: string): string { return `${APP_ROUTES.pos}/${encodeURIComponent(orderId)}`; }
