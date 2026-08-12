import { type ReactNode, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Tags, Boxes, Warehouse, Store, Truck, Users, Building2, Receipt, BarChart3, UserCog, Settings, ScrollText, Menu, X, Moon, Sun, Globe, LogOut, FileText, Layers, ChevronDown, Timer, Sparkles, FlaskConical, ChefHat, Factory, ArrowLeftRight, BookOpenText, Landmark, HandCoins, NotebookPen, FileSpreadsheet, Wallet, Scale, Activity, CreditCard } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCan, type Permission } from '../lib/permissions';
import { useBranchFilter } from '../lib/useBranchFilter';
import { useActiveOrders } from '../features/pos/hooks/useActiveOrders';
import type { TranslationKey } from '../lib/i18n';
import { Logo } from './Logo';

type NavItem = { to: string; icon: ReactNode; labelKey: TranslationKey; permission?: Permission; group: string };

const navItems: NavItem[] = [
  { to:'/dashboard',icon:<LayoutDashboard className="h-5 w-5"/>,labelKey:'dashboard',permission:'dashboard.view',group:'main' },
  { to:'/subscription',icon:<CreditCard className="h-5 w-5"/>,labelKey:'mySubscription',group:'main' },
  { to:'/pos',icon:<ShoppingCart className="h-5 w-5"/>,labelKey:'pos',permission:'pos.sell',group:'main' },
  { to:'/products',icon:<Package className="h-5 w-5"/>,labelKey:'products',permission:'products.view',group:'catalog' },
  { to:'/categories',icon:<Tags className="h-5 w-5"/>,labelKey:'categories',permission:'categories.view',group:'catalog' },
  { to:'/components',icon:<Layers className="h-5 w-5"/>,labelKey:'components',permission:'components.view',group:'catalog' },
  { to:'/raw-materials',icon:<FlaskConical className="h-5 w-5"/>,labelKey:'rawMaterials',permission:'raw_materials.view',group:'catalog' },
  { to:'/recipes',icon:<ChefHat className="h-5 w-5"/>,labelKey:'recipes',permission:'recipes.view',group:'catalog' },
  { to:'/inventory',icon:<Boxes className="h-5 w-5"/>,labelKey:'inventory',permission:'inventory.view',group:'operations' },
  { to:'/warehouses',icon:<Warehouse className="h-5 w-5"/>,labelKey:'warehouses',permission:'warehouses.view',group:'operations' },
  { to:'/production',icon:<Factory className="h-5 w-5"/>,labelKey:'productionOrders',permission:'production.view',group:'operations' },
  { to:'/transfers',icon:<ArrowLeftRight className="h-5 w-5"/>,labelKey:'warehouseTransfers',permission:'inventory.transfers',group:'operations' },
  { to:'/inventory-ledger',icon:<BookOpenText className="h-5 w-5"/>,labelKey:'inventoryLedger',permission:'inventory.ledger.view',group:'operations' },
  { to:'/branches',icon:<Store className="h-5 w-5"/>,labelKey:'branches',permission:'branches.manage',group:'operations' },
  { to:'/purchases',icon:<Truck className="h-5 w-5"/>,labelKey:'purchases',permission:'purchases.view',group:'operations' },
  { to:'/customers',icon:<Users className="h-5 w-5"/>,labelKey:'customers',permission:'customers.view',group:'people' },
  { to:'/suppliers',icon:<Building2 className="h-5 w-5"/>,labelKey:'suppliers',permission:'suppliers.view',group:'people' },
  { to:'/expenses',icon:<Receipt className="h-5 w-5"/>,labelKey:'expenses',permission:'expenses.view',group:'finance' },
  { to:'/accounts',icon:<Landmark className="h-5 w-5"/>,labelKey:'chartOfAccounts',permission:'accounts.view',group:'finance' },
  { to:'/payments',icon:<HandCoins className="h-5 w-5"/>,labelKey:'receivePayment',permission:'accounts.view',group:'finance' },
  { to:'/journal',icon:<NotebookPen className="h-5 w-5"/>,labelKey:'journalEntries',permission:'accounts.view',group:'finance' },
  { to:'/treasury',icon:<Wallet className="h-5 w-5"/>,labelKey:'treasury',permission:'accounts.view',group:'finance' },
  { to:'/reconciliation',icon:<Scale className="h-5 w-5"/>,labelKey:'bankReconciliation',permission:'accounts.view',group:'finance' },
  { to:'/financial-reports',icon:<FileSpreadsheet className="h-5 w-5"/>,labelKey:'financialReports',permission:'reports.financial',group:'finance' },
  { to:'/sales',icon:<FileText className="h-5 w-5"/>,labelKey:'salesInvoices',permission:'sales.view',group:'finance' },
  { to:'/shifts',icon:<Timer className="h-5 w-5"/>,labelKey:'shifts',permission:'shifts.view',group:'finance' },
  { to:'/reports',icon:<BarChart3 className="h-5 w-5"/>,labelKey:'reports',permission:'reports.view',group:'finance' },
  { to:'/users',icon:<UserCog className="h-5 w-5"/>,labelKey:'users',permission:'users.view',group:'admin' },
  { to:'/subscriptions',icon:<CreditCard className="h-5 w-5"/>,labelKey:'subscriptionsAdmin',permission:'settings.manage',group:'admin' },
  { to:'/audit-log',icon:<ScrollText className="h-5 w-5"/>,labelKey:'auditLog',permission:'audit.view',group:'admin' },
  { to:'/settings',icon:<Settings className="h-5 w-5"/>,labelKey:'settings',permission:'settings.manage',group:'admin' },
];

const groups: Record<string,[string,string]> = { main:['الرئيسية','Main'],catalog:['الكتالوج','Catalog'],operations:['العمليات','Operations'],people:['الأطراف','People'],finance:['المالية','Finance'],admin:['الإدارة','Admin'] };

export function Layout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const can = useCan();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen,setMobileOpen]=useState(false);
  const [collapsed,setCollapsed]=useState<Record<string,boolean>>({});
  const ar=lang==='ar';
  const branchFilter=useBranchFilter();
  const { counts }=useActiveOrders(branchFilter||user?.branch_id||'');
  const visible=navItems.filter(item=>!item.permission||can(item.permission)).filter(item=>item.to!=='/subscriptions'||user?.role==='super_admin');
  const grouped=visible.reduce<Record<string,NavItem[]>>((acc,item)=>{(acc[item.group]??=[]).push(item);return acc},{});
  const title=visible.find(item=>item.to===location.pathname)?.labelKey||'dashboard';
  const topTabs=[
    {key:'general',label:ar?'عام':'General',to:'/dashboard',show:true},
    {key:'branches',label:ar?'الفروع':'Branches',to:'/branches',show:can('branches.manage')},
    {key:'inventory',label:ar?'المخزون':'Inventory',to:'/inventory',show:can('inventory.view')},
    {key:'kitchen',label:ar?'المطبخ':'Kitchen',to:'/pos',show:can('pos.sell')},
  ];
  const activeTop=location.pathname==='/dashboard'?'general':location.pathname.startsWith('/branches')?'branches':location.pathname.startsWith('/inventory')||location.pathname.startsWith('/warehouses')?'inventory':location.pathname.startsWith('/pos')?'kitchen':'';

  return <div dir={ar?'rtl':'ltr'} className="min-h-screen bg-[#fafafa] text-[#24243a] dark:bg-navy-950 dark:text-slate-100">
    <aside className={`fixed inset-y-0 ${ar?'right-0':'left-0'} z-50 w-[252px] bg-white shadow-[0_0_28px_rgba(27,20,72,0.06)] transition-transform dark:bg-navy-950 ${mobileOpen?'translate-x-0':ar?'translate-x-full':'-translate-x-full'} lg:translate-x-0`}>
      <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5 dark:border-navy-800"><Logo variant="horizontal" size={30} tone="mono" showTagline={false} className="text-[#5728d6]"/><button onClick={()=>setMobileOpen(false)} className="rounded-lg p-2 text-slate-500 lg:hidden" aria-label={ar?'إغلاق القائمة':'Close sidebar'}><X className="h-5 w-5"/></button></div>
      <nav className="h-[calc(100%-76px)] overflow-y-auto px-3 py-5">
        {Object.entries(grouped).map(([group,items])=><section key={group} className="mb-2"><button onClick={()=>setCollapsed(v=>({...v,[group]:!v[group]}))} className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400"><span>{groups[group]?.[ar?0:1]}</span><ChevronDown className={`h-4 w-4 transition-transform ${collapsed[group]?'rotate-90':''}`}/></button>{!collapsed[group]&&items.map(item=><NavLink key={item.to} to={item.to} onClick={()=>setMobileOpen(false)} className={({isActive})=>`group flex min-h-[44px] items-center gap-3 rounded-xl px-4 text-[14px] font-semibold transition ${isActive?'bg-gradient-to-r from-[#5c2bd7] to-[#6b34e5] text-white shadow-[0_8px_20px_rgba(91,43,216,0.22)]':'text-[#3f3f55] hover:bg-[#f7f5ff] hover:text-[#5728d6] dark:text-slate-300 dark:hover:bg-navy-800'}`}>{item.icon}<span className="flex-1">{t(item.labelKey)}</span></NavLink>)}</section>)}
        <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-navy-800 dark:bg-navy-900"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#faf8ff] text-[#6b35df]"><Sparkles className="h-4 w-4"/></div><div><p className="text-xs font-bold">{ar?'مساعد Premier':'Premier Assistant'}</p><p className="text-[10px] text-slate-400">{ar?'قريباً':'Coming soon'}</p></div></div></div>
      </nav>
    </aside>
    {mobileOpen&&<button className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={()=>setMobileOpen(false)} aria-label={ar?'إغلاق':'Close'}/>} 
    <div className={`${ar?'lg:mr-[252px]':'lg:ml-[252px]'} min-h-screen`}>
      <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-100 bg-white px-4 shadow-sm dark:border-navy-800 dark:bg-navy-950 sm:px-7"><div className="flex min-w-0 items-center gap-4"><button onClick={()=>setMobileOpen(true)} className="rounded-lg p-2 text-slate-600 lg:hidden"><Menu className="h-5 w-5"/></button><div className="hidden h-8 w-px bg-slate-200 lg:block"/><div className="flex min-w-0 items-center gap-6 overflow-x-auto">{topTabs.filter(t=>t.show).map(tab=><NavLink key={tab.key} to={tab.to} className={`relative whitespace-nowrap px-1 py-7 text-sm font-semibold ${activeTop===tab.key?'text-[#5728d6]':'text-slate-600 dark:text-slate-300'}`}>{tab.label}{tab.key==='kitchen'&&<span className="ms-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] text-white">{ar?'جديد':'New'}</span>}{activeTop===tab.key&&<span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#5b2bd8]"/>}</NavLink>)}</div></div><div className="flex items-center gap-2 sm:gap-4"><button onClick={()=>navigate('/floor-plan')} className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-50 dark:text-slate-300" aria-label={ar?'الطلبات النشطة':'Active orders'}><Activity className="h-5 w-5"/>{counts.active>0&&<span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{counts.active}</span>}</button><div className="hidden h-8 w-px bg-slate-200 sm:block"/><button onClick={()=>navigate('/settings')} className="flex items-center gap-3"><div className="hidden text-end sm:block"><p className="text-sm font-bold">{user?.full_name||user?.email|| (ar?'مدير النظام':'System Admin')}</p><p className="text-[11px] text-slate-400">{user?.role||'admin'}</p></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-bold text-slate-600">{(user?.full_name||user?.email||'A').slice(0,1).toUpperCase()}</div></button><button onClick={()=>setLang(ar?'en':'ar')} className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold sm:flex dark:border-navy-700"><Globe className="h-4 w-4"/>{ar?'العربية':'English'}</button><button onClick={toggleTheme} className="rounded-xl p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-navy-800" aria-label={ar?'تغيير المظهر':'Toggle theme'}>{theme==='light'?<Moon className="h-5 w-5"/>:<Sun className="h-5 w-5"/>}</button><button onClick={signOut} className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={ar?'تسجيل الخروج':'Sign out'}><LogOut className="h-5 w-5"/></button></div></header>
      <main className="min-h-[calc(100vh-76px)] bg-[#fafafa] p-4 sm:p-6 lg:p-7 dark:bg-navy-950">{children}</main>
    </div>
  </div>;
}
