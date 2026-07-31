import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, Search, Eye, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useBranchFilter } from '../lib/useBranchFilter';
import { useToast } from '../components/Toast';
import { PageHeader, Card } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { formatCurrency, formatDate, generateInvoiceNumber } from '../lib/format';
import { exportToExcel } from '../lib/excel';
import { logAudit } from '../lib/audit';
import type { Purchase, Supplier, Product, Warehouse, Branch, Settings, RpcResult } from '../lib/types';

interface PurchaseFormItem {
  product_id: string;
  unit_name: string;
  quantity: number;
  unit_cost: number;
}

export function PurchasesPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const branchFilter = useBranchFilter();
  const { show } = useToast();
  const [items, setItems] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState<Purchase | null>(null);
  const [viewItems, setViewItems] = useState<{ name: string; quantity: number; unit_cost: number; total: number }[]>([]);
  const [currency, setCurrency] = useState('EGP');

  const [form, setForm] = useState({
    supplier_id: '',
    warehouse_id: '',
    branch_id: '',
    payment_method: 'cash',
    notes: '',
  });
  const [lineItems, setLineItems] = useState<PurchaseFormItem[]>([{ product_id: '', unit_name: 'piece', quantity: 1, unit_cost: 0 }]);

  async function load() {
    setLoading(true);
    try {
      let purchaseQuery = supabase.from('purchases').select('*, supplier:suppliers(*)').order('created_at', { ascending: false });
      if (branchFilter) purchaseQuery = purchaseQuery.eq('branch_id', branchFilter);
      const [p, s, pr, w, b, st] = await Promise.all([
        purchaseQuery,
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('warehouses').select('*').order('name'),
        supabase.from('branches').select('*').order('name'),
        supabase.from('settings').select('*').maybeSingle(),
      ]);
      setItems((p.data as Purchase[]) || []);
      setSuppliers((s.data as Supplier[]) || []);
      setProducts((pr.data as Product[]) || []);
      setWarehouses((w.data as Warehouse[]) || []);
      setBranches((b.data as Branch[]) || []);
      if (st.data) setCurrency((st.data as Settings).currency || 'EGP');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter((p) => !search || p.invoice_number.toLowerCase().includes(search.toLowerCase()) || (p as Purchase & { supplier?: Supplier }).supplier?.name.toLowerCase().includes(search.toLowerCase()));

  const subtotal = useMemo(() => lineItems.reduce((s, i) => s + i.quantity * i.unit_cost, 0), [lineItems]);

  const openAdd = () => {
    setForm({ supplier_id: '', warehouse_id: '', branch_id: user?.branch_id || '', payment_method: 'cash', notes: '' });
    setLineItems([{ product_id: '', unit_name: 'piece', quantity: 1, unit_cost: 0 }]);
    setModalOpen(true);
  };

  const addLine = () => setLineItems([...lineItems, { product_id: '', unit_name: 'piece', quantity: 1, unit_cost: 0 }]);
  const updateLine = (i: number, field: keyof PurchaseFormItem, value: string | number) => setLineItems(lineItems.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  const removeLine = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i));

  const save = async () => {
    const validItems = lineItems.filter((l) => l.product_id && l.quantity > 0);
    if (!form.supplier_id) { show(t('required') + ': ' + t('supplier'), 'error'); return; }
    if (validItems.length === 0) { show(t('required') + ': ' + t('addProduct'), 'error'); return; }

    const invoiceNumber = generateInvoiceNumber('PUR');
    const total = validItems.reduce((s, i) => s + i.quantity * i.unit_cost, 0);

    const { data, error } = await supabase.rpc('process_purchase', {
      p_invoice_number: invoiceNumber,
      p_supplier_id: form.supplier_id,
      p_branch_id: form.branch_id || null,
      p_warehouse_id: form.warehouse_id || null,
      p_subtotal: total,
      p_discount_amount: 0,
      p_tax_amount: 0,
      p_total: total,
      p_paid_amount: total,
      p_payment_method: form.payment_method,
      p_status: 'completed',
      p_notes: form.notes,
      p_items: validItems.map((i) => ({
        product_id: i.product_id,
        unit_name: i.unit_name,
        quantity: i.quantity,
        unit_cost: i.unit_cost,
      })),
    });
    if (error) { show(error.message, 'error'); return; }
    const result = data as RpcResult | null;
    if (!result?.success) { show(result?.detail || result?.error || t('error'), 'error'); return; }

    await logAudit('create', 'purchases', result.purchase_id || '', { invoice: invoiceNumber, total });
    show(t('saveSuccess'), 'success');
    setModalOpen(false);
    load();
  };

  const viewPurchase = async (p: Purchase) => {
    setViewModal(p);
    const { data } = await supabase.from('purchase_items').select('*, product:products(name)').eq('purchase_id', p.id);
    setViewItems((data || []).map((i: Record<string, unknown>) => ({
      name: (i.product as { name: string })?.name || '-',
      quantity: Number(i.quantity),
      unit_cost: Number(i.unit_cost),
      total: Number(i.total),
    })));
  };

  const handleExport = () => exportToExcel(items.map((p) => ({ Invoice: p.invoice_number, Date: formatDate(p.created_at, lang), Supplier: (p as Purchase & { supplier?: Supplier }).supplier?.name || '', Total: p.total, Status: p.status })), 'purchases');

  const columns: Column<Purchase>[] = [
    { key: 'invoice_number', header: t('invoice'), render: (p) => <span className="font-medium text-slate-800 dark:text-slate-200">{p.invoice_number}</span> },
    { key: 'supplier', header: t('supplier'), render: (p) => (p as Purchase & { supplier?: Supplier }).supplier?.name || '-' },
    { key: 'created_at', header: t('date'), render: (p) => formatDate(p.created_at, lang) },
    { key: 'total', header: t('total'), render: (p) => <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(p.total, currency, lang)}</span> },
    { key: 'status', header: t('status'), render: (p) => <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 capitalize">{p.status}</span> },
    { key: 'actions', header: t('actions'), render: (p) => (
      <button onClick={() => viewPurchase(p)} className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"><Eye className="w-4 h-4" /></button>
    )},
  ];

  return (
    <div>
      <PageHeader title={t('purchases')} actions={
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
        <DataTable columns={columns} data={filtered} loading={loading} emptyMessage={t('noData')} onRowClick={viewPurchase} />
      </Card>

      {/* Add Purchase Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('purchaseInvoice')} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label={t('supplier')} value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} required>
              <option value="">--</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select label={t('warehouse')} value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}>
              <option value="">--</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
            <Select label={t('branch')} value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
              <option value="">--</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
            <Select label={t('paymentMethod')} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              <option value="cash">{t('cash')}</option>
              <option value="card">{t('card')}</option>
              <option value="transfer">{t('transfer')}</option>
              <option value="credit">{t('credit')}</option>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">{t('addProduct')}</h3>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="w-4 h-4" /> {t('add')}</Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select value={l.product_id} onChange={(e) => updateLine(i, 'product_id', e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm">
                      <option value="">--</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <input type="number" placeholder={t('quantity')} value={l.quantity || ''} onChange={(e) => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} className="col-span-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm" />
                  <input type="number" placeholder={t('cost')} step="0.01" value={l.unit_cost || ''} onChange={(e) => updateLine(i, 'unit_cost', parseFloat(e.target.value) || 0)} className="col-span-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm" />
                  <span className="col-span-2 text-sm text-slate-600 dark:text-slate-300 text-end">{formatCurrency(l.quantity * l.unit_cost, currency, lang)}</span>
                  <button onClick={() => removeLine(i)} className="col-span-1 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
            <span className="text-lg font-bold">{t('total')}: {formatCurrency(subtotal, currency, lang)}</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</Button>
              <Button onClick={save}>{t('save')}</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* View Purchase Modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={t('purchaseInvoice')} size="lg">
        {viewModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">{t('invoice')}: </span><span className="font-medium">{viewModal.invoice_number}</span></div>
              <div><span className="text-slate-500">{t('date')}: </span><span className="font-medium">{formatDate(viewModal.created_at, lang)}</span></div>
              <div><span className="text-slate-500">{t('supplier')}: </span><span className="font-medium">{(viewModal as Purchase & { supplier?: Supplier }).supplier?.name || '-'}</span></div>
              <div><span className="text-slate-500">{t('paymentMethod')}: </span><span className="font-medium capitalize">{viewModal.payment_method}</span></div>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-start py-2 font-semibold text-slate-600 dark:text-slate-300">{t('productName')}</th>
                  <th className="text-center py-2 font-semibold text-slate-600 dark:text-slate-300">{t('quantity')}</th>
                  <th className="text-center py-2 font-semibold text-slate-600 dark:text-slate-300">{t('cost')}</th>
                  <th className="text-end py-2 font-semibold text-slate-600 dark:text-slate-300">{t('total')}</th>
                </tr></thead>
                <tbody>
                  {viewItems.map((i, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 text-slate-700 dark:text-slate-200">{i.name}</td>
                      <td className="py-2 text-center text-slate-700 dark:text-slate-200">{i.quantity}</td>
                      <td className="py-2 text-center text-slate-700 dark:text-slate-200">{formatCurrency(i.unit_cost, currency, lang)}</td>
                      <td className="py-2 text-end font-medium text-slate-800 dark:text-slate-100">{formatCurrency(i.total, currency, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-100 dark:border-slate-700">
              <span>{t('total')}</span>
              <span className="text-teal-600 dark:text-teal-400">{formatCurrency(viewModal.total, currency, lang)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
