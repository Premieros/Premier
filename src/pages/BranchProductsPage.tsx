import { useEffect, useMemo, useState } from 'react';
import { Search, Save, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';
import { PageHeader, Card } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { formatCurrency } from '../lib/format';
import { logAudit } from '../lib/audit';
import type { Branch, Product, Category, Settings, BranchProduct } from '../lib/types';

interface AssignmentEntry {
  selling_price: string;
  is_active: boolean;
}

export function BranchProductsPage() {
  const { t, lang } = useLanguage();
  const { show } = useToast();
  const isAr = lang === 'ar';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [assignments, setAssignments] = useState<Record<string, AssignmentEntry>>({});
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [b, c, s] = await Promise.all([
        supabase.from('branches').select('*').eq('is_active', true).order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('settings').select('*').maybeSingle(),
      ]);
      setBranches((b.data as Branch[]) || []);
      setCategories((c.data as Category[]) || []);
      if (s.data) setCurrency((s.data as Settings).currency || 'EGP');
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedBranch) { setProducts([]); setAssignments({}); setLoading(false); return; }
    setLoading(true);
    async function loadBranch() {
      const [p, bp] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)').order('name'),
        supabase.from('branch_products').select('*').eq('branch_id', selectedBranch),
      ]);
      setProducts((p.data as Product[]) || []);
      const map: Record<string, AssignmentEntry> = {};
      for (const row of (bp.data as BranchProduct[]) || []) {
        map[row.product_id] = {
          selling_price: row.selling_price != null ? String(row.selling_price) : '',
          is_active: row.is_active,
        };
      }
      setAssignments(map);
      setLoading(false);
    }
    loadBranch();
  }, [selectedBranch]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter && p.category_id !== categoryFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (p.name?.toLowerCase().includes(q) || p.name_en?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    });
  }, [products, search, categoryFilter]);

  const assignedCount = Object.keys(assignments).length;

  const toggleAssign = (productId: string, checked: boolean) => {
    setAssignments((prev) => {
      const next = { ...prev };
      if (checked) {
        if (!(productId in next)) {
          next[productId] = { selling_price: '', is_active: true };
        }
      } else {
        delete next[productId];
      }
      return next;
    });
  };

  const updateEntry = (productId: string, patch: Partial<AssignmentEntry>) => {
    setAssignments((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }));
  };

  const selectAll = () => {
    setAssignments((prev) => {
      const next = { ...prev };
      for (const p of filtered) {
        if (!(p.id in next)) next[p.id] = { selling_price: '', is_active: true };
      }
      return next;
    });
  };

  const clearSelection = () => {
    setAssignments((prev) => {
      const next = { ...prev };
      for (const p of filtered) delete next[p.id];
      return next;
    });
  };

  const save = async () => {
    if (!selectedBranch) { show(t('selectBranchFirst'), 'error'); return; }
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('branch_products')
        .select('id, product_id')
        .eq('branch_id', selectedBranch);
      const existingRows = (existing || []) as { id: string; product_id: string }[];
      const existingById = new Map(existingRows.map((r) => [r.product_id, r.id]));
      const keep = Object.keys(assignments);
      const keepSet = new Set(keep);

      const toDelete = existingRows.filter((r) => !keepSet.has(r.product_id)).map((r) => r.id);
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase
          .from('branch_products')
          .delete()
          .in('id', toDelete);
        if (delErr) { show(delErr.message, 'error'); return; }
      }

      const toUpdate = keep.filter((pid) => existingById.has(pid));
      for (const pid of toUpdate) {
        const entry = assignments[pid];
        const { error: upErr } = await supabase
          .from('branch_products')
          .update({
            selling_price: entry.selling_price ? parseFloat(entry.selling_price) : null,
            is_active: entry.is_active,
          })
          .eq('id', existingById.get(pid));
        if (upErr) { show(upErr.message, 'error'); return; }
      }

      const toInsert = keep.filter((pid) => !existingById.has(pid));
      if (toInsert.length > 0) {
        const rows = toInsert.map((pid) => ({
          branch_id: selectedBranch,
          product_id: pid,
          selling_price: assignments[pid].selling_price ? parseFloat(assignments[pid].selling_price) : null,
          is_active: assignments[pid].is_active,
          display_order: 0,
        }));
        const { error: insErr } = await supabase.from('branch_products').insert(rows);
        if (insErr) { show(insErr.message, 'error'); return; }
      }

      await logAudit('update', 'branch_products', selectedBranch);
      show(t('assignmentsSaved'), 'success');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('branchProducts')} actions={
        <Button size="sm" onClick={save} disabled={saving || !selectedBranch}>
          <Save className="w-4 h-4" /> {t('save')}
        </Button>
      } />
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label={t('branch')} value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
            <option value="">--</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Select label={t('category')} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} disabled={!selectedBranch}>
            <option value="">{isAr ? 'الكل' : 'All'}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </Card>

      {!selectedBranch ? (
        <Card className="p-8 text-center text-slate-400">{t('selectBranchToStart')}</Card>
      ) : (
        <>
          <Card className="mb-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search')}
                  className="w-full ps-10 pe-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <Button variant="outline" size="sm" onClick={selectAll} disabled={filtered.length === 0}>
                <CheckSquare className="w-4 h-4" /> {t('selectAll')}
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection} disabled={filtered.length === 0}>
                <Square className="w-4 h-4" /> {t('clearSelection')}
              </Button>
              <span className="text-sm text-slate-500">{assignedCount} / {products.length}</span>
            </div>
          </Card>

          <Card className="p-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600" />
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 && (
                  <div className="py-10 text-center text-slate-400">{t('noData')}</div>
                )}
                {filtered.map((p) => {
                  const entry = assignments[p.id];
                  const checked = !!entry;
                  return (
                    <div key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                      <input type="checkbox" checked={checked} onChange={(e) => toggleAssign(p.id, e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                      <div className="flex-1 min-w-40">
                        <p className="font-semibold text-slate-800 dark:text-white text-sm">
                          {isAr ? (p.name || p.name_en) : (p.name_en || p.name)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {p.category?.name || (isAr ? 'غير مصنف' : 'Uncategorized')}
                          {p.barcode ? ` • ${p.barcode}` : ''}
                          {` • ${formatCurrency(p.sale_price, currency, lang)}`}
                        </p>
                      </div>
                      {checked && (
                        <div className="flex items-center gap-3">
                          <div className="w-36">
                            <Input type="number" step="0.01" placeholder={t('branchSellingPrice')}
                              value={entry.selling_price}
                              onChange={(e) => updateEntry(p.id, { selling_price: e.target.value })} />
                          </div>
                          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={entry.is_active}
                              onChange={(e) => updateEntry(p.id, { is_active: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                            {t('active')}
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
