import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, TrendingUp, Receipt, Package, AlertTriangle,
  DollarSign, ArrowUpRight, ArrowDownRight, Wallet, Crown, Sparkles,
  ShoppingBag, Truck, FileText, ChevronLeft, Activity, Calendar, Filter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatNumber, formatDateTime } from '../lib/format';
import { useBranchFilter } from '../lib/useBranchFilter';
import { Modal } from '../components/Modal';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import type { Settings, Branch } from '../lib/types';
import type { Language } from '../lib/types';

interface DashboardData {
  todaySales: number;
  todayExpenses: number;
  yesterdaySales: number;
  totalSales: number;
  totalSalesCount: number;
  totalPurchases: number;
  totalExpenses: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockCount: number;
  lowStockItems: { name: string; quantity: number; threshold: number }[];
  salesTrend: { date: string; total: number }[];
  topProducts: { name: string; quantity: number; total: number }[];
  salesByCategory: { name: string; total: number }[];
  recentSales: { id: string; invoice_number: string; total: number; created_at: string }[];
}

interface DetailRow {
  id: string;
  invoice_number?: string;
  name?: string;
  total: number;
  created_at: string;
  extra?: string;
}

type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom';

const PIE_COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#ec4899'];

function CustomTooltip({ active, payload, label, currency, lang }: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
  currency: string;
  lang: Language;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 px-4 py-3">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {formatCurrency(p.value, currency, lang)}
        </p>
      ))}
    </div>
  );
}

function KpiCard({
  title, value, icon, gradient, trend, trendUp, subtitle, onClick, lang,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
  onClick?: () => void;
  lang: Language;
}) {
  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${gradient}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              trendUp
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
            }`}>
              {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend}
            </div>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1 tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {onClick && (
        <div className="absolute bottom-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
            {lang === 'ar' ? 'عرض التفاصيل' : 'View Details'}
            <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState('EGP');
  const branchFilter = useBranchFilter();
  const isAr = lang === 'ar';

  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [detailModal, setDetailModal] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DetailRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [adminBranchFilter, setAdminBranchFilter] = useState<string>('');
  const effectiveBranchFilter = user?.role === 'admin' ? (adminBranchFilter || null) : branchFilter;

  const getDateRange = useCallback(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    let from = '';
    let to = today + 'T23:59:59';

    switch (dateRange) {
      case 'today':
        from = today + 'T00:00:00';
        break;
      case 'week': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        from = d.toISOString().slice(0, 10) + 'T00:00:00';
        break;
      }
      case 'month': {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        from = d.toISOString().slice(0, 10) + 'T00:00:00';
        break;
      }
      case 'year': {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - 1);
        from = d.toISOString().slice(0, 10) + 'T00:00:00';
        break;
      }
      case 'custom':
        from = customFrom ? customFrom + 'T00:00:00' : '';
        to = customTo ? customTo + 'T23:59:59' : today + 'T23:59:59';
        break;
    }
    return { from, to };
  }, [dateRange, customFrom, customTo]);

  useEffect(() => {
    async function load() {
      if (data) setRefreshing(true); else setLoading(true);
      try {
      const { data: settingsData } = await supabase.from('settings').select('*').maybeSingle();
      if (settingsData) setCurrency((settingsData as Settings).currency || 'EGP');

      if (user?.role === 'admin' && branches.length === 0) {
        const { data: br } = await supabase.from('branches').select('*').order('name');
        setBranches((br as Branch[]) || []);
      }

      const { from, to } = getDateRange();
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const yesterdayEnd = yesterday + 'T23:59:59';
      const yesterdayStart = yesterday + 'T00:00:00';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const branchEq = (q: any) => effectiveBranchFilter ? q.eq('branch_id', effectiveBranchFilter) : q;

      let salesQuery = branchEq(supabase.from('sales').select('total, created_at'));
      if (from) salesQuery = salesQuery.gte('created_at', from);
      salesQuery = salesQuery.lte('created_at', to);

      let expensesQuery = branchEq(supabase.from('expenses').select('amount, expense_date'));
      if (from) expensesQuery = expensesQuery.gte('expense_date', from.slice(0, 10));
      expensesQuery = expensesQuery.lte('expense_date', to.slice(0, 10));

      const [salesRange, salesYesterday, expensesRange, salesAll, purchasesAll, expensesAll, productsCount, customersCount, lowStock, salesTrend, topProducts, salesByCat, recentSales] =
        await Promise.all([
          salesQuery,
          branchEq(supabase.from('sales').select('total')).gte('created_at', yesterdayStart).lte('created_at', yesterdayEnd),
          expensesQuery,
          branchEq(supabase.from('sales').select('total')),
          branchEq(supabase.from('purchases').select('total')),
          branchEq(supabase.from('expenses').select('amount')),
          supabase.from('products').select('id', { count: 'exact', head: true }),
          supabase.from('customers').select('id', { count: 'exact', head: true }),
          supabase.from('inventory').select('product_id, quantity, product:products(name, low_stock_threshold)'),
          branchEq(supabase.from('sales').select('created_at, total')).gte('created_at', `${sevenDaysAgo}T00:00:00`).order('created_at', { ascending: true }),
          supabase.from('sale_items').select('quantity, total, product:products(name)').order('total', { ascending: false }).limit(5),
          supabase.from('sale_items').select('total, product:products(category:categories(name))'),
          branchEq(supabase.from('sales').select('id, invoice_number, total, created_at')).order('created_at', { ascending: false }).limit(6),
        ]);

      const rangeSalesTotal = (salesRange.data || []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.total), 0);
      const yesterdaySalesTotal = (salesYesterday.data || []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.total), 0);
      const rangeExpensesTotal = (expensesRange.data || []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.amount), 0);
      const totalSales = (salesAll.data || []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.total), 0);
      const totalPurchases = (purchasesAll.data || []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.total), 0);
      const totalExpenses = (expensesAll.data || []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.amount), 0);

      const trendMap = new Map<string, number>();
      (salesTrend.data || []).forEach((r: Record<string, unknown>) => {
        const day = String(r.created_at).slice(0, 10);
        trendMap.set(day, (trendMap.get(day) || 0) + Number(r.total));
      });
      const trend = Array.from(trendMap.entries()).map(([date, total]) => ({
        date: new Date(date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short', day: 'numeric' }),
        total,
      }));

      const top = (topProducts.data || []).map((r: Record<string, unknown>) => ({
        name: (r.product as { name: string })?.name || '-',
        quantity: Number(r.quantity),
        total: Number(r.total),
      }));

      const catMap = new Map<string, number>();
      (salesByCat.data || []).forEach((r: Record<string, unknown>) => {
        const prod = r.product as { category: { name: string } | null } | null;
        const catName = prod?.category?.name || (isAr ? 'غير مصنف' : 'Uncategorized');
        catMap.set(catName, (catMap.get(catName) || 0) + Number(r.total));
      });
      const byCat = Array.from(catMap.entries()).map(([name, total]) => ({ name, total }));

      const lowStockItems = (lowStock.data || []).filter((r: Record<string, unknown>) => {
        const qty = Number(r.quantity);
        const threshold = Number((r.product as { low_stock_threshold: number })?.low_stock_threshold || 5);
        return qty < threshold;
      }).map((r: Record<string, unknown>) => ({
        name: (r.product as { name: string })?.name || '-',
        quantity: Number(r.quantity),
        threshold: Number((r.product as { low_stock_threshold: number })?.low_stock_threshold || 5),
      }));

      setData({
        todaySales: rangeSalesTotal,
        todayExpenses: rangeExpensesTotal,
        yesterdaySales: yesterdaySalesTotal,
        totalSales,
        totalSalesCount: (salesAll.data || []).length,
        totalPurchases,
        totalExpenses,
        totalProducts: productsCount.count || 0,
        totalCustomers: customersCount.count || 0,
        lowStockCount: lowStockItems.length,
        lowStockItems,
        salesTrend: trend,
        topProducts: top,
        salesByCategory: byCat,
        recentSales: (recentSales.data || []) as { id: string; invoice_number: string; total: number; created_at: string }[],
      });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }
    load();
  }, [lang, effectiveBranchFilter, getDateRange]);

  const loadDetail = useCallback(async (type: string) => {
    setDetailLoading(true);
    setDetailModal(type);
    const { from, to } = getDateRange();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const branchEq = (q: any) => effectiveBranchFilter ? q.eq('branch_id', effectiveBranchFilter) : q;

    try {
      let rows: DetailRow[] = [];

      switch (type) {
        case 'sales': {
          let q = branchEq(supabase.from('sales').select('id, invoice_number, total, payment_method, status, created_at, customer:customers(name)')).order('created_at', { ascending: false });
          if (from) q = q.gte('created_at', from);
          q = q.lte('created_at', to);
          const { data } = await q;
          rows = (data || []).map((r: Record<string, unknown>) => ({
            id: String(r.id),
            invoice_number: String(r.invoice_number),
            total: Number(r.total),
            created_at: String(r.created_at),
            extra: `${(r.customer as { name: string } | null)?.name || '-'} | ${r.payment_method || ''} | ${r.status || ''}`,
          }));
          break;
        }
        case 'expenses': {
          let q = branchEq(supabase.from('expenses').select('id, category, description, amount, expense_date, payment_method')).order('expense_date', { ascending: false });
          if (from) q = q.gte('expense_date', from.slice(0, 10));
          q = q.lte('expense_date', to.slice(0, 10));
          const { data } = await q;
          rows = (data || []).map((r: Record<string, unknown>) => ({
            id: String(r.id),
            name: String(r.category || r.description || '-'),
            total: Number(r.amount),
            created_at: String(r.expense_date),
            extra: String(r.payment_method || ''),
          }));
          break;
        }
        case 'purchases': {
          let q = branchEq(supabase.from('purchases').select('id, invoice_number, total, created_at, supplier:suppliers(name)')).order('created_at', { ascending: false });
          if (from) q = q.gte('created_at', from);
          q = q.lte('created_at', to);
          const { data } = await q;
          rows = (data || []).map((r: Record<string, unknown>) => ({
            id: String(r.id),
            invoice_number: String(r.invoice_number),
            total: Number(r.total),
            created_at: String(r.created_at),
            extra: (r.supplier as { name: string } | null)?.name || '-',
          }));
          break;
        }
        case 'allSales': {
          let q = branchEq(supabase.from('sales').select('id, invoice_number, total, payment_method, status, created_at, customer:customers(name)')).order('created_at', { ascending: false });
          if (from) q = q.gte('created_at', from);
          q = q.lte('created_at', to);
          const { data } = await q;
          rows = (data || []).map((r: Record<string, unknown>) => ({
            id: String(r.id),
            invoice_number: String(r.invoice_number),
            total: Number(r.total),
            created_at: String(r.created_at),
            extra: `${(r.customer as { name: string } | null)?.name || '-'} | ${r.payment_method || ''} | ${r.status || ''}`,
          }));
          break;
        }
        case 'allPurchases': {
          let q = branchEq(supabase.from('purchases').select('id, invoice_number, total, created_at, supplier:suppliers(name)')).order('created_at', { ascending: false });
          if (from) q = q.gte('created_at', from);
          q = q.lte('created_at', to);
          const { data } = await q;
          rows = (data || []).map((r: Record<string, unknown>) => ({
            id: String(r.id),
            invoice_number: String(r.invoice_number),
            total: Number(r.total),
            created_at: String(r.created_at),
            extra: (r.supplier as { name: string } | null)?.name || '-',
          }));
          break;
        }
        case 'allExpenses': {
          let q = branchEq(supabase.from('expenses').select('id, category, description, amount, expense_date, payment_method')).order('expense_date', { ascending: false });
          if (from) q = q.gte('expense_date', from.slice(0, 10));
          q = q.lte('expense_date', to.slice(0, 10));
          const { data } = await q;
          rows = (data || []).map((r: Record<string, unknown>) => ({
            id: String(r.id),
            name: String(r.category || r.description || '-'),
            total: Number(r.amount),
            created_at: String(r.expense_date),
            extra: String(r.payment_method || ''),
          }));
          break;
        }
        case 'lowStock': {
          const { data } = await supabase.from('inventory').select('product_id, quantity, product:products(name, low_stock_threshold)');
          rows = (data || []).filter((r: Record<string, unknown>) => {
            const qty = Number(r.quantity);
            const threshold = Number((r.product as { low_stock_threshold: number })?.low_stock_threshold || 5);
            return qty < threshold;
          }).map((r: Record<string, unknown>) => ({
            id: String(r.product_id),
            name: (r.product as { name: string })?.name || '-',
            total: 0,
            created_at: '',
            extra: `${Number(r.quantity)} / ${Number((r.product as { low_stock_threshold: number })?.low_stock_threshold || 5)}`,
          }));
          break;
        }
      }
      setDetailData(rows);
    } catch {
      setDetailData([]);
    }
    setDetailLoading(false);
  }, [getDateRange, effectiveBranchFilter]);

  const salesTrendPct = useMemo(() => {
    if (!data || data.yesterdaySales === 0) return null;
    return ((data.todaySales - data.yesterdaySales) / data.yesterdaySales) * 100;
  }, [data]);

  const todayProfit = useMemo(() => (data ? data.todaySales - data.todayExpenses : 0), [data]);
  const totalProfit = useMemo(() => (data ? data.totalSales - data.totalExpenses : 0), [data]);
  const profitMargin = useMemo(() => {
    if (!data || data.totalSales === 0) return 0;
    return (totalProfit / data.totalSales) * 100;
  }, [data, totalProfit]);

  const rangeLabel = useMemo(() => {
    const labels: Record<DateRange, string> = {
      today: isAr ? 'اليوم' : 'Today',
      week: isAr ? 'آخر 7 أيام' : 'Last 7 Days',
      month: isAr ? 'آخر شهر' : 'Last Month',
      year: isAr ? 'آخر سنة' : 'Last Year',
      custom: isAr ? 'مخصص' : 'Custom',
    };
    return labels[dateRange];
  }, [dateRange, isAr]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
          <p className="text-sm text-slate-400">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? (isAr ? 'صباح الخير' : 'Good Morning')
    : hour < 18
      ? (isAr ? 'مساء الخير' : 'Good Afternoon')
      : (isAr ? 'مساء الخير' : 'Good Evening');

  const getModalTitle = () => {
    const titles: Record<string, string> = {
      sales: isAr ? 'فواتير البيع' : 'Sales Invoices',
      expenses: isAr ? 'المصروفات' : 'Expenses',
      purchases: isAr ? 'فواتير المشتريات' : 'Purchase Invoices',
      allSales: isAr ? 'كل المبيعات' : 'All Sales',
      allPurchases: isAr ? 'كل المشتريات' : 'All Purchases',
      allExpenses: isAr ? 'كل المصروفات' : 'All Expenses',
      lowStock: isAr ? 'المنتجات منخفضة المخزون' : 'Low Stock Products',
    };
    return titles[detailModal || ''] || '';
  };

  return (
    <div className="space-y-6 relative">
      {refreshing && (
        <div className="absolute top-2 end-2 z-50 flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-1.5 rounded-full shadow-md border border-slate-200 dark:border-slate-700">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600" />
          <span className="text-xs text-slate-500">{isAr ? 'جاري التحديث...' : 'Refreshing...'}</span>
        </div>
      )}
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 dark:from-teal-700 dark:via-teal-800 dark:to-slate-900 shadow-xl">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-8 -right-8 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-72 h-72 bg-cyan-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-teal-100" />
              <span className="text-sm text-teal-100 font-medium">{greeting}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {user?.full_name || (isAr ? 'مرحباً بك' : 'Welcome')}
            </h1>
            <p className="text-teal-100/80 text-sm mt-1">
              {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/15 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20">
              <p className="text-xs text-teal-100 font-medium mb-0.5">{isAr ? 'ربح الفترة' : "Period Profit"}</p>
              <p className="text-xl font-bold text-white">{formatCurrency(todayProfit, currency, lang)}</p>
            </div>
            <Link
              to="/pos"
              className="hidden sm:flex items-center gap-2 bg-white text-teal-700 hover:bg-teal-50 font-semibold text-sm px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              <ShoppingBag className="w-4 h-4" />
              {isAr ? 'بيع جديد' : 'New Sale'}
            </Link>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Filter className="w-4 h-4" />
            {isAr ? 'فلتر التاريخ' : 'Date Filter'}
          </div>
          <div className="flex flex-wrap gap-2">
            {(['today', 'week', 'month', 'year'] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  dateRange === r
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {r === 'today' ? (isAr ? 'اليوم' : 'Today') : r === 'week' ? (isAr ? '7 أيام' : '7 Days') : r === 'month' ? (isAr ? 'شهر' : 'Month') : (isAr ? 'سنة' : 'Year')}
              </button>
            ))}
            <button
              onClick={() => setDateRange('custom')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                dateRange === 'custom'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {isAr ? 'مخصص' : 'Custom'}
            </button>
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
              <span className="text-slate-400 text-sm">-</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
            </div>
          )}
          {user?.role === 'admin' && branches.length > 0 && (
            <select
              value={adminBranchFilter}
              onChange={(e) => setAdminBranchFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              <option value="">{isAr ? 'كل الفروع' : 'All Branches'}</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{isAr ? b.name : (b.name_en || b.name)}</option>)}
            </select>
          )}
          <span className="ms-auto text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            {rangeLabel}
          </span>
        </div>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={isAr ? 'مبيعات الفترة' : 'Period Sales'}
          value={formatCurrency(data.todaySales, currency, lang)}
          icon={<DollarSign className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-teal-500 to-teal-600"
          trend={salesTrendPct !== null ? `${Math.abs(salesTrendPct).toFixed(1)}%` : undefined}
          trendUp={(salesTrendPct ?? 0) >= 0}
          subtitle={isAr ? 'مقارنة بالأمس' : 'vs yesterday'}
          onClick={() => loadDetail('sales')}
          lang={lang}
        />
        <KpiCard
          title={isAr ? 'مصروفات الفترة' : 'Period Expenses'}
          value={formatCurrency(data.todayExpenses, currency, lang)}
          icon={<Receipt className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-rose-500 to-rose-600"
          subtitle={isAr ? 'مصروفات الفترة المحددة' : 'Expenses in period'}
          onClick={() => loadDetail('expenses')}
          lang={lang}
        />
        <KpiCard
          title={isAr ? 'ربح الفترة' : 'Period Profit'}
          value={formatCurrency(todayProfit, currency, lang)}
          icon={<Wallet className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          subtitle={isAr ? 'صافي الربح' : 'Net profit'}
          lang={lang}
        />
        <KpiCard
          title={t('lowStockProducts')}
          value={formatNumber(data.lowStockCount, 0)}
          icon={<AlertTriangle className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          subtitle={isAr ? 'تحتاج إعادة طلب' : 'Need restock'}
          onClick={() => loadDetail('lowStock')}
          lang={lang}
        />
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={t('totalSales')}
          value={formatCurrency(data.totalSales, currency, lang)}
          icon={<TrendingUp className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-green-500 to-green-600"
          subtitle={isAr ? 'إجمالي المبيعات' : 'All-time sales'}
          onClick={() => loadDetail('allSales')}
          lang={lang}
        />
        <KpiCard
          title={t('totalPurchases')}
          value={formatCurrency(data.totalPurchases, currency, lang)}
          icon={<ShoppingCart className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          subtitle={isAr ? 'إجمالي المشتريات' : 'All-time purchases'}
          onClick={() => loadDetail('allPurchases')}
          lang={lang}
        />
        <KpiCard
          title={t('totalExpenses')}
          value={formatCurrency(data.totalExpenses, currency, lang)}
          icon={<Receipt className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-rose-500 to-rose-600"
          subtitle={isAr ? 'إجمالي المصروفات' : 'All-time expenses'}
          onClick={() => loadDetail('allExpenses')}
          lang={lang}
        />
        <KpiCard
          title={t('avgInvoiceValue')}
          value={data.totalSalesCount > 0 ? formatCurrency(Math.round(data.totalSales / data.totalSalesCount), currency, lang) : formatCurrency(0, currency, lang)}
          icon={<DollarSign className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-cyan-500 to-cyan-600"
          subtitle={`${formatNumber(data.totalSalesCount, 0)} ${isAr ? 'فاتورة' : 'invoices'}`}
          lang={lang}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t('salesTrend')}</h3>
                <p className="text-xs text-slate-400">{isAr ? 'آخر 7 أيام' : 'Last 7 days'}</p>
              </div>
            </div>
            <Link to="/reports" className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1">
              {t('viewReport')}
              {isAr ? <ChevronLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.salesTrend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip content={<CustomTooltip currency={currency} lang={lang} />} />
              <Area type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={2.5} fill="url(#salesGradient)" dot={{ fill: '#0d9488', r: 3 }} activeDot={{ r: 5, strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <Crown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t('profitMargin')}</h3>
              <p className="text-xs text-slate-400">{isAr ? 'هامش الربح الإجمالي' : 'Gross profit margin'}</p>
            </div>
          </div>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={[{ name: 'margin', value: Math.min(profitMargin, 100), fill: '#10b981' }]}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: '#e2e8f0' }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{profitMargin.toFixed(1)}%</p>
              <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(totalProfit, currency, lang)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-xs text-slate-400">{isAr ? 'الإيرادات' : 'Revenue'}</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatCurrency(data.totalSales, currency, lang)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{isAr ? 'المصروفات' : 'Expenses'}</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formatCurrency(data.totalExpenses, currency, lang)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Crown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t('topProducts')}</h3>
          </div>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">{t('noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topProducts} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CustomTooltip currency={currency} lang={lang} />} cursor={{ fill: 'rgba(148,163,184,0.1)' }} />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t('salesByCategory')}</h3>
          </div>
          {data.salesByCategory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">{t('noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.salesByCategory}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {data.salesByCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip currency={currency} lang={lang} />} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {data.salesByCategory.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {data.salesByCategory.slice(0, 4).map((cat, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-slate-500 dark:text-slate-400">{cat.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{t('recentSales')}</h3>
            </div>
          </div>
          <div className="space-y-1">
            {data.recentSales.length === 0 && <p className="text-sm text-slate-400 text-center py-8">{t('noRecentSales')}</p>}
            {data.recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/40 dark:to-teal-800/40 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{sale.invoice_number}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(sale.created_at, lang)}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-teal-600 dark:text-teal-400">{formatCurrency(sale.total, currency, lang)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {data.lowStockItems.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200 dark:border-amber-800/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">{t('lowStockAlert')}</h3>
            <span className="ml-auto text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
              {data.lowStockCount} {isAr ? 'منتج' : 'items'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.lowStockItems.slice(0, 6).map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-white/60 dark:bg-slate-800/40 rounded-xl px-4 py-3 border border-amber-100 dark:border-amber-900/30">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.name}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {isAr ? 'المتبقي' : 'Left'}: {item.quantity} / {item.threshold}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
          <Link to="/inventory" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline">
            {isAr ? 'إدارة المخزون' : 'Manage Inventory'}
            {isAr ? <ChevronLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/pos" className="group flex flex-col items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg hover:-translate-y-1 transition-all">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{isAr ? 'بيع جديد' : 'New Sale'}</span>
        </Link>
        <Link to="/purchases" className="group flex flex-col items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg hover:-translate-y-1 transition-all">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
            <Truck className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{isAr ? 'إضافة شراء' : 'Add Purchase'}</span>
        </Link>
        <Link to="/expenses" className="group flex flex-col items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg hover:-translate-y-1 transition-all">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{isAr ? 'إضافة مصروف' : 'Add Expense'}</span>
        </Link>
        <Link to="/reports" className="group flex flex-col items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg hover:-translate-y-1 transition-all">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{isAr ? 'التقارير' : 'Reports'}</span>
        </Link>
      </div>

      {/* Detail Modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={getModalTitle()} size="xl">
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : detailData.length === 0 ? (
          <p className="text-center text-slate-400 py-12">{t('noData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-start py-3 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    {isAr ? 'رقم الفاتورة / الاسم' : 'Invoice / Name'}
                  </th>
                  <th className="text-start py-3 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    {isAr ? 'العميل / المورد' : 'Customer / Supplier'}
                  </th>
                  <th className="text-end py-3 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    {isAr ? 'المبلغ' : 'Amount'}
                  </th>
                  <th className="text-start py-3 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    {isAr ? 'التاريخ' : 'Date'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {detailData.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-2 font-medium text-slate-700 dark:text-slate-200">
                      {row.invoice_number || row.name}
                    </td>
                    <td className="py-3 px-2 text-slate-500 dark:text-slate-400">
                      {row.extra || '-'}
                    </td>
                    <td className="py-3 px-2 text-end font-bold text-teal-600 dark:text-teal-400">
                      {row.total > 0 ? formatCurrency(row.total, currency, lang) : row.extra || '-'}
                    </td>
                    <td className="py-3 px-2 text-slate-400 dark:text-slate-500 text-xs">
                      {row.created_at ? formatDateTime(row.created_at, lang) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-600 font-bold">
                  <td colSpan={2} className="py-3 px-2 text-slate-700 dark:text-slate-200">
                    {isAr ? 'الإجمالي' : 'Total'}
                  </td>
                  <td className="py-3 px-2 text-end text-teal-600 dark:text-teal-400">
                    {formatCurrency(detailData.reduce((s, r) => s + r.total, 0), currency, lang)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
