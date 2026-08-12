import { type ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Globe, HelpCircle, Menu, Megaphone, Package, PanelLeft, Settings, ShoppingCart, Users, BarChart3, Boxes, X, LayoutDashboard, Grid2X2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useActiveOrders } from '@/features/pos/hooks/useActiveOrders';
import { useBranchFilter } from '@/lib/useBranchFilter';

interface DashboardChromeProps { children: ReactNode; activeTab?: 'general' | 'branches' | 'inventory' | 'kitchen'; }
type LabelPair = readonly [string, string];
interface SidebarItem { label: LabelPair; icon: typeof LayoutDashboard; to: string; expandable?: boolean; disabledLabel?: LabelPair; }

const sidebarItems: SidebarItem[] = [
  { label: ['لوحة التحكم', 'Dashboard'], icon: LayoutDashboard, to: '/dashboard' },
  { label: ['الطلبات', 'Orders'], icon: ShoppingCart, to: '/reports?reportType=detailed_invoices' },
  { label: ['العملاء', 'Customers'], icon: Users, to: '/customers' },
  { label: ['التقارير', 'Reports'], icon: BarChart3, to: '/reports', expandable: true },
  { label: ['المخزون', 'Inventory'], icon: Boxes, to: '/inventory', expandable: true },
  { label: ['المنيو', 'Menu'], icon: Package, to: '/products', expandable: true },
  { label: ['الإدارة', 'Management'], icon: Settings, to: '/settings', expandable: true },
  { label: ['التسويق', 'Marketing'], icon: Megaphone, to: '/reports', expandable: true, disabledLabel: ['قريبًا', 'Soon'] },
  { label: ['سوق التطبيقات', 'Marketplace'], icon: Grid2X2, to: '/settings/basic' },
];
const topTabs: { key: DashboardChromeProps['activeTab']; label: LabelPair; to: string }[] = [
  { key: 'general', label: ['عام', 'General'], to: '/dashboard' },
  { key: 'branches', label: ['الفروع', 'Branches'], to: '/branches' },
  { key: 'inventory', label: ['المخزون', 'Inventory'], to: '/inventory' },
  { key: 'kitchen', label: ['المطبخ', 'Kitchen'], to: '/pos' },
];

export function DashboardChrome({ children, activeTab = 'general' }: DashboardChromeProps) {
  const { lang, setLang } = useLanguage(); const { user } = useAuth(); const branchFilter = useBranchFilter(); const { counts } = useActiveOrders(branchFilter || user?.branch_id || '');
  const [mobileOpen, setMobileOpen] = useState(false); const [helpOpen, setHelpOpen] = useState(false); const navigate = useNavigate(); const ar = lang === 'ar';
  const label = (pair: LabelPair) => pair[ar ? 0 : 1];
  return <div dir={ar ? 'rtl' : 'ltr'} className="fixed inset-0 z-[45] flex overflow-hidden bg-[#fafafa] text-[#24243a]">
    <aside className={`absolute inset-y-0 ${ar ? 'right-0' : 'left-0'} z-50 w-[252px] bg-white shadow-[0_0_28px_rgba(27,20,72,0.06)] transition-transform lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : ar ? 'translate-x-full' : '-translate-x-full'}`}>
      <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5"><Logo variant="horizontal" size={30} tone="mono" showTagline={false} className="text-[#5728d6]"/><button className="rounded-lg p-2 text-slate-500 lg:hidden" onClick={()=>setMobileOpen(false)} aria-label="Close sidebar"><X className="h-5 w-5"/></button></div>
      <nav className="flex h-[calc(100%-76px)] flex-col px-3 py-8"><div className="space-y-1">{sidebarItems.map(item=>{const Icon=item.icon;const active=item.to==='/dashboard'&&activeTab==='general';return <Link key={item.label[0]} to={item.to} onClick={()=>setMobileOpen(false)} className={`group flex min-h-[46px] items-center gap-4 rounded-xl px-4 text-[15px] font-semibold transition ${active?'bg-gradient-to-r from-[#5c2bd7] to-[#6b34e5] text-white shadow-[0_8px_20px_rgba(91,43,216,0.22)]':'text-[#3f3f55] hover:bg-[#f7f5ff] hover:text-[#5728d6]'}`}><Icon className="h-[21px] w-[21px] shrink-0" strokeWidth={1.8}/><span className="flex-1">{label(item.label)}</span>{item.expandable&&<ChevronDown className="h-4 w-4 text-slate-400"/>}{item.disabledLabel&&<span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] text-white">{label(item.disabledLabel)}</span>}</Link>})}</div>
        <div className="mt-auto space-y-4 pb-3"><div className="rounded-xl border border-slate-100 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e5dcff] bg-[#faf8ff] text-[#6b35df]"><HelpCircle className="h-5 w-5"/></div><div><p className="text-sm font-bold">{ar?'هل تحتاج مساعدة؟':'Need help?'}</p><p className="text-[11px] text-slate-400">{ar?'فريق الدعم متاح 24/7':'Support team available 24/7'}</p></div></div></div><button onClick={()=>setHelpOpen(true)} className="flex items-center gap-3 px-3 text-sm font-semibold text-[#45455a]"><HelpCircle className="h-5 w-5"/>{ar?'مركز المساعدة':'Help Center'}</button></div>
      </nav>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col"><header className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-7"><div className="flex items-center gap-4"><button className="rounded-lg p-2 text-slate-600 lg:hidden" onClick={()=>setMobileOpen(true)} aria-label="Open sidebar"><Menu className="h-5 w-5"/></button><button className="hidden rounded-lg p-2 text-slate-600 lg:block" onClick={()=>setMobileOpen(v=>!v)} aria-label="Toggle sidebar"><PanelLeft className="h-5 w-5"/></button><div className="hidden h-8 w-px bg-slate-200 lg:block"/><div className="flex items-center gap-6 overflow-x-auto">{topTabs.map(tab=><Link key={tab.key} to={tab.to} className={`relative whitespace-nowrap px-1 py-7 text-[14px] font-semibold ${activeTab===tab.key?'text-[#5728d6]':'text-[#414155]'}`}>{label(tab.label)}{tab.key==='kitchen'&&<span className="ms-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] text-white">{ar?'جديد':'New'}</span>}{activeTab===tab.key&&<span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#5b2bd8]"/>}</Link>)}</div></div><div className="flex items-center gap-4"><button onClick={()=>navigate('/floor-plan')} className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-50" aria-label={ar?'الطلبات النشطة':'Active orders'}><Bell className="h-5 w-5"/>{counts.active>0&&<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{counts.active}</span>}</button><div className="h-8 w-px bg-slate-200"/><button className="flex items-center gap-3" onClick={()=>navigate('/settings')}><div className="hidden text-end sm:block"><p className="text-sm font-bold">{ar?'مدير النظام':'System Admin'}</p><p className="text-[11px] text-slate-400">{ar?'مدير':'Admin'}</p></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-bold text-slate-600">{(user?.full_name||user?.email||'A').slice(0,1).toUpperCase()}</div></button><button onClick={()=>setLang(ar?'en':'ar')} className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold sm:flex"><Globe className="h-4 w-4"/>{ar?'العربية':'English'}</button></div></header><main className="min-h-0 flex-1 overflow-y-auto">{children}</main></div>
    {mobileOpen&&<button className="absolute inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={()=>setMobileOpen(false)} aria-label="Close overlay"/>}{helpOpen&&<div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4" onClick={()=>setHelpOpen(false)}><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><h2 className="text-lg font-bold">{ar?'مركز المساعدة':'Help Center'}</h2><p className="mt-2 text-sm text-slate-500">{ar?'يمكنك التواصل مع فريق الدعم من داخل النظام.':'Contact support from inside the system.'}</p><button onClick={()=>setHelpOpen(false)} className="mt-5 w-full rounded-xl bg-[#5b2bd8] py-3 text-sm font-bold text-white">{ar?'إغلاق':'Close'}</button></div></div>}
  </div>;
}
