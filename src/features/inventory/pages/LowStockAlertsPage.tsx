import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/api';
import * as api from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { DesignSurface, DesignPageHeader, DesignSearch, DesignPanel } from '@/components/design';
import { DataTable, type Column } from '@/components/DataTable';
import { Button } from '@/components/Button';
import { Select } from '@/components/Input';
import { formatNumber } from '@/lib/format';
import { exportToExcel } from '@/lib/excel';
import type { LowStockAlertRow, Warehouse } from '@/lib/types';

export function LowStockAlertsPage() {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const { show } = useToast();
  const branchFilter = useBranchFilter();

  const [rows, setRows] = useState<LowStockAlertRow[]>([]);
  const [summary, setSummary] = useState<{ out_count?: number; low_count?: number; ok_count?: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState(branchFilter || '');
  const [warehouseId, setWarehouseId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [br, wh] = await Promise.all([
      supabase.from('branches').select('id, name').eq('is_active', true).order('name'),
      supabase.from('warehouses').select('*').eq('is_active', true).order('name'),
    ]);
    if (br.error) { setError(br.error.message); setLoading(false); show(br.error.message, 'error'); return; }
    const b = (br.data as { id: string; name: string }[] | null) || [];
    setBranches(b);
    setWarehouses((wh.data as Warehouse[]) || []);
    let effBranch = branchId;
    if (!effBranch && b.length === 1) { effBranch = b[0].id; setBranchId(effBranch); }

    const [alerts, sum] = await Promise.all([
      api.inventory.getLowStockAlerts({ p_branch_id: effBranch || null, p_warehouse_id: warehouseId || null }),
      api.inventory.getLowStockSummary({ p_branch_id: effBranch || null, p_warehouse_id: warehouseId || null }),
    ]);
    if (alerts.error || sum.error) { setError(alerts.error?.message || sum.error?.message || t('error')); setLoading(false); return; }
    setRows(alerts.data || []);
    setSummary(sum.data || {});
    setLoading(false);
  }, [branchId, warehouseId, show, t]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.map((r) => ({
    ...r,
    id: `${r.product_id}-${r.warehouse_id || 'n/a'}`,
  })).filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.product_name.toLowerCase().includes(q)
      || (r.barcode || '').toLowerCase().includes(q)
      || (r.warehouse_name || '').toLowerCase().includes(q);
  });

  const visibleBranches = branchFilter ? branches.filter((b) => b.id === branchFilter) : branches;

  const handleExport = () => {
    exportToExcel(filtered.map((r) => ({
      Product: r.product_name, Barcode: r.barcode || '', SKU: r.sku || '',
      Warehouse: r.warehouse_name || '', Quantity: r.quantity,
      ReorderPoint: r.reorder_point, LowStockThreshold: r.low_stock_threshold,
      Shortage: r.shortage_qty, Status: r.status,
    })), 'low-stock-alerts');
  };

  const statusPill = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      out: { label: t('statusOut'), cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
      low: { label: t('statusLow'), cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
      ok: { label: t('statusOk'), cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    };
    const s = map[status] || map.ok;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
  };

  const columns: Column<LowStockAlertRow & { id: string }>[] = [
    { key: 'product', header: t('product'), render: (r) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
          {r.product_name[0]}
        </div>
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-200">{r.product_name}</p>
          <p className="text-xs text-slate-400">{r.barcode || r.sku || ''}</p>
        </div>
      </div>
    )},
    { key: 'warehouse', header: t('warehouse'), render: (r) => r.warehouse_name || '-' },
    { key: 'quantity', header: t('quantity'), render: (r) => (
      <span className={`font-semibold ${r.status === 'out' ? 'text-red-600 dark:text-red-400' : r.status === 'low' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
        {formatNumber(Number(r.quantity))}
      </span>
    )},
    { key: 'reorder', header: t('reorderPoint'), render: (r) => formatNumber(Number(r.reorder_point || r.low_stock_threshold)) },
    { key: 'shortage', header: t('shortageQty'), render: (r) => (
      <span className="font-semibold text-red-600 dark:text-red-400">{formatNumber(Number(r.shortage_qty))}</span>
    )},
    { key: 'status', header: t('status'), render: (r) => statusPill(r.status) },
  ];

  return (
    <DesignSurface testId="low-stock-alerts-page">
      <DesignPageHeader title={t('lowStockAlerts')} subtitle={isAr ? 'تنبيهات إعادة الطلب للمنتجات المنخفضة أو النافدة' : 'Reorder alerts for low or out-of-stock products'} actions={
        <Button variant="outline" size="sm" onClick={handleExport}>{t('exportExcel')}</Button>
      } />

      <DesignPanel testId="alerts-summary-panel">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-ui-lg border border-ui-border bg-ui-page p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t('statusOut')}</p>
            <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{summary.out_count ?? 0}</p>
          </div>
          <div className="rounded-ui-lg border border-ui-border bg-ui-page p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t('statusLow')}</p>
            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.low_count ?? 0}</p>
          </div>
          <div className="rounded-ui-lg border border-ui-border bg-ui-page p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t('statusOk')}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.ok_count ?? 0}</p>
          </div>
        </div>
      </DesignPanel>

      <DesignPanel testId="alerts-search-panel">
        <div className="flex flex-col sm:flex-row gap-3">
          <DesignSearch value={search} onChange={setSearch} className="flex-1" label={t('search')} placeholder={t('search')} testId="alerts-search" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-36">
            <option value="all">{t('all')}</option>
            <option value="out">{t('statusOut')}</option>
            <option value="low">{t('statusLow')}</option>
          </Select>
          <Select value={branchId} onChange={(e) => { setBranchId(e.target.value); setWarehouseId(''); }} className="sm:w-44">
            <option value="">{t('allBranches')}</option>
            {visibleBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="sm:w-44">
            <option value="">{t('all')} - {t('warehouses')}</option>
            {warehouses.filter((w) => !branchId || w.branch_id === branchId).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </div>
      </DesignPanel>

      <DesignPanel testId="alerts-table-panel">
        <DataTable columns={columns} data={filtered} loading={loading} error={error} emptyMessage={t('noData')} />
      </DesignPanel>
    </DesignSurface>
  );
}
