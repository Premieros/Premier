import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PosPage } from './pages/PosPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { InventoryPage } from './pages/InventoryPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { BranchesPage } from './pages/BranchesPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { SalesPage } from './pages/SalesPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';
import { ComponentsPage } from './pages/ComponentsPage';

function ProtectedRoute({ children, adminOnly, fullscreen }: { children: React.ReactNode; adminOnly?: boolean; fullscreen?: boolean }) {
  const { session, loading, user } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
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
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/pos" element={<ProtectedRoute fullscreen><PosPage /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
      <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
      <Route path="/components" element={<ProtectedRoute><ComponentsPage /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
      <Route path="/warehouses" element={<ProtectedRoute adminOnly><WarehousesPage /></ProtectedRoute>} />
      <Route path="/branches" element={<ProtectedRoute adminOnly><BranchesPage /></ProtectedRoute>} />
      <Route path="/purchases" element={<ProtectedRoute><PurchasesPage /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
      <Route path="/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute adminOnly><AuditLogPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
