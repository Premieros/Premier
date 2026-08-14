import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/api';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { useBranches } from '@/hooks/useBranches';
import { isAdminRole } from '@/lib/permissions';
import { formatCurrency, formatDate, formatNumber, todayISO } from '@/lib/format';
import { DesignSurface, DesignPageHeader, DesignPanel, DesignSearch } from '@/components/design';
import { DataTable, type Column } from '@/components/DataTable';
import { Input } from '@/components/Input';

// ERP-02 Costing Center. Drives the branch-scoped costing analytics from the
// 070_recipe_costing migration (compute_recipe_cost / recipe_costing_report /
// raw_material_cost_history / costing_profitability_report) in three tabs.

type Tab = 'recipe' | 'raw' | 'profit';

interface RecipeCostRow {
  id: string;
  product_id: string;
  product_name: string;
  recipe_id: string;
  recipe_name: string | null;
  yield_quantity: number;
  sale_price: number;
  recipe_cost: number;
  gross_margin: number;
  gross_margin_pct: number;
  food_cost_pct: number;
}

interface RawCostRow {
  id: string;
  raw_material_id: string;
  raw_material_name: string;
  unit_cost: number;
  quantity: number;
  batch_number: string | null;
  source_type: string;
  supplier_name: string | null;
  occurred_at: string;
}

interface ProfitRow {
  id: string;
  product_id: string;
  product_name: string;
  units_sold: number;
  revenue: number;
  theoretical_cost: number;
  actual_cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
  variance: number;
}

interface BreakdownItem {
  name: string | null;
  quantity: number;
  consumed_quantity: number;
  unit_cost: number;
  line_cost: number;
}

export function CostingPage() {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const { user } = useAuth();
  const branchFilter = useBranchFilter();
  const { branches } = useBranches();
  const { effectiveSettings } = useSettings();

  const [tab, setTab] = useState<Tab>('recipe');
  const [adminBranchFilter, setAdminBranchFilter] = useState('');
  const effectiveBranch = isAdminRole(user?.role) ? (adminBranchFilter || null) : branchFilter;
  const currency = effectiveSettings(effectiveBranch)?.currency || 'EGP';

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recipes, setRecipes] = useState<RecipeCostRow[]>([]);
  const [rawHistory, setRawHistory] = useState<RawCostRow[]>([]);
  const [profitRows, setProfitRows] = useState<ProfitRow[]>([]);
  const [breakdown, setBreakdown] = useState<{ name: string; yield: number; total: number; unit: number; items: BreakdownItem[] } | null>(null);

  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(todayISO());

  const run = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecipes = useCallback(() => run(async () => {
    const { data, error: err } = await supabase.rpc('recipe_costing_report', { p_branch_id: effectiveBranch });
    if (err) throw new Error(err.message);
    setRecipes((((data as RecipeCostRow[] | null) ?? [])).map((r) => ({ ...r, id: r.recipe_id })));
  }), [effectiveBranch, run]);

  const loadRawHistory = useCallback(() => run(async () => {
    const { data, error: err } = await supabase.rpc('raw_material_cost_history', { p_raw_material_id: null, p_branch_id: effectiveBranch });
    if (err) throw new Error(err.message);
    setRawHistory((((data as RawCostRow[] | null) ?? [])).map((r) => ({ ...r, id: `${r.raw_material_id}-${r.batch_number || r.occurred_at}` })));
  }), [effectiveBranch, run]);

  const loadProfit = useCallback(() => run(async () => {
    if (!effectiveBranch) {
      setProfitRows([]);
      return;
    }
    const fromTs = `${from}T00:00:00`;
    const toTs = `${to}T23:59:59`;
    const { data, error: err } = await supabase.rpc('costing_profitability_report', { p_branch_id: effectiveBranch, p_from: fromTs, p_to: toTs });
    if (err) throw new Error(err.message);
    setProfitRows((((data as ProfitRow[] | null) ?? [])).map((r) => ({ ...r, id: r.product_id })));
  }), [effectiveBranch, from, to, run]);

  useEffect(() => {
    if (tab === 'recipe') void loadRecipes();
    else if (tab === 'raw') void loadRawHistory();
    else void loadProfit();
  }, [tab, loadRecipes, loadRawHistory, loadProfit]);

  const openBreakdown = useCallback(async (row: RecipeCostRow) => {
    const { data, error: err } = await supabase.rpc('compute_recipe_cost', { p_recipe_id: row.recipe_id });
    if (err || !data || !(data as Record<string, unknown>).success) {
      setBreakdown(null);
      return;
    }
    const r = data as Record<string, unknown>;
    setBreakdown({
      name: String(r.name ?? row.recipe_name ?? ''),
      yield: Number(r.yield_quantity ?? 0),
      total: Number(r.total_cost ?? 0),
      unit: Number(r.unit_cost ?? 0),
      items: ((r.items as BreakdownItem[] | null) ?? []).map((it) => ({
        name: it.name,
        quantity: Number(it.quantity),
        consumed_quantity: Number(it.consumed_quantity),
        unit_cost: Number(it.unit_cost),
        line_cost: Number(it.line_cost),
      })),
    });
  }, []);

  const recipeColumns: Column<RecipeCostRow>[] = [
    { key: 'product_name', header: isAr ? 'المنتج' : 'Product' },
    { key: 'recipe_name', header: isAr ? 'الوصفة' : 'Recipe', render: (r) => r.recipe_name || '-' },
    { key: 'yield_quantity', header: t('yieldQuantity'), render: (r) => formatNumber(r.yield_quantity) },
    { key: 'sale_price', header: t('salePrice'), render: (r) => formatCurrency(r.sale_price, currency, lang) },
    { key: 'recipe_cost', header: t('recipeCost'), render: (r) => formatCurrency(r.recipe_cost, currency, lang) },
    { key: 'gross_margin', header: t('grossMargin'), render: (r) => formatCurrency(r.gross_margin, currency, lang) },
    { key: 'gross_margin_pct', header: t('grossMarginPct'), render: (r) => `${r.gross_margin_pct}%` },
    { key: 'food_cost_pct', header: t('foodCostPercent'), render: (r) => `${r.food_cost_pct}%` },
  ];

  const rawColumns: Column<RawCostRow>[] = [
    { key: 'raw_material_name', header: isAr ? 'المادة' : 'Material' },
    { key: 'unit_cost', header: t('unitCost'), render: (r) => formatCurrency(r.unit_cost, currency, lang) },
    { key: 'quantity', header: t('quantity'), render: (r) => formatNumber(r.quantity) },
    { key: 'batch_number', header: t('batchNumber'), render: (r) => r.batch_number || '-' },
    { key: 'source_type', header: t('sourceType'), render: (r) => r.source_type || '-' },
    { key: 'supplier_name', header: t('supplierName'), render: (r) => r.supplier_name || '-' },
    { key: 'occurred_at', header: t('occurredAt'), render: (r) => formatDate(r.occurred_at, lang) },
  ];

  const profitColumns: Column<ProfitRow>[] = [
    { key: 'product_name', header: isAr ? 'المنتج' : 'Product' },
    { key: 'units_sold', header: t('unitsSold'), render: (r) => formatNumber(r.units_sold) },
    { key: 'revenue', header: t('revenue'), render: (r) => formatCurrency(r.revenue, currency, lang) },
    { key: 'theoretical_cost', header: t('theoreticalCost'), render: (r) => formatCurrency(r.theoretical_cost, currency, lang) },
    { key: 'actual_cogs', header: t('actualCogs'), render: (r) => formatCurrency(r.actual_cogs, currency, lang) },
    { key: 'gross_profit', header: t('grossProfit'), render: (r) => formatCurrency(r.gross_profit, currency, lang) },
    { key: 'gross_margin_pct', header: t('grossMarginPct'), render: (r) => `${r.gross_margin_pct}%` },
    { key: 'variance', header: t('variance'), render: (r) => formatCurrency(r.variance, currency, lang) },
  ];

  const filteredRecipes = recipes.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.product_name.toLowerCase().includes(q) || (r.recipe_name || '').toLowerCase().includes(q);
  });
  const filteredRaw = rawHistory.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.raw_material_name.toLowerCase().includes(q) || (r.supplier_name || '').toLowerCase().includes(q);
  });
  const filteredProfit = profitRows.filter((r) => {
    if (!search) return true;
    return r.product_name.toLowerCase().includes(search.toLowerCase());
  });

  const tabLabel = (key: Tab, testId: string, label: string) => (
    <button
      data-testid={testId}
      type="button"
      onClick={() => { setTab(key); setBreakdown(null); setSearch(''); }}
      className={`px-4 py-2 rounded-ui-lg text-sm font-semibold transition-colors ${tab === key ? 'bg-ui-primary text-ui-primary-fg shadow-ui-sm' : 'bg-ui-page-alt text-ui-muted border border-ui-border hover:bg-ui-primary-soft hover:text-ui-primary'}`}
    >
      {label}
    </button>
  );

  return (
    <DesignSurface testId="costing-page">
      <DesignPageHeader title={t('costingCenter')} subtitle={t('costingSubtitle')} actions={
        isAdminRole(user?.role) && branches.length > 0 ? (
          <select
            value={adminBranchFilter}
            onChange={(e) => setAdminBranchFilter(e.target.value)}
            className="h-10 min-w-[180px] rounded-ui border border-ui-border bg-ui-surface-raised px-3 text-sm font-semibold text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-ring"
          >
            <option value="">{t('allBranches')}</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{lang === 'ar' ? b.name : (b.name_en || b.name)}</option>)}
          </select>
        ) : undefined
      } />

      <DesignPanel testId="costing-tabs-panel">
        <div className="flex flex-wrap gap-2">
          {tabLabel('recipe', 'costing-tab-recipe', t('recipeCosts'))}
          {tabLabel('raw', 'costing-tab-raw', t('rawMaterialCosts'))}
          {tabLabel('profit', 'costing-tab-profit', t('profitability'))}
        </div>
      </DesignPanel>

      {tab === 'profit' && (
        <DesignPanel testId="costing-profit-filters">
          <div className="flex flex-wrap items-end gap-4">
            <Input label={t('from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label={t('to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {!effectiveBranch && (
            <p data-testid="costing-profit-branch-hint" className="text-sm text-ui-subtle">
              {isAr ? 'اختر فرعاً من الأعلى لعرض الربحية' : 'Select a branch above to view profitability'}
            </p>
          )}
        </DesignPanel>
      )}

      <DesignPanel testId="costing-search-panel">
        <DesignSearch value={search} onChange={setSearch} label={t('search')} placeholder={t('search')} testId="costing-search" />
      </DesignPanel>

      <DesignPanel testId="costing-table-panel">
        {tab === 'recipe' && (
          <DataTable columns={recipeColumns} data={filteredRecipes} loading={loading} error={error} emptyMessage={t('noData')} onRowClick={openBreakdown} />
        )}
        {tab === 'raw' && (
          <DataTable columns={rawColumns} data={filteredRaw} loading={loading} error={error} emptyMessage={t('noData')} />
        )}
        {tab === 'profit' && (
          <DataTable columns={profitColumns} data={filteredProfit} loading={loading} error={error} emptyMessage={t('noData')} />
        )}
      </DesignPanel>

      {tab === 'recipe' && breakdown && (
        <DesignPanel testId="costing-breakdown-panel">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-ui-text">{t('costBreakdown')}: {breakdown.name}</h3>
            <div className="flex gap-4 text-sm">
              <span className="text-ui-muted">{t('yieldQuantity')}: <b className="text-ui-text">{formatNumber(breakdown.yield)}</b></span>
              <span className="text-ui-muted">{t('recipeCost')}: <b className="text-ui-accent">{formatCurrency(breakdown.unit, currency, lang)}</b></span>
              <span className="text-ui-muted">{t('totalCost')}: <b className="text-ui-text">{formatCurrency(breakdown.total, currency, lang)}</b></span>
            </div>
          </div>
          <DataTable
            columns={[
              { key: 'name', header: isAr ? 'المادة' : 'Material', render: (it) => it.name || '-' },
              { key: 'quantity', header: isAr ? 'الكمية' : 'Quantity', render: (it) => formatNumber(it.quantity) },
              { key: 'consumed_quantity', header: t('consumedQuantity'), render: (it) => formatNumber(it.consumed_quantity) },
              { key: 'unit_cost', header: t('unitCost'), render: (it) => formatCurrency(it.unit_cost, currency, lang) },
              { key: 'line_cost', header: t('totalCost'), render: (it) => formatCurrency(it.line_cost, currency, lang) },
            ]}
            data={breakdown.items.map((it, i) => ({ ...it, id: String(i) }))}
            loading={false}
            error={null}
            emptyMessage={t('noData')}
          />
        </DesignPanel>
      )}
    </DesignSurface>
  );
}
