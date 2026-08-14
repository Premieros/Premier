import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, TrendingUp, ShoppingCart, Receipt, Package, BarChart3, CreditCard, Users, FileText, List, Layers, TrendingDown, AlertTriangle } from 'lucide-react';
import { supabase } from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { formatCurrency, formatDate, todayISO } from '@/lib/format';
import { getBrandColor } from '@/lib/brandColor';
import { exportToExcel } from '@/lib/excel';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { isAdminRole, useCan } from '@/lib/permissions';
import { useBranches } from '@/hooks/useBranches';
import { useSettings } from '@/context/SettingsContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

type ReportType = 'sales' | 'purchases' | 'expenses' | 'profit' | 'inventory' | 'sales_by_payment' | 'sales_by_employee' | 'sales_by_product' | 'detailed_invoices' | 'component_consumption' | 'recipe_costs' | 'top_consumed_components' | 'top_consumed_products' | 'low_stock';

type FinancialReportType = 'trial_balance' | 'ledger' | 'income' | 'balance_sheet' | 'ar_aging' | 'ap_aging' | 'aging_summary' | 'cash_flow' | 'party_statement';

type PeriodKey = 'custom' | 'today' | 'yesterday' | 'last7' | 'last30' | 'this_month' | 'last_month' | 'this_year';

const PIE_COLORS = [getBrandColor(600), '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#ec4899', getBrandColor(500)];

export function ReportsPage() {
  /* REPORT-BRANCH-AUDIT-2026 */
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const can = useCan();
  const navigate = useNavigate();
  const branchFilter = useBranchFilter();
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(todayISO());
  const [period, setPeriod] = useState<PeriodKey>('custom');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);
  const [summary, setSummary] = useState({ total: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const [adminBranchFilter, setAdminBranchFilter] = useState<string>('');
  const effectiveBranchFilter = isAdminRole(user?.role) ? (adminBranchFilter || null) : branchFilter;
  const { branches } = useBranches();
  const { effectiveSettings } = useSettings();
  const currency = effectiveSettings(effectiveBranchFilter)?.currency || 'EGP';

  const financialTypes: { key: FinancialReportType; label: string }[] = [
    { key: 'trial_balance', label: t('trialBalance') },
    { key: 'ledger', label: t('generalLedger') },
    { key: 'income', label: t('incomeStatement') },
    { key: 'balance_sheet', label: t('balanceSheet') },
    { key: 'ar_aging', label: t('arAging') },
    { key: 'ap_aging', label: t('apAging') },
    { key: 'aging_summary', label: t('agingSummary') },
    { key: 'cash_flow', label: t('cashFlow') },
    { key: 'party_statement', label: t('partyStatement') },
  ];
  const canFinancial = can('reports.financial');

  function handleReportTypeSelect(value: string) {
    if (financialTypes.some((f) => f.key === value)) {
      navigate(`/financial-reports?view=${value}&from=${from}&to=${to}`);
      return;
    }
    setReportType(value as ReportType);
  }

  function applyPeriod(key: PeriodKey) {
    const now = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = iso(now);
    let f = from;
    let t = today;
    if (key === 'today') {
      f = today;
    } else if (key === 'yesterday') {
      const y = new Date(now.getTime() - 86400000);
      f = iso(y);
      t = f;
    } else if (key === 'last7') {
      f = iso(new Date(now.getTime() - 6 * 86400000));
    } else if (key === 'last30') {
      f = iso(new Date(now.getTime() - 29 * 86400000));
    } else if (key === 'this_month') {
      f = iso(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (key === 'last_month') {
      f = iso(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      t = iso(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (key === 'this_year') {
      f = iso(new Date(now.getFullYear(), 0, 1));
    }
    setPeriod(key);
    setFrom(f);
    setTo(t);
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, from, to, effectiveBranchFilter]);

  async function loadReport() {
    setLoading(true);
    try {
      const fromTs = `${from}T00:00:00`;
      const toTs = `${to}T23:59:59`;

      if (reportType === 'sales') {
        let q = supabase.from('sales').select('id, invoice_number, total, created_at, customer:customers(name)').gte('created_at', fromTs).lte('created_at', toTs).order('created_at', { ascending: false });
        if (effectiveBranchFilter) q = q.eq('branch_id', effectiveBranchFilter);
        const { data: sales } = await q;
        const rows = (sales || []).map((s: Record<string, unknown>) => ({ [lang === 'ar' ? 'الفاتورة' : 'Invoice']: s.invoice_number, [lang === 'ar' ? 'التاريخ' : 'Date']: formatDate(s.created_at as string, lang), [lang === 'ar' ? 'العميل' : 'Customer']: (s.customer as { name?: string })?.name || '', [lang === 'ar' ? 'الإجمالي' : 'Total']: Number(s.total) }));
        setData(rows);
        setChartData((sales || []).slice(0, 10).map((s: Record<string, unknown>) => ({ name: String(s.invoice_number), value: Number(s.total) })));
        setSummary({ total: (sales || []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.total), 0), count: (sales || []).length });
      } else if (reportType === 'purchases') {
        let q = supabase.from('purchases').select('id, invoice_number, total, created_at, supplier:suppliers(name)').gte('created_at', fromTs).lte('created_at', toTs).order('created_at', { ascending: false });
        if (effectiveBranchFilter) q = q.eq('branch_id', effectiveBranchFilter);
        const { data: purchases } = await q;
        const rows = (purchases || []).map((p: Record<string, unknown>) => ({ [lang === 'ar' ? 'الفاتورة' : 'Invoice']: p.invoice_number, [lang === 'ar' ? 'التاريخ' : 'Date']: formatDate(p.created_at as string, lang), [lang === 'ar' ? 'المورد' : 'Supplier']: (p.supplier as { name?: string })?.name || '', [lang === 'ar' ? 'الإجمالي' : 'Total']: Number(p.total) }));
        setData(rows);
        setChartData((purchases || []).slice(0, 10).map((p: Record<string, unknown>) => ({ name: String(p.invoice_number), value: Number(p.total) })));
        setSummary({ total: (purchases || []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.total), 0), count: (purchases || []).length });
      } else if (reportType === 'expenses') {
        let q = supabase.from('expenses').select('id, category, description, amount, expense_date').gte('expense_date', from).lte('expense_date', to).order('expense_date', { ascending: false });
        if (effectiveBranchFilter) q = q.eq('branch_id', effectiveBranchFilter);
        const { data: expenses } = await q;
        const rows = (expenses || []).map((e: Record<string, unknown>) => ({ [lang === 'ar' ? 'التاريخ' : 'Date']: formatDate(e.expense_date as string, lang), [lang === 'ar' ? 'الفئة' : 'Category']: e.category || '', [lang === 'ar' ? 'الوصف' : 'Description']: e.description || '', [lang === 'ar' ? 'المبلغ' : 'Amount']: Number(e.amount) }));
        setData(rows);
        const catMap = new Map<string, number>();
        (expenses || []).forEach((e: Record<string, unknown>) => catMap.set(String(e.category || ''), (catMap.get(String(e.category || '')) || 0) + Number(e.amount)));
        setChartData(Array.from(catMap.entries()).map(([name, value]) => ({ name: name || (lang === 'ar' ? 'غير محدد' : 'Other'), value })));
        setSummary({ total: (expenses || []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.amount), 0), count: (expenses || []).length });
      } else if (reportType === 'profit') {
        let salesQ = supabase.from('sales').select('total').gte('created_at', fromTs).lte('created_at', toTs);
        let purchasesQ = supabase.from('purchases').select('total').gte('created_at', fromTs).lte('created_at', toTs);
        let expensesQ = supabase.from('expenses').select('amount').gte('expense_date', from).lte('expense_date', to);
        if (effectiveBranchFilter) { salesQ = salesQ.eq('branch_id', effectiveBranchFilter); purchasesQ = purchasesQ.eq('branch_id', effectiveBranchFilter); expensesQ = expensesQ.eq('branch_id', effectiveBranchFilter); }
        const [sales, purchases, expenses] = await Promise.all([salesQ, purchasesQ, expensesQ]);
        const totalSales = (sales.data || []).reduce((s, r) => s + Number(r.total), 0);
        const totalPurchases = (purchases.data || []).reduce((s, r) => s + Number(r.total), 0);
        const totalExpenses = (expenses.data || []).reduce((s, r) => s + Number(r.amount), 0);
        const profit = totalSales - totalPurchases - totalExpenses;
        setData([{ [lang === 'ar' ? 'الفترة' : 'Period']: `${from} - ${to}`, [lang === 'ar' ? 'المبيعات' : 'Sales']: totalSales, [lang === 'ar' ? 'المشتريات' : 'Purchases']: totalPurchases, [lang === 'ar' ? 'المصروفات' : 'Expenses']: totalExpenses, [lang === 'ar' ? 'الربح' : 'Profit']: profit }]);
        setChartData([
          { name: t('totalSales'), value: totalSales },
          { name: t('totalPurchases'), value: totalPurchases },
          { name: t('totalExpenses'), value: totalExpenses },
          { name: t('netProfit'), value: profit },
        ]);
        setSummary({ total: profit, count: 1 });
      } else if (reportType === 'inventory') {
        let inventoryQuery = supabase.from('inventory').select('quantity, product:products(name, barcode, low_stock_threshold), warehouse:warehouses(name)').order('updated_at', { ascending: false });
        if (effectiveBranchFilter) inventoryQuery = inventoryQuery.eq('branch_id', effectiveBranchFilter);
        const { data: inv } = await inventoryQuery;
        const rows = (inv || []).map((i: Record<string, unknown>) => {
          const product = i.product as { name: string; barcode: string | null; low_stock_threshold: number };
          const warehouse = i.warehouse as { name: string };
          return { [lang === 'ar' ? 'المنتج' : 'Product']: product?.name || '', [lang === 'ar' ? 'الباركود' : 'Barcode']: product?.barcode || '', [lang === 'ar' ? 'المستودع' : 'Warehouse']: warehouse?.name || '', [lang === 'ar' ? 'الكمية' : 'Quantity']: Number(i.quantity) };
        });
        setData(rows);
        setChartData(rows.slice(0, 10).map((r) => ({ name: String(Object.values(r)[0]), value: Number(Object.values(r)[3]) })));
        setSummary({ total: rows.reduce((s, r) => s + Number(Object.values(r)[3]), 0), count: rows.length });
      } else if (reportType === 'sales_by_payment') {
        let q = supabase.from('sales').select('payment_method, total').gte('created_at', fromTs).lte('created_at', toTs);
        if (effectiveBranchFilter) q = q.eq('branch_id', effectiveBranchFilter);
        const { data: sales } = await q;
        const methodMap = new Map<string, { total: number; count: number }>();
        (sales || []).forEach((s: Record<string, unknown>) => {
          const method = String(s.payment_method || '');
          const existing = methodMap.get(method) || { total: 0, count: 0 };
          methodMap.set(method, { total: existing.total + Number(s.total), count: existing.count + 1 });
        });
        const METHOD_LABELS: Record<string, string> = { cash: t('cash'), card: t('card'), transfer: t('transfer'), credit: t('credit') };
        const rows = Array.from(methodMap.entries()).map(([method, data]) => ({
          [lang === 'ar' ? 'طريقة الدفع' : 'Payment Method']: METHOD_LABELS[method] || method,
          [lang === 'ar' ? 'الإجمالي' : 'Total']: data.total,
          [lang === 'ar' ? 'العدد' : 'Count']: data.count,
        }));
        setData(rows);
        setChartData(Array.from(methodMap.entries()).map(([method, data]) => ({ name: METHOD_LABELS[method] || method, value: data.total })));
        setSummary({ total: (sales || []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.total), 0), count: (sales || []).length });
      } else if (reportType === 'sales_by_employee') {
        let q = supabase.from('sales').select('cashier_id, total, users:users!fk_sales_cashier(full_name, email)').gte('created_at', fromTs).lte('created_at', toTs);
        if (effectiveBranchFilter) q = q.eq('branch_id', effectiveBranchFilter);
        const { data: sales } = await q;
        const empMap = new Map<string, { name: string; total: number; count: number }>();
        (sales || []).forEach((s: Record<string, unknown>) => {
          const cashier = s.users as { full_name?: string; email?: string } | null;
          const name = cashier?.full_name || cashier?.email || (lang === 'ar' ? 'غير معروف' : 'Unknown');
          const existing = empMap.get(name) || { name, total: 0, count: 0 };
          empMap.set(name, { name, total: existing.total + Number(s.total), count: existing.count + 1 });
        });
        const rows = Array.from(empMap.values()).sort((a, b) => b.total - a.total).map((e) => ({
          [lang === 'ar' ? 'الموظف' : 'Employee']: e.name,
          [lang === 'ar' ? 'الإجمالي' : 'Total']: e.total,
          [lang === 'ar' ? 'الفواتير' : 'Invoices']: e.count,
          [lang === 'ar' ? 'متوسط الفاتورة' : 'Avg Invoice']: e.count > 0 ? Math.round(e.total / e.count) : 0,
        }));
        setData(rows);
        setChartData(Array.from(empMap.values()).sort((a, b) => b.total - a.total).slice(0, 10).map((e) => ({ name: e.name, value: e.total })));
        setSummary({ total: (sales || []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.total), 0), count: (sales || []).length });
      } else if (reportType === 'sales_by_product') {
        let itemsQuery = supabase.from('sale_items').select('quantity, total, product:products(name), sale:sales(created_at, branch_id)');
        if (effectiveBranchFilter) itemsQuery = itemsQuery.eq('sale.branch_id', effectiveBranchFilter);
        const { data: items } = await itemsQuery;
        const filtered = (items || []).filter((item: Record<string, unknown>) => {
          const sale = item.sale as { created_at: string } | null;
          if (!sale) return false;
          return sale.created_at >= fromTs && sale.created_at <= toTs;
        });
        const prodMap = new Map<string, { name: string; quantity: number; total: number }>();
        filtered.forEach((item: Record<string, unknown>) => {
          const product = item.product as { name: string } | null;
          const name = product?.name || (lang === 'ar' ? 'غير معروف' : 'Unknown');
          const existing = prodMap.get(name) || { name, quantity: 0, total: 0 };
          prodMap.set(name, { name, quantity: existing.quantity + Number(item.quantity), total: existing.total + Number(item.total) });
        });
        const rows = Array.from(prodMap.values()).sort((a, b) => b.total - a.total).map((p) => ({
          [lang === 'ar' ? 'المنتج' : 'Product']: p.name,
          [lang === 'ar' ? 'الكمية' : 'Quantity']: p.quantity,
          [lang === 'ar' ? 'الإيراد' : 'Revenue']: p.total,
        }));
        setData(rows);
        setChartData(Array.from(prodMap.values()).sort((a, b) => b.total - a.total).slice(0, 10).map((p) => ({ name: p.name, value: p.total })));
        setSummary({ total: rows.reduce((s, r) => s + Number(Object.values(r)[2]), 0), count: rows.length });
      } else if (reportType === 'detailed_invoices') {
        let q = supabase.from('sales').select('id, invoice_number, total, paid_amount, payment_method, status, created_at, customer:customers(name), cashier:users!fk_sales_cashier(full_name)').gte('created_at', fromTs).lte('created_at', toTs).order('created_at', { ascending: false });
        if (effectiveBranchFilter) q = q.eq('branch_id', effectiveBranchFilter);
        const { data: sales } = await q;
        const rows = (sales || []).map((s: Record<string, unknown>) => {
          const customer = s.customer as { name?: string } | null;
          const cashier = s.cashier as { full_name?: string } | null;
          return {
            [lang === 'ar' ? 'رقم الفاتورة' : 'Invoice']: s.invoice_number,
            [lang === 'ar' ? 'التاريخ' : 'Date']: formatDate(s.created_at as string, lang),
            [lang === 'ar' ? 'العميل' : 'Customer']: customer?.name || '-',
            [lang === 'ar' ? 'أمين الصندوق' : 'Cashier']: cashier?.full_name || '-',
            [lang === 'ar' ? 'طريقة الدفع' : 'Payment']: s.payment_method,
            [lang === 'ar' ? 'الإجمالي' : 'Total']: Number(s.total),
            [lang === 'ar' ? 'المدفوع' : 'Paid']: Number(s.paid_amount),
            [lang === 'ar' ? 'الحالة' : 'Status']: s.status,
          };
        });
        setData(rows);
        setChartData([]);
        setSummary({ total: rows.reduce((s, r) => s + Number(Object.values(r)[5] || 0), 0), count: rows.length });
      } else if (reportType === 'component_consumption') {
        let q = supabase.from('stock_transactions').select('product_id, quantity, unit_cost, created_at, product:products(name), warehouse:warehouses(name)').eq('component_flow', true).eq('transaction_type', 'sale').gte('created_at', fromTs).lte('created_at', toTs);
        if (effectiveBranchFilter) q = q.eq('branch_id', effectiveBranchFilter);
        const { data: tx } = await q;
        const map = new Map<string, { name: string; qty: number; cost: number; count: number }>();
        (tx || []).forEach((t: Record<string, unknown>) => {
          const product = t.product as { name?: string } | null;
          const name = product?.name || (lang === 'ar' ? 'غير معروف' : 'Unknown');
          const e = map.get(name) || { name, qty: 0, cost: 0, count: 0 };
          const qty = -Number(t.quantity);
          e.qty += qty;
          e.cost += qty * Number(t.unit_cost || 0);
          e.count += 1;
          map.set(name, e);
        });
        const rows = Array.from(map.values()).sort((a, b) => b.qty - a.qty).map((e) => ({
          [lang === 'ar' ? 'المكوّن' : 'Component']: e.name,
          [lang === 'ar' ? 'الكمية المستهلكة' : 'Consumed Qty']: e.qty,
          [lang === 'ar' ? 'تكلفة الاستهلاك' : 'Consumption Cost']: e.cost,
          [lang === 'ar' ? 'عدد الحركات' : 'Movements']: e.count,
        }));
        setData(rows);
        setChartData(rows.slice(0, 10).map((r) => ({ name: String(Object.values(r)[0]), value: Number(Object.values(r)[1]) })));
        setSummary({ total: rows.reduce((s, r) => s + Number(Object.values(r)[2]), 0), count: rows.length });
      } else if (reportType === 'top_consumed_components') {
        let q = supabase.from('stock_transactions').select('product_id, quantity, product:products(name)').eq('component_flow', true).eq('transaction_type', 'sale').gte('created_at', fromTs).lte('created_at', toTs);
        if (effectiveBranchFilter) q = q.eq('branch_id', effectiveBranchFilter);
        const { data: tx } = await q;
        const map = new Map<string, { name: string; qty: number }>();
        (tx || []).forEach((t: Record<string, unknown>) => {
          const product = t.product as { name?: string } | null;
          const name = product?.name || (lang === 'ar' ? 'غير معروف' : 'Unknown');
          const e = map.get(name) || { name, qty: 0 };
          e.qty += -Number(t.quantity);
          map.set(name, e);
        });
        const rows = Array.from(map.values()).sort((a, b) => b.qty - a.qty).map((p) => ({
          [lang === 'ar' ? 'المكوّن' : 'Component']: p.name,
          [lang === 'ar' ? 'الكمية المستهلكة' : 'Consumed Qty']: p.qty,
        }));
        setData(rows);
        setChartData(rows.slice(0, 10).map((p) => ({ name: String(p.name), value: Number(p.qty) })));
        setSummary({ total: rows.length, count: rows.length });
      } else if (reportType === 'top_consumed_products') {
        let itemsQuery = supabase.from('sale_items').select('quantity, product:products(name), sale:sales(created_at, branch_id)');
        if (effectiveBranchFilter) itemsQuery = itemsQuery.eq('sale.branch_id', effectiveBranchFilter);
        const { data: items } = await itemsQuery;
        const filtered = (items || []).filter((item: Record<string, unknown>) => {
          const sale = item.sale as { created_at: string } | null;
          if (!sale) return false;
          return sale.created_at >= fromTs && sale.created_at <= toTs;
        });
        const prodMap = new Map<string, { name: string; quantity: number }>();
        filtered.forEach((item: Record<string, unknown>) => {
          const product = item.product as { name: string } | null;
          const name = product?.name || (lang === 'ar' ? 'غير معروف' : 'Unknown');
          const existing = prodMap.get(name) || { name, quantity: 0 };
          existing.quantity += Number(item.quantity);
          prodMap.set(name, existing);
        });
        const rows = Array.from(prodMap.values()).sort((a, b) => b.quantity - a.quantity).map((p) => ({
          [lang === 'ar' ? 'المنتج' : 'Product']: p.name,
          [lang === 'ar' ? 'الكمية' : 'Quantity']: p.quantity,
        }));
        setData(rows);
        setChartData(rows.slice(0, 10).map((p) => ({ name: String(p.name), value: Number(p.quantity) })));
        setSummary({ total: rows.length, count: rows.length });
      } else if (reportType === 'recipe_costs') {
        let compQuery = supabase.from('product_components').select('product_id, component_product_id, quantity, product:products(branch_id)');
        let prodQuery = supabase.from('products').select('id, name, sale_price, cost_price, product_type');
        if (effectiveBranchFilter) {
          compQuery = compQuery.eq('product.branch_id', effectiveBranchFilter);
          prodQuery = prodQuery.eq('branch_id', effectiveBranchFilter);
        }
        const [rec, prod] = await Promise.all([compQuery, prodQuery]);
        const productsById = new Map<string, Record<string, unknown>>();
        (prod.data || []).forEach((p) => productsById.set(p.id as string, p));
        const costMap = new Map<string, number>();
        (rec.data || []).forEach((r: Record<string, unknown>) => {
          const pid = r.product_id as string;
          const cp = productsById.get(r.component_product_id as string) as { cost_price?: number } | undefined;
          costMap.set(pid, (costMap.get(pid) || 0) + Number(cp?.cost_price || 0) * Number(r.quantity));
        });
        const rows = Array.from(costMap.entries()).map(([pid, cost]) => {
          const p = productsById.get(pid) as { name?: string; sale_price?: number } | undefined;
          const sale = Number(p?.sale_price || 0);
          return {
            [lang === 'ar' ? 'المنتج' : 'Product']: p?.name || '-',
            [lang === 'ar' ? 'تكلفة الوصفة' : 'Recipe Cost']: cost,
            [lang === 'ar' ? 'سعر البيع' : 'Sale Price']: sale,
            [lang === 'ar' ? 'الهامش' : 'Margin']: sale - cost,
          };
        }).sort((a, b) => Number(Object.values(b)[3]) - Number(Object.values(a)[3]));
        setData(rows);
        setChartData(rows.slice(0, 10).map((r) => ({ name: String(Object.values(r)[0]), value: Number(Object.values(r)[3]) })));
        setSummary({ total: rows.reduce((s, r) => s + Number(Object.values(r)[1]), 0), count: rows.length });
      } else if (reportType === 'low_stock') {
        let lowStockQuery = supabase.from('inventory').select('quantity, product:products(name, barcode, low_stock_threshold, product_type), warehouse:warehouses(name)');
        if (effectiveBranchFilter) lowStockQuery = lowStockQuery.eq('branch_id', effectiveBranchFilter);
        const { data: inv } = await lowStockQuery;
        const rows = (inv || [])
          .map((i: Record<string, unknown>) => {
            const product = i.product as { name: string; barcode: string | null; low_stock_threshold: number } | null;
            const warehouse = i.warehouse as { name: string } | null;
            return { product, warehouse: warehouse?.name || '', qty: Number(i.quantity), threshold: product?.low_stock_threshold || 5, barcode: product?.barcode || '' };
          })
          .filter((r) => r.qty <= r.threshold)
          .map((r) => ({
            [lang === 'ar' ? 'المنتج' : 'Product']: r.product?.name || '-',
            [lang === 'ar' ? 'الباركود' : 'Barcode']: r.barcode,
            [lang === 'ar' ? 'المستودع' : 'Warehouse']: r.warehouse,
            [lang === 'ar' ? 'الكمية' : 'Quantity']: r.qty,
            [lang === 'ar' ? 'الحد الأدنى' : 'Low Stock Threshold']: r.threshold,
          }));
        setData(rows);
        setChartData(rows.slice(0, 10).map((r) => ({ name: String(Object.values(r)[0]), value: Number(Object.values(r)[3]) })));
        setSummary({ total: 0, count: rows.length });
      }
    } finally { setLoading(false); }
  }

  const handleExport = () => exportToExcel(data, `report_${reportType}_${from}_${to}`);

  const reportTypes: { key: ReportType; label: string; icon: React.ReactNode }[] = [
    { key: 'sales', label: t('salesReport'), icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'sales_by_payment', label: t('salesByPayment'), icon: <CreditCard className="w-4 h-4" /> },
    { key: 'sales_by_employee', label: t('salesByEmployee'), icon: <Users className="w-4 h-4" /> },
    { key: 'sales_by_product', label: t('salesByProduct'), icon: <Package className="w-4 h-4" /> },
    { key: 'detailed_invoices', label: t('detailedInvoices'), icon: <List className="w-4 h-4" /> },
    { key: 'purchases', label: t('purchasesReport'), icon: <ShoppingCart className="w-4 h-4" /> },
    { key: 'expenses', label: t('expensesReport'), icon: <Receipt className="w-4 h-4" /> },
    { key: 'profit', label: t('profitReport'), icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'inventory', label: t('inventoryReport'), icon: <Package className="w-4 h-4" /> },
    { key: 'component_consumption', label: t('componentConsumptionReport'), icon: <Layers className="w-4 h-4" /> },
    { key: 'recipe_costs', label: t('recipeCostReport'), icon: <FileText className="w-4 h-4" /> },
    { key: 'top_consumed_components', label: t('topConsumedComponentsReport'), icon: <TrendingDown className="w-4 h-4" /> },
    { key: 'top_consumed_products', label: t('topConsumedProductsReport'), icon: <Package className="w-4 h-4" /> },
    { key: 'low_stock', label: t('lowStockReport'), icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  const isPie = reportType === 'expenses' || reportType === 'profit' || reportType === 'sales_by_payment';

  const moneyKeys = [lang === 'ar' ? 'الإجمالي' : 'Total', lang === 'ar' ? 'المبلغ' : 'Amount', lang === 'ar' ? 'الربح' : 'Profit', lang === 'ar' ? 'المبيعات' : 'Sales', lang === 'ar' ? 'المشتريات' : 'Purchases', lang === 'ar' ? 'المصروفات' : 'Expenses', lang === 'ar' ? 'الإيراد' : 'Revenue', lang === 'ar' ? 'المدفوع' : 'Paid', lang === 'ar' ? 'متوسط الفاتورة' : 'Avg Invoice', lang === 'ar' ? 'تكلفة الاستهلاك' : 'Consumption Cost', lang === 'ar' ? 'تكلفة الوصفة' : 'Recipe Cost', lang === 'ar' ? 'سعر البيع' : 'Sale Price', lang === 'ar' ? 'الهامش' : 'Margin'];

  return (
    <div>
      <PageHeader title={t('reports')} actions={<Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4" /> {t('exportExcel')}</Button>} />

      <Card className="mb-4 p-4 border-ui-border bg-ui-surface shadow-ui">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[220px]">
              <label className="block text-sm font-medium text-ui-muted mb-1.5">{t('reports')}</label>
              <select data-testid="report-type-select" value={reportType} onChange={(e) => handleReportTypeSelect(e.target.value)}
                className="h-10 w-full rounded-ui border border-ui-border bg-ui-surface-raised px-3 text-sm font-semibold text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-ring">
                <optgroup label={lang === 'ar' ? 'التقارير التشغيلية' : 'Operational reports'}>
                  {reportTypes.map((rt) => <option key={rt.key} value={rt.key}>{rt.label}</option>)}
                </optgroup>
                {canFinancial && (
                  <optgroup label={lang === 'ar' ? 'التقارير المالية' : 'Financial reports'}>
                    {financialTypes.map((ft) => <option key={ft.key} value={ft.key}>{ft.label}</option>)}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-ui-muted mb-1.5">{t('filterByPeriod')}</label>
              <select data-testid="report-context-filter" value={period} onChange={(e) => applyPeriod(e.target.value as PeriodKey)}
                className="h-10 w-full rounded-ui border border-ui-border bg-ui-surface-raised px-3 text-sm font-semibold text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-ring">
                <option value="custom">{lang === 'ar' ? 'مخصص' : 'Custom'}</option>
                <option value="today">{lang === 'ar' ? 'اليوم' : 'Today'}</option>
                <option value="yesterday">{lang === 'ar' ? 'أمس' : 'Yesterday'}</option>
                <option value="last7">{lang === 'ar' ? 'آخر 7 أيام' : 'Last 7 days'}</option>
                <option value="last30">{lang === 'ar' ? 'آخر 30 يومًا' : 'Last 30 days'}</option>
                <option value="this_month">{lang === 'ar' ? 'هذا الشهر' : 'This month'}</option>
                <option value="last_month">{lang === 'ar' ? 'الشهر الماضي' : 'Last month'}</option>
                <option value="this_year">{lang === 'ar' ? 'هذه السنة' : 'This year'}</option>
              </select>
            </div>
            <Input label={t('from')} type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPeriod('custom'); }} />
            <Input label={t('to')} type="date" value={to} onChange={(e) => { setTo(e.target.value); setPeriod('custom'); }} />
            {isAdminRole(user?.role) && branches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-ui-muted mb-1.5">{t('filterByBranch')}</label>
                <select value={adminBranchFilter} onChange={(e) => setAdminBranchFilter(e.target.value)}
                  className="h-10 min-w-[180px] rounded-ui border border-ui-border bg-ui-surface-raised px-3 text-sm font-semibold text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-ring">
                  <option value="">{t('allBranches')}</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{lang === 'ar' ? b.name : (b.name_en || b.name)}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-4 text-sm">
              <div className="rounded-ui-lg bg-ui-page-alt px-4 py-2 border border-ui-border">
                <span className="text-ui-muted">{t('total')}: </span>
                <span className="font-bold text-ui-accent">{formatCurrency(summary.total, currency, lang)}</span>
              </div>
              <div className="rounded-ui-lg bg-ui-page-alt px-4 py-2 border border-ui-border">
                <span className="text-ui-muted">{t('count')}: </span>
                <span className="font-bold text-ui-text">{summary.count}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-ui-border pt-3">
            {reportTypes.map((rt) => (
              <button key={rt.key} data-report-type={rt.key} onClick={() => setReportType(rt.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-ui-lg text-sm font-medium transition-colors ${reportType === rt.key ? 'bg-ui-primary text-ui-primary-fg shadow-ui-sm' : 'bg-ui-page-alt text-ui-muted border border-ui-border hover:bg-ui-primary-soft hover:text-ui-primary'}`}>
                {rt.icon} {rt.label}
              </button>
            ))}
            {canFinancial && financialTypes.map((ft) => (
              <button key={ft.key} data-report-type={ft.key} onClick={() => handleReportTypeSelect(ft.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-ui-lg text-sm font-medium transition-colors bg-ui-page-alt text-ui-muted border border-ui-border hover:bg-ui-primary-soft hover:text-ui-primary`}>
                {ft.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {chartData.length > 0 && (
        <Card className="mb-4 p-5 border-ui-border bg-ui-surface shadow-ui">
          <ResponsiveContainer width="100%" height={300}>
            {isPie ? (
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: { name?: string }) => e.name || ''}>
                  {chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(value) => formatCurrency(Number(value ?? 0), currency, lang)} />
                <Legend />
              </PieChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(value) => formatCurrency(Number(value ?? 0), currency, lang)} />
                <Bar dataKey="value" fill={getBrandColor(600)} radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="p-4 border-ui-border bg-ui-surface shadow-ui">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-ui-subtle text-sm">{t('noData')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ui-border">
                  {Object.keys(data[0]).map((key) => (
                    <th key={key} className="px-4 py-3 text-start font-semibold text-ui-muted text-xs uppercase tracking-wider">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-b border-ui-border/60 hover:bg-ui-page-alt">
                    {Object.entries(row).map(([key, val], j) => (
                      <td key={j} className="px-4 py-3 text-ui-text">
                        {typeof val === 'number' && moneyKeys.includes(key)
                          ? formatCurrency(val, currency, lang)
                          : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
