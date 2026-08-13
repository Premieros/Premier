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
import { Input, Select } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { logAudit } from '@/lib/audit';
import { usePaginatedRows } from '@/hooks/usePaginatedRows';
import type { Branch } from '@/lib/types';

export function BranchesPage() {
  const { t } = useLanguage();
  const { show } = useToast();
  const { rows: items, loading, total, hasMore, loadMore, loadingMore, refresh: reloadBranches } = usePaginatedRows<Branch>({
    table: 'branches',
    select: '*',
    order: { column: 'created_at', ascending: false },
    pageSize: 100,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', name_en: '', address: '', phone: '', is_active: true });

  const openAdd = () => { setEditing(null); setForm({ name: '', name_en: '', address: '', phone: '', is_active: true }); setModalOpen(true); };
  const openEdit = (b: Branch) => { setEditing(b); setForm({ name: b.name, name_en: b.name_en || '', address: b.address || '', phone: b.phone || '', is_active: b.is_active }); setModalOpen(true); };

  const save = async () => {
    if (!form.name) { show(t('required'), 'error'); return; }
    if (editing) {
      const { error } = await supabase.from('branches').update(form).eq('id', editing.id);
      if (error) { show(error.message, 'error'); return; }
      await logAudit('update', 'branches', editing.id);
    } else {
      const { error } = await supabase.from('branches').insert(form);
      if (error) { show(error.message, 'error'); return; }
      await logAudit('create', 'branches');
    }
    show(t('saveSuccess'), 'success');
    setModalOpen(false);
    reloadBranches();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('branches').delete().eq('id', deleteId);
    if (error) show(error.message, 'error');
    else { show(t('deleteSuccess'), 'success'); await logAudit('delete', 'branches', deleteId); }
    setDeleteId(null);
    reloadBranches();
  };

  const columns: Column<Branch>[] = [
    { key: 'name', header: t('name'), render: (b) => <span className="font-medium text-slate-800 dark:text-slate-200">{b.name}</span> },
    { key: 'name_en', header: t('nameEn'), render: (b) => b.name_en || '-' },
    { key: 'address', header: t('address'), render: (b) => b.address || '-' },
    { key: 'phone', header: t('phone'), render: (b) => b.phone || '-' },
    { key: 'is_active', header: t('status'), render: (b) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
        {b.is_active ? t('active') : t('inactive')}
      </span>
    )},
    { key: 'actions', header: t('actions'), render: (b) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(b)} className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => setDeleteId(b.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <DesignSurface testId="branches-page">
      <DesignPageHeader title={t('branches')} actions={<Button size="sm" onClick={openAdd} data-testid="branches-add"><Plus className="w-4 h-4" /> {t('add')}</Button>} />
      <DesignPanel testId="branches-table-panel">
        <DataTable columns={columns} data={items} loading={loading} emptyMessage={t('noData')} />
        <DesignPagination loaded={items.length} total={total} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} />
      </DesignPanel>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('edit') : t('add')}>
        <div className="space-y-4">
          <Input label={t('name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label={t('nameEn')} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
          <Input label={t('address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label={t('phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label={t('status')} value={form.is_active ? '1' : '0'} onChange={(e) => setForm({ ...form, is_active: e.target.value === '1' })}>
            <option value="1">{t('active')}</option>
            <option value="0">{t('inactive')}</option>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</Button>
            <Button onClick={save}>{t('save')}</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} title={t('delete')} message={t('confirmDelete')} confirmLabel={t('delete')} cancelLabel={t('cancel')} />
    </DesignSurface>
  );
}
