import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { RolesProvider } from './context/RolesContext';
import { ToastProvider } from './components/Toast';
import { Layout } from './components/Layout';
import { useCan, type Permission } from './lib/permissions';

const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PosPage = lazy(() => import('./pages/PosPage').then(m => ({ default: m.PosPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const InventoryPage = lazy(() => import('./pages/InventoryPage').then(m => ({ default: m.InventoryPage })));
const WarehousesPage = lazy(() => import('./pages/WarehousesPage').then(m => ({ default: m.WarehousesPage })));
const BranchesPage = lazy(() => import('./pages/BranchesPage').then(m => ({ default: m.BranchesPage })));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage').then(m => ({ default: m.PurchasesPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const SalesPage = lazy(() => import('./pages/SalesPage').then(m => ({ default: m.SalesPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const UsersPage = lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ComponentsPage = lazy(() => import('./pages/ComponentsPage').then(m => ({ default: m.ComponentsPage })));
const ShiftsPage = lazy(() => import('./pages/ShiftsPage').then(m => ({ default: m.ShiftsPage })));
const RawMaterialsPage = lazy(() => import('./pages/RawMaterialsPage').then(m => ({ default: m.RawMaterialsPage })));
const RecipesPage = lazy(() => import('./pages/RecipesPage').then(m => ({ default: m.RecipesPage })));
const ProductionOrdersPage = lazy(() => import('./pages/ProductionOrdersPage').then(m => ({ default: m.ProductionOrdersPage })));
const TransfersPage = lazy(() => import('./pages/TransfersPage').then(m => ({ default: m.TransfersPage })));
const InventoryLedgerPage = lazy(() => import('./pages/InventoryLedgerPage').then(m => ({ default: m.InventoryLedgerPage })));
const AccountsPage = lazy(() => import('./pages/AccountsPage').then(m => ({ default: m.AccountsPage })));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const JournalPage = lazy(() => import('./pages/JournalPage').then(m => ({ default: m.JournalPage })));
const FinancialReportsPage = lazy(() => import('./pages/FinancialReportsPage').then(m => ({ default: m.FinancialReportsPage })));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
    </div>
  );
}

function ProtectedRoute({ children, permission, fullscreen }: { children: React.ReactNode; permission?: Permission; fullscreen?: boolean }) {
  const { session, loading } = useAuth();
  const can = useCan();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (permission && !can(permission)) return <Navigate to="/dashboard" replace />;
  if (fullscreen) return <>{children}</>;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute permission="dashboard.view"><DashboardPage /></ProtectedRoute>} />
      <Route path="/pos" element={<ProtectedRoute permission="pos.sell" fullscreen><PosPage /></ProtectedRoute>} />
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
      <Route path="/reports" element={<ProtectedRoute permission="reports.view"><ReportsPage /></ProtectedRoute>} />
      <Route path="/financial-reports" element={<ProtectedRoute permission="reports.financial"><FinancialReportsPage /></ProtectedRoute>} />
      <Route path="/accounts" element={<ProtectedRoute permission="accounts.view"><AccountsPage /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute permission="accounts.view"><PaymentsPage /></ProtectedRoute>} />
      <Route path="/journal" element={<ProtectedRoute permission="accounts.view"><JournalPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute permission="users.view"><UsersPage /></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute permission="audit.view"><AuditLogPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute permission="settings.manage"><SettingsPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SettingsProvider>
            <RolesProvider>
              <ToastProvider>
                <HashRouter>
                  <AppRoutes />
                </HashRouter>
              </ToastProvider>
            </RolesProvider>
          </SettingsProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
