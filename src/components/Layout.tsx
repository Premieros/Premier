import { type ReactNode, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowLeftRight, BarChart3, Boxes, BookOpenText, Building2, ChefHat,
  ChevronDown, CreditCard, Factory, FileSpreadsheet, FileText, FlaskConical,
  Globe, HandCoins, Landmark, Layers, LayoutDashboard, LogOut, Menu, Moon, NotebookPen,
  Package, Receipt, Scale, ScrollText, Settings, ShoppingCart, Sparkles, Store, Sun,
  Tags, Timer, Truck, UserCog, Users, Wallet, Warehouse, X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCan } from '../lib/permissions';
import { useBranchFilter } from '../lib/useBranchFilter';
import { useActiveOrders } from '../features/pos/hooks/useActiveOrders';
import { Logo } from './Logo';
import { APP_ROUTES } from '@/core/navigation/routes';
import { MENU_GROUPS, MENU_ITEMS, type MenuIcon, type MenuGroup } from '@/core/navigation/menu.config';

const ICONS: Record<MenuIcon, ReactNode> = {
  dashboard: <LayoutDashboard className="h-5 w-5" />,
  subscription: <CreditCard className="h-5 w-5" />,
  pos: <ShoppingCart className="h-5 w-5" />,
  products: <Package className="h-5 w-5" />,
  categories: <Tags className="h-5 w-5" />,
  components: <Layers className="h-5 w-5" />,
  rawMaterials: <FlaskConical className="h-5 w-5" />,
  recipes: <ChefHat className="h-5 w-5" />,
  inventory: <Boxes className="h-5 w-5" />,
  warehouses: <Warehouse className="h-5 w-5" />,
  production: <Factory className="h-5 w-5" />,
  transfers: <ArrowLeftRight className="h-5 w-5" />,
  inventoryLedger: <BookOpenText className="h-5 w-5" />,
  branches: <Store className="h-5 w-5" />,
  purchases: <Truck className="h-5 w-5" />,
  customers: <Users className="h-5 w-5" />,
  suppliers: <Building2 className="h-5 w-5" />,
  expenses: <Receipt className="h-5 w-5" />,
  accounts: <Landmark className="h-5 w-5" />,
  payments: <HandCoins className="h-5 w-5" />,
  journal: <NotebookPen className="h-5 w-5" />,
  treasury: <Wallet className="h-5 w-5" />,
  reconciliation: <Scale className="h-5 w-5" />,
  financialReports: <FileSpreadsheet className="h-5 w-5" />,
  sales: <FileText className="h-5 w-5" />,
  shifts: <Timer className="h-5 w-5" />,
  reports: <BarChart3 className="h-5 w-5" />,
  users: <UserCog className="h-5 w-5" />,
  subscriptionsAdmin: <CreditCard className="h-5 w-5" />,
  auditLog: <ScrollText className="h-5 w-5" />,
  settings: <Settings className="h-5 w-5" />,
};

const TOP_TABS = [
  { key: 'general', label: ['عام', 'General'], route: APP_ROUTES.dashboard },
  { key: 'branches', label: ['الفروع', 'Branches'], route: APP_ROUTES.branches },
  { key: 'inventory', label: ['المخزون', 'Inventory'], route: APP_ROUTES.inventory },
  { key: 'kitchen', label: ['المطبخ', 'Kitchen'], route: APP_ROUTES.pos },
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const can = useCan();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const ar = lang === 'ar';
  const branchFilter = useBranchFilter();
  const { counts } = useActiveOrders(branchFilter || user?.branch_id || '');

  const visibleItems = useMemo(
    () => MENU_ITEMS.filter((item) => (!item.permission || can(item.permission)) && (!item.superAdminOnly || user?.role === 'super_admin')),
    [can, user?.role],
  );
  const grouped = useMemo(() => visibleItems.reduce<Record<MenuGroup, typeof visibleItems>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {} as Record<MenuGroup, typeof visibleItems>), [visibleItems]);

  const activeTop = location.pathname === APP_ROUTES.dashboard
    ? 'general'
    : location.pathname.startsWith(APP_ROUTES.branches)
      ? 'branches'
      : location.pathname.startsWith(APP_ROUTES.inventory) || location.pathname.startsWith(APP_ROUTES.warehouses)
        ? 'inventory'
        : location.pathname.startsWith(APP_ROUTES.pos)
          ? 'kitchen'
          : '';

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-[#fafafa] text-[#24243a] dark:bg-navy-950 dark:text-slate-100" data-testid="app-shell">
      <aside data-testid="app-sidebar" className={`fixed inset-y-0 ${ar ? 'right-0' : 'left-0'} z-50 w-[252px] bg-white shadow-[0_0_28px_rgba(27,20,72,0.06)] transition-transform dark:bg-navy-950 ${mobileOpen ? 'translate-x-0' : ar ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5 dark:border-navy-800">
          <Logo variant="horizontal" size={30} tone="mono" showTagline={false} className="text-[#5728d6]" />
          <button data-testid="sidebar-close" type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-500 lg:hidden" aria-label={ar ? 'إغلاق القائمة' : 'Close sidebar'}><X className="h-5 w-5" /></button>
        </div>
        <nav data-testid="app-navigation" className="h-[calc(100%-76px)] overflow-y-auto px-3 py-5">
          {(Object.keys(MENU_GROUPS) as MenuGroup[]).map((group) => {
            const items = grouped[group] ?? [];
            if (!items.length) return null;
            return (
              <section key={group} data-testid={`nav-group-${group}`} className="mb-2">
                <button data-testid={`nav-group-toggle-${group}`} type="button" onClick={() => setCollapsed((v) => ({ ...v, [group]: !v[group] }))} className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <span>{MENU_GROUPS[group][ar ? 'ar' : 'en']}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${collapsed[group] ? 'rotate-90' : ''}`} />
                </button>
                {!collapsed[group] && items.map((item) => (
                  <NavLink data-testid={`nav-item-${item.id}`} key={item.id} to={item.route} onClick={() => setMobileOpen(false)} className={({ isActive }) => `group flex min-h-[44px] items-center gap-3 rounded-xl px-4 text-[14px] font-semibold transition ${isActive ? 'bg-gradient-to-r from-[#5c2bd7] to-[#6b34e5] text-white shadow-[0_8px_20px_rgba(91,43,216,0.22)]' : 'text-[#3f3f55] hover:bg-[#f7f5ff] hover:text-[#5728d6] dark:text-slate-300 dark:hover:bg-navy-800'}`}>
                    {ICONS[item.icon]}<span className="flex-1">{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </section>
            );
          })}
          <div data-testid="assistant-card" className="mt-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-navy-800 dark:bg-navy-900">
            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#faf8ff] text-[#6b35df]"><Sparkles className="h-4 w-4" /></div><div><p className="text-xs font-bold">{ar ? 'مساعد Premier' : 'Premier Assistant'}</p><p className="text-[10px] text-slate-400">{ar ? 'قريباً' : 'Coming soon'}</p></div></div>
          </div>
        </nav>
      </aside>
      {mobileOpen && <button data-testid="mobile-sidebar-backdrop" type="button" className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-label={ar ? 'إغلاق' : 'Close'} />}
      <div className={`${ar ? 'lg:mr-[252px]' : 'lg:ml-[252px]'} min-h-screen`}>
        <header data-testid="app-header" className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-100 bg-white px-4 shadow-sm dark:border-navy-800 dark:bg-navy-950 sm:px-7">
          <div className="flex min-w-0 items-center gap-4"><button data-testid="sidebar-open" type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-600 lg:hidden" aria-label={ar ? 'فتح القائمة' : 'Open sidebar'}><Menu className="h-5 w-5" /></button><div className="hidden h-8 w-px bg-slate-200 lg:block" /><div data-testid="top-navigation" className="flex min-w-0 items-center gap-6 overflow-x-auto">{TOP_TABS.map((tab) => { const allowed = tab.key === 'general' || tab.key === 'kitchen' ? true : tab.key === 'branches' ? can('branches.manage') : can('inventory.view'); if (!allowed) return null; return <NavLink data-testid={`top-tab-${tab.key}`} key={tab.key} to={tab.route} className={`relative whitespace-nowrap px-1 py-7 text-sm font-semibold ${activeTop === tab.key ? 'text-[#5728d6]' : 'text-slate-600 dark:text-slate-300'}`}>{tab.label[ar ? 0 : 1]}{tab.key === 'kitchen' && <span className="ms-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] text-white">{ar ? 'جديد' : 'New'}</span>}{activeTop === tab.key && <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#5b2bd8]" />}</NavLink>; })}</div></div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button data-testid="active-orders-button" type="button" onClick={() => navigate('/floor-plan')} className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-50 dark:text-slate-300" aria-label={ar ? 'الطلبات النشطة' : 'Active orders'}><Activity className="h-5 w-5" />{counts.active > 0 && <span data-testid="active-orders-count" className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{counts.active}</span>}</button>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <button data-testid="user-menu-button" type="button" onClick={() => navigate(APP_ROUTES.settings)} className="flex items-center gap-3"><div className="hidden text-end sm:block"><p className="text-sm font-bold">{user?.full_name || user?.email || (ar ? 'مدير النظام' : 'System Admin')}</p><p className="text-[11px] text-slate-400">{user?.role || 'admin'}</p></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-bold text-slate-600">{(user?.full_name || user?.email || 'A').slice(0, 1).toUpperCase()}</div></button>
            <button data-testid="language-toggle" type="button" onClick={() => setLang(ar ? 'en' : 'ar')} className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold sm:flex dark:border-navy-700"><Globe className="h-4 w-4" />{ar ? 'العربية' : 'English'}</button>
            <button data-testid="theme-toggle" type="button" onClick={toggleTheme} className="rounded-xl p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-navy-800" aria-label={ar ? 'تغيير المظهر' : 'Toggle theme'}>{theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}</button>
            <button data-testid="sign-out-button" type="button" onClick={signOut} className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={ar ? 'تسجيل الخروج' : 'Sign out'}><LogOut className="h-5 w-5" /></button>
          </div>
        </header>
        <main data-testid="app-main" className="min-h-[calc(100vh-76px)] bg-[#fafafa] p-4 sm:p-6 lg:p-7 dark:bg-navy-950">{children}</main>
      </div>
    </div>
  );
}
