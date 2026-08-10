import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  CircleDollarSign,
  FileText,
  Package,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { isAdminRole } from '@/lib/permissions';
import { useBranches } from '@/hooks/useBranches';
import { useSettings } from '@/context/SettingsContext';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format';
import type { Language } from '@/lib/types';

type Range = 'today' | 'week' | 'month' | 'year';

type DashboardData = {
  sales: number;
  expenses: number;
  profit: number;
  invoices: number;
  lowStock: number;
  products: number;
  trend: { label: string; total: number }[];
  topProducts: { name: string; total: number; quantity: number }[];
  recentSales: { id: string; invoice_number: string; total: number; created_at: string }[];
};

const rangeLabels: Record<Range, [string, string]> = {
  today: ['اليوم', 'Today'],
  week: ['7 أيام', '7 Days'],
  month: ['30 يوم', '30 Days'],
  year: ['سنة', 'Year'],
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-900 ${className}`}>{children}</section>;
}

function Metric({ title, value, icon, tone, hint, trend }: { title: string; value: string; icon: React.ReactNode; tone: string; hint: string; trend?: number }) {
  return (
    <Card className="group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1 ${tone}`} />
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone} text-white shadow-sm`}>{icon}</div>
        {trend !== undefined && Number.isFinite(trend) && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${trend >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>
    </Card>
  );
}

function ChartTooltip({ active, payload, label, currency, lang }: { active?: boolean; payload?: { value: number }[]; label?: string; currency: string; lang: Language }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-navy-700 dark:bg-navy-950"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(Number(payload[0].value), currency, lang)}</p></div>;
}

export function DashboardModernPage() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { branches } = useBranches();
  const branchFilter = useBranchFilter();
  const { effectiveSettings } = useSettings();
  const isAr = lang === 'ar';
  const [range, setRange] = useState<Range>('today');
  const [branchId, setBranchId] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const effectiveBranch = isAdminRole(user?.role) ? (branchId || null) : branchFilter;
  const currency = effectiveSettings(effectiveBranch)?.currency || 'EGP';

  const getDates = useCallback(() => {
    const end = new Date();
    const start = new Date(end);
    if (range === 'today') start.setHours(0, 0, 0, 0);
    if (range === 'week') start.setDate(start.getDate() - 6);
    if (range === 'month') start.setDate(start.getDate() - 29);
    if (range === 'year') start.setFullYear(start.getFullYear() - 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [range]);

  const load = useCallback(async () => {
    setRefreshing(Boolean(data));
    try {
      const { from, to } = getDates();
      const branch = (q: any) => effectiveBranch ? q.eq('branch_id', effectiveBranch) : q;
      const [salesRes, expensesRes, productsRes, inventoryRes, itemsRes] = await Promise.all([
        branch(supabase.from('sales').select('id, invoice_number, total, created_at').gte('created_at', from).lte('created_at', to).order('created_at', { ascending: false })),
        branch(supabase.from('expenses').select('amount, expense_date').gte('expense_date', from.slice(0, 10)).lte('expense_date', to.slice(0, 10))),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('inventory').select('product_id, quantity, product:products(name, low_stock_threshold)') ,
        supabase.from('sale_items').select('quantity, total, product:products(name)').limit(1000),
      ]);

      const salesRows = (salesRes.data || []) as any[];
      const expensesRows = (expensesRes.data || []) as any[];
      const sales = salesRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
      const expenses = expensesRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const threshold = Number(effectiveSettings(effectiveBranch)?.low_stock_threshold ?? 5);
      const lowStock = ((inventoryRes.data || []) as any[]).filter(row => Number(row.quantity || 0) < Number(row.product?.low_stock_threshold ?? threshold)).length;

      const top = new Map<string, { name: string; total: number; quantity: number }>();
      ((itemsRes.data || []) as any[]).forEach(row => {
        const name = row.product?.name || '-';
        const current = top.get(name) || { name, total: 0, quantity: 0 };
        current.total += Number(row.total || 0);
        current.quantity += Number(row.quantity || 0);
        top.set(name, current);
      });

      const days = range === 'today' ? 1 : range === 'week' ? 7 : range === 'month' ? 30 : 12;
      const trendMap = new Map<string, number>();
      salesRows.forEach(row => {
        const date = new Date(row.created_at);
        const key = range === 'year' ? `${date.getFullYear()}-${date.getMonth() + 1}` : date.toISOString().slice(0, 10);
        trendMap.set(key, (trendMap.get(key) || 0) + Number(row.total || 0));
      });
      const trend = Array.from(trendMap.entries()).slice(-days).map(([key, total]) => ({
        label: range === 'year' ? key.split('-')[1] : new Date(key).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' }),
        total,
      }));

      setData({
        sales,
        expenses,
        profit: sales - expenses,
        invoices: salesRows.length,
        lowStock,
        products: productsRes.count || 0,
        trend,
        topProducts: Array.from(top.values()).sort((a, b) => b.total - a.total).slice(0, 5),
        recentSales: salesRows.slice(0, 6),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data, effectiveBranch, effectiveSettings, getDates, isAr]);

  useEffect(() => { void load(); }, [load]);

  const previousSales = useMemo(() => data ? data.sales : 0, [data]);
  const profitMargin = data && data.sales > 0 ? (data.profit / data.sales) * 100 : 0;
  const greeting = new Date().getHours() < 12 ? (isAr ? 'صباح الخير' : 'Good morning') : (isAr ? 'مساء الخير' : 'Good evening');

  if (loading || !data) return <div className="flex min-h-[60vh] items-center justify-center"><div className="flex flex-col items-center gap-3"><RefreshCw className="h-8 w-8 animate-spin text-brand-600" /><p className="text-sm text-slate-400">{isAr ? 'جاري تجهيز لوحة التحكم...' : 'Loading dashboard...'}</p></div></div>;

  return (
    <div className="space-y-6 pb-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 p-6 shadow-xl sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gold-300"><Sparkles className="h-4 w-4" />{greeting}</div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{user?.full_name || (isAr ? 'لوحة التحكم' : 'Dashboard')}</h1>
            <p className="mt-1 text-sm text-slate-400">{new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
              <p className="text-xs text-slate-400">{isAr ? 'ربح الفترة' : 'Period profit'}</p>
              <p className="mt-1 text-xl font-bold text-white">{formatCurrency(data.profit, currency, lang)}</p>
            </div>
            <Link to="/pos" className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-5 py-3 text-sm font-bold text-navy-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-gold-400"><ShoppingBag className="h-4 w-4" />{isAr ? 'بيع جديد' : 'New Sale'}</Link>
          </div>
        </div>
      </div>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><CalendarDays className="h-4 w-4 text-brand-600" />{isAr ? 'نطاق التحليل' : 'Analysis period'}</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(rangeLabels) as Range[]).map(item => <button key={item} onClick={() => setRange(item)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${range === item ? 'bg-navy-900 text-white shadow-sm dark:bg-brand-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-300'}`}>{rangeLabels[item][isAr ? 0 : 1]}</button>)}
            {isAdminRole(user?.role) && branches.length > 0 && <select value={branchId} onChange={e => setBranchId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none dark:border-navy-700 dark:bg-navy-800 dark:text-slate-200"><option value="">{isAr ? 'كل الفروع' : 'All branches'}</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{isAr ? branch.name : branch.name_en || branch.name}</option>)}</select>}
            <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-navy-700 dark:text-slate-300 dark:hover:bg-navy-800"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{isAr ? 'تحديث' : 'Refresh'}</button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric title={isAr ? 'المبيعات' : 'Sales'} value={formatCurrency(data.sales, currency, lang)} icon={<CircleDollarSign className="h-5 w-5" />} tone="bg-gradient-to-br from-navy-800 to-navy-950" hint={isAr ? `${data.invoices} فاتورة` : `${data.invoices} invoices`} />
        <Metric title={isAr ? 'المصروفات' : 'Expenses'} value={formatCurrency(data.expenses, currency, lang)} icon={<FileText className="h-5 w-5" />} tone="bg-gradient-to-br from-rose-500 to-rose-600" hint={isAr ? 'خلال الفترة' : 'In selected period'} />
        <Metric title={isAr ? 'صافي الربح' : 'Net profit'} value={formatCurrency(data.profit, currency, lang)} icon={<Wallet className="h-5 w-5" />} tone="bg-gradient-to-br from-gold-400 to-gold-600" hint={`${profitMargin.toFixed(1)}% ${isAr ? 'هامش' : 'margin'}`} />
        <Metric title={isAr ? 'الفواتير' : 'Invoices'} value={formatNumber(data.invoices, 0)} icon={<BarChart3 className="h-5 w-5" />} tone="bg-gradient-to-br from-brand-500 to-brand-600" hint={isAr ? 'طلبات مكتملة' : 'Completed sales'} />
        <Metric title={isAr ? 'مخزون منخفض' : 'Low stock'} value={formatNumber(data.lowStock, 0)} icon={<AlertTriangle className="h-5 w-5" />} tone="bg-gradient-to-br from-amber-500 to-orange-500" hint={data.lowStock ? (isAr ? 'يحتاج إعادة طلب' : 'Needs restock') : (isAr ? 'المخزون جيد' : 'Stock is healthy')} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-5 flex items-center justify-between"><div><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-brand-600" /><h2 className="font-bold text-slate-800 dark:text-white">{isAr ? 'اتجاه المبيعات' : 'Sales trend'}</h2></div><p className="mt-1 text-xs text-slate-400">{isAr ? 'حركة المبيعات خلال الفترة المحددة' : 'Sales movement in the selected period'}</p></div><Link to="/reports" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">{isAr ? 'التقارير' : 'Reports'}{isAr ? <ChevronLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}</Link></div>
          <ResponsiveContainer width="100%" height={310}><AreaChart data={data.trend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}><defs><linearGradient id="dashboardSalesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4AF37" stopOpacity={0.35} /><stop offset="100%" stopColor="#D4AF37" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-40" /><XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={55} /><Tooltip content={<ChartTooltip currency={currency} lang={lang} />} /><Area type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={3} fill="url(#dashboardSalesFill)" /></AreaChart></ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="mb-5 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /><div><h2 className="font-bold text-slate-800 dark:text-white">{isAr ? 'أفضل المنتجات' : 'Top products'}</h2><p className="text-xs text-slate-400">{isAr ? 'حسب قيمة المبيعات' : 'By sales value'}</p></div></div>
          {data.topProducts.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={data.topProducts} layout="vertical" margin={{ left: 0, right: 10 }}><CartesianGrid horizontal={false} strokeDasharray="3 3" /><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip currency={currency} lang={lang} />} /><Bar dataKey="total" fill="#0F172A" radius={[0, 7, 7, 0]} barSize={18} /></BarChart></ResponsiveContainer> : <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">{isAr ? 'لا توجد بيانات' : 'No data'}</div>}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-800 dark:text-white">{isAr ? 'آخر المبيعات' : 'Recent sales'}</h2><p className="mt-1 text-xs text-slate-400">{isAr ? 'أحدث الفواتير المسجلة' : 'Latest recorded invoices'}</p></div><Link to="/sales" className="text-xs font-semibold text-brand-600 hover:underline">{isAr ? 'عرض الكل' : 'View all'}</Link></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-100 dark:border-navy-800"><th className="py-3 text-start text-xs font-semibold text-slate-400">{isAr ? 'الفاتورة' : 'Invoice'}</th><th className="py-3 text-start text-xs font-semibold text-slate-400">{isAr ? 'التاريخ' : 'Date'}</th><th className="py-3 text-end text-xs font-semibold text-slate-400">{isAr ? 'الإجمالي' : 'Total'}</th></tr></thead><tbody>{data.recentSales.map(sale => <tr key={sale.id} className="border-b border-slate-50 last:border-0 dark:border-navy-800/60"><td className="py-3 font-semibold text-slate-700 dark:text-white">{sale.invoice_number || '-'}</td><td className="py-3 text-slate-400">{formatDateTime(sale.created_at, lang)}</td><td className="py-3 text-end font-bold text-brand-600 dark:text-gold-400">{formatCurrency(Number(sale.total), currency, lang)}</td></tr>)}{!data.recentSales.length && <tr><td colSpan={3} className="py-10 text-center text-slate-400">{isAr ? 'لا توجد مبيعات' : 'No sales found'}</td></tr>}</tbody></table></div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 p-5 dark:border-navy-800"><div className="flex items-center gap-2"><Package className="h-4 w-4 text-amber-500" /><h2 className="font-bold text-slate-800 dark:text-white">{isAr ? 'حالة المخزون' : 'Inventory status'}</h2></div></div>
          <div className="p-5"><div className={`rounded-2xl p-4 ${data.lowStock ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-emerald-50 dark:bg-emerald-900/10'}`}><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{data.lowStock ? (isAr ? 'تحتاج مراجعة' : 'Needs attention') : (isAr ? 'المخزون مستقر' : 'Stock is stable')}</p><p className="mt-1 text-xs text-slate-400">{data.lowStock ? `${data.lowStock} ${isAr ? 'أصناف منخفضة' : 'low-stock items'}` : (isAr ? 'لا توجد تنبيهات حالية' : 'No current alerts')}</p></div><div className={`flex h-11 w-11 items-center justify-center rounded-full ${data.lowStock ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'}`}><AlertTriangle className="h-5 w-5" /></div></div></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3 dark:bg-navy-800"><p className="text-xs text-slate-400">{isAr ? 'المنتجات' : 'Products'}</p><p className="mt-1 text-lg font-bold text-slate-800 dark:text-white">{formatNumber(data.products, 0)}</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-navy-800"><p className="text-xs text-slate-400">{isAr ? 'هامش الربح' : 'Margin'}</p><p className="mt-1 text-lg font-bold text-slate-800 dark:text-white">{profitMargin.toFixed(1)}%</p></div></div><Link to="/inventory" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">{isAr ? 'إدارة المخزون' : 'Manage inventory'}<ArrowUpRight className="h-4 w-4" /></Link></div>
        </Card>
      </div>

      <Card className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-gold-400 dark:bg-navy-800"><Sparkles className="h-5 w-5" /></div><div><h2 className="font-bold text-slate-800 dark:text-white">{isAr ? 'إجراءات سريعة' : 'Quick actions'}</h2><p className="text-xs text-slate-400">{isAr ? 'الوصول المباشر للعمليات اليومية' : 'Shortcuts for daily operations'}</p></div></div><div className="grid grid-cols-2 gap-2 sm:flex"><Link to="/pos" className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-800"><ShoppingBag className="h-4 w-4" />{isAr ? 'بيع' : 'Sale'}</Link><Link to="/purchases" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-200"><Package className="h-4 w-4" />{isAr ? 'شراء' : 'Purchase'}</Link><Link to="/expenses" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-200"><FileText className="h-4 w-4" />{isAr ? 'مصروف' : 'Expense'}</Link><Link to="/reports" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-navy-950 hover:bg-gold-400"><BarChart3 className="h-4 w-4" />{isAr ? 'تقارير' : 'Reports'}</Link></div></div></Card>

      <div className="text-center text-[11px] text-slate-400">{isAr ? 'لوحة التحكم تعرض البيانات وفق صلاحيات المستخدم ونطاق الفرع المحدد.' : 'Dashboard data follows the user permissions and selected branch scope.'}</div>
    </div>
  );
}
