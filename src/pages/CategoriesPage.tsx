import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';
import { PageHeader, Card } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Input, Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { logAudit } from '../lib/audit';
import type { Category } from '../lib/types';

export function CategoriesPage() {
  const { t, lang } = useLanguage();
  const { show } = useToast();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteSelectedConfirm, setDeleteSelectedConfirm] = useState(false);
  const [form, setForm] = useState({ name: '', name_en: '', description: '' });

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase.from('categories').select('*').order('created_at', { ascending: false });
      setItems((data as Category[]) || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', name_en: '', description: '' }); setModalOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, name_en: c.name_en || '', description: c.description || '' }); setModalOpen(true); };

  const save = async () => {
    if (!form.name) { show(t('required'), 'error'); return; }
    if (editing) {
      const { error } = await supabase.from('categories').update(form).eq('id', editing.id);
      if (error) { show(error.message, 'error'); return; }
      await logAudit('update', 'categories', editing.id);
    } else {
      const { error } = await supabase.from('categories').insert(form);
      if (error) { show(error.message, 'error'); return; }
      await logAudit('create', 'categories');
    }
    show(t('saveSuccess'), 'success');
    setModalOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('categories').delete().eq('id', deleteId);
    if (error) show(error.message, 'error');
    else { show(t('deleteSuccess'), 'success'); await logAudit('delete', 'categories', deleteId); }
    setDeleteId(null);
    load();
  };

  const removeSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      await supabase.from('categories').delete().eq('id', id);
      await logAudit('delete', 'categories', id);
    }
    show(t('deleteSuccess'), 'success');
    setSelectedIds(new Set());
    setDeleteSelectedConfirm(false);
    load();
  };

  const columns: Column<Category>[] = [
    { key: 'name', header: t('name'), render: (c) => <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span> },
    { key: 'name_en', header: t('nameEn'), render: (c) => c.name_en || '-' },
    { key: 'description', header: t('description'), render: (c) => c.description || '-' },
    { key: 'actions', header: t('actions'), render: (c) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title={t('categories')} actions={
        <>
          {selectedIds.size > 0 && (
            <Button variant="danger" size="sm" onClick={() => setDeleteSelectedConfirm(true)}>
              <Trash2 className="w-4 h-4" /> {t('deleteSelected')} ({selectedIds.size})
            </Button>
          )}
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4" /> {t('add')}</Button>
        </>
      } />
      <Card className="p-4">
        <DataTable columns={columns} data={items} loading={loading} emptyMessage={t('noData')}
          onRowClick={openEdit} showCheckbox selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('edit') : t('add')}>
        <div className="space-y-4">
          <Input label={t('name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label={t('nameEn')} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
          <Textarea label={t('description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</Button>
            <Button onClick={save}>{t('save')}</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} title={t('delete')} message={t('confirmDelete')} confirmLabel={t('delete')} cancelLabel={t('cancel')} />
      <ConfirmDialog open={deleteSelectedConfirm} onClose={() => setDeleteSelectedConfirm(false)} onConfirm={removeSelected}
        title={t('deleteSelected')} message={t('confirmDeleteAll')} confirmLabel={t('delete')} cancelLabel={t('cancel')} />
    </div>
  );
}
