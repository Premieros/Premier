import { useEffect, useState } from 'react';
import { Search, BookOpenText } from 'lucide-react';
import { supabase } from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { PageHeader, Card } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { Select } from '@/components/Input';
import { formatNumber, formatDateTime } from '@/lib/format';
import { exportToExcel } from '@/lib/excel';
import type { InventoryLedgerEntry, Warehouse } from '@/lib/types';

interface LedgerRow {
  id: string;
  entry: InventoryLedgerEntry;
}

export function InventoryLedgerPage() {
  const { t, lang } = useLanguage();
  const branchFilter = useBranchFilter();

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryType, setEntryType] = useState('all');
  const [branchId, setBranchId] = useState(branchFilter || '');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');

  const entryTypes: { key: string; label: string }[] = [
    { key: 'opening', label: t('entryOpening') },
    { key: 'purchase', label: t('entryPurchase') },
    { key: 'sale', label: t('entrySale') },
    { key: 'refund', label: t('entryRefund') },
    { key: 'production', label: t('entryProduction') },
    { key: 'waste', label: t('entryWaste') },
    { key: 'transfer', label: t('entryTransfer') },
    { key: 'adjustment', label: t('entryAdjustment') },
  ];

  async function load() {
    setLoading(true);
    try {
      const br = await supabase.from('branches').select('id, name').eq('is_active', true).order('name');
      setBranches((br.data as { id: string; name: string }[]) || []);
      const ledger = await supabase.from('inventory_ledger')
        .select('*, product:products(*), raw_material:raw_materials(*), warehouse:warehouses(*)')
        .order('created_at', { ascending: false })
        .limit(500);
      setRows(((ledger.data as InventoryLedgerEntry[]) || []).map((entry) => ({ id: String(entry.id), entry })));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    const e = r.entry;
    if (entryType !== 'all' && e.entry_type !== entryType) return false;
    if (branchId && e.branch_id !== branchId) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (e.reference_number || '').toLowerCase().includes(q)
      || (e.product?.name || '').toLowerCase().includes(q)
      || (e.raw_material?.name || '').toLowerCase().includes(q)
      || (e.batch_number || '').toLowerCase().includes(q);
  });

  const handleExport = () => {
    exportToExcel(filtered.map((r) => ({
      Date: r.entry.created_at,
      Type: entryTypes.find((x) => x.key === r.entry.entry_type)?.label || r.entry.entry_type,
      Item: r.entry.product?.name || r.entry.raw_material?.name || '-',
      Reference: r.entry.reference_number || '',
      Batch: r.entry.batch_number || '',
      Quantity: r.entry.quantity,
      UnitCost: r.entry.unit_cost,
      TotalCost: r.entry.total_cost,
      Before: r.entry.before_qty ?? '',
      After: r.entry.after_qty ?? '',
    })), 'inventory-ledger');
  };

  const typePill = (type: string) => {
    const map: Record<string, string> = {
      opening: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      purchase: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      sale: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      refund: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      production: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      waste: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      transfer: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      adjustment: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[type] || map.opening}`}>
      {entryTypes.find((x) => x.key === type)?.label || type}
    </span>;
  };

  const columns: Column<LedgerRow>[] = [
    { key: 'created_at', header: t('from'), render: (r) => (
      <div className="text-sm">
        <p className="text-slate-800 dark:text-slate-200">{formatDateTime(r.entry.created_at, lang)}</p>
        <p className="text-xs text-slate-400">#{r.entry.id}</p>
      </div>
    )},
    { key: 'entry_type', header: t('entryType'), render: (r) => typePill(r.entry.entry_type) },
    { key: 'item', header: t('product'), render: (r) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
          <BookOpenText className="w-4 h-4" />
        </div>
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-200">{r.entry.product?.name || r.entry.raw_material?.name || '-'}</p>
          {r.entry.product && <p className="text-xs text-purple-500 dark:text-purple-400">{t('product')}</p>}
          {r.entry.raw_material && <p className="text-xs text-emerald-500 dark:text-emerald-400">{t('rawMaterial')}</p>}
        </div>
      </div>
    )},
    { key: 'warehouse', header: t('warehouse'), render: (r) => (r.entry.warehouse as Warehouse | undefined)?.name || '-' },
    { key: 'batch', header: t('batchNumber'), render: (r) => r.entry.batch_number || '-' },
    { key: 'quantity', header: t('quantity'), render: (r) => (
      <span className={`font-semibold ${r.entry.quantity >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {r.entry.quantity >= 0 ? '+' : ''}{formatNumber(Number(r.entry.quantity))}
      </span>
    )},
    { key: 'unit_cost', header: t('unitCost'), render: (r) => formatNumber(Number(r.entry.unit_cost), 2) },
    { key: 'total_cost', header: t('totalCost'), render: (r) => formatNumber(Number(r.entry.total_cost), 2) },
    { key: 'reference', header: t('referenceNumber'), render: (r) => r.entry.reference_number || '-' },
  ];

  return (
    <div>
      <PageHeader title={t('inventoryLedger')} subtitle={lang === 'ar' ? 'ط³ط¬ظ„ ظƒط§ظ…ظ„ ظ„ط­ط±ظƒط§طھ ط§ظ„ظ…ط®ط²ظˆظ† (ظ…ظ†طھط¬ط§طھ ظˆظ…ظˆط§ط¯ ط®ط§ظ…)' : 'Full movement log for inventory (products and raw materials)'} actions={
        <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all">
          {t('exportExcel')}
        </button>
      } />

      <Card className="mb-4 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')}
              className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <Select value={entryType} onChange={(e) => setEntryType(e.target.value)} className="sm:w-48">
            <option value="all">{t('all')}</option>
            {entryTypes.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </Select>
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="sm:w-48">
            <option value="">{t('allBranches')}</option>
            {branches.map((br) => <option key={br.id} value={br.id}>{br.name}</option>)}
          </Select>
        </div>
      </Card>

      <Card className="p-4">
        <DataTable columns={columns} data={filtered} loading={loading} emptyMessage={t('noData')} />
      </Card>
    </div>
  );
}
