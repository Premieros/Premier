import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';
import { PageHeader, Card } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Input, Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency } from '../lib/format';
import { exportToExcel } from '../lib/excel';
import { logAudit } from '../lib/audit';
import type { Supplier, Settings } from '../lib/types';

export function SuppliersPage() {
  const { t, lang } = useLanguage();
  const { show } = useToast();
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', name_en: '', phone: '', email: '', address: '', tax_number: '', balance: 0, notes: '' });
  const [currency, setCurrency] = useState('EGP');

  async function load() {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([
        supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
        supabase.from('settings').select('*').maybeSingle(),
      ]);
      setItems((res.data as Supplier[]) || []);
      if (s.data) setCurrency((s.data as Settings).currency || 'EGP');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search));
  const openAdd = () => { setEditing(null); setForm({ name: '', name_en: '', phone: '', email: '', address: '', tax_number: '', balance: 0, notes: '' }); setModalOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, name_en: s.name_en || '', phone: s.phone || '', email: s.email || '', address: s.address || '', tax_number: s.tax_number || '', balance: s.balance, notes: s.notes || '' }); setModalOpen(true); };

  const save = async () => {
    if (!form.name) { show(t('required'), 'error'); return; }
    if (editing) {
      const { error } = await supabase.from('suppliers').update(form).eq('id', editing.id);
      if (error) { show(error.message, 'error'); return; }
      await logAudit('update', 'suppliers', editing.id);
    } else {
      const { error } = await supabase.from('suppliers').insert(form);
      if (error) { show(error.message, 'error'); return; }
      await logAudit('create', 'suppliers');
    }
    show(t('saveSuccess'), 'success');
    setModalOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', deleteId);
    if (error) show(error.message, 'error');
    else { show(t('deleteSuccess'), 'success'); await logAudit('delete', 'suppliers', deleteId); }
    setDeleteId(null);
    load();
  };

  const handleExport = () => exportToExcel(items.map((s) => ({ Name: s.name, Phone: s.phone || '', Email: s.email || '', Address: s.address || '', TaxNumber: s.tax_number || '', Balance: s.balance })), 'suppliers');

  const columns: Column<Supplier>[] = [
    { key: 'name', header: t('name'), render: (s) => <span className="font-medium text-slate-800 dark:text-slate-200">{s.name}</span> },
    { key: 'phone', header: t('phone'), render: (s) => s.phone || '-' },
    { key: 'email', header: t('emailField'), render: (s) => s.email || '-' },
    { key: 'address', header: t('address'), render: (s) => s.address || '-' },
    { key: 'balance', header: t('amount'), render: (s) => <span className={s.balance > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>{formatCurrency(s.balance, currency, lang)}</span> },
    { key: 'actions', header: t('actions'), render: (s) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title={t('suppliers')} actions={
        <>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4" /> {t('exportExcel')}</Button>
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4" /> {t('add')}</Button>
        </>
      } />
      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')}
            className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
      </Card>
      <Card className="p-4">
        <DataTable columns={columns} data={filtered} loading={loading} emptyMessage={t('noData')} onRowClick={openEdit} />
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('edit') : t('add')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label={t('nameEn')} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
            <Input label={t('phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label={t('emailField')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label={t('address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label="Tax Number" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
          </div>
          <Textarea label={t('notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
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
