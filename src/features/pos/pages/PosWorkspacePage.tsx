import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, Printer, Barcode as BarcodeIcon } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '@/api';
import * as api from '@/api';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { isAdminRole } from '@/lib/permissions';
import { Modal } from '@/components/Modal';
import { Logo } from '@/components/Logo';
import { formatCurrency } from '@/lib/format';
import { mergeEffectiveSettings, useSettings } from '@/context/SettingsContext';
import { useToast } from '@/components/Toast';
import type { Product, Customer, Settings, Branch, Category, ProductComponent, RpcResult, Order } from '@/lib/types';
import { usePosOrder } from '../hooks/usePosOrder';
import { useActiveOrders } from '../hooks/useActiveOrders';
import { OrderStartWizard, type StartStep, type StartOrderOptions } from '../components/start/OrderStartWizard';
import { ProductBrowser } from '../components/catalog/ProductBrowser';
import { PosTopBar, type PosPanelId } from '../components/topbar/PosTopBar';
import { OrderTypeBottomBar } from '../components/bottom/OrderTypeBottomBar';
import { ActiveOrdersDrawer } from '../components/orders/ActiveOrdersDrawer';
import { TablesPanel } from '../components/tables/TablesPanel';
import { KitchenPanel } from '../components/kitchen/KitchenPanel';
import { CurrentOrderPanel } from '../components/order/CurrentOrderPanel';
import { PaymentPanel } from '../components/checkout/PaymentPanel';

interface WorkspaceState { tableId?: string | null; branchId?: string | null; guestCount?: number | null; pay?: number | null; }

export function PosWorkspacePage() {
  const { orderId: orderIdParam } = useParams<{ orderId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const { user } = useAuth();
  const branchFilter = useBranchFilter();
  const { branchSettingsMap } = useSettings();
  const { show } = useToast();
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
  const [activeShift, setActiveShift] = useState<{ id: string; expected: number; opened_at: string; opening_amount: number } | null>(null);
  const [shiftChecked, setShiftChecked] = useState(false);
  const [panel, setPanel] = useState<PosPanelId>(null);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);
  const [startStep, setStartStep] = useState<StartStep | null>(null);
  const [preselectedTableId, setPreselectedTableId] = useState<string | null>(initState.tableId || null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const payConsumed = useRef(false);
  const effectiveBranch = selectedBranch || branchFilter || user?.branch_id || '';
  const effSettings: Settings | null = settings ? mergeEffectiveSettings(settings, effectiveBranch ? branchSettingsMap[effectiveBranch] : null) : null;
  const isCashier = user?.role === 'cashier';

  useEffect(() => {
    let cancelled = false;
    if (!isCashier || !effectiveBranch) { setShiftChecked(true); setActiveShift(null); return; }
    setShiftChecked(false);
    api.pos.getActiveShift({ p_branch_id: effectiveBranch }).then(({ data }) => {
      if (cancelled) return;
      const res = data as unknown as { open?: boolean; shift?: { id: string; expected: number; opened_at: string; opening_amount: number } } | null;
      setActiveShift(res?.open ? (res.shift ?? null) : null); setShiftChecked(true);
    });
    return () => { cancelled = true; };
  }, [isCashier, effectiveBranch]);

  const loadStock = useCallback(async (branchId: string) => {
    if (!branchId) { setStockMap({}); return; }
    const { data: warehouses } = await supabase.from('warehouses').select('id').eq('branch_id', branchId).eq('is_active', true);
    const warehouseIds = (warehouses || []).map((w: { id: string }) => w.id);
    if (warehouseIds.length === 0) { setStockMap({}); return; }
    const { data: inv } = await supabase.from('inventory').select('product_id, quantity').in('warehouse_id', warehouseIds);
    const map: Record<string, number> = {};
    for (const row of (inv || []) as { product_id: string; quantity: number }[]) map[row.product_id] = (map[row.product_id] || 0) + Number(row.quantity);
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

  const pos = usePosOrder({ branchId: effectiveBranch, orderId: orderIdParam || null, customers, effSettings, isCashier, activeShift, products, stockMap, sellableStock, recipeMap });
  const live = useActiveOrders(effectiveBranch);

  useEffect(() => {
    if (!effSettings?.pos_barcode_autofocus) return;
    if (panel || pos.checkoutOpen || mobileOrderOpen) return;
    const timer = setTimeout(() => barcodeRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [effSettings?.pos_barcode_autofocus, panel, pos.checkoutOpen, mobileOrderOpen]);
  const { orders, tables, counts, ordersByTable, itemsByOrder, kitchenSendsByOrder, sentOrderItemIds, tableById } = live;
  const customerById = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c])), [customers]);
  const productNames = useMemo(() => Object.fromEntries(products.map((p) => [p.id, isAr ? p.name : (p.name_en || p.name)])), [products, isAr]);
  const kitchenOrders = useMemo(() => orders.filter((o) => (kitchenSendsByOrder[o.id]?.length || 0) > 0).length, [orders, kitchenSendsByOrder]);
  const activeOrderCreatedAt = useMemo(() => orders.find((o) => o.id === pos.activeOrderId)?.created_at || null, [orders, pos.activeOrderId]);

  useEffect(() => {
    if (orderIdParam) { setStartStep(null); return; }
    if (initState.tableId) { setPreselectedTableId(initState.tableId); setStartStep('table'); } else setStartStep('type');
  }, [orderIdParam, initState.tableId]);

  useEffect(() => {
    if (payConsumed.current || !initState.pay || pos.checkoutOpen || pos.orderLoading || !pos.activeOrderId || pos.cart.length === 0) return;
    payConsumed.current = true; pos.setPaymentMethod('cash'); pos.setPaidAmount(pos.total); pos.setCheckoutOpen(true);
  }, [initState.pay, pos.checkoutOpen, pos.orderLoading, pos.activeOrderId, pos.cart.length, pos.total]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const fixedBranch = effectiveBranch;
        let cusq = supabase.from('customers').select('*');
        let catq = supabase.from('categories').select('*');
        const productQuery = fixedBranch ? supabase.from('products').select('*, category:categories(*)').eq('branch_id', fixedBranch).eq('is_active', true) : supabase.from('products').select('*, category:categories(*)').eq('is_active', true).order('name');
        if (fixedBranch) { cusq = cusq.eq('branch_id', fixedBranch); catq = catq.eq('branch_id', fixedBranch); }
        const [pRes, cRes, sRes, bRes, catRes] = await Promise.allSettled([productQuery, cusq.order('name'), supabase.from('settings').select('*').maybeSingle(), supabase.from('branches').select('*').eq('is_active', true).order('name'), catq.order('name')]);
        if (cancelled) return;
        const errors: string[] = [];
        if (pRes.status === 'fulfilled' && pRes.value.error) errors.push('products: ' + pRes.value.error.message); else if (pRes.status === 'fulfilled') setProducts((pRes.value.data as Product[]) || []);
        if (cRes.status === 'fulfilled' && cRes.value.error) errors.push('customers: ' + cRes.value.error.message); else if (cRes.status === 'fulfilled') setCustomers((cRes.value.data as Customer[]) || []);
        if (sRes.status === 'fulfilled' && sRes.value.error) errors.push('settings: ' + sRes.value.error.message); else if (sRes.status === 'fulfilled') setSettings(sRes.value.data as Settings);
        if (bRes.status === 'fulfilled' && bRes.value.error) errors.push('branches: ' + bRes.value.error.message); else if (bRes.status === 'fulfilled') setBranches((bRes.value.data as Branch[]) || []);
        if (catRes.status === 'fulfilled' && catRes.value.error) errors.push('categories: ' + catRes.value.error.message); else if (catRes.status === 'fulfilled') setCategories((catRes.value.data as Category[]) || []);
        if (errors.length > 0) setLoadError(errors.join('\n'));
      } catch (err: unknown) { if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err)); }
      finally { if (!cancelled) setLoading(false); }
    }
    loadData(); return () => { cancelled = true; };
  }, [effectiveBranch]);

  useEffect(() => { if (effectiveBranch) void loadStock(effectiveBranch); }, [effectiveBranch, loadStock]);

  useEffect(() => {
    let cancelled = false;
    const manufactured = products.filter((p) => p.product_type === 'manufactured');
    if (manufactured.length === 0) { setRecipeMap({}); return; }
    supabase.from('product_components').select('*').in('product_id', manufactured.map((p) => p.id)).then(({ data }) => {
      if (cancelled) return;
      const map: Record<string, ProductComponent[]> = {};
      for (const row of (data || []) as ProductComponent[]) (map[row.product_id] = map[row.product_id] || []).push(row);
      setRecipeMap(map);
    });
    return () => { cancelled = true; };
  }, [products]);

  const openOrderWorkspace = (orderId: string, opts: { pay?: boolean } = {}) => {
    if (pos.activeOrderId === orderId) {
      if (opts.pay) { pos.setPaymentMethod('cash'); pos.setPaidAmount(pos.total); pos.setCheckoutOpen(true); }
      setPanel(null); setMobileOrderOpen(false); return;
    }
    navigate(`/pos/${orderId}`, { state: { branchId: effectiveBranch, ...(opts.pay ? { pay: 1 } : {}) } });
  };
  const startOrderAtTable = (tableId: string) => {
    if (pos.activeOrderId || pos.cart.length > 0) {
      const ok = window.confirm(isAr ? 'سيتم إغلاق الطلب الحالي محلياً وبدء طلب جديد على الطاولة. متابعة؟' : 'The current workspace order will be cleared. Continue?');
      if (!ok) return;
      pos.resetWorkspace();
    }
    setStartStep('table'); setPreselectedTableId(tableId); setPanel(null); setMobileOrderOpen(false);
  };
  const handleStartOrder = (opts: StartOrderOptions) => {
    pos.resetWorkspace(); pos.setOrderType(opts.orderType); if (opts.tableId) pos.setTableId(opts.tableId); pos.setGuestCount(opts.guestCount ?? null); if (opts.customerId) pos.setCustomerId(opts.customerId); pos.setOrderNotes(opts.notes || '');
    setStartStep(null); setPreselectedTableId(null); setPanel(null); setMobileOrderOpen(false);
  };
  const handleWizardResume = (order: Order, pay = false) => {
    setStartStep(null); setPreselectedTableId(null); setPanel(null); setMobileOrderOpen(false); openOrderWorkspace(order.id, pay ? { pay: true } : {});
  };
  const handleCancelOrder = async (orderId: string) => {
    const { data, error } = await api.floorPlan.setOrderStatus({ p_order_id: orderId, p_status: 'cancelled' });
    if (error) show(error.message, 'error'); else if (!(data as RpcResult | null)?.success) { const r = data as RpcResult | null; show(r?.detail || r?.error || t('error'), 'error'); } else show(t('cancelOrder'), 'success');
  };
  const handlePay = () => { pos.setPaymentMethod('cash'); pos.setPaidAmount(pos.total); pos.setCheckoutOpen(true); setMobileOrderOpen(false); };
  const handleBranchChange = (v: string) => {
    if (v !== effectiveBranch && (pos.cart.length > 0 || pos.activeOrderId)) {
      const ok = window.confirm(isAr ? 'تبديل الفرع سيمسح السلة الحالية. متابعة؟' : 'Switching branch will clear the current cart. Continue?');
      if (!ok) return;
    }
    setSelectedBranch(v); pos.resetWorkspace(); void loadStock(v);
  };

  if (loading) return <div className="h-screen flex flex-col items-center justify-center bg-ui-page gap-4"><Logo variant="mark" size={56} tone="auto" /><div className="animate-spin rounded-full h-10 w-10 border-2 border-ui-primary border-t-transparent" /></div>;
  if (loadError) return <div className="h-screen flex items-center justify-center bg-ui-page"><div className="text-center max-w-md px-4"><div className="flex justify-center mb-4"><Logo variant="mark" size={56} tone="auto" /></div><div className="w-16 h-16 rounded-full bg-ui-danger/20 border border-ui-danger/30 flex items-center justify-center mx-auto mb-4"><ShoppingCart className="w-8 h-8 text-ui-danger" /></div><p className="text-lg font-semibold text-ui-text mb-2">{isAr ? 'خطأ في تحميل البيانات' : 'Error Loading Data'}</p><p className="text-sm text-ui-muted mb-4 whitespace-pre-line">{loadError}</p><button onClick={() => window.location.reload()} className="px-6 py-2.5 rounded-xl bg-ui-primary hover:bg-ui-primary-hover text-ui-primary-fg font-bold transition-colors">{isAr ? 'إعادة المحاولة' : 'Retry'}</button></div></div>;

  const currentBranchName = branches.find((b) => b.id === effectiveBranch)?.name || '';
  const isCheckout = pos.checkoutOpen;
  const orderItemsForActive = pos.activeOrderId ? (itemsByOrder[pos.activeOrderId] || []) : [];
  const rightPanel = isCheckout ? <PaymentPanel currentBranchName={currentBranchName} orderType={pos.orderType} activeTable={pos.activeTable} activeOrderNumber={pos.activeOrderNumber} guestCount={pos.guestCount} onGuestCountChange={pos.setGuestCount} customerId={pos.customerId} customers={customers} onCustomerChange={pos.setCustomerId} discountType={pos.discountType} discountAmount={pos.discountAmount} onDiscountTypeChange={pos.setDiscountType} onDiscountAmountChange={pos.setDiscountAmount} paymentMethod={pos.paymentMethod} onPaymentMethodChange={pos.setPaymentMethod} paidAmount={pos.paidAmount} onPaidAmountChange={pos.setPaidAmount} subtotal={pos.subtotal} discountValue={pos.discountValue} taxAmount={pos.taxAmount} total={pos.total} change={pos.change} completing={pos.completing} canComplete={!!effectiveBranch} onComplete={() => void pos.completeSale()} onBack={() => pos.setCheckoutOpen(false)} currency={pos.effCurrency} /> : <CurrentOrderPanel cart={pos.cart} currency={pos.effCurrency} subtotal={pos.subtotal} discountValue={pos.discountValue} discountType={pos.discountType} discountAmount={pos.discountAmount} taxRate={effSettings?.tax_enabled ? (effSettings.tax_rate || 0) : 0} taxAmount={pos.taxAmount} total={pos.total} completing={pos.completing} orderLoading={pos.orderLoading} kitchenSending={pos.kitchenSending} orderType={pos.orderType} activeOrderNumber={pos.activeOrderNumber} activeOrderId={pos.activeOrderId} activeTable={pos.activeTable} guestCount={pos.guestCount} customerId={pos.customerId} customerById={customerById} orderNotes={pos.orderNotes} activeOrderCreatedAt={activeOrderCreatedAt} orderItems={orderItemsForActive} sentOrderItemIds={sentOrderItemIds} sessionSent={pos.kitchenSentItems} onSwitchOrderType={(ot) => void pos.switchOrderType(ot)} onGuestCountChange={pos.setGuestCount} onDiscountTypeChange={pos.setDiscountType} onDiscountAmountChange={pos.setDiscountAmount} onUpdateQty={pos.updateQty} onSetQty={pos.setQty} onRemove={pos.removeFromCart} onClear={pos.clearCart} onSetItemDiscount={pos.setItemDiscount} onHold={() => void pos.holdOrder()} onSendKitchen={() => void pos.sendToKitchen()} onPrint={pos.printKitchenTicket} onPay={handlePay} onAddItem={() => barcodeRef.current?.focus()} />;

  return <div className="h-screen flex flex-col bg-ui-page text-ui-text overflow-hidden pb-[62px] lg:pb-[66px]">
    <PosTopBar panel={panel} onPanel={(p) => { setStartStep(null); setPanel(p); }} counts={{ activeOrders: counts.active, occupiedTables: tables.filter((tb) => tb.status === 'occupied').length, kitchenOrders, heldOrders: counts.held, deliveryOrders: counts.delivery, takeawayOrders: counts.takeaway }} branchId={effectiveBranch} branches={branches} canChangeBranch={isAdminRole(user?.role)} onBranchChange={handleBranchChange} isCashier={isCashier} shiftChecked={shiftChecked} activeShift={activeShift} onNewOrder={() => { pos.resetWorkspace(); setStartStep('type'); setPreselectedTableId(null); setPanel(null); setMobileOrderOpen(false); if (orderIdParam) navigate('/pos'); }} onExit={() => navigate('/dashboard')} />
    <div className="flex-1 flex min-h-0"><ProductBrowser products={products} categories={categories} stockMap={stockMap} sellableStock={sellableStock} recipeMap={recipeMap} search={search} selectedCategory={selectedCategory} currency={pos.effCurrency} hasBranch={!!effectiveBranch} onSearch={setSearch} onSelectCategory={setSelectedCategory} onAddToCart={pos.addToCart} inputRef={barcodeRef} /><div className="hidden lg:flex w-[390px] xl:w-[430px] 2xl:w-[460px] flex-shrink-0 flex-col border-s border-ui-border bg-ui-surface shadow-ui-md">{rightPanel}</div></div>
    {pos.cart.length > 0 && !mobileOrderOpen && !isCheckout && <button onClick={() => setMobileOrderOpen(true)} className="lg:hidden fixed bottom-[68px] start-4 end-4 z-30 flex items-center justify-between gap-2 px-5 py-3.5 rounded-2xl bg-ui-primary text-ui-primary-fg border border-ui-border-strong shadow-ui-lg active:scale-[0.98] transition-all"><span className="flex items-center gap-2 font-bold text-sm"><ShoppingCart className="w-5 h-5 text-ui-accent" />{isAr ? 'عرض السلة' : 'View Cart'}<span className="px-2 py-0.5 rounded-full bg-ui-accent text-ui-primary-fg text-xs font-bold">{pos.cart.length}</span></span><span className="font-bold text-ui-accent">{formatCurrency(pos.total, pos.effCurrency, lang)}</span></button>}
    {mobileOrderOpen && <div className="lg:hidden fixed inset-0 z-40 flex items-end justify-center animate-fade-in"><div className="absolute inset-0 bg-black/50" onClick={() => setMobileOrderOpen(false)} /><div className="relative w-full max-h-[92vh] bg-ui-surface rounded-t-2xl shadow-ui-xl overflow-hidden animate-slide-up flex flex-col"><div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-ui-border"><button onClick={() => setMobileOrderOpen(false)} className="p-2 rounded-lg text-ui-muted hover:bg-ui-page-alt"><ShoppingCart className="w-5 h-5" /></button><span className="text-xs font-bold text-ui-muted">{isAr ? 'اسحب لأسفل للإغلاق' : 'Order'}</span><span className="text-sm font-black text-ui-accent">{formatCurrency(pos.total, pos.effCurrency, lang)}</span></div><div className="flex-1 min-h-0 overflow-hidden">{rightPanel}</div></div></div>}
    <OrderTypeBottomBar disabled={isCheckout} />
    <ActiveOrdersDrawer open={panel === 'orders'} onClose={() => setPanel(null)} orders={orders} itemsByOrder={itemsByOrder} kitchenSendsByOrder={kitchenSendsByOrder} tableById={tableById} customerById={customerById} currency={pos.effCurrency} onResume={(o) => openOrderWorkspace(o.id)} onPay={(o) => openOrderWorkspace(o.id, { pay: true })} onCancel={(o) => void handleCancelOrder(o.id)} />
    <TablesPanel open={panel === 'tables'} onClose={() => setPanel(null)} tables={tables} ordersByTable={ordersByTable} currency={pos.effCurrency} onResume={(o) => openOrderWorkspace(o.id)} onPay={(o) => openOrderWorkspace(o.id, { pay: true })} onStart={(tb) => startOrderAtTable(tb.id)} />
    <KitchenPanel open={panel === 'kitchen'} onClose={() => setPanel(null)} orders={orders} itemsByOrder={itemsByOrder} kitchenSendsByOrder={kitchenSendsByOrder} tableById={tableById} productNames={productNames} />
    {startStep && <OrderStartWizard step={startStep} tables={tables} ordersByTable={ordersByTable} itemsByOrder={itemsByOrder} kitchenSendsByOrder={kitchenSendsByOrder} customers={customers} preselectedTableId={preselectedTableId} currency={pos.effCurrency} onStepChange={setStartStep} onBack={() => setStartStep('type')} onStart={handleStartOrder} onResume={handleWizardResume} onActiveOrders={() => { setStartStep(null); setPreselectedTableId(null); setPanel('orders'); }} />}
    <Modal open={!!pos.receiptSaleId} onClose={pos.closeReceipt} title={t('printReceipt')} size="sm">{pos.lastReceipt && <div className="space-y-4"><div className="text-center"><div className="w-16 h-16 rounded-full bg-ui-success/15 ring-2 ring-ui-border-strong flex items-center justify-center mx-auto mb-3"><BarcodeIcon className="w-8 h-8 text-ui-success" /></div><p className="text-base font-semibold text-ui-text">{t('saleCompleted')}</p><p className="text-sm text-ui-muted mt-1">{pos.lastReceipt.invoice}</p></div><button onClick={() => void pos.printReceipt()} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-ui-primary hover:bg-ui-primary-hover text-ui-primary-fg font-bold transition-colors"><Printer className="w-5 h-5" /> {t('printReceipt')}</button></div>}</Modal>
  </div>;
}
