import { useEffect, useState } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';
import { PageHeader, Card } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency } from '../lib/format';
import { logAudit } from '../lib/audit';
import type { Product, ProductComponent } from '../lib/types';

interface ComponentWithProduct extends ProductComponent {
  component_product?: Product;
}

export function ComponentsPage() {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const { show } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [components, setComponents] = useState<ComponentWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ component_product_id: '', quantity: 1 });

  const availableComponents = products.filter(
    (p) => p.id !== selectedProductId && !components.some((c) => c.component_product_id === p.id)
  );

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').eq('is_active', true).order('name');
    setProducts((data as Product[]) || []);
    setLoading(false);
  }

  async function loadComponents(productId: string) {
    if (!productId) { setComponents([]); return; }
    const { data } = await supabase
      .from('product_components')
      .select('*, component_product:products(*)')
      .eq('product_id', productId)
      .order('created_at');
    setComponents((data as ComponentWithProduct[]) || []);
  }

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => { if (selectedProductId) loadComponents(selectedProductId); }, [selectedProductId]);

  const addComponent = async () => {
    if (!selectedProductId || !form.component_product_id) { show(t('required'), 'error'); return; }
    if (form.quantity <= 0) { show(t('required'), 'error'); return; }
    const { error } = await supabase.from('product_components').insert({
      product_id: selectedProductId,
      component_product_id: form.component_product_id,
      quantity: form.quantity,
    });
    if (error) { show(error.message, 'error'); return; }
    await logAudit('create', 'product_components', undefined, { product_id: selectedProductId });
    show(t('saveSuccess'), 'success');
    setModalOpen(false);
    setForm({ component_product_id: '', quantity: 1 });
    loadComponents(selectedProductId);
  };

  const removeComponent = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('product_components').delete().eq('id', deleteId);
    if (error) show(error.message, 'error');
    else { show(t('deleteSuccess'), 'success'); await logAudit('delete', 'product_components', deleteId); }
    setDeleteId(null);
    loadComponents(selectedProductId);
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const componentCost = components.reduce((sum, c) => {
    const price = c.component_product?.cost_price || 0;
    return sum + price * Number(c.quantity);
  }, 0);

  return (
    <div>
      <PageHeader title={t('components')} />

      <Card>
        <div className="mb-4">
          <Select
            label={isAr ? 'اختر منتجاً لإدارة مكوناته' : 'Select product to manage components'}
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">-- {isAr ? 'اختر منتج' : 'Select product'} --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.cost_price, 'EGP', lang)})</option>
            ))}
          </Select>
        </div>

        {!loading && selectedProductId && (
          <>
            {/* Product info */}
            {selectedProduct && (
              <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{selectedProduct.name}</p>
                  <p className="text-xs text-slate-400">{isAr ? 'سعر البيع' : 'Sale Price'}: {formatCurrency(selectedProduct.sale_price, 'EGP', lang)} | {isAr ? 'التكلفة' : 'Cost'}: {formatCurrency(selectedProduct.cost_price, 'EGP', lang)}</p>
                </div>
                <div className="text-end">
                  <p className="text-xs text-slate-400">{isAr ? 'تكلفة المكونات' : 'Component Cost'}</p>
                  <p className={`font-bold ${componentCost > selectedProduct.sale_price ? 'text-red-500' : 'text-teal-600'}`}>
                    {formatCurrency(componentCost, 'EGP', lang)}
                  </p>
                </div>
              </div>
            )}

            {/* Add button */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isAr ? 'المكونات' : 'Components'} ({components.length})
              </h3>
              <Button onClick={() => { setForm({ component_product_id: '', quantity: 1 }); setModalOpen(true); }} disabled={!availableComponents.length}>
                <Plus className="w-4 h-4" /> {t('addComponent')}
              </Button>
            </div>

            {/* Components list */}
            {components.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('noComponents')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {components.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                      {c.component_product?.image_url ? (
                        <img src={c.component_product.image_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{c.component_product?.name || '-'}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(c.component_product?.cost_price || 0, 'EGP', lang)} × {c.quantity}</p>
                    </div>
                    <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                      {formatCurrency((c.component_product?.cost_price || 0) * Number(c.quantity), 'EGP', lang)}
                    </span>
                    <button onClick={() => setDeleteId(c.id)} className="p-2 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && !selectedProductId && (
          <div className="text-center py-16 text-slate-400">
            <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{isAr ? 'اختر منتجاً لإدارة مكوناته' : 'Select a product to manage its components'}</p>
          </div>
        )}
      </Card>

      {/* Add Component Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('addComponent')} size="sm">
        <div className="space-y-4">
          <Select
            label={t('componentProduct')}
            value={form.component_product_id}
            onChange={(e) => setForm({ ...form, component_product_id: e.target.value })}
          >
            <option value="">-- {t('selectComponentProduct')} --</option>
            {availableComponents.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.cost_price, 'EGP', lang)})</option>
            ))}
          </Select>
          <Input
            label={t('componentQuantity')}
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 1 })}
            min={0.001}
          />
          <Button className="w-full" onClick={addComponent}>{t('save')}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={removeComponent}
        title={t('delete')}
        message={isAr ? 'هل أنت متأكد من حذف هذا المكون؟' : 'Are you sure you want to delete this component?'}
      />
    </div>
  );
}
