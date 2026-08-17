import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, Building2, Clock3, CreditCard, Package, RefreshCw, ShoppingCart, Sparkles, Wallet, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { useActiveBranchId } from '@/lib/activeBranch';
import { isAdminRole } from '@/lib/permissions';
import { useSettings } from '@/context/SettingsContext';
import { formatCurrency, formatNumber } from '@/lib/format';

type Sale = { id: string; total: number | null; paid_amount: number | null; payment_method: string | null; order_type: string | null; branch_id: string | null; created_at: string; refunded_amount?: number | null; discount_amount?: number | null; branch?: { name: string | null; name_en: string | null }[] | null };
type Stock = { quantity: number | null; branch_id: string | null; product?: { name: string | null; low_stock_threshold: number | null }[] | null };

type Range = 'today' | 'week' | 'month';
const ranges: Record<Range, [string, string]> = { today: ['اليوم', 'Today'], week: ['7 أيام', '7 days'], month: ['30 يوم', '30 days'] };

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-ui-border bg-ui-surface p-5 shadow-ui ${className}`}>{children}</section>;
}

export function DashboardExecutiveInsights() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const branchFilter = useBranchFilter();
  const { effectiveSettings } = useSettings();
  const [activeBranchId] = useActiveBranchId();
  const ar = lang === 'ar';
  const adminUser = isAdminRole(user?.role);
  const branchId = adminUser ? activeBranchId : branchFilter;
  const settings = effectiveSettings(branchId);
  const money = useCallback((n: number) => formatCurrency(n, settings?.currency || 'EGP', lang), [settings?.currency, lang]);
  const [range, setRange] = useState<Range>('today');
  const [sales, setSales] = useState<Sale[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date(end);
      if (range === 'today') start.setHours(0, 0, 0, 0);
      if (range === 'week') start.setDate(start.getDate() - 6);
      if (range === 'month') start.setDate(start.getDate() - 29);
      let sq = supabase.from('sales').select('id,total,paid_amount,payment_method,order_type,branch_id,created_at,refunded_amount,discount_amount,branch:branches(name,name_en)').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()).order('created_at', { ascending: false }).limit(5000);
      let iq = supabase.from('inventory').select('quantity,branch_id,product:products(name,low_stock_threshold)').limit(5000);
      if (branchId) { sq = sq.eq('branch_id', branchId); iq = iq.eq('branch_id', branchId); }
      const [s, i] = await Promise.all([sq, iq]);
      if (s.error) throw s.error;
      setSales((s.data || []) as unknown as Sale[]);
      setStock((i.data || []) as unknown as Stock[]);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Executive dashboard load failed', error);
      setSales([]); setStock([]);
    } finally { setLoading(false); }
  }, [range, branchId]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const sales = sales.reduce((n, x) => n + Number(x.total || 0), 0);
    const paid = sales.length ? sales : 0;
    const collected = sales.reduce((n, x) => n + Number(x.paid_amount ?? x.total ?? 0), 0);
    const discounts = sales.reduce((n, x) => n + Number(x.discount_amount || 0), 0);
    const returns = sales.reduce((n, x) => n + Number(x.refunded_amount || 0), 0);
    return { sales, collected, discounts, returns, orders: paid, average: paid ? sales / paid : 0 };
  }, [sales]);

  const payments = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => { const key = (s.payment_method || 'other').toLowerCase(); map.set(key, (map.get(key) || 0) + Number(s.paid_amount ?? s.total ?? 0)); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [sales]);

  const orderTypes = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => { const key = s.order_type || 'other'; map.set(key, (map.get(key) || 0) + 1); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [sales]);

  const branches = useMemo(() => {
    const map = new Map<string, { name: string; sales: number; orders: number }>();
    sales.forEach((s) => { const b = s.branch?.[0]; const name = ar ? (b?.name || 'غير محدد') : (b?.name_en || b?.name || 'Unknown'); const row = map.get(name) || { name, sales: 0, orders: 0 }; row.sales += Number(s.total || 0); row.orders++; map.set(name, row); });
    return [...map.values()].sort((a, b) => b.sales - a.sales).slice(0, 5);
  }, [sales, ar]);

  const lowStock = useMemo(() => stock.filter((x) => Number(x.quantity || 0) <= Number(x.product?.[0]?.low_stock_threshold ?? settings?.low_stock_threshold ?? 5)).sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0)).slice(0, 6), [stock, settings?.low_stock_threshold]);

  const paymentName = (key: string) => ({ cash: ar ? 'نقدي' : 'Cash', card: ar ? 'بطاقة' : 'Card', visa: ar ? 'فيزا / ماستركارد' : 'Visa / Mastercard', bank: ar ? 'تحويل بنكي' : 'Bank transfer', wallet: ar ? 'محفظة' : 'Wallet', instapay: 'InstaPay', other: ar ? 'أخرى' : 'Other' }[key] || key);
  const orderName = (key: string) => ({ dine_in: ar ? 'الصالة' : 'Dine-in', takeaway: ar ? 'تيك أواي' : 'Takeaway', delivery: ar ? 'دليفري' : 'Delivery', car: ar ? 'سيارة' : 'Car', quick: ar ? 'سريع' : 'Quick', other: ar ? 'أخرى' : 'Other' }[key] || key);

  const metrics = [
    { title: ar ? 'إجمالي المبيعات' : 'Gross sales', value: money(stats.sales), icon: ShoppingCart, href: '/reports' },
    { title: ar ? 'التحصيل النقدي' : 'Collected', value: money(stats.collected), icon: Wallet, href: '/accounting' },
    { title: ar ? 'متوسط الطلب' : 'Average ticket', value: money(stats.average), icon: CreditCard, href: '/pos' },
    { title: ar ? 'عدد الطلبات' : 'Orders', value: formatNumber(stats.orders, lang), icon: ArrowUpRight, href: '/reports' },
    { title: ar ? 'الخصومات' : 'Discounts', value: money(stats.discounts), icon: ArrowDownRight, href: '/reports' },
    { title: ar ? 'المرتجعات' : 'Returns', value: money(stats.returns), icon: RefreshCw, href: '/reports' },
  ];

  return <section className="space-y-6" dir={ar ? 'rtl' : 'ltr'} data-testid="dashboard-executive-insights">
    <Card className="bg-gradient-to-r from-ui-surface to-ui-primary-soft/30">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-ui-primary" /><h2 className="text-xl font-black text-ui-text">{ar ? 'مركز الإدارة التنفيذي' : 'Executive Management Center'}</h2></div><p className="mt-1 text-sm text-ui-muted">{ar ? 'قراءة سريعة للأداء، المخزون والتنبيهات التشغيلية' : 'A fast view of performance, inventory and operational alerts'}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {(['today', 'week', 'month'] as Range[]).map((r) => <button key={r} onClick={() => setRange(r)} className={`rounded-xl px-4 py-2 text-sm font-bold ${range === r ? 'bg-ui-primary text-white' : 'bg-ui-page text-ui-muted'}`}>{ranges[r][ar ? 0 : 1]}</button>)}
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-ui-border px-3 py-2 text-sm font-bold text-ui-text"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{ar ? 'تحديث' : 'Refresh'}</button>
        </div>
      </div>
    </Card>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map(({ title, value, icon: Icon, href }) => <Link key={title} to={href} className="rounded-3xl border border-ui-border bg-ui-surface p-5 shadow-ui transition hover:-translate-y-0.5 hover:shadow-ui-lg"><div className="flex items-center justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ui-primary-soft text-ui-primary"><Icon className="h-5 w-5" /></div><ArrowUpRight className="h-4 w-4 text-ui-subtle" /></div><p className="mt-4 text-sm font-bold text-ui-muted">{title}</p><p className="mt-1 text-2xl font-black text-ui-text">{loading ? '—' : value}</p></Link>)}
    </div>

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-ui-primary" /><h3 className="font-black text-ui-text">{ar ? 'طرق الدفع' : 'Payment mix'}</h3></div><Link to="/reports" className="text-xs font-bold text-ui-primary">{ar ? 'التقارير' : 'Reports'}</Link></div>{payments.length ? payments.map(([key, value]) => { const max = payments[0]?.[1] || 1; return <div key={key} className="mb-4 last:mb-0"><div className="mb-1 flex justify-between text-sm"><span className="font-semibold text-ui-text">{paymentName(key)}</span><span className="font-bold text-ui-muted">{money(value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-ui-page"><div className="h-full rounded-full bg-ui-primary" style={{ width: `${Math.max(4, value / max * 100)}%` }} /></div></div> }) : <p className="text-sm text-ui-subtle">{ar ? 'لا توجد بيانات' : 'No data'}</p>}</Card>

      <Card><div className="mb-5 flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-ui-primary" /><h3 className="font-black text-ui-text">{ar ? 'أنواع الطلبات' : 'Order channels'}</h3></div>{orderTypes.length ? orderTypes.map(([key, count], i) => <div key={key} className="mb-3 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ui-primary-soft text-xs font-black text-ui-primary">{i + 1}</span><span className="flex-1 text-sm font-semibold text-ui-text">{orderName(key)}</span><span className="text-sm font-black text-ui-text">{formatNumber(count, lang)}</span></div>) : <p className="text-sm text-ui-subtle">{ar ? 'لا توجد بيانات' : 'No data'}</p>}</Card>

      <Card><div className="mb-5 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /><h3 className="font-black text-ui-text">{ar ? 'تنبيهات تشغيلية' : 'Operational alerts'}</h3></div><div className="space-y-3"><Link to="/inventory" className="flex items-center gap-3 rounded-2xl bg-amber-500/10 p-3"><Boxes className="h-5 w-5 text-amber-500" /><div className="flex-1"><p className="text-sm font-bold text-ui-text">{ar ? 'مخزون منخفض' : 'Low stock'}</p><p className="text-xs text-ui-muted">{formatNumber(lowStock.length, lang)} {ar ? 'منتج يحتاج مراجعة' : 'items need review'}</p></div><ArrowUpRight className="h-4 w-4 text-ui-subtle" /></Link><Link to="/employees" className="flex items-center gap-3 rounded-2xl bg-ui-primary-soft p-3"><Clock3 className="h-5 w-5 text-ui-primary" /><div className="flex-1"><p className="text-sm font-bold text-ui-text">{ar ? 'الورديات والنشاط' : 'Shifts & activity'}</p><p className="text-xs text-ui-muted">{ar ? 'راجع الورديات المفتوحة والنشاط الأخير' : 'Review open shifts and recent activity'}</p></div><ArrowUpRight className="h-4 w-4 text-ui-subtle" /></Link></div></Card>
    </div>

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-ui-primary" /><h3 className="font-black text-ui-text">{ar ? 'أداء الفروع' : 'Branch performance'}</h3></div><Link to="/reports" className="text-xs font-bold text-ui-primary">{ar ? 'عرض التقرير' : 'View report'}</Link></div>{branches.length ? <div className="space-y-4">{branches.map((b, i) => { const max = branches[0].sales || 1; return <div key={b.name}><div className="mb-1 flex items-center justify-between text-sm"><span className="font-bold text-ui-text">{i + 1}. {b.name}</span><span className="font-black text-ui-text">{money(b.sales)}</span></div><div className="h-2 rounded-full bg-ui-page"><div className="h-full rounded-full bg-ui-primary" style={{ width: `${Math.max(5, b.sales / max * 100)}%` }} /></div><p className="mt-1 text-xs text-ui-subtle">{formatNumber(b.orders, lang)} {ar ? 'طلب' : 'orders'}</p></div> })}</div> : <EmptyState ar={ar} />}</Card>

      <Card><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2"><Package className="h-5 w-5 text-ui-primary" /><h3 className="font-black text-ui-text">{ar ? 'المخزون منخفض' : 'Low stock items'}</h3></div><Link to="/inventory" className="text-xs font-bold text-ui-primary">{ar ? 'المخزون' : 'Inventory'}</Link></div>{lowStock.length ? <div className="space-y-2">{lowStock.map((x, i) => <div key={`${x.product?.[0]?.name || 'item'}-${i}`} className="flex items-center gap-3 rounded-2xl bg-ui-page p-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500"><Package className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-ui-text">{x.product?.[0]?.name || (ar ? 'منتج' : 'Product')}</p><p className="text-xs text-ui-muted">{ar ? 'المتاح:' : 'Available:'} {formatNumber(Number(x.quantity || 0), lang)}</p></div><AlertTriangle className="h-4 w-4 text-rose-500" /></div>)}</div> : <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm font-bold text-emerald-600">{ar ? 'لا توجد أصناف تحت حد المخزون.' : 'No items are below the stock threshold.'}</div>}</Card>
    </div>

    <Card><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-ui-primary" /><h3 className="font-black text-ui-text">{ar ? 'إجراءات سريعة' : 'Quick actions'}</h3></div><p className="mt-1 text-xs text-ui-subtle">{ar ? 'الوصول السريع لأهم شاشات الإدارة' : 'Fast access to the most important management screens'}</p></div><span className="text-xs text-ui-subtle">{lastRefresh ? `${ar ? 'آخر تحديث' : 'Updated'} ${lastRefresh.toLocaleTimeString(ar ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}</span></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">{[
      ['/pos', ShoppingCart, ar ? 'نقطة البيع' : 'POS'], ['/inventory', Boxes, ar ? 'المخزون' : 'Inventory'], ['/products', Package, ar ? 'المنتجات' : 'Products'], ['/purchases', Package, ar ? 'المشتريات' : 'Purchases'], ['/customers', Users, ar ? 'العملاء' : 'Customers'], ['/reports', BarIcon, ar ? 'التقارير' : 'Reports'], ['/accounting', Wallet, ar ? 'المحاسبة' : 'Accounting'], ['/settings', Sparkles, ar ? 'الإعدادات' : 'Settings'],
    ].map(([href, Icon, label]) => <Link key={String(href)} to={String(href)} className="flex flex-col items-center gap-2 rounded-2xl border border-ui-border bg-ui-page p-3 text-center transition hover:border-ui-primary hover:text-ui-primary"><Icon className="h-5 w-5" /><span className="text-xs font-bold">{String(label)}</span></Link>)}</div></Card>
  </section>;
}

function BarIcon(props: React.SVGProps<SVGSVGElement>) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M4 19V5M4 19h16M8 16v-5M12 16V7M16 16v-8M20 16V4" /></svg>; }
function EmptyState({ ar }: { ar: boolean }) { return <div className="rounded-2xl bg-ui-page p-5 text-center text-sm text-ui-subtle">{ar ? 'لا توجد بيانات للفترة المحددة.' : 'No data for the selected period.'}</div>; }
