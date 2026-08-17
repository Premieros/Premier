import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowLeftRight, BarChart3, BadgeDollarSign, Boxes, BookOpenText, Building2, Calculator, ChefHat,
  ChevronDown, ClipboardCheck, CreditCard, Factory, FileSpreadsheet, FileText, FlaskConical,
  Globe, HandCoins, Landmark, Layers, LayoutDashboard, LogOut, Menu, Moon, NotebookPen,
  Package, Receipt, Scale, ScrollText, Settings, ShoppingCart, Sparkles, Store, Sun,
  Tags, Timer, Trash2, Truck, UserCog, Users, Wallet, Warehouse, X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCan, isAdminRole } from '../lib/permissions';
import { useBranchFilter } from '../lib/useBranchFilter';
import { useActiveBranchId } from '../lib/activeBranch';
import { useBranches } from '@/hooks/useBranches';
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
  stockCounts: <ClipboardCheck className="h-5 w-5" />,
  inventoryBatches: <Layers className="h-5 w-5" />,
  stockValuation: <BadgeDollarSign className="h-5 w-5" />,
  lowStockAlerts: <AlertTriangle className="h-5 w-5" />,
  inventoryUnits: <Package className="h-5 w-5" />,
  wasteCenter: <Trash2 className="h-5 w-5" />,
  kitchenDisplay: <ChefHat className="h-5 w-5" />,
  costingCenter: <Calculator className="h-5 w-5" />,
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

  const isAdmin = isAdminRole(user?.role);
  const { branches } = useBranches();
  const [activeBranchId, setActiveBranchId] = useActiveBranchId();
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const branchMenuRef = useRef<HTMLDivElement>(null);
  const effectiveBranch = isAdmin ? activeBranchId : branchFilter ?? null;
  const activeBranch = branches.find((b) => b.id === effectiveBranch) ?? null;
  const branchLabel = activeBranch
    ? (lang === 'ar' ? activeBranch.name : activeBranch.name_en || activeBranch.name)
    : (ar ? 'كل الفروع' : 'All branches');

  useEffect(() => {
    if (!branchMenuOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (branchMenuRef.current && !branchMenuRef.current.contains(e.target as Node)) {
        setBranchMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [branchMenuOpen]);

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
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-ui-page text-ui-text" data-testid="app-shell">
      <aside data-testid="app-sidebar" className={`fixed inset-y-0 ${ar ? 'right-0' : 'left-0'} z-50 w-[252px] bg-ui-surface border-e border-ui-border shadow-ui-md transition-transform ${mobileOpen ? 'translate-x-0' : ar ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex h-[76px] items-center justify-between border-b border-ui-border px-5">
          <Logo variant="horizontal" size={30} tone="mono" showTagline={false} className="text-ui-primary" />
          <button data-testid="sidebar-close" type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-ui-muted lg:hidden" aria-label={ar ? 'إغلاق القائمة' : 'Close sidebar'}><X className="h-5 w-5" /></button>
        </div>
        <nav data-testid="app-navigation" className="h-[calc(100%-76px)] overflow-y-auto px-3 py-5">
          {(Object.keys(MENU_GROUPS) as MenuGroup[]).map((group) => {
            const items = grouped[group] ?? [];
            if (!items.length) return null;
            return (
              <section key={group} data-testid={`nav-group-${group}`} className="mb-2">
                <button data-testid={`nav-group-toggle-${group}`} type="button" onClick={() => setCollapsed((v) => ({ ...v, [group]: !v[group] }))} className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-ui-subtle">
                  <span>{MENU_GROUPS[group][ar ? 'ar' : 'en']}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${collapsed[group] ? 'rotate-90' : ''}`} />
                </button>
                {!collapsed[group] && items.map((item) => (
                  <NavLink data-testid={`nav-item-${item.id}`} key={item.id} to={item.route} onClick={() => setMobileOpen(false)} className={({ isActive }) => `group flex min-h-[44px] items-center gap-3 rounded-xl px-4 text-[14px] font-semibold transition ${isActive ? 'bg-gradient-to-r from-[#5c2bd7] to-[#6b34e5] text-white shadow-[0_8px_20px_rgba(91,43,216,0.22)]' : 'text-ui-muted hover:bg-ui-primary-soft hover:text-ui-primary'}`}>
                    {ICONS[item.icon]}<span className="flex-1">{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </section>
            );
          })}
          <div data-testid="assistant-card" className="mt-4 rounded-xl border border-ui-border bg-ui-surface p-4 shadow-ui-sm">
            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-ui-primary-soft text-ui-primary"><Sparkles className="h-4 w-4" /></div><div><p className="text-xs font-bold">{ar ? 'مساعد Premier' : 'Premier Assistant'}</p><p className="text-[10px] text-ui-subtle">{ar ? 'قريباً' : 'Coming soon'}</p></div></div>
          </div>
        </nav>
      </aside>
      {mobileOpen && <button data-testid="mobile-sidebar-backdrop" type="button" className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-label={ar ? 'إغلاق' : 'Close'} />}
      <div className={`${ar ? 'lg:mr-[252px]' : 'lg:ml-[252px]'} min-h-screen`}>
        <header data-testid="app-header" className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-3 border-b border-ui-border bg-ui-surface px-4 shadow-ui-sm sm:px-7">
          <div className="flex min-w-0 items-center gap-4"><button data-testid="sidebar-open" type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-ui-muted lg:hidden" aria-label={ar ? 'فتح القائمة' : 'Open sidebar'}><Menu className="h-5 w-5" /></button><div className="hidden h-8 w-px bg-ui-border lg:block" /><div data-testid="top-navigation" className="flex min-w-0 items-center gap-6 overflow-x-auto">{TOP_TABS.map((tab) => { const allowed = tab.key === 'general' || tab.key === 'kitchen' ? true : tab.key === 'branches' ? can('branches.manage') : can('inventory.view'); if (!allowed) return null; return <NavLink data-testid={`top-tab-${tab.key}`} key={tab.key} to={tab.route} className={`relative whitespace-nowrap px-1 py-7 text-sm font-semibold ${activeTop === tab.key ? 'text-ui-primary' : 'text-ui-muted'}`}>{tab.label[ar ? 0 : 1]}{tab.key === 'kitchen' && <span className="ms-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] text-white">{ar ? 'جديد' : 'New'}</span>}{activeTop === tab.key && <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-ui-primary" />}</NavLink>; })}</div></div>
          <div className="relative flex items-center gap-2 sm:gap-4" ref={branchMenuRef}>
            <div className="relative">
              <button
                data-testid="branch-indicator"
                type="button"
                onClick={isAdmin ? () => setBranchMenuOpen((v) => !v) : undefined}
                aria-expanded={isAdmin ? branchMenuOpen : undefined}
                aria-label={ar ? 'الفرع النشط' : 'Active branch'}
                className={`flex items-center gap-2 rounded-xl border border-ui-border bg-ui-surface px-3 py-2 text-xs font-semibold text-ui-text ${isAdmin ? 'hover:bg-ui-page-alt' : 'cursor-default'}`}
              >
                <Building2 className="h-4 w-4 shrink-0 text-ui-primary" />
                <span className="max-w-[140px] truncate">{branchLabel}</span>
                {isAdmin && <ChevronDown className={`h-4 w-4 shrink-0 text-ui-muted transition-transform ${branchMenuOpen ? 'rotate-180' : ''}`} />}
              </button>
              {isAdmin && branchMenuOpen && (
                <div data-testid="branch-menu" className="absolute end-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-ui-border bg-ui-surface py-1 shadow-ui-lg">
                  <button data-testid="branch-option-all" type="button" onClick={() => { setActiveBranchId(null); setBranchMenuOpen(false); }} className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${effectiveBranch === null ? 'bg-ui-primary-soft font-bold text-ui-primary' : 'text-ui-muted hover:bg-ui-page-alt'}`}>
                    {ar ? 'كل الفروع' : 'All branches'}
                  </button>
                  {branches.map((b) => (
                    <button key={b.id} data-testid={`branch-option-${b.id}`} type="button" onClick={() => { setActiveBranchId(b.id); setBranchMenuOpen(false); }} className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${effectiveBranch === b.id ? 'bg-ui-primary-soft font-bold text-ui-primary' : 'text-ui-muted hover:bg-ui-page-alt'}`}>
                      <span className="truncate">{lang === 'ar' ? b.name : (b.name_en || b.name)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button data-testid="active-orders-button" type="button" onClick={() => navigate('/floor-plan')} className="relative rounded-xl p-2 text-ui-muted hover:bg-ui-page-alt" aria-label={ar ? 'الطلبات النشطة' : 'Active orders'}><Activity className="h-5 w-5" />{counts.active > 0 && <span data-testid="active-orders-count" className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{counts.active}</span>}</button>
            <div className="hidden h-8 w-px bg-ui-border sm:block" />
            <button data-testid="user-menu-button" type="button" onClick={() => navigate(APP_ROUTES.settings)} className="flex items-center gap-3"><div className="hidden text-end sm:block"><p className="text-sm font-bold">{user?.full_name || user?.email || (ar ? 'مدير النظام' : 'System Admin')}</p><p className="text-[11px] text-ui-subtle">{user?.role || 'admin'}</p></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-ui-primary-soft to-ui-page-alt text-xs font-bold text-ui-primary">{(user?.full_name || user?.email || 'A').slice(0, 1).toUpperCase()}</div></button>
            <button data-testid="language-toggle" type="button" onClick={() => setLang(ar ? 'en' : 'ar')} className="hidden items-center gap-2 rounded-xl border border-ui-border px-3 py-2 text-xs font-semibold sm:flex"><Globe className="h-4 w-4" />{ar ? 'العربية' : 'English'}</button>
            <button data-testid="theme-toggle" type="button" onClick={toggleTheme} className="rounded-xl p-2 text-ui-muted hover:bg-ui-page-alt" aria-label={ar ? 'تغيير المظهر' : 'Toggle theme'}>{theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}</button>
            <button data-testid="sign-out-button" type="button" onClick={signOut} className="rounded-xl p-2 text-ui-subtle hover:bg-ui-primary-soft hover:text-ui-danger" aria-label={ar ? 'تسجيل الخروج' : 'Sign out'}><LogOut className="h-5 w-5" /></button>
          </div>
        </header>
        <main data-testid="app-main" className="min-h-[calc(100vh-76px)] bg-ui-page p-4 sm:p-6 lg:p-7">
          <div data-testid="design-content-surface" className="min-w-0 w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
