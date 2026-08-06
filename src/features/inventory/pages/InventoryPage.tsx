import { useEffect, useState } from 'react';
import { Search, Edit2, AlertTriangle, Download, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import * as api from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { useCan } from '@/lib/permissions';
import { PageHeader, Card } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatNumber } from '@/lib/format';
import { exportToExcel } from '@/lib/excel';
import { logAudit } from '@/lib/audit';
import type { Inventory, Warehouse } from '@/lib/types';

export function InventoryPage() {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const { show } = useToast();
  const can = useCan();
  const [items, setItems] = useState<Inventory[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [componentIds, setComponentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [adjustModal, setAdjustModal] = useState<Inventory | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteSelectedConfirm, setDeleteSelectedConfirm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [inv, wh, pc] = await Promise.all([
        supabase.from('inventory').select('*, product:products(*), warehouse:warehouses(*)').order('updated_at', { ascending: false }),
        supabase.from('warehouses').select('*').order('name'),
        supabase.from('product_components').select('component_product_id'),
      ]);
      setItems((inv.data as Inventory[]) || []);
      setWarehouses((wh.data as Warehouse[]) || []);
      setComponentIds(new Set((pc.data || []).map((r: { component_product_id: string }) => r.component_product_id)));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) => {
    if (filterWarehouse && i.warehouse_id !== filterWarehouse) return false;
    if (filterType === 'components' && !componentIds.has(i.product_id)) return false;
    if (filterType === 'ready' && (i.product?.product_type !== 'ready' || componentIds.has(i.product_id))) return false;
    if (!search) return true;
    return i.product?.name.toLowerCase().includes(search.toLowerCase()) || i.product?.barcode?.includes(search);
  });

  const openAdjust = (inv: Inventory) => {
    setAdjustModal(inv);
    setAdjustQty(inv.quantity);
    setAdjustReason('');
  };

  const saveAdjust = async () => {
    if (!adjustModal) return;
    const { data, error } = await api.inventory.adjustStock({
      p_inventory_id: adjustModal.id,
      p_new_quantity: adjustQty,
      p_reason: adjustReason || null,
    });
    if (error) { show(error.message, 'error'); return; }
    const result = data as { success: boolean; error?: string; detail?: string } | null;
    if (!result?.success) { show(result?.detail || result?.error || t('error'), 'error'); return; }
    await logAudit('update', 'inventory', adjustModal.id, { from: adjustModal.quantity, to: adjustQty });
    show(t('saveSuccess'), 'success');
    setAdjustModal(null);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('inventory').delete().eq('id', deleteId);
    if (error) show(error.message, 'error');
    else { show(t('deleteSuccess'), 'success'); await logAudit('delete', 'inventory', deleteId); }
    setDeleteId(null);
    load();
  };

  const removeSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      await supabase.from('inventory').delete().eq('id', id);
      await logAudit('delete', 'inventory', id);
    }
    show(t('deleteSuccess'), 'success');
    setSelectedIds(new Set());
    setDeleteSelectedConfirm(false);
    load();
  };

  const handleExport = () => {
    exportToExcel(items.map((i) => ({
      Product: i.product?.name || '', Barcode: i.product?.barcode || '',
      Warehouse: i.warehouse?.name || '', Quantity: i.quantity,
      LowStockThreshold: i.product?.low_stock_threshold || 0,
    })), 'inventory');
  };

  const columns: Column<Inventory>[] = [
    { key: 'product', header: t('productName'), render: (i) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
          {(i.product?.name || '?')[0]}
        </div>
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-200">{i.product?.name || '-'}</p>
          <div className="flex items-center gap-1">
            <p className="text-xs text-slate-400">{i.product?.barcode || '-'}</p>
            {componentIds.has(i.product_id) && (
              <span className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-medium text-slate-500 dark:text-slate-400">{t('component')}</span>
            )}
            {i.product?.product_type === 'manufactured' && (
              <span className="px-1 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-[10px] font-medium text-purple-700 dark:text-purple-400">{t('manufactured')}</span>
            )}
          </div>
        </div>
      </div>
    )},
    { key: 'warehouse', header: t('warehouse'), render: (i) => i.warehouse?.name || '-' },
    { key: 'quantity', header: t('quantity'), render: (i) => {
      const isLow = i.quantity < (i.product?.low_stock_threshold || 5);
      return (
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isLow ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>{formatNumber(i.quantity)}</span>
          {isLow && <AlertTriangle className="w-4 h-4 text-amber-500" />}
        </div>
      );
    }},
    { key: 'status', header: t('status'), render: (i) => {
      const isLow = i.quantity < (i.product?.low_stock_threshold || 5);
      const isOut = i.quantity <= 0;
      return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          isOut ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
          isLow ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        }`}>
          {isOut ? t('outOfStock') : isLow ? t('lowStock') : t('inStock')}
        </span>
      );
    }},
    { key: 'actions', header: t('actions'), render: (i) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        {can('inventory.manage') && (
          <button onClick={() => openAdjust(i)} className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title={t('adjustStock')}>
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {can('inventory.manage') && (
          <button onClick={() => setDeleteId(i.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title={t('delete')}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title={t('inventory')} actions={
        <>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4" /> {t('exportExcel')}</Button>
          {can('inventory.manage') && selectedIds.size > 0 && (
            <Button variant="danger" size="sm" onClick={() => setDeleteSelectedConfirm(true)}>
              <Trash2 className="w-4 h-4" /> {t('deleteSelected')} ({selectedIds.size})
            </Button>
          )}
        </>
      } />

      <Card className="mb-4 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')}
              className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <Select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)} className="sm:w-48">
            <option value="">{t('all')} - {t('warehouses')}</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="sm:w-40">
            <option value="all">{t('all')}</option>
            <option value="ready">{t('readyProduct')}</option>
            <option value="components">{t('component')}</option>
          </Select>
        </div>
      </Card>

      <Card className="p-4">
        <DataTable columns={columns} data={filtered} loading={loading} emptyMessage={t('noData')}
          onRowClick={can('inventory.manage') ? openAdjust : undefined} showCheckbox={can('inventory.manage')} selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </Card>

      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title={t('adjustStock')} size="sm">
        {adjustModal && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">{t('productName')}</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">{adjustModal.product?.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">{t('warehouse')}</p>
              <p className="font-medium text-slate-800 dark:text-slate-200">{adjustModal.warehouse?.name}</p>
            </div>
            <Input label={t('currentStock')} type="number" step="0.0001" value={adjustQty} onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)} />
            <Input label={t('reason')} value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder={isAr ? 'مثال: جرد، تالف، تصحيح' : 'e.g. count, damaged, correction'} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAdjustModal(null)}>{t('cancel')}</Button>
              <Button onClick={saveAdjust}>{t('save')}</Button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} title={t('delete')} message={t('confirmDelete')} confirmLabel={t('delete')} cancelLabel={t('cancel')} />
      <ConfirmDialog open={deleteSelectedConfirm} onClose={() => setDeleteSelectedConfirm(false)} onConfirm={removeSelected}
        title={t('deleteSelected')} message={t('confirmDeleteAll')} confirmLabel={t('delete')} cancelLabel={t('cancel')} />
    </div>
  );
}
