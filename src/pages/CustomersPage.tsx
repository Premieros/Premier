import { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, Download, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';
import { PageHeader, Card } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Input, Select, Textarea } from '../components/Input';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency } from '../lib/format';
import { exportToExcel, importFromExcel } from '../lib/excel';
import { logAudit } from '../lib/audit';
import { useBranchFilter } from '../lib/useBranchFilter';
import type { Customer, Settings, Branch } from '../lib/types';

export function CustomersPage() {
  const { t, lang } = useLanguage();
  const { show } = useToast();
  const branchFilter = useBranchFilter();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({ name: '', name_en: '', phone: '', email: '', address: '', tax_number: '', balance: 0, notes: '', branch_id: '' });
  const [currency, setCurrency] = useState('EGP');
  const [branches, setBranches] = useState<Branch[]>([]);

  async function load() {
    setLoading(true);
    try {
      let q = supabase.from('customers').select('*');
      if (branchFilter) q = q.eq('branch_id', branchFilter);
      const [res, s, b] = await Promise.all([
        q.order('created_at', { ascending: false }),
        supabase.from('settings').select('*').maybeSingle(),
        supabase.from('branches').select('*').order('name'),
      ]);
      setItems((res.data as Customer[]) || []);
      if (s.data) setCurrency((s.data as Settings).currency || 'EGP');
      setBranches((b.data as Branch[]) || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
  const openAdd = () => { setEditing(null); setForm({ name: '', name_en: '', phone: '', email: '', address: '', tax_number: '', balance: 0, notes: '', branch_id: branchFilter || '' }); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, name_en: c.name_en || '', phone: c.phone || '', email: c.email || '', address: c.address || '', tax_number: c.tax_number || '', balance: c.balance, notes: c.notes || '', branch_id: c.branch_id || branchFilter || '' }); setModalOpen(true); };

  const save = async () => {
    if (!form.name) { show(t('required'), 'error'); return; }
    const payload = { ...form, branch_id: branchFilter || form.branch_id || null };
    if (editing) {
      const { error } = await supabase.from('customers').update(payload).eq('id', editing.id);
      if (error) { show(error.message, 'error'); return; }
      await logAudit('update', 'customers', editing.id);
    } else {
      const { error } = await supabase.from('customers').insert(payload);
      if (error) { show(error.message, 'error'); return; }
      await logAudit('create', 'customers');
    }
    show(t('saveSuccess'), 'success');
    setModalOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('customers').delete().eq('id', deleteId);
    if (error) show(error.message, 'error');
    else { show(t('deleteSuccess'), 'success'); await logAudit('delete', 'customers', deleteId); }
    setDeleteId(null);
    load();
  };

  const handleExport = () => exportToExcel(items.map((c) => ({ Name: c.name, Phone: c.phone || '', Email: c.email || '', Address: c.address || '', TaxNumber: c.tax_number || '', Balance: c.balance })), 'customers');

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await importFromExcel(file);
      const payload = rows.map((r) => ({ name: String(r.Name || r.name || ''), phone: String(r.Phone || r.phone || ''), email: String(r.Email || r.email || ''), address: String(r.Address || r.address || ''), tax_number: String(r.TaxNumber || ''), balance: Number(r.Balance || 0), branch_id: branchFilter || branches[0]?.id || null })).filter((r) => r.name);
      const { error } = await supabase.from('customers').insert(payload);
      if (error) show(error.message, 'error');
      else { show(`${payload.length} ${t('import')} OK`, 'success'); load(); }
    } catch (err) { show(String(err), 'error'); }
  };

  const columns: Column<Customer>[] = [
    { key: 'name', header: t('name'), render: (c) => <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span> },
    { key: 'phone', header: t('phone'), render: (c) => c.phone || '-' },
    { key: 'email', header: t('emailField'), render: (c) => c.email || '-' },
    { key: 'address', header: t('address'), render: (c) => c.address || '-' },
    { key: 'balance', header: t('amount'), render: (c) => <span className={c.balance > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>{formatCurrency(c.balance, currency, lang)}</span> },
    { key: 'actions', header: t('actions'), render: (c) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title={t('customers')} actions={
        <>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> {t('importExcel')}</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4" /> {t('exportExcel')}</Button>
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4" /> {t('add')}</Button>
        </>
      } />
      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')}
            className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
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
          {!branchFilter && (
            <Select label={t('branch')} value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
              <option value="">--</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          )}
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
