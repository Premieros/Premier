import { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, Download, Upload, Barcode as BarcodeIcon, QrCode } from 'lucide-react';
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
import { renderBarcode, generateQRCodeDataURL } from '../lib/barcode';
import { logAudit } from '../lib/audit';
import { generateBarcode } from '../lib/format';
import type { Product, Category, ProductUnit, Settings } from '../lib/types';

const UNIT_NAMES = ['piece', 'carton', 'box', 'pack', 'kg', 'liter', 'meter', 'gram'];

export function ProductsPage() {
  const { t, lang } = useLanguage();
  const { show } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [barcodeModal, setBarcodeModal] = useState<Product | null>(null);
  const [qrModal, setQrModal] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [currency, setCurrency] = useState('EGP');

  const [form, setForm] = useState({
    name: '', name_en: '', barcode: '', sku: '', category_id: '', description: '',
    cost_price: 0, sale_price: 0, wholesale_price: 0, image_url: '', is_active: true, low_stock_threshold: 5, product_type: 'ready' as 'ready' | 'manufactured',
  });
  const [units, setUnits] = useState<ProductUnit[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('settings').select('*').maybeSingle(),
      ]);
      setProducts((p.data as Product[]) || []);
      setCategories((c.data as Category[]) || []);
      if (s.data) setCurrency((s.data as Settings).currency || 'EGP');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search) || p.sku?.includes(search)
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', name_en: '', barcode: generateBarcode(), sku: '', category_id: '', description: '', cost_price: 0, sale_price: 0, wholesale_price: 0, image_url: '', is_active: true, low_stock_threshold: 5, product_type: 'ready' });
    setUnits([{ id: '', product_id: '', unit_name: 'piece', unit_name_en: 'piece', conversion_factor: 1, sale_price: 0, cost_price: 0, barcode: '', is_base: true, created_at: '' }]);
    setModalOpen(true);
  };

  const openEdit = async (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, name_en: p.name_en || '', barcode: p.barcode || '', sku: p.sku || '', category_id: p.category_id || '', description: p.description || '', cost_price: p.cost_price, sale_price: p.sale_price, wholesale_price: p.wholesale_price, image_url: p.image_url || '', is_active: p.is_active, low_stock_threshold: p.low_stock_threshold, product_type: p.product_type || 'ready' });
    const { data: u } = await supabase.from('product_units').select('*').eq('product_id', p.id);
    setUnits((u as ProductUnit[]) || [{ id: '', product_id: p.id, unit_name: 'piece', unit_name_en: 'piece', conversion_factor: 1, sale_price: p.sale_price, cost_price: p.cost_price, barcode: p.barcode || '', is_base: true, created_at: '' }]);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name) { show(t('required') + ': ' + t('name'), 'error'); return; }
    const payload = { ...form, category_id: form.category_id || null };
    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      if (error) { show(error.message, 'error'); return; }
      await supabase.from('product_units').delete().eq('product_id', editing.id);
      if (units.length > 0) {
        await supabase.from('product_units').insert(units.filter(u => u.unit_name).map(u => ({ ...u, id: undefined, product_id: editing.id })));
      }
      await logAudit('update', 'products', editing.id, { name: form.name });
      show(t('saveSuccess'), 'success');
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select().single();
      if (error) { show(error.message, 'error'); return; }
      if (units.length > 0) {
        await supabase.from('product_units').insert(units.filter(u => u.unit_name).map(u => ({ ...u, id: undefined, product_id: data.id })));
      }
      await logAudit('create', 'products', data.id, { name: form.name });
      show(t('saveSuccess'), 'success');
    }
    setModalOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('products').delete().eq('id', deleteId);
    if (error) show(error.message, 'error');
    else { show(t('deleteSuccess'), 'success'); await logAudit('delete', 'products', deleteId); }
    setDeleteId(null);
    load();
  };

  const handleExport = () => {
    exportToExcel(products.map(p => ({
      Name: p.name, NameEn: p.name_en || '', Barcode: p.barcode || '', SKU: p.sku || '',
      ProductType: p.product_type || 'ready',
      CostPrice: p.cost_price, SalePrice: p.sale_price, WholesalePrice: p.wholesale_price,
      Category: p.category?.name || '', Active: p.is_active, LowStockThreshold: p.low_stock_threshold,
    })), 'products');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await importFromExcel(file);
      const payload = rows.map((r) => ({
        name: String(r.Name || r.name || ''),
        name_en: String(r.NameEn || r.name_en || ''),
        barcode: String(r.Barcode || r.barcode || ''),
        sku: String(r.SKU || r.sku || ''),
        product_type: String(r.ProductType || r.product_type || 'ready') === 'manufactured' ? 'manufactured' as const : 'ready' as const,
        cost_price: Number(r.CostPrice || r.cost_price || 0),
        sale_price: Number(r.SalePrice || r.sale_price || 0),
        wholesale_price: Number(r.WholesalePrice || r.wholesale_price || 0),
        is_active: true,
        low_stock_threshold: Number(r.LowStockThreshold || 5),
      })).filter(r => r.name);
      if (payload.length === 0) { show('No valid rows', 'error'); return; }
      const { error } = await supabase.from('products').insert(payload);
      if (error) show(error.message, 'error');
      else { show(`${payload.length} ${t('import')} OK`, 'success'); load(); }
    } catch (err) {
      show(String(err), 'error');
    }
  };

  const showBarcode = (p: Product) => {
    setBarcodeModal(p);
    setTimeout(() => {
      if (barcodeCanvasRef.current) renderBarcode(barcodeCanvasRef.current, p.barcode || p.id);
    }, 100);
  };

  const showQR = async (p: Product) => {
    const url = await generateQRCodeDataURL(JSON.stringify({ id: p.id, name: p.name, barcode: p.barcode, price: p.sale_price }));
    setQrDataUrl(url);
    setQrModal(p.id);
  };

  const addUnit = () => setUnits([...units, { id: '', product_id: '', unit_name: 'box', unit_name_en: 'box', conversion_factor: 10, sale_price: 0, cost_price: 0, barcode: '', is_base: false, created_at: '' }]);
  const updateUnit = (i: number, field: keyof ProductUnit, value: string | number | boolean) => setUnits(units.map((u, idx) => idx === i ? { ...u, [field]: value } : u));
  const removeUnit = (i: number) => setUnits(units.filter((_, idx) => idx !== i));

  const columns: Column<Product>[] = [
    { key: 'name', header: t('productName'), render: (p) => (
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
          {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full rounded-lg object-cover" /> : <BarcodeIcon className="w-4 h-4 text-slate-400" />}
        </div>
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-200">{p.name}</p>
          <p className="text-xs text-slate-400">{p.barcode || '-'}</p>
        </div>
        {p.product_type === 'manufactured' && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{t('manufactured')}</span>
        )}
      </div>
    )},
    { key: 'category', header: t('category'), render: (p) => p.category?.name || '-' },
    { key: 'cost_price', header: t('costPrice'), render: (p) => formatCurrency(p.cost_price, currency, lang) },
    { key: 'sale_price', header: t('salePrice'), render: (p) => <span className="font-semibold text-teal-600 dark:text-teal-400">{formatCurrency(p.sale_price, currency, lang)}</span> },
    { key: 'wholesale_price', header: t('wholesalePrice'), render: (p) => formatCurrency(p.wholesale_price, currency, lang) },
    { key: 'is_active', header: t('status'), render: (p) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
        {p.is_active ? t('active') : t('inactive')}
      </span>
    )},
    { key: 'actions', header: t('actions'), render: (p) => (
      <div className="flex items-center gap-1">
        <button onClick={() => showBarcode(p)} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title={t('barcode')}><BarcodeIcon className="w-4 h-4" /></button>
        <button onClick={() => showQR(p)} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title={t('generateQR')}><QrCode className="w-4 h-4" /></button>
        <button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title={t('edit')}><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title={t('delete')}><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title={t('products')}
        actions={
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> {t('importExcel')}</Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4" /> {t('exportExcel')}</Button>
            <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4" /> {t('add')}</Button>
          </>
        }
      />

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search')}
            className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </Card>

      <Card className="p-4">
        <DataTable columns={columns} data={filtered} loading={loading} emptyMessage={t('noData')} onRowClick={openEdit} />
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('edit') : t('add')} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('productName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label={t('nameEn')} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
            <Input label={t('barcode')} value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            <Input label={t('sku')} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <Select label={t('category')} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">--</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label={t('productType')} value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value as 'ready' | 'manufactured' })}>
              <option value="ready">{t('readyProduct')}</option>
              <option value="manufactured">{t('manufacturedProduct')}</option>
            </Select>
            <Input label={t('image') + ' URL'} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <Input label={t('costPrice')} type="number" step="0.01" value={form.cost_price || ''} onChange={(e) => setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })} />
            <Input label={t('salePrice')} type="number" step="0.01" value={form.sale_price || ''} onChange={(e) => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })} />
            <Input label={t('wholesalePrice')} type="number" step="0.01" value={form.wholesale_price || ''} onChange={(e) => setForm({ ...form, wholesale_price: parseFloat(e.target.value) || 0 })} />
            <Input label={t('lowStockThreshold')} type="number" value={form.low_stock_threshold || ''} onChange={(e) => setForm({ ...form, low_stock_threshold: parseInt(e.target.value) || 0 })} />
          </div>
          <Textarea label={t('description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />

          {/* Units */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">{t('units')}</h3>
              <Button size="sm" variant="outline" onClick={addUnit}><Plus className="w-4 h-4" /> {t('add')}</Button>
            </div>
            <div className="space-y-2">
              {units.map((u, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div>
                    <label className="text-xs text-slate-500">{t('unitName')}</label>
                    <select value={u.unit_name} onChange={(e) => updateUnit(i, 'unit_name', e.target.value)} className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm">
                      {UNIT_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <Input label={t('conversionFactor')} type="number" step="0.0001" value={u.conversion_factor || ''} onChange={(e) => updateUnit(i, 'conversion_factor', parseFloat(e.target.value) || 1)} />
                  <Input label={t('salePrice')} type="number" step="0.01" value={u.sale_price || ''} onChange={(e) => updateUnit(i, 'sale_price', parseFloat(e.target.value) || 0)} />
                  <Input label={t('costPrice')} type="number" step="0.01" value={u.cost_price || ''} onChange={(e) => updateUnit(i, 'cost_price', parseFloat(e.target.value) || 0)} />
                  <Input label={t('barcode')} value={u.barcode || ''} onChange={(e) => updateUnit(i, 'barcode', e.target.value)} />
                  <button onClick={() => removeUnit(i)} className="p-2 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('cancel')}</Button>
            <Button onClick={save}>{t('save')}</Button>
          </div>
        </div>
      </Modal>

      {/* Barcode Modal */}
      <Modal open={!!barcodeModal} onClose={() => setBarcodeModal(null)} title={t('barcode')} size="sm">
        {barcodeModal && (
          <div className="flex flex-col items-center gap-4">
            <p className="font-medium text-slate-700 dark:text-slate-200">{barcodeModal.name}</p>
            <canvas ref={barcodeCanvasRef} className="rounded-lg bg-white p-2" />
            <Button variant="outline" onClick={() => window.print()}><BarcodeIcon className="w-4 h-4" /> {t('print')}</Button>
          </div>
        )}
      </Modal>

      {/* QR Modal */}
      <Modal open={!!qrModal} onClose={() => setQrModal(null)} title={t('generateQR')} size="sm">
        {qrDataUrl && (
          <div className="flex flex-col items-center gap-4">
            <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-lg" />
            <Button variant="outline" onClick={() => window.print()}><QrCode className="w-4 h-4" /> {t('print')}</Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        title={t('delete')}
        message={t('confirmDelete')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
      />
    </div>
  );
}
