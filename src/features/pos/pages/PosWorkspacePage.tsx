import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ArrowRight, LayoutDashboard, ShoppingCart, Tag, User, Timer, X,
  Printer, Barcode as BarcodeIcon, Plus, Activity, UtensilsCrossed,
  Pause, Truck, ShoppingBag, Grid3x3,
} from 'lucide-react';
import { supabase } from '@/api';
import * as api from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { isAdminRole } from '@/lib/permissions';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Logo } from '@/components/Logo';
import { formatCurrency } from '@/lib/format';
import { mergeEffectiveSettings, useSettings } from '@/context/SettingsContext';
import type { Product, Customer, Settings, Branch, Category, ProductComponent, OrderType } from '@/lib/types';
import { usePosOrder } from '../hooks/usePosOrder';
import { usePosSummary } from '../hooks/usePosSummary';
import { ProductBrowser } from '../components/catalog/ProductBrowser';
import { CartPanel } from '../components/cart/CartPanel';
import { CheckoutModal } from '../components/checkout/CheckoutModal';
import { ORDER_TYPES } from '../utils/orderTypes';
import { orderTypeLabel } from '../utils/format';

interface WorkspaceState {
  tableId?: string | null;
  branchId?: string | null;
  orderType?: OrderType | null;
}

export function PosWorkspacePage() {
  const { orderId: orderIdParam } = useParams<{ orderId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const { user } = useAuth();
  const branchFilter = useBranchFilter();
  const { branchSettingsMap } = useSettings();

  const initState = useMemo<WorkspaceState>(() => (location.state || {}) as WorkspaceState, [location.state]);

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [recipeMap, setRecipeMap] = useState<Record<string, ProductComponent[]>>({});

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(initState.branchId || branchFilter || '');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [activeShift, setActiveShift] = useState<{ id: string; expected: number; opened_at: string; opening_amount: number } | null>(null);
  const [shiftChecked, setShiftChecked] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const stateApplied = useRef(false);

  const effectiveBranch = selectedBranch || branchFilter || user?.branch_id || '';
  const effSettings: Settings | null = settings
    ? mergeEffectiveSettings(settings, effectiveBranch ? branchSettingsMap[effectiveBranch] : null)
    : null;

  const isCashier = user?.role === 'cashier';

  useEffect(() => {
    let cancelled = false;
    if (!isCashier || !effectiveBranch) {
      setShiftChecked(true);
      setActiveShift(null);
      return;
    }
    setShiftChecked(false);
    api.pos.getActiveShift({ p_branch_id: effectiveBranch }).then(({ data }) => {
      if (cancelled) return;
      const res = data as unknown as { open?: boolean; shift?: { id: string; expected: number; opened_at: string; opening_amount: number } } | null;
      setActiveShift(res?.open ? (res.shift ?? null) : null);
      setShiftChecked(true);
    });
    return () => { cancelled = true; };
  }, [isCashier, effectiveBranch]);

  const loadStock = useCallback(async (branchId: string) => {
    if (!branchId) { setStockMap({}); return; }
    const { data: warehouses } = await supabase
      .from('warehouses')
      .select('id')
      .eq('branch_id', branchId)
      .eq('is_active', true);
    const warehouseIds = (warehouses || []).map((w: { id: string }) => w.id);
    if (warehouseIds.length === 0) { setStockMap({}); return; }
    const { data: inv } = await supabase
      .from('inventory')
      .select('product_id, quantity')
      .in('warehouse_id', warehouseIds);
    const map: Record<string, number> = {};
    for (const row of (inv || []) as { product_id: string; quantity: number }[]) {
      map[row.product_id] = (map[row.product_id] || 0) + Number(row.quantity);
    }
    setStockMap(map);
  }, []);

  const sellableStock = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) {
      if (p.product_type !== 'manufactured') continue;
      const comps = recipeMap[p.id] || [];
      if (comps.length === 0) { map[p.id] = 0; continue; }
      let min = Infinity;
      for (const c of comps) {
        const perUnit = Number(c.quantity) || 0;
        if (perUnit <= 0) { min = 0; break; }
        const possible = (stockMap[c.component_product_id] || 0) / perUnit;
        if (possible < min) min = possible;
      }
      map[p.id] = min === Infinity ? 0 : Math.floor(min);
    }
    return map;
  }, [products, recipeMap, stockMap]);

  const pos = usePosOrder({
    branchId: effectiveBranch,
    orderId: orderIdParam || null,
    customers,
    effSettings,
    isCashier,
    activeShift,
    products,
    stockMap,
    sellableStock,
    recipeMap,
  });

  const summary = usePosSummary(effectiveBranch);
  const { subtotal } = pos;

  // Applies navigation state from the Active Orders Center: starting a new
  // order at a table / branch / order type. Runs after usePosOrder's reset so
  // the passed table survives the fresh mount.
  useEffect(() => {
    if (stateApplied.current) return;
    stateApplied.current = true;
    if (!orderIdParam && initState.tableId) pos.setTableId(initState.tableId);
    if (initState.orderType) pos.setOrderType(initState.orderType);
  }, [orderIdParam, initState.tableId, initState.orderType, pos]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const fixedBranch = effectiveBranch;
        let cusq = supabase.from('customers').select('*');
        let catq = supabase.from('categories').select('*');
        const productQuery = fixedBranch
          ? supabase
              .from('products')
              .select('*, category:categories(*)')
              .eq('branch_id', fixedBranch)
              .eq('is_active', true)
          : supabase.from('products').select('*, category:categories(*)').eq('is_active', true).order('name');
        if (fixedBranch) {
          cusq = cusq.eq('branch_id', fixedBranch);
          catq = catq.eq('branch_id', fixedBranch);
        }
        const [pRes, cRes, sRes, bRes, catRes] = await Promise.allSettled([
          productQuery,
          cusq.order('name'),
          supabase.from('settings').select('*').maybeSingle(),
          supabase.from('branches').select('*').eq('is_active', true).order('name'),
          catq.order('name'),
        ]);
        if (cancelled) return;

        const errors: string[] = [];
        if (pRes.status === 'fulfilled' && pRes.value.error) errors.push('products: ' + pRes.value.error.message);
        else if (pRes.status === 'fulfilled') {
          if (fixedBranch) {
            const rows = ((pRes.value.data || []) as Product[]).sort((a, b) =>
              (a.name || '').localeCompare(b.name || '')
            );
            setProducts(rows);
          } else {
            setProducts((pRes.value.data as Product[]) || []);
          }
        }
        if (cRes.status === 'fulfilled' && cRes.value.error) errors.push('customers: ' + cRes.value.error.message);
        else if (cRes.status === 'fulfilled') setCustomers((cRes.value.data as Customer[]) || []);
        if (sRes.status === 'fulfilled' && sRes.value.error) errors.push('settings: ' + sRes.value.error.message);
        else if (sRes.status === 'fulfilled') setSettings(sRes.value.data as Settings);
        if (bRes.status === 'fulfilled' && bRes.value.error) errors.push('branches: ' + bRes.value.error.message);
        else if (bRes.status === 'fulfilled') setBranches((bRes.value.data as Branch[]) || []);
        if (catRes.status === 'fulfilled' && catRes.value.error) errors.push('categories: ' + catRes.value.error.message);
        else if (catRes.status === 'fulfilled') setCategories((catRes.value.data as Category[]) || []);

        if (errors.length > 0) setLoadError(errors.join('\n'));
      } catch (err: unknown) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [effectiveBranch]);

  useEffect(() => {
    if (effectiveBranch) void loadStock(effectiveBranch);
  }, [effectiveBranch, loadStock]);

  useEffect(() => {
    let cancelled = false;
    const manufactured = products.filter((p) => p.product_type === 'manufactured');
    if (manufactured.length === 0) { setRecipeMap({}); return; }
    supabase
      .from('product_components')
      .select('*')
      .in('product_id', manufactured.map((p) => p.id))
      .then(({ data }) => {
        if (cancelled) return;
        const map: Record<string, ProductComponent[]> = {};
        for (const row of (data || []) as ProductComponent[]) {
          (map[row.product_id] = map[row.product_id] || []).push(row);
        }
        setRecipeMap(map);
      });
    return () => { cancelled = true; };
  }, [products]);

  const goToFloorPlan = (filter: '' | 'held' | 'delivery' | 'takeaway') => {
    navigate('/floor-plan', { state: { filter } });
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-navy-950 gap-4">
        <Logo variant="mark" size={56} tone="white" />
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-screen flex items-center justify-center bg-navy-950">
        <div className="text-center max-w-md px-4">
          <div className="flex justify-center mb-4">
            <Logo variant="mark" size={56} tone="white" />
          </div>
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-lg font-semibold text-white mb-2">{isAr ? 'خطأ في تحميل البيانات' : 'Error Loading Data'}</p>
          <p className="text-sm text-slate-400 mb-4">{loadError}</p>
          <Button onClick={() => window.location.reload()}>{isAr ? 'إعادة المحاولة' : 'Retry'}</Button>
        </div>
      </div>
    );
  }

  const currentBranchName = branches.find((b) => b.id === effectiveBranch)?.name || '';

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-navy-950 text-slate-900 dark:text-slate-100 overflow-hidden">

      {/* ===== TOP TOOLBAR ===== */}
      <header className="flex-shrink-0 h-14 bg-white dark:bg-navy-900 border-b border-slate-200 dark:border-navy-800 flex items-center px-3 gap-2 z-20">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800">
          {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowRight className="w-5 h-5 rotate-180" />}
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-sm font-bold hidden sm:inline">{isAr ? 'لوحة التحكم' : 'Dashboard'}</span>
        </button>

        <div className="w-px h-7 bg-slate-200 dark:bg-navy-700" />

        <button
          onClick={() => goToFloorPlan('')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-50 dark:bg-navy-800 border border-navy-100 dark:border-navy-700 hover:border-brand-400 transition-all"
          title={t('activeOrders')}
        >
          <Grid3x3 className="w-4 h-4 text-brand-500 dark:text-gold-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-white hidden sm:inline">{t('activeOrders')}</span>
          {summary.activeOrders > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-brand-600 text-white text-[10px] font-bold">{summary.activeOrders}</span>
          )}
        </button>

        <button
          onClick={() => navigate('/pos')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          {isAr ? 'طلب جديد' : 'New Order'}
        </button>

        <div className="flex-1" />

        {/* Branch selector */}
        <div className="flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-slate-400" />
          <select
            value={effectiveBranch}
            disabled={!isAdminRole(user?.role)}
            onChange={(e) => {
              const v = e.target.value;
              if (v !== effectiveBranch && (pos.cart.length > 0 || pos.activeOrderId)) {
                const msg = pos.activeOrderId
                  ? (isAr ? 'تبديل الفرع سيبقي الطلب الحالي مفتوحاً على طاولته وسيمسح السلة المحلية. متابعة؟'
                          : 'Switching branch will keep the current order open on its table and clear the local cart. Continue?')
                  : (isAr ? 'تبديل الفرع سيمسح السلة الحالية. متابعة؟' : 'Switching branch will clear the current cart. Continue?');
                const ok = window.confirm(msg);
                if (!ok) { e.target.value = effectiveBranch; return; }
              }
              setSelectedBranch(v);
              pos.resetWorkspace();
              void loadStock(v);
            }}
            className="text-sm border-0 bg-slate-100 dark:bg-navy-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 max-w-[130px] sm:max-w-none truncate"
          >
            <option value="">{isAr ? 'اختر الفرع' : 'Select Branch'}</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{isAr ? b.name : (b.name_en || b.name)}</option>)}
          </select>
        </div>

        {/* Cart summary in header */}
        {pos.cart.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-50 dark:bg-navy-800 border border-navy-100 dark:border-navy-700">
            <ShoppingCart className="w-4 h-4 text-navy-700 dark:text-gold-400" />
            <span className="text-sm font-bold text-navy-800 dark:text-gold-400">{pos.cart.length}</span>
            <span className="text-xs text-navy-400 dark:text-slate-500">|</span>
            <span className="text-sm font-bold text-navy-800 dark:text-gold-400">{formatCurrency(pos.total, pos.effCurrency, lang)}</span>
          </div>
        )}

        {/* Cashier */}
        <div className="flex items-center gap-2 px-2">
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:inline">{user?.full_name || user?.email}</span>
        </div>
      </header>

      {/* ===== ORDER CONTEXT BAR (all sizes) ===== */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 overflow-x-auto">
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-navy-800 p-1">
          {ORDER_TYPES.map((ot) => (
            <button
              key={ot}
              type="button"
              onClick={() => void pos.switchOrderType(ot)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                pos.orderType === ot
                  ? 'bg-white dark:bg-navy-700 text-brand-700 dark:text-gold-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {orderTypeLabel(t, ot)}
            </button>
          ))}
        </div>

        {pos.activeTable && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{pos.activeTable.name}</span>
            {pos.activeOrderNumber && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">#{pos.activeOrderNumber}</span>
            )}
            <button onClick={() => void pos.detachTable()} className="ms-0.5 text-emerald-500 hover:text-emerald-700" title={isAr ? 'إلغاء ربط الطلب' : 'Detach order'}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {pos.activeOrderNumber && !pos.activeTable && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{isAr ? 'طلب' : 'Order'}: {pos.activeOrderNumber}</span>
            <button onClick={() => void pos.detachOrder()} className="text-amber-500 hover:text-amber-700" title={isAr ? 'إلغاء ربط الطلب' : 'Detach order'}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live summary tiles (clickable -> Active Orders Center) */}
        <div className="ms-auto flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => goToFloorPlan('')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 hover:border-brand-400 transition-all" title={t('activeOrders')}>
            <Activity className="w-3.5 h-3.5 text-brand-500 dark:text-gold-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-white">{summary.activeOrders}</span>
          </button>
          <button onClick={() => goToFloorPlan('')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-500 transition-all" title={t('occupiedTables')}>
            <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{summary.occupiedTables}</span>
          </button>
          <button onClick={() => goToFloorPlan('held')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:border-amber-500 transition-all" title={t('heldOrders')}>
            <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{summary.heldOrders}</span>
          </button>
          <button onClick={() => goToFloorPlan('delivery')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:border-blue-500 transition-all" title={t('deliveryOrders')}>
            <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{summary.deliveryOrders}</span>
          </button>
          <button onClick={() => goToFloorPlan('takeaway')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 hover:border-purple-500 transition-all" title={t('takeawayOrders')}>
            <ShoppingBag className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300">{summary.takeawayOrders}</span>
          </button>
        </div>
      </div>

      {/* ===== SHIFT STATUS BANNER (cashier) ===== */}
      {isCashier && shiftChecked && (
        <div className={`flex-shrink-0 flex items-center gap-2 px-4 py-1.5 text-sm border-b ${
          activeShift
            ? 'bg-navy-50 dark:bg-navy-900 border-navy-100 dark:border-navy-800 text-navy-800 dark:text-gold-300'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
        }`}>
          <Timer className="w-4 h-4" />
          {activeShift ? (
            <>
              <span className="font-semibold">{t('open')} · {new Date(activeShift.opened_at).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</span>
              <span className="hidden sm:inline text-xs opacity-80">{t('expectedAmount')}: {formatCurrency(activeShift.expected, pos.effCurrency, lang)}</span>
            </>
          ) : (
            <span className="font-semibold">{t('noOpenShift')}</span>
          )}
          <button onClick={() => navigate('/shifts')} className="ms-auto text-xs font-bold underline underline-offset-2 hover:opacity-80">
            {activeShift ? t('closeShift') : t('openShift')}
          </button>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex min-h-0">
        <ProductBrowser
          products={products}
          categories={categories}
          stockMap={stockMap}
          sellableStock={sellableStock}
          recipeMap={recipeMap}
          search={search}
          selectedCategory={selectedCategory}
          currency={pos.effCurrency}
          hasBranch={!!effectiveBranch}
          onSearch={setSearch}
          onSelectCategory={setSelectedCategory}
          onAddToCart={pos.addToCart}
          inputRef={barcodeRef}
        />

        {/* ===== RIGHT: CART (desktop) ===== */}
        <div className="hidden lg:flex w-[340px] xl:w-[380px] flex-shrink-0 flex-col bg-white dark:bg-navy-900 border-s border-slate-200 dark:border-navy-800">
          <CartPanel
            cart={pos.cart}
            currency={pos.effCurrency}
            subtotal={subtotal}
            discountValue={pos.discountValue}
            taxRate={effSettings?.tax_enabled ? (effSettings.tax_rate || 0) : 0}
            taxAmount={pos.taxAmount}
            total={pos.total}
            completing={pos.completing}
            orderLoading={pos.orderLoading}
            onUpdateQty={pos.updateQty}
            onSetQty={pos.setQty}
            onRemove={pos.removeFromCart}
            onClear={pos.clearCart}
            onSetItemDiscount={pos.setItemDiscount}
            onHold={() => void pos.holdOrder()}
            onSendKitchen={() => void pos.sendToKitchen()}
            onPayment={(m) => {
              pos.setPaymentMethod(m);
              pos.setPaidAmount(m === 'credit' ? 0 : pos.total);
              pos.setCheckoutOpen(true);
            }}
            onOpenCheckout={() => pos.setCheckoutOpen(true)}
          />
        </div>
      </div>

      {/* ===== MOBILE FLOATING CART BAR ===== */}
      {pos.cart.length > 0 && !mobileCartOpen && (
        <button
          onClick={() => setMobileCartOpen(true)}
          className="lg:hidden fixed bottom-4 start-4 end-4 z-30 flex items-center justify-between gap-2 px-5 py-3.5 rounded-2xl bg-navy-900 text-white border border-gold-500/40 shadow-pos active:scale-[0.98] transition-all"
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <ShoppingCart className="w-5 h-5 text-gold-400" />
            {isAr ? 'عرض السلة' : 'View Cart'}
            <span className="px-2 py-0.5 rounded-full bg-gold-500 text-navy-950 text-xs font-bold">{pos.cart.length}</span>
          </span>
          <span className="font-bold text-gold-400">{formatCurrency(pos.total, pos.effCurrency, lang)}</span>
        </button>
      )}

      {/* ===== MOBILE CART BOTTOM SHEET ===== */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex items-end justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileCartOpen(false)} />
          <div className="relative w-full max-h-[92vh] bg-white dark:bg-navy-900 rounded-t-2xl shadow-pos overflow-hidden animate-slide-up flex flex-col">
            <CartPanel
              cart={pos.cart}
              currency={pos.effCurrency}
              subtotal={subtotal}
              discountValue={pos.discountValue}
              taxRate={effSettings?.tax_enabled ? (effSettings.tax_rate || 0) : 0}
              taxAmount={pos.taxAmount}
              total={pos.total}
              completing={pos.completing}
              orderLoading={pos.orderLoading}
              onUpdateQty={pos.updateQty}
              onSetQty={pos.setQty}
              onRemove={pos.removeFromCart}
              onClear={pos.clearCart}
              onSetItemDiscount={pos.setItemDiscount}
              onHold={() => void pos.holdOrder()}
              onSendKitchen={() => void pos.sendToKitchen()}
              onPayment={(m) => {
                pos.setPaymentMethod(m);
                pos.setPaidAmount(m === 'credit' ? 0 : pos.total);
                pos.setCheckoutOpen(true);
              }}
              onOpenCheckout={() => pos.setCheckoutOpen(true)}
              onClose={() => setMobileCartOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ===== CHECKOUT MODAL ===== */}
      <CheckoutModal
        open={pos.checkoutOpen}
        onClose={() => pos.setCheckoutOpen(false)}
        currentBranchName={currentBranchName}
        orderType={pos.orderType}
        onSwitchOrderType={(ot) => void pos.switchOrderType(ot)}
        activeTable={pos.activeTable}
        activeOrderNumber={pos.activeOrderNumber}
        guestCount={pos.guestCount}
        onGuestCountChange={pos.setGuestCount}
        customerId={pos.customerId}
        customers={customers}
        onCustomerChange={pos.setCustomerId}
        discountType={pos.discountType}
        discountAmount={pos.discountAmount}
        onDiscountTypeChange={pos.setDiscountType}
        onDiscountAmountChange={pos.setDiscountAmount}
        paymentMethod={pos.paymentMethod}
        onPaymentMethodChange={pos.setPaymentMethod}
        paidAmount={pos.paidAmount}
        onPaidAmountChange={pos.setPaidAmount}
        subtotal={pos.subtotal}
        discountValue={pos.discountValue}
        taxAmount={pos.taxAmount}
        total={pos.total}
        change={pos.change}
        completing={pos.completing}
        canComplete={!!effectiveBranch}
        onComplete={() => void pos.completeSale()}
        currency={pos.effCurrency}
      />

      {/* ===== RECEIPT MODAL ===== */}
      <Modal open={!!pos.receiptSaleId} onClose={pos.closeReceipt} title={t('printReceipt')} size="sm">
        {pos.lastReceipt && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 ring-2 ring-gold-500/40 flex items-center justify-center mx-auto mb-3">
                <BarcodeIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-base font-semibold text-slate-800 dark:text-white">{t('saleCompleted')}</p>
              <p className="text-sm text-slate-400 mt-1">{pos.lastReceipt.invoice}</p>
            </div>
            <Button size="lg" className="w-full" onClick={() => void pos.printReceipt()}>
              <Printer className="w-5 h-5" /> {t('printReceipt')}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
