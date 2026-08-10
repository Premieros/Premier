import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { useCan, type Permission } from '../lib/permissions';

const LoginPage = lazy(() => import('../features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardEnhancedPage').then(m => ({ default: m.DashboardEnhancedPage })));
const PosWorkspacePage = lazy(() => import('../features/pos/pages/PosWorkspacePage').then(m => ({ default: m.PosWorkspacePage })));
const ActiveOrdersPage = lazy(() => import('../features/pos/pages/ActiveOrdersPage').then(m => ({ default: m.ActiveOrdersPage })));
const ProductsPage = lazy(() => import('../features/catalog/pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const CategoriesPage = lazy(() => import('../features/catalog/pages/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const ComponentsPage = lazy(() => import('../features/catalog/pages/ComponentsPage').then(m => ({ default: m.ComponentsPage })));
const InventoryPage = lazy(() => import('../features/inventory/pages/InventoryPage').then(m => ({ default: m.InventoryPage })));
const WarehousesPage = lazy(() => import('../features/inventory/pages/WarehousesPage').then(m => ({ default: m.WarehousesPage })));
const RawMaterialsPage = lazy(() => import('../features/manufacturing/pages/RawMaterialsPage').then(m => ({ default: m.RawMaterialsPage })));
const RecipesPage = lazy(() => import('../features/manufacturing/pages/RecipesPage').then(m => ({ default: m.RecipesPage })));
const ProductionOrdersPage = lazy(() => import('../features/manufacturing/pages/ProductionOrdersPage').then(m => ({ default: m.ProductionOrdersPage })));
const TransfersPage = lazy(() => import('../features/inventory/pages/TransfersPage').then(m => ({ default: m.TransfersPage })));
const InventoryLedgerPage = lazy(() => import('../features/inventory/pages/InventoryLedgerPage').then(m => ({ default: m.InventoryLedgerPage })));
const BranchesPage = lazy(() => import('../features/admin/pages/BranchesPage').then(m => ({ default: m.BranchesPage })));
const PurchasesPage = lazy(() => import('../features/trade/pages/PurchasesPage').then(m => ({ default: m.PurchasesPage })));
const CustomersPage = lazy(() => import('../features/parties/pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const SuppliersPage = lazy(() => import('../features/parties/pages/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const ExpensesPage = lazy(() => import('../features/trade/pages/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const SalesPage = lazy(() => import('../features/trade/pages/SalesPage').then(m => ({ default: m.SalesPage })));
const ShiftsPage = lazy(() => import('../features/trade/pages/ShiftsPage').then(m => ({ default: m.ShiftsPage })));
const ReportDeepLinkPage = lazy(() => import('../features/reporting/pages/ReportDeepLinkPage').then(m => ({ default: m.ReportDeepLinkPage })));
const FinancialReportsPage = lazy(() => import('../features/accounting/pages/FinancialReportsPage').then(m => ({ default: m.FinancialReportsPage })));
const AccountsPage = lazy(() => import('../features/accounting/pages/AccountsPage').then(m => ({ default: m.AccountsPage })));
const PaymentsPage = lazy(() => import('../features/accounting/pages/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const JournalPage = lazy(() => import('../features/accounting/pages/JournalPage').then(m => ({ default: m.JournalPage })));
const TreasuryPage = lazy(() => import('../features/accounting/pages/TreasuryPage').then(m => ({ default: m.TreasuryPage })));
const ReconciliationPage = lazy(() => import('../features/accounting/pages/ReconciliationPage').then(m => ({ default: m.ReconciliationPage })));
const UsersPage = lazy(() => import('../features/admin/pages/UsersPage').then(m => ({ default: m.UsersPage })));
const AuditLogPage = lazy(() => import('../features/reporting/pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const SettingsPage = lazy(() => import('../features/admin/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SystemControlCenterPage = lazy(() => import('../features/admin/pages/SystemControlCenterPage').then(m => ({ default: m.SystemControlCenterPage })));

function PageLoader() { return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" /></div>; }
function ProtectedRoute({ children, permission, fullscreen }: { children: React.ReactNode; permission?: Permission; fullscreen?: boolean }) { const { session, loading } = useAuth(); const can = useCan(); if (loading) return <PageLoader />; if (!session) return <Navigate to="/login" replace />; if (permission && !can(permission)) return <Navigate to="/dashboard" replace />; if (fullscreen) return <>{children}</>; return <Layout>{children}</Layout>; }
function PublicRoute({ children }: { children: React.ReactNode }) { const { session, loading } = useAuth(); if (loading) return null; if (session) return <Navigate to="/dashboard" replace />; return <>{children}</>; }

export function AppRoutes() {
 return <Suspense fallback={<PageLoader />}><Routes>
  <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
  <Route path="/dashboard" element={<ProtectedRoute permission="dashboard.view"><DashboardPage /></ProtectedRoute>} />
  <Route path="/pos" element={<ProtectedRoute permission="pos.sell" fullscreen><PosWorkspacePage /></ProtectedRoute>} />
  <Route path="/pos/:orderId" element={<ProtectedRoute permission="pos.sell" fullscreen><PosWorkspacePage /></ProtectedRoute>} />
  <Route path="/floor-plan" element={<ProtectedRoute permission="floor_plan.view"><ActiveOrdersPage /></ProtectedRoute>} />
  <Route path="/products" element={<ProtectedRoute permission="products.view"><ProductsPage /></ProtectedRoute>} />
  <Route path="/categories" element={<ProtectedRoute permission="categories.view"><CategoriesPage /></ProtectedRoute>} />
  <Route path="/components" element={<ProtectedRoute permission="components.view"><ComponentsPage /></ProtectedRoute>} />
  <Route path="/inventory" element={<ProtectedRoute permission="inventory.view"><InventoryPage /></ProtectedRoute>} />
  <Route path="/warehouses" element={<ProtectedRoute permission="warehouses.view"><WarehousesPage /></ProtectedRoute>} />
  <Route path="/raw-materials" element={<ProtectedRoute permission="raw_materials.view"><RawMaterialsPage /></ProtectedRoute>} />
  <Route path="/recipes" element={<ProtectedRoute permission="recipes.view"><RecipesPage /></ProtectedRoute>} />
  <Route path="/production" element={<ProtectedRoute permission="production.view"><ProductionOrdersPage /></ProtectedRoute>} />
  <Route path="/transfers" element={<ProtectedRoute permission="inventory.transfers"><TransfersPage /></ProtectedRoute>} />
  <Route path="/inventory-ledger" element={<ProtectedRoute permission="inventory.ledger.view"><InventoryLedgerPage /></ProtectedRoute>} />
  <Route path="/branches" element={<ProtectedRoute permission="branches.manage"><BranchesPage /></ProtectedRoute>} />
  <Route path="/purchases" element={<ProtectedRoute permission="purchases.view"><PurchasesPage /></ProtectedRoute>} />
  <Route path="/customers" element={<ProtectedRoute permission="customers.view"><CustomersPage /></ProtectedRoute>} />
  <Route path="/suppliers" element={<ProtectedRoute permission="suppliers.view"><SuppliersPage /></ProtectedRoute>} />
  <Route path="/expenses" element={<ProtectedRoute permission="expenses.view"><ExpensesPage /></ProtectedRoute>} />
  <Route path="/sales" element={<ProtectedRoute permission="sales.view"><SalesPage /></ProtectedRoute>} />
  <Route path="/shifts" element={<ProtectedRoute permission="shifts.view"><ShiftsPage /></ProtectedRoute>} />
  <Route path="/reports" element={<ProtectedRoute permission="reports.view"><ReportDeepLinkPage /></ProtectedRoute>} />
  <Route path="/financial-reports" element={<ProtectedRoute permission="reports.financial"><FinancialReportsPage /></ProtectedRoute>} />
  <Route path="/accounts" element={<ProtectedRoute permission="accounts.view"><AccountsPage /></ProtectedRoute>} />
  <Route path="/payments" element={<ProtectedRoute permission="accounts.view"><PaymentsPage /></ProtectedRoute>} />
  <Route path="/journal" element={<ProtectedRoute permission="accounts.view"><JournalPage /></ProtectedRoute>} />
  <Route path="/treasury" element={<ProtectedRoute permission="accounts.view"><TreasuryPage /></ProtectedRoute>} />
  <Route path="/reconciliation" element={<ProtectedRoute permission="accounts.view"><ReconciliationPage /></ProtectedRoute>} />
  <Route path="/users" element={<ProtectedRoute permission="users.view"><UsersPage /></ProtectedRoute>} />
  <Route path="/audit-log" element={<ProtectedRoute permission="audit.view"><AuditLogPage /></ProtectedRoute>} />
  <Route path="/settings" element={<ProtectedRoute permission="settings.manage"><SystemControlCenterPage /></ProtectedRoute>} />
  <Route path="/settings/basic" element={<ProtectedRoute permission="settings.manage"><SettingsPage /></ProtectedRoute>} />
  <Route path="/" element={<Navigate to="/dashboard" replace />} />
  <Route path="*" element={<Navigate to="/dashboard" replace />} />
 </Routes></Suspense>;
}
