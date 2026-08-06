import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, ChefHat } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { useCan } from '@/lib/permissions';
import { useAuth } from '@/context/AuthContext';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { PageHeader, Card } from '@/components/PageHeader';
import { DataTable, type Column } from '@/components/DataTable';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatNumber } from '@/lib/format';
import { logAudit } from '@/lib/audit';
import type { Recipe, RecipeItem, RawMaterial, Product, Branch, RecipeItemInput } from '@/lib/types';

interface ItemForm {
  raw_material_id: string;
  quantity: number;
  wastage_percent: number;
}

const EMPTY_ITEM: ItemForm = { raw_material_id: '', quantity: 1, wastage_percent: 0 };

export function RecipesPage() {
  const { t, lang } = useLanguage();
  const { show } = useToast();
  const can = useCan();
  const { user } = useAuth();
  const branchFilter = useBranchFilter();
  const isAr = lang === 'ar';

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [form, setForm] = useState({
    product_id: '',
    branch_id: '',
    name: '',
    yield_quantity: 1,
    notes: '',
    is_active: true,
  });
  const [items, setItems] = useState<ItemForm[]>([{ ...EMPTY_ITEM }]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [r, pr, m, br] = await Promise.all([
        supabase.from('recipes').select('*, product:products(*), branch:branches(*)').order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('product_type', 'manufactured').eq('is_active', true).order('name'),
        supabase.from('raw_materials').select('*').eq('is_active', true).order('name'),
        supabase.from('branches').select('*').eq('is_active', true).order('name'),
      ]);
      setRecipes((r.data as Recipe[]) || []);
      setProducts((pr.data as Product[]) || []);
      setMaterials((m.data as RawMaterial[]) || []);
      setBranches((br.data as Branch[]) || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = recipes.filter((rc) => {
    if (branchFilter && rc.branch_id !== branchFilter) return false;
    if (!search) return true;
    return (rc.product?.name || '').toLowerCase().includes(search.toLowerCase()) || (rc.name || '').toLowerCase().includes(search.toLowerCase());
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ product_id: '', branch_id: user?.branch_id || branchFilter || '', name: '', yield_quantity: 1, notes: '', is_active: true });
    setItems([{ ...EMPTY_ITEM }]);
    setModalOpen(true);
  };

  const openEdit = async (rc: Recipe) => {
    const { data } = await supabase.from('recipe_items')
      .select('*, raw_material:raw_materials(*)')
      .eq('recipe_id', rc.id)
      .order('created_at');
    setEditing(rc);
    setForm({
      product_id: rc.product_id, branch_id: rc.branch_id, name: rc.name || '',
      yield_quantity: Number(rc.yield_quantity), notes: rc.notes || '', is_active: rc.is_active,
    });
    const fetched = ((data as RecipeItem[]) || []).map((it) => ({
      raw_material_id: it.raw_material_id, quantity: Number(it.quantity), wastage_percent: Number(it.wastage_percent),
    }));
    setItems(fetched.length ? fetched : [{ ...EMPTY_ITEM }]);
    setModalOpen(true);
  };

  const addLine = () => setItems([...items, { ...EMPTY_ITEM }]);
  const updateLine = (i: number, field: keyof ItemForm, value: string | number) =>
    setItems(items.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  const removeLine = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!form.product_id) { show(t('required') + ': ' + t('selectProduct'), 'error'); return; }
    if (!form.branch_id) { show(t('required') + ': ' + t('branch'), 'error'); return; }
    const validItems = items.filter((it) => it.raw_material_id && it.quantity > 0);
    if (validItems.length === 0) { show(t('required') + ': ' + t('recipeItems'), 'error'); return; }

    const payload = {
      product_id: form.product_id,
      branch_id: form.branch_id,
      name: form.name.trim() || null,
      yield_quantity: form.yield_quantity,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    };
    const itemRows: RecipeItemInput[] = validItems.map((it) => ({
      raw_material_id: it.raw_material_id,
      quantity: it.quantity,
      wastage_percent: it.wastage_percent,
    }));

    if (editing) {
      const { error } = await supabase.from('recipes').update(payload).eq('id', editing.id);
      if (error) { show(error.message, 'error'); return; }
      const { error: delErr } = await supabase.from('recipe_items').delete().eq('recipe_id', editing.id);
      if (delErr) { show(delErr.message, 'error'); return; }
      if (itemRows.length > 0) {
        const { error: insErr } = await supabase.from('recipe_items').insert(itemRows.map((it) => ({ ...it, recipe_id: editing.id })));
        if (insErr) { show(insErr.message, 'error'); return; }
      }
      await logAudit('update', 'recipes', editing.id);
    } else {
      const { data, error } = await supabase.from('recipes').insert(payload).select().single();
      if (error) { show(error.message, 'error'); return; }
      const recipeId = (data as Recipe).id;
      const { error: insErr } = await supabase.from('recipe_items').insert(itemRows.map((it) => ({ ...it, recipe_id: recipeId })));
      if (insErr) { show(insErr.message, 'error'); return; }
      await logAudit('create', 'recipes', recipeId);
    }
    show(t('saveSuccess'), 'success');
    setModalOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('recipes').delete().eq('id', deleteId);
    if (error) show(error.message, 'error');
    else { show(t('deleteSuccess'), 'success'); await logAudit('delete', 'recipes', deleteId); }
    setDeleteId(null);
    load();
  };

  const columns: Column<Recipe>[] = [
    { key: 'product', header: t('product'), render: (rc) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400">
          <ChefHat className="w-4 h-4" />
        </div>
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-200">{rc.product?.name || '-'}</p>
          {rc.name && <p className="text-xs text-slate-400">{rc.name}</p>}
        </div>
      </div>
    )},
    { key: 'branch', header: t('branch'), render: (rc) => rc.branch?.name || '-' },
    { key: 'yield', header: t('yieldQuantity'), render: (rc) => formatNumber(Number(rc.yield_quantity)) },
    { key: 'is_active', header: t('status'), render: (rc) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rc.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
        {rc.is_active ? t('active') : t('inactive')}
      </span>
    )},
    { key: 'actions', header: t('actions'), render: (rc) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        {can('recipes.manage') && (
          <button onClick={() => openEdit(rc)} className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title={t('edit')}>
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {can('recipes.manage') && (
          <button onClick={() => setDeleteId(rc.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title={t('delete')}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title={t('recipes')} subtitle={isAr ? 'ط±ط¨ط· ط§ظ„ظ…ظ†طھط¬ط§طھ ط§ظ„ظ…طµظ†ظ‘ط¹ط© ط¨ظ…ظƒظˆظ†ط§طھظ‡ط§ ظ…ظ† ط§ظ„ظ…ظˆط§ط¯ ط§ظ„ط®ط§ظ…' : 'Link manufactured products to their raw material components'} actions={
        can('recipes.manage') ? (
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4" /> {t('addRecipe')}</Button>
        ) : undefined
      } />

      <Card className="mb-4 p-4">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')}
            className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </Card>

      <Card className="p-4">
        <DataTable columns={columns} data={filtered} loading={loading} emptyMessage={t('noData')} />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('editRecipe') : t('addRecipe')} size="2xl">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label={t('product')} value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} disabled={!!editing}>
              <option value="">{t('selectProduct')}</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Select label={t('branch')} value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} disabled={!!branchFilter}>
              <option value="">{t('branch')}</option>
              {branches.map((br) => <option key={br.id} value={br.id}>{br.name}</option>)}
            </Select>
            <Input label={t('name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label={t('yieldQuantity')} type="number" step="0.0001" value={form.yield_quantity} onChange={(e) => setForm({ ...form, yield_quantity: parseFloat(e.target.value) || 1 })} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('recipeItems')}</p>
              <Button variant="outline" size="sm" onClick={addLine}><Plus className="w-4 h-4" /> {t('add')}</Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_100px_100px_36px] gap-2 items-end">
                  <Select value={it.raw_material_id} onChange={(e) => updateLine(idx, 'raw_material_id', e.target.value)}>
                    <option value="">{t('selectRawMaterial')}</option>
                    {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </Select>
                  <Input type="number" step="0.0001" value={it.quantity} onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)} placeholder={t('requiredQty')} />
                  <Input type="number" step="0.01" value={it.wastage_percent} onChange={(e) => updateLine(idx, 'wastage_percent', parseFloat(e.target.value) || 0)} placeholder={t('wastagePercent')} />
                  <button onClick={() => removeLine(idx)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title={t('delete')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500" />
            {t('active')}
          </label>

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
