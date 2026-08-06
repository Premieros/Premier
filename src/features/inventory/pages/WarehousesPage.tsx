import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { PageHeader, Card } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { logAudit } from '@/lib/audit';
import { useBranchFilter } from '@/lib/useBranchFilter';
import type { Warehouse, Branch } from '@/lib/types';

export function WarehousesPage() {
  const { t } = useLanguage();
  const { show } = useToast();
  const branchFilter = useBranchFilter();
  const [items, setItems] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', branch_id: '', address: '', is_active: true });

  async function load() {
    setLoading(true);
    try {
      let wq = supabase.from('warehouses').select('*, branch:branches(*)');
      if (branchFilter) wq = wq.eq('branch_id', branchFilter);
      const [w, b] = await Promise.all([
        wq.order('created_at', { ascending: false }),
        supabase.from('branches').select('*').order('name'),
      ]);
      setItems((w.data as Warehouse[]) || []);
      setBranches((b.data as Branch[]) || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', branch_id: branchFilter || '', address: '', is_active: true }); setModalOpen(true); };
  const openEdit = (w: Warehouse) => { setEditing(w); setForm({ name: w.name, branch_id: w.branch_id || '', address: w.address || '', is_active: w.is_active }); setModalOpen(true); };

  const save = async () => {
    if (!form.name) { show(t('required'), 'error'); return; }
    const payload = { ...form, branch_id: branchFilter || form.branch_id || null };
    if (editing) {
      const { error } = await supabase.from('warehouses').update(payload).eq('id', editing.id);
      if (error) { show(error.message, 'error'); return; }
      await logAudit('update', 'warehouses', editing.id);
    } else {
      const { error } = await supabase.from('warehouses').insert(payload);
      if (error) { show(error.message, 'error'); return; }
      await logAudit('create', 'warehouses');
    }
    show(t('saveSuccess'), 'success');
    setModalOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('warehouses').delete().eq('id', deleteId);
    if (error) show(error.message, 'error');
    else { show(t('deleteSuccess'), 'success'); await logAudit('delete', 'warehouses', deleteId); }
    setDeleteId(null);
    load();
  };

  const columns: Column<Warehouse>[] = [
    { key: 'name', header: t('name'), render: (w) => <span className="font-medium text-slate-800 dark:text-slate-200">{w.name}</span> },
    { key: 'branch', header: t('branch'), render: (w) => (w as Warehouse & { branch?: Branch }).branch?.name || '-' },
    { key: 'address', header: t('address'), render: (w) => w.address || '-' },
    { key: 'is_active', header: t('status'), render: (w) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${w.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
        {w.is_active ? t('active') : t('inactive')}
      </span>
    )},
    { key: 'actions', header: t('actions'), render: (w) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(w)} className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => setDeleteId(w.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title={t('warehouses')} actions={<Button size="sm" onClick={openAdd}><Plus className="w-4 h-4" /> {t('add')}</Button>} />
      <Card className="p-4">
        <DataTable columns={columns} data={items} loading={loading} emptyMessage={t('noData')} />
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('edit') : t('add')}>
        <div className="space-y-4">
          <Input label={t('name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          {!branchFilter && (
            <Select label={t('branch')} value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
              <option value="">--</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          )}
          <Input label={t('address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
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
    </div>
  );
}
