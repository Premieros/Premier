import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, BarChart3, CalendarDays, CircleDollarSign,
  FileBarChart, FileText, Package, RefreshCw, ShoppingBag, Sparkles,
  TrendingUp, Wallet, X, ChevronLeft, ExternalLink,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { isAdminRole } from '@/lib/permissions';
import { useBranches } from '@/hooks/useBranches';
import { useSettings } from '@/context/SettingsContext';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format';

type Range = 'today' | 'week' | 'month' | 'year';
type SaleRow = { id: string; invoice_number: string | null; total: number | null; created_at: string };
type ExpenseRow = { amount: number | null };
type InventoryRow = { quantity: number | null; product: { name: string | null; low_stock_threshold: number | null } | null };
type SaleItemRow = { quantity: number | null; total: number | null; product: { name: string | null } | null };
type ChartPoint = { label: string; total: number };
type TopProduct = { name: string; total: number };
type DashboardData = {
  sales: number;
  expenses: number;
  invoices: number;
  averageOrder: number;
  lowStock: number;
  trend: ChartPoint[];
  top: TopProduct[];
  recent: SaleRow[];
};

const ranges: Record<Range, [string, string]> = {
  today: ['اليوم', 'Today'],
  week: ['7 أيام', '7 Days'],
  month: ['30 يوم', '30 Days'],
  year: ['سنة', 'Year'],
};

const reports = [
  ['المبيعات', 'Sales', 'sales'],
  ['المبيعات حسب طريقة الدفع', 'Sales by Payment', 'sales_by_payment'],
  ['المبيعات حسب الموظف', 'Sales by Employee', 'sales_by_employee'],
  ['المبيعات حسب المنتج', 'Sales by Product', 'sales_by_product'],
  ['الفواتير التفصيلية', 'Detailed Invoices', 'detailed_invoices'],
  ['المشتريات', 'Purchases', 'purchases'],
  ['المصروفات', 'Expenses', 'expenses'],
  ['الربحية', 'Profitability', 'profit'],
  ['المخزون', 'Inventory', 'inventory'],
  ['استهلاك المكونات', 'Component Consumption', 'component_consumption'],
  ['تكلفة الوصفات', 'Recipe Costs', 'recipe_costs'],
  ['أكثر المكونات استهلاكًا', 'Top Components', 'top_consumed_components'],
  ['أكثر المنتجات استهلاكًا', 'Top Consumed Products', 'top_consumed_products'],
  ['المخزون المنخفض', 'Low Stock', 'low_stock'],
] as const;

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-900 ${className}`}>{children}</section>;
}

function Metric({ title, value, icon, tone, hint, href }: { title: string; value: string; icon: React.ReactNode; tone: string; hint: string; href?: string }) {
  const body = <Card className="relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className={`absolute inset-x-0 top-0 h-1 ${tone}`} /><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone} text-white`}>{icon}</div><p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></Card>;
  return href ? <Link to={href}>{body}</Link> : body;
}

export function DashboardEnhancedPage() {
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
  const [reportsOpen, setReportsOpen] = useState(false);

  const effectiveBranch = isAdminRole(user?.role) ? (branchId || null) : branchFilter;
  const currency = effectiveSettings(effectiveBranch)?.currency || 'EGP';

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const end = new Date();
      const start = new Date(end);
      if (range === 'today') start.setHours(0, 0, 0, 0);
      if (range === 'week') start.setDate(start.getDate() - 6);
      if (range === 'month') start.setDate(start.getDate() - 29);
      if (range === 'year') start.setFullYear(start.getFullYear() - 1);
      const from = start.toISOString();
      const to = end.toISOString();
      const branchSales = effectiveBranch
        ? supabase.from('sales').select('id,invoice_number,total,created_at').eq('branch_id', effectiveBranch).gte('created_at', from).lte('created_at', to).order('created_at', { ascending: false })
        : supabase.from('sales').select('id,invoice_number,total,created_at').gte('created_at', from).lte('created_at', to).order('created_at', { ascending: false });
      const branchExpenses = effectiveBranch
        ? supabase.from('expenses').select('amount').eq('branch_id', effectiveBranch).gte('expense_date', from.slice(0, 10)).lte('expense_date', to.slice(0, 10))
        : supabase.from('expenses').select('amount').gte('expense_date', from.slice(0, 10)).lte('expense_date', to.slice(0, 10));
      const branchInventory = effectiveBranch
        ? supabase.from('inventory').select('quantity,product:products(name,low_stock_threshold)').eq('branch_id', effectiveBranch)
        : supabase.from('inventory').select('quantity,product:products(name,low_stock_threshold)');

      const [salesResult, expensesResult, inventoryResult] = await Promise.all([branchSales, branchExpenses, branchInventory]);
      if (salesResult.error) throw salesResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (inventoryResult.error) throw inventoryResult.error;

      const salesRows = (salesResult.data ?? []) as SaleRow[];
      const expenseRows = (expensesResult.data ?? []) as ExpenseRow[];
      const inventoryRows = (inventoryResult.data ?? []) as InventoryRow[];
      const saleIds = salesRows.map((row) => row.id);

      let itemRows: SaleItemRow[] = [];
      if (saleIds.length > 0) {
        const itemsResult = await supabase.from('sale_items').select('quantity,total,product:products(name)').in('sale_id', saleIds).limit(5000);
        if (!itemsResult.error) itemRows = (itemsResult.data ?? []) as SaleItemRow[];
      }

      const sales = salesRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
      const expenses = expenseRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const averageOrder = salesRows.length ? sales / salesRows.length : 0;
      const defaultThreshold = Number(effectiveSettings(effectiveBranch)?.low_stock_threshold ?? 5);
      const lowStock = inventoryRows.filter((row) => Number(row.quantity || 0) < Number(row.product?.low_stock_threshold ?? defaultThreshold)).length;

      const trendMap = new Map<string, number>();
      salesRows.forEach((row) => {
        const date = new Date(row.created_at);
        const key = range === 'year' ? `${date.getFullYear()}-${date.getMonth() + 1}` : date.toISOString().slice(0, 10);
        trendMap.set(key, (trendMap.get(key) || 0) + Number(row.total || 0));
      });
      const trend = Array.from(trendMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, total]) => ({
        label: range === 'year' ? key.split('-')[1] : new Date(`${key}T00:00:00`).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' }),
        total,
      }));

      const topMap = new Map<string, number>();
      itemRows.forEach((row) => {
        const name = row.product?.name || (isAr ? 'منتج غير مسمى' : 'Unnamed product');
        topMap.set(name, (topMap.get(name) || 0) + Number(row.total || 0));
      });
      const top = Array.from(topMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, total]) => ({ name, total }));
      setData({ sales, expenses, invoices: salesRows.length, averageOrder, lowStock, trend, top, recent: salesRows.slice(0, 6) });
    } catch (error) {
      console.error('Dashboard data load failed', error);
      setData({ sales: 0, expenses: 0, invoices: 0, averageOrder: 0, lowStock: 0, trend: [], top: [], recent: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, effectiveBranch, effectiveSettings, isAr]);

  useEffect(() => { void load(); }, [load]);

  const reportLinks = useMemo(() => reports.map(([ar, en, type]) => ({ title: isAr ? ar : en, href: `/reports?reportType=${encodeURIComponent(type)}` })), [isAr]);
  const profit = (data?.sales || 0) - (data?.expenses || 0);
  const margin = data?.sales ? (profit / data.sales) * 100 : 0;
  const greeting = new Date().getHours() < 12 ? (isAr ? 'صباح الخير' : 'Good morning') : (isAr ? 'مساء الخير' : 'Good evening');

  if (loading || !data) return <div className="flex min-h-[60vh] items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-brand-600" /></div>;

  return <div className="space-y-6 pb-8">
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 p-6 shadow-xl sm:p-8">
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="mb-2 flex items-center gap-2 text-sm text-gold-300"><Sparkles className="h-4 w-4" />{greeting}</div><h1 className="text-3xl font-bold text-white">{user?.full_name || (isAr ? 'لوحة التحكم' : 'Dashboard')}</h1><p className="mt-1 text-sm text-slate-400">{new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
        <div className="flex items-center gap-3"><div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3"><p className="text-xs text-slate-400">{isAr ? 'صافي الفترة' : 'Period net'}</p><p className="text-xl font-bold text-white">{formatCurrency(profit, currency, lang)}</p></div><Link to="/pos" className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-5 py-3 text-sm font-bold text-navy-950 hover:bg-gold-400"><ShoppingBag className="h-4 w-4" />{isAr ? 'بيع جديد' : 'New Sale'}</Link></div>
      </div>
    </div>

    <Card className="p-4"><div className="flex flex-wrap items-center gap-2"><CalendarDays className="h-4 w-4 text-brand-600" />{(Object.keys(ranges) as Range[]).map((item) => <button key={item} onClick={() => setRange(item)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${range === item ? 'bg-navy-900 text-white dark:bg-brand-600' : 'bg-slate-100 text-slate-600 dark:bg-navy-800 dark:text-slate-300'}`}>{ranges[item][isAr ? 0 : 1]}</button>)}{isAdminRole(user?.role) && branches.length > 0 && <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-navy-700 dark:bg-navy-800 dark:text-slate-200"><option value="">{isAr ? 'كل الفروع' : 'All branches'}</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{isAr ? branch.name : branch.name_en || branch.name}</option>)}</select>}<button onClick={() => void load()} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-navy-700 dark:text-slate-300"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{isAr ? 'تحديث' : 'Refresh'}</button><button onClick={() => setReportsOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"><FileBarChart className="h-4 w-4" />{isAr ? 'التقارير' : 'Reports'}</button></div></Card>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <Metric title={isAr ? 'المبيعات' : 'Sales'} value={formatCurrency(data.sales, currency, lang)} icon={<CircleDollarSign className="h-5 w-5" />} tone="bg-gradient-to-br from-navy-800 to-navy-950" hint={`${data.invoices} ${isAr ? 'فاتورة' : 'invoices'}`} href="/reports?reportType=sales" />
      <Metric title={isAr ? 'المصروفات' : 'Expenses'} value={formatCurrency(data.expenses, currency, lang)} icon={<FileText className="h-5 w-5" />} tone="bg-gradient-to-br from-rose-500 to-rose-600" hint={isAr ? 'الفترة المحددة' : 'Selected period'} href="/reports?reportType=expenses" />
      <Metric title={isAr ? 'الصافي' : 'Net'} value={formatCurrency(profit, currency, lang)} icon={<Wallet className="h-5 w-5" />} tone="bg-gradient-to-br from-gold-400 to-gold-600" hint={`${margin.toFixed(1)}% ${isAr ? 'من المبيعات' : 'of sales'}`} href="/reports?reportType=profit" />
      <Metric title={isAr ? 'عدد الفواتير' : 'Invoices'} value={formatNumber(data.invoices, 0)} icon={<BarChart3 className="h-5 w-5" />} tone="bg-gradient-to-br from-brand-500 to-brand-600" hint={isAr ? 'المبيعات الفعلية' : 'Actual sales'} href="/reports?reportType=detailed_invoices" />
      <Metric title={isAr ? 'متوسط الطلب' : 'Avg. order'} value={formatCurrency(data.averageOrder, currency, lang)} icon={<TrendingUp className="h-5 w-5" />} tone="bg-gradient-to-br from-emerald-500 to-emerald-600" hint={isAr ? 'المبيعات ÷ الفواتير' : 'Sales ÷ invoices'} href="/reports?reportType=sales" />
      <Metric title={isAr ? 'مخزون منخفض' : 'Low stock'} value={formatNumber(data.lowStock, 0)} icon={<AlertTriangle className="h-5 w-5" />} tone="bg-gradient-to-br from-amber-500 to-orange-500" hint={data.lowStock ? (isAr ? 'يحتاج مراجعة' : 'Needs review') : (isAr ? 'لا توجد أصناف منخفضة' : 'None detected')} href="/reports?reportType=low_stock" />
    </div>

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card className="p-5 xl:col-span-2"><div className="mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-brand-600" /><div><h2 className="font-bold text-slate-800 dark:text-white">{isAr ? 'اتجاه المبيعات' : 'Sales trend'}</h2><p className="text-xs text-slate-400">{isAr ? 'بيانات المبيعات الفعلية للفترة المحددة' : 'Actual sales for the selected period'}</p></div></div>{data.trend.length ? <ResponsiveContainer width="100%" height={300}><AreaChart data={data.trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => formatCurrency(Number(value), currency, lang)} /><Area type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={3} fill="#D4AF3730" /></AreaChart></ResponsiveContainer> : <p className="py-24 text-center text-sm text-slate-400">{isAr ? 'لا توجد مبيعات في الفترة المحددة' : 'No sales in selected period'}</p>}</Card>
      <Card className="p-5"><div className="mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /><h2 className="font-bold text-slate-800 dark:text-white">{isAr ? 'أفضل المنتجات' : 'Top products'}</h2></div>{data.top.length ? <ResponsiveContainer width="100%" height={300}><BarChart data={data.top} layout="vertical"><CartesianGrid horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => formatCurrency(Number(value), currency, lang)} /><Bar dataKey="total" fill="#0F172A" radius={[0, 6, 6, 0]} barSize={18} /></BarChart></ResponsiveContainer> : <p className="py-24 text-center text-sm text-slate-400">{isAr ? 'لا توجد بيانات منتجات للفترة المحددة' : 'No product sales in selected period'}</p>}</Card>
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-800 dark:text-white">{isAr ? 'آخر المبيعات' : 'Recent sales'}</h2><p className="text-xs text-slate-400">{isAr ? 'من نفس الفترة والفرع المحدد' : 'Same period and selected branch'}</p></div><Link to="/sales" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">{isAr ? 'عرض الكل' : 'View all'}<ExternalLink className="h-3 w-3" /></Link></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-100 dark:border-navy-800"><th className="py-3 text-start text-xs text-slate-400">{isAr ? 'الفاتورة' : 'Invoice'}</th><th className="py-3 text-start text-xs text-slate-400">{isAr ? 'التاريخ' : 'Date'}</th><th className="py-3 text-end text-xs text-slate-400">{isAr ? 'الإجمالي' : 'Total'}</th></tr></thead><tbody>{data.recent.map((sale) => <tr key={sale.id} className="border-b border-slate-50 dark:border-navy-800"><td className="py-3 font-semibold text-slate-700 dark:text-white">{sale.invoice_number || '-'}</td><td className="py-3 text-slate-400">{formatDateTime(sale.created_at, lang)}</td><td className="py-3 text-end font-bold text-brand-600 dark:text-gold-400">{formatCurrency(Number(sale.total || 0), currency, lang)}</td></tr>)}{!data.recent.length && <tr><td colSpan={3} className="py-10 text-center text-slate-400">{isAr ? 'لا توجد مبيعات' : 'No sales'}</td></tr>}</tbody></table></div></Card>
      <Card className="p-5"><div className="flex items-center gap-2"><Package className="h-4 w-4 text-amber-500" /><h2 className="font-bold text-slate-800 dark:text-white">{isAr ? 'حالة المخزون' : 'Inventory status'}</h2></div><div className={`mt-5 rounded-2xl p-4 ${data.lowStock ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-emerald-50 dark:bg-emerald-900/10'}`}><p className="font-semibold text-slate-700 dark:text-slate-200">{data.lowStock ? (isAr ? `${data.lowStock} صنف يحتاج مراجعة` : `${data.lowStock} items need review`) : (isAr ? 'لا توجد أصناف أقل من الحد' : 'No items below threshold')}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isAr ? 'تم الحساب من رصيد المخزون الفعلي للفترة الحالية' : 'Calculated from current inventory balances'}</p></div><Link to="/reports?reportType=inventory" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">{isAr ? 'تقرير المخزون' : 'Inventory report'}<ChevronLeft className="h-4 w-4" /></Link></Card>
    </div>

    {reportsOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label={isAr ? 'قائمة التقارير' : 'Reports menu'} onMouseDown={() => setReportsOpen(false)}><div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-navy-900" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-navy-800"><div><h2 className="text-xl font-bold text-slate-900 dark:text-white">{isAr ? 'التقارير التفصيلية' : 'Detailed reports'}</h2><p className="mt-1 text-xs text-slate-400">{isAr ? 'اختر التقرير لفتحه مباشرة' : 'Choose a report to open it directly'}</p></div><button onClick={() => setReportsOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800" aria-label={isAr ? 'إغلاق' : 'Close'}><X className="h-5 w-5" /></button></div><div className="max-h-[70vh] overflow-y-auto p-4"><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{reportLinks.map((report) => <Link key={report.href} to={report.href} onClick={() => setReportsOpen(false)} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-white hover:shadow-sm dark:border-navy-800 dark:bg-navy-950 dark:text-slate-200"><span className="flex items-center gap-3"><FileBarChart className="h-4 w-4 text-brand-600" />{report.title}</span><ChevronLeft className="h-4 w-4 text-slate-300 group-hover:text-brand-600" /></Link>)}</div></div></div></div>}
  </div>;
}
