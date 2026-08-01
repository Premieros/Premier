import { type ReactNode, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Tags, Boxes, Warehouse, Store,
  Truck, Users, Building2, Receipt, BarChart3, UserCog, Settings, ScrollText,
  Menu, X, Moon, Sun, Globe, LogOut, FileText, Layers, ChevronDown, Timer,
  ListChecks, Sparkles,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCan, type Permission } from '../lib/permissions';
import type { TranslationKey } from '../lib/i18n';
import { Logo } from './Logo';

interface NavItem {
  to: string;
  icon: ReactNode;
  labelKey: TranslationKey;
  permission?: Permission;
  group?: string;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, labelKey: 'dashboard', permission: 'dashboard.view', group: 'main' },
  { to: '/pos', icon: <ShoppingCart className="w-5 h-5" />, labelKey: 'pos', permission: 'pos.sell', group: 'main' },
  { to: '/products', icon: <Package className="w-5 h-5" />, labelKey: 'products', permission: 'products.view', group: 'catalog' },
  { to: '/categories', icon: <Tags className="w-5 h-5" />, labelKey: 'categories', permission: 'categories.view', group: 'catalog' },
  { to: '/components', icon: <Layers className="w-5 h-5" />, labelKey: 'components', permission: 'components.view', group: 'catalog' },
  { to: '/inventory', icon: <Boxes className="w-5 h-5" />, labelKey: 'inventory', permission: 'inventory.view', group: 'operations' },
  { to: '/warehouses', icon: <Warehouse className="w-5 h-5" />, labelKey: 'warehouses', permission: 'warehouses.view', group: 'operations' },
  { to: '/branches', icon: <Store className="w-5 h-5" />, labelKey: 'branches', permission: 'branches.manage', group: 'operations' },
  { to: '/purchases', icon: <Truck className="w-5 h-5" />, labelKey: 'purchases', permission: 'purchases.view', group: 'operations' },
  { to: '/customers', icon: <Users className="w-5 h-5" />, labelKey: 'customers', permission: 'customers.view', group: 'people' },
  { to: '/suppliers', icon: <Building2 className="w-5 h-5" />, labelKey: 'suppliers', permission: 'suppliers.view', group: 'people' },
  { to: '/expenses', icon: <Receipt className="w-5 h-5" />, labelKey: 'expenses', permission: 'expenses.view', group: 'finance' },
  { to: '/sales', icon: <FileText className="w-5 h-5" />, labelKey: 'salesInvoices', permission: 'sales.view', group: 'finance' },
  { to: '/shifts', icon: <Timer className="w-5 h-5" />, labelKey: 'shifts', permission: 'shifts.view', group: 'finance' },
  { to: '/reports', icon: <BarChart3 className="w-5 h-5" />, labelKey: 'reports', permission: 'reports.view', group: 'finance' },
  { to: '/users', icon: <UserCog className="w-5 h-5" />, labelKey: 'users', permission: 'users.view', group: 'admin' },
  { to: '/branch-products', icon: <ListChecks className="w-5 h-5" />, labelKey: 'branchProducts', permission: 'products.assign', group: 'admin' },
  { to: '/audit-log', icon: <ScrollText className="w-5 h-5" />, labelKey: 'auditLog', permission: 'audit.view', group: 'admin' },
  { to: '/settings', icon: <Settings className="w-5 h-5" />, labelKey: 'settings', permission: 'settings.manage', group: 'admin' },
];

const groupLabels: Record<string, { ar: string; en: string }> = {
  main: { ar: 'الرئيسية', en: 'Main' },
  catalog: { ar: 'الكتالوج', en: 'Catalog' },
  operations: { ar: 'العمليات', en: 'Operations' },
  people: { ar: 'الأطراف', en: 'People' },
  finance: { ar: 'المالية', en: 'Finance' },
  admin: { ar: 'الإدارة', en: 'Admin' },
};

export function Layout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const can = useCan();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const isAr = lang === 'ar';

  const visibleNavItems = navItems.filter((item) => !item.permission || can(item.permission));
  const currentTitle = visibleNavItems.find((n) => n.to === location.pathname)?.labelKey || 'dashboard';

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const grouped = visibleNavItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const g = item.group || 'main';
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} z-40 h-full w-64 bg-navy-900 dark:bg-navy-950 ${lang === 'ar' ? 'border-l' : 'border-r'} border-navy-800/60 shadow-xl shadow-navy-950/20 transform transition-transform duration-300 ${
          sidebarOpen
            ? 'translate-x-0'
            : lang === 'ar'
              ? 'translate-x-full'
              : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-navy-800/60">
          <Logo variant="horizontal" size={30} tone="white" showTagline={false} />
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 p-3 overflow-y-auto h-[calc(100vh-4rem)]">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-1">
              <button
                onClick={() => toggleGroup(group)}
                className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-bold text-navy-300/70 uppercase tracking-wider hover:text-gold-300 transition-colors"
              >
                <span>{isAr ? groupLabels[group]?.ar : groupLabels[group]?.en}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedGroups[group] ? '-rotate-90' : ''}`} />
              </button>
              {!collapsedGroups[group] && items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-600/30'
                        : 'text-slate-300/80 hover:bg-navy-800/80 hover:text-white'
                    }`
                  }
                >
                  {item.icon}
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              ))}
            </div>
          ))}

          {/* AI Assistant teaser */}
          <div className="mt-auto pt-3">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-navy-800/60 border border-gold-500/20">
              <div className="w-8 h-8 rounded-lg bg-gold-500/15 text-gold-300 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="text-white font-semibold">{isAr ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}</p>
                <p className="text-slate-400">{isAr ? 'قريباً' : 'Coming soon'}</p>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className={`${lang === 'ar' ? 'lg:mr-64' : 'lg:ml-64'}`}>
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-navy-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-navy-800/60 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white hidden sm:block">{t(currentTitle)}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* POS Quick Access */}
            {can('pos.sell') && (
              <button
                onClick={() => navigate('/pos')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-navy-900 to-navy-800 dark:from-brand-600 dark:to-brand-500 hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-navy-900/25 ring-1 ring-gold-500/30 transition-all active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">{t('pos')}</span>
              </button>
            )}

            <div className="w-px h-7 bg-slate-200 dark:bg-navy-700 mx-1" />

            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              title={lang === 'ar' ? 'English' : 'العربية'}
            >
              <Globe className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              title={theme === 'light' ? t('darkMode') : t('lightMode')}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <div className="h-8 w-px bg-slate-200 dark:bg-navy-700 mx-1" />

            <div className="flex items-center gap-2.5">
              <div className="text-end hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">{user?.full_name || user?.email}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{user?.role}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-navy-700 to-navy-900 ring-1 ring-gold-500/40 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {(user?.full_name || user?.email || '?')[0].toUpperCase()}
              </div>
            </div>

            <button
              onClick={signOut}
              className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
              title={t('logout')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
