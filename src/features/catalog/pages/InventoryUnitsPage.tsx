import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { DesignSurface, DesignPageHeader } from '@/components/design/DesignSurface';
import { DesignPanel } from '@/components/design/DesignPanel';
import { DesignPagination } from '@/components/design/DesignPagination';
import { DataTable, type Column } from '@/components/DataTable';
import { Button } from '@/components/Button';
import { Input, Select, Textarea } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { logAudit } from '@/lib/audit';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { useCan } from '@/lib/permissions';
import { usePaginatedRows } from '@/hooks/usePaginatedRows';
import type { InventoryUnit } from '@/lib/types';

interface UnitForm {
  code: string;
  name: string;
  name_en: string;
  unit_type: 'ready' | 'manufactured';
  cost_price: number;
  sale_price: number;
  min_stock: number;
  max_stock: number;
  reorder_point: number;
  low_stock_threshold: number;
  barcode: string;
  sku: string;
  description: string;
}

const EMPTY_FORM: UnitForm = {
  code: '',
  name: '',
  name_en: '',
  unit_type: 'ready',
  cost_price: 0,
  sale_price: 0,
  min_stock: 0,
  max_stock: 0,
  reorder_point: 0,
  low_stock_threshold: 5,
  barcode: '',
  sku: '',
  description: '',
};

export function InventoryUnitsPage() {
  const { t } = useLanguage();
  const { show } = useToast();
  const can = useCan();
  const branchFilter = useBranchFilter();

  const { rows: items, loading, total, hasMore, loadMore, loadingMore, refresh: reloadItems } = usePaginatedRows<InventoryUnit>({
    table: 'inventory_units',
    select: '*',
    order: { column: 'name', ascending: true },
    branch_id: branchFilter,
    pageSize: 100,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryUnit | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<UnitForm>(EMPTY_FORM);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (u: InventoryUnit) => {
    setEditing(u);
    setForm({
      code: u.code,
      name: u.name,
      name_en: u.name_en || '',
      unit_type: u.unit_type,
      cost_price: u.cost_price,
      sale_price: u.sale_price,
      min_stock: u.min_stock,
      max_stock: u.max_stock,
      reorder_point: u.reorder_point,
      low_stock_threshold: u.low_stock_threshold,
      barcode: u.barcode || '',
      sku: u.sku || '',
      description: u.description || '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.code || !form.name) {
      show(t('required'), 'error');
      return;
    }
    const payload = {
      ...form,
      cost_price: Number(form.cost_price),
      sale_price: Number(form.sale_price),
      min_stock: Number(form.min_stock),
      max_stock: Number(form.max_stock),
      reorder_point: Number(form.reorder_point),
      low_stock_threshold: Number(form.low_stock_threshold),
      barcode: form.barcode || null,
      sku: form.sku || null,
      description: form.description || null,
      name_en: form.name_en || null,
      branch_id: branchFilter || null,
    };
    if (editing) {
      const { error } = await supabase.from('inventory_units').update(payload).eq('id', editing.id);
      if (error) { show(error.message, 'error'); return; }
      await logAudit('update', 'inventory_units', editing.id);
    } else {
      const { error } = await supabase.from('inventory_units').insert(payload);
      if (error) { show(error.message, 'error'); return; }
      await logAudit('create', 'inventory_units');
    }
    show(t('saveSuccess'), 'success');
    setModalOpen(false);
    reloadItems();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('inventory_units').delete().eq('id', deleteId);
    if (error) show(error.message, 'error');
    else {
      show(t('deleteSuccess'), 'success');
      await logAudit('delete', 'inventory_units', deleteId);
    }
    setDeleteId(null);
    reloadItems();
  };

  const columns: Column<InventoryUnit>[] = [
    { key: 'code', header: t('code'), render: (u) => <span className="font-mono text-sm">{u.code}</span> },
    { key: 'name', header: t('name'), render: (u) => <span className="font-medium text-slate-800 dark:text-slate-200">{u.name}</span> },
    {
      key: 'unit_type', header: t('unitType'), render: (u) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.unit_type === 'manufactured' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
          {u.unit_type === 'manufactured' ? t('manufactured') : t('ready')}
        </span>
      ),
    },
    { key: 'cost_price', header: t('costPrice'), render: (u) => <span className="text-sm">{Number(u.cost_price).toFixed(2)}</span> },
    { key: 'sale_price', header: t('salePrice'), render: (u) => <span className="text-sm">{Number(u.sale_price).toFixed(2)}</span> },
    {
      key: 'actions', header: t('actions'), render: (u) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {can('raw_materials.manage') && (
            <button onClick={() => openEdit(u)} className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"><Edit2 className="w-4 h-4" /></button>
          )}
          {can('raw_materials.manage') && (
            <button onClick={() => setDeleteId(u.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DesignSurface testId="inventory-units-page">
      <DesignPageHeader title={t('inventoryUnits')} actions={
        <>
          {can('raw_materials.manage') && (
            <Button size="sm" onClick={openAdd} data-testid="inventory-units-add"><Plus className="w-4 h-4" /> {t('add')}</Button>
          )}
        </>
      } />
      <DesignPanel testId="inventory-units-table-panel">
        <DataTable columns={columns} data={items} loading={loading} emptyMessage={t('noData')}
          onRowClick={can('raw_materials.manage') ? openEdit : undefined} />
        <DesignPagination loaded={items.length} total={total} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} />
      </DesignPanel>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('edit') : t('add')}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('code')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <Input label={t('name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('nameEn')} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
            <Select label={t('unitType')} value={form.unit_type} onChange={(e) => setForm({ ...form, unit_type: e.target.value as 'ready' | 'manufactured' })}>
              <option value="ready">{t('ready')}</option>
              <option value="manufactured">{t('manufactured')}</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('costPrice')} type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: +e.target.value })} />
            <Input label={t('salePrice')} type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: +e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('minStock')} type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: +e.target.value })} />
            <Input label={t('maxStock')} type="number" value={form.max_stock} onChange={(e) => setForm({ ...form, max_stock: +e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('reorderPoint')} type="number" value={form.reorder_point} onChange={(e) => setForm({ ...form, reorder_point: +e.target.value })} />
            <Input label={t('lowStockThreshold')} type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: +e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('barcode')} value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            <Input label={t('sku')} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <Textarea label={t('description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</Button>
            <Button onClick={save}>{t('save')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove}
        title={t('delete')} message={t('confirmDelete')} confirmLabel={t('delete')} cancelLabel={t('cancel')} />
    </DesignSurface>
  );
}
