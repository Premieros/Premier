import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, ShoppingCart, X, Printer, Barcode as BarcodeIcon, ArrowRight, CreditCard, Banknote, Smartphone, FileText, LayoutDashboard, Tag, User, Percent, Package, Timer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useBranchFilter } from '../lib/useBranchFilter';
import { isAdminRole } from '../lib/permissions';
import { useToast } from '../components/Toast';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Logo } from '../components/Logo';
import { formatCurrency } from '../lib/format';
import { logAudit } from '../lib/audit';
import { generateQRCodeDataURL } from '../lib/barcode';
import { mergeEffectiveSettings, useSettings } from '../context/SettingsContext';
import type { Product, Customer, CartItem, Settings, Branch, Category, ProductComponent, RpcResult, Language } from '../lib/types';

interface ReceiptData {
  invoice: string;
  items: { name: string; qty: number; price: number; total: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  date: string;
  customerName: string;
}

function openPrintWindow(html: string, widthMm: number) {
  const win = window.open('', '_blank', `width=${Math.min(500, widthMm + 140)},height=600`);
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  return true;
}

async function buildReceiptHtml(receipt: ReceiptData, s: Settings, lang: Language, isAr: boolean): Promise<string> {
  const width = Math.max(50, Math.min(100, s.receipt_width_mm || 80));
  const copies = Math.max(1, Math.min(5, s.receipt_copies || 1));
  const showTax = s.receipt_show_tax !== false;
  const showQr = s.receipt_show_qr !== false;
  const currency = s.currency || 'EGP';

  let qrImg = '';
  if (showQr) {
    try {
      qrImg = await generateQRCodeDataURL(
        JSON.stringify({ inv: receipt.invoice, total: receipt.total, date: receipt.date })
      );
    } catch {
      qrImg = '';
    }
  }

  const single = `
    <div class="center header">${s.store_name || ''}</div>
    ${s.store_address ? `<div class="center sub">${s.store_address}</div>` : ''}
    ${s.store_phone ? `<div class="center sub">${isAr ? 'هاتف' : 'Tel'}: ${s.store_phone}</div>` : ''}
    ${s.receipt_header ? `<div class="center sub">${s.receipt_header}</div>` : ''}
    <div class="divider"></div>
    <div class="row"><span>${isAr ? 'الفاتورة' : 'Invoice'}: ${receipt.invoice}</span></div>
    <div class="row"><span>${isAr ? 'التاريخ' : 'Date'}: ${new Date(receipt.date).toLocaleString(isAr ? 'ar-SA' : 'en-US')}</span></div>
    ${receipt.customerName ? `<div class="row"><span>${isAr ? 'العميل' : 'Customer'}: ${receipt.customerName}</span></div>` : ''}
    <div class="divider"></div>
    ${receipt.items.map((i) => `<div class="item-row"><div class="item-name">${i.name}</div><div class="row item-detail"><span>${i.qty} x ${formatCurrency(i.price, currency, lang)}</span><span>${formatCurrency(i.total, currency, lang)}</span></div></div>`).join('')}
    <div class="divider"></div>
    <div class="row"><span>${isAr ? 'المجموع الفرعي' : 'Subtotal'}</span><span>${formatCurrency(receipt.subtotal, currency, lang)}</span></div>
    ${receipt.discount > 0 ? `<div class="row"><span>${isAr ? 'الخصم' : 'Discount'}</span><span>-${formatCurrency(receipt.discount, currency, lang)}</span></div>` : ''}
    ${showTax && receipt.tax > 0 ? `<div class="row"><span>${isAr ? 'الضريبة' : 'Tax'} (${s.tax_rate ?? 0}%)</span><span>${formatCurrency(receipt.tax, currency, lang)}</span></div>` : ''}
    <div class="divider"></div>
    <div class="row total-row"><span>${isAr ? 'الإجمالي' : 'Total'}</span><span>${formatCurrency(receipt.total, currency, lang)}</span></div>
    <div class="row"><span>${isAr ? 'المدفوع' : 'Paid'}</span><span>${formatCurrency(receipt.paid, currency, lang)}</span></div>
    ${receipt.change > 0 ? `<div class="row"><span>${isAr ? 'الباقي' : 'Change'}</span><span>${formatCurrency(receipt.change, currency, lang)}</span></div>` : ''}
    ${qrImg ? `<div class="center" style="margin-top:6px"><img src="${qrImg}" width="${Math.round(width / 2.2)}" style="display:block;margin:0 auto" /></div>` : ''}
    <div class="divider"></div>
    ${s.receipt_footer ? `<div class="footer">${s.receipt_footer}</div>` : ''}
    <div class="footer">${isAr ? 'شكراً لزيارتكم' : 'Thank you!'}</div>`;

  const pages = Array.from({ length: copies }, () => `<div class="page">${single}</div>`).join('\n');
  return `<!DOCTYPE html>
    <html dir="${isAr ? 'rtl' : 'ltr'}">
    <head><title>${receipt.invoice}</title>
    <style>
      * { font-family: 'Courier New', monospace; margin: 0; padding: 0; box-sizing: border-box; }
      body { width: ${width}mm; padding: 4mm; font-size: 12px; color: #000; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .header { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
      .sub { font-size: 10px; margin-bottom: 8px; }
      .divider { border-top: 1px dashed #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; margin: 2px 0; }
      .item-row { margin: 4px 0; }
      .item-name { font-weight: bold; }
      .item-detail { font-size: 11px; }
      .total-row { font-size: 14px; font-weight: bold; }
      .footer { margin-top: 10px; text-align: center; font-size: 10px; }
    </style></head>
    <body>${pages}</body>
    <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }</script>
    </html>`;
}

export function PosPage() {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const { user } = useAuth();
  const branchFilter = useBranchFilter();
  const { show } = useToast();
  const { branchSettingsMap } = useSettings();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [recipeMap, setRecipeMap] = useState<Record<string, ProductComponent[]>>({});

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [paidAmount, setPaidAmount] = useState(0);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(branchFilter || '');
  const [loadError, setLoadError] = useState('');
  const [catSidebarOpen, setCatSidebarOpen] = useState(true);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [activeShift, setActiveShift] = useState<{ id: string; expected: number; cash_sales: number; total_sales: number; opened_at: string; opening_amount: number } | null>(null);
  const [shiftChecked, setShiftChecked] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const effectiveBranch = selectedBranch || branchFilter || user?.branch_id || '';
  const effSettings: Settings | null = settings
    ? mergeEffectiveSettings(settings, effectiveBranch ? branchSettingsMap[effectiveBranch] : null)
    : null;

  const isCashier = user?.role === 'cashier';

  useEffect(() => {
    let cancelled = false;
    if (!isCashier) { setShiftChecked(true); setActiveShift(null); return; }
    if (!effectiveBranch) { setShiftChecked(true); setActiveShift(null); return; }
    setShiftChecked(false);
    supabase.rpc('get_active_shift', { p_branch_id: effectiveBranch }).then(({ data }) => {
      if (cancelled) return;
      const res = data as RpcResult | null;
      setActiveShift(res?.open ? (res.shift as unknown as { id: string; expected: number; cash_sales: number; total_sales: number; opened_at: string; opening_amount: number }) : null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBranch]);

  useEffect(() => {
    if (effectiveBranch) loadStock(effectiveBranch);
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

  // For manufactured products: how many units can be built from current component stock
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

  const getStock = useCallback((productId: string) => {
    const prod = products.find((x) => x.id === productId);
    if (prod?.product_type === 'manufactured') return sellableStock[productId] || 0;
    return stockMap[productId] || 0;
  }, [products, sellableStock, stockMap]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory) result = result.filter((p) => p.category_id === selectedCategory);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }
    return result;
  }, [products, search, selectedCategory]);

  const categoryProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const cid = p.category_id || '_none';
      counts[cid] = (counts[cid] || 0) + 1;
    }
    return counts;
  }, [products]);

  const addToCart = (product: Product) => {
    const stock = getStock(product.id);
    if (product.product_type === 'manufactured' && (recipeMap[product.id]?.length || 0) === 0) {
      show(`${product.name}: ${t('noRecipe')}`, 'error');
      return;
    }
    const inCart = cart.find((i) => i.product.id === product.id)?.quantity || 0;
    if (inCart >= stock && stock > 0) {
      show(`${product.name}: ${t('insufficientStock')} (${stock})`, 'error');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { product, unit_name: 'piece', quantity: 1, unit_price: product.sale_price, discount_amount: 0, bonus_quantity: 0 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    const stock = getStock(productId);
    if (delta > 0 && stock > 0) {
      const inCart = cart.find((i) => i.product.id === productId)?.quantity || 0;
      if (inCart + delta > stock) { show(`${t('insufficientStock')} (${stock})`, 'error'); return; }
    }
    setCart((prev) => prev.map((i) => (i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)).filter((i) => i.quantity > 0));
  };

  const setQty = (productId: string, qty: number) => {
    const stock = getStock(productId);
    if (stock > 0 && qty > stock) { show(`${t('insufficientStock')} (${stock})`, 'error'); qty = stock; }
    setCart((prev) => prev.map((i) => (i.product.id === productId ? { ...i, quantity: Math.max(1, qty) } : i)));
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((i) => i.product.id !== productId));
  const clearCart = () => setCart([]);

  const setItemDiscount = (productId: string, discount: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;
    const lineTotal = item.quantity * item.unit_price;
    const d = Math.round(Math.min(Math.max(discount || 0, 0), lineTotal) * 100) / 100;
    setCart((prev) => prev.map((i) => (i.product.id === productId ? { ...i, discount_amount: d } : i)));
  };

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.quantity * i.unit_price - i.discount_amount, 0), [cart]);
  const discountValue = discountType === 'percent' ? (subtotal * discountAmount) / 100 : discountAmount;
  const taxableAmount = subtotal - discountValue;
  const taxRate = effSettings?.tax_enabled ? (effSettings?.tax_rate || 0) : 0;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = taxableAmount + taxAmount;
  const change = Math.max(0, paidAmount - total);

  const handleBarcodeScan = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const found = products.find((p) => p.barcode === search);
      if (found) { addToCart(found); setSearch(''); show(t('addToCart') + ': ' + found.name, 'success'); }
    }
  };

  const completeSale = async () => {
    if (cart.length === 0 || completing) return;
    if (!effectiveBranch) { show(t('selectBranchFirst'), 'error'); return; }
    if (isCashier && !activeShift) { show(t('shiftRequired'), 'error'); return; }
    setCompleting(true);

    const { data: branchWarehouses } = await supabase.from('warehouses').select('id').eq('branch_id', effectiveBranch).eq('is_active', true);
    const warehouseIds = (branchWarehouses || []).map((w: { id: string }) => w.id);

    for (const item of cart) {
      const stock = getStock(item.product.id);
      if (stock < item.quantity) { show(`${item.product.name}: ${t('insufficientStock')} (${stock})`, 'error'); setCompleting(false); return; }
    }

    const { data: serialRes, error: serialError } = await supabase.rpc('next_document_number', { p_type: 'sale' });
    if (serialError || !serialRes?.success) {
      show(serialError?.message || (serialRes as { detail?: string } | null)?.detail || t('error'), 'error');
      setCompleting(false);
      return;
    }
    const invoiceNumber = (serialRes as { number?: string }).number || `INV-${Date.now()}`;
    const itemsPayload = cart.map((i) => ({
      product_id: i.product.id,
      unit_name: i.unit_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      discount_amount: i.discount_amount,
      bonus_quantity: i.bonus_quantity,
      total: i.quantity * i.unit_price - i.discount_amount,
    }));

    const paidAmountToUse = paymentMethod === 'credit' ? 0 : paidAmount || total;

    const { data, error } = await supabase.rpc('process_sale', {
      p_invoice_number: invoiceNumber,
      p_branch_id: effectiveBranch,
      p_shift_id: activeShift?.id || null,
      p_warehouse_id: warehouseIds.length > 0 ? warehouseIds[0] : null,
      p_customer_id: customerId || null,
      p_salesperson_id: null,
      p_subtotal: subtotal,
      p_discount_amount: discountValue,
      p_discount_type: discountType === 'percent' ? 'percent' : 'amount',
      p_tax_amount: taxAmount,
      p_bonus_amount: 0,
      p_total: total,
      p_paid_amount: paidAmountToUse,
      p_payment_method: paymentMethod,
      p_status: 'completed',
      p_items: itemsPayload,
    });
    if (error) { show(error.message, 'error'); setCompleting(false); return; }
    const result = data as RpcResult | null;
    if (!result?.success) {
      show(result?.detail || result?.error || t('error'), 'error');
      setCompleting(false);
      return;
    }
    const saleId = result.sale_id || '';

    await logAudit('create', 'sales', saleId, { invoice: invoiceNumber, total });

    const receiptPayload: ReceiptData = {
      invoice: invoiceNumber,
      items: cart.map((i) => ({ name: i.product.name, qty: i.quantity, price: i.unit_price, total: i.quantity * i.unit_price - i.discount_amount })),
      subtotal, discount: discountValue, tax: taxAmount, total,
      paid: paidAmountToUse, change, date: new Date().toISOString(),
      customerName: customers.find((c) => c.id === customerId)?.name || '',
    };
    setLastReceipt(receiptPayload);
    setReceiptSaleId(saleId);
    setCheckoutOpen(false);
    setMobileCartOpen(false);
    clearCart();
    setDiscountAmount(0);
    setPaidAmount(0);
    setCustomerId('');
    setCompleting(false);
    loadStock(effectiveBranch);
    show(t('saleCompleted'), 'success');

    if (effSettings?.receipt_auto_print) {
      const html = await buildReceiptHtml(receiptPayload, effSettings, lang, isAr);
      openPrintWindow(html, effSettings.receipt_width_mm || 80);
    }
  };

  const printReceipt = async () => {
    if (!lastReceipt || !effSettings) return;
    const html = await buildReceiptHtml(lastReceipt, effSettings, lang, isAr);
    openPrintWindow(html, effSettings.receipt_width_mm || 80);
  };

  const renderCartPanel = (opts: { onClose?: () => void }) => (
    <div className="flex flex-col h-full min-h-0">
      {/* Cart Header */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-navy-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('cart')}</h2>
            <p className="text-xs text-slate-400">{cart.length} {isAr ? 'منتج' : 'items'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors">
              {t('clearCart')}
            </button>
          )}
          {opts.onClose && (
            <button onClick={opts.onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors" title={isAr ? 'إغلاق' : 'Close'}>
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-navy-800 flex items-center justify-center mb-3">
              <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-navy-700" />
            </div>
            <p className="text-sm font-medium">{t('emptyCart')}</p>
            <p className="text-xs text-slate-400 mt-1">{isAr ? 'اضغط على المنتج لإضافته' : 'Tap a product to add it'}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-navy-800/50 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{item.product.name}</p>
                  <p className="text-xs text-slate-400">{formatCurrency(item.unit_price, effSettings?.currency || 'EGP', lang)}</p>
                  <label className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                    {isAr ? 'خصم' : 'Disc'}
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={item.discount_amount || ''}
                      placeholder="0"
                      onChange={(e) => setItemDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                      className="w-16 px-1 py-0.5 rounded border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-[11px] text-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-gold-500"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-navy-800 rounded-lg border border-slate-200 dark:border-navy-700 p-0.5">
                  <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => setQty(item.product.id, parseInt(e.target.value) || 1)}
                    className="w-9 text-center text-sm font-bold bg-transparent text-slate-800 dark:text-white focus:outline-none"
                  />
                  <button onClick={() => updateQty(item.product.id, 1)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-16 text-end">
                  {item.discount_amount > 0 && (
                    <p className="text-[10px] text-red-400 line-through">{formatCurrency(item.quantity * item.unit_price, effSettings?.currency || 'EGP', lang)}</p>
                  )}
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {formatCurrency(item.quantity * item.unit_price - item.discount_amount, effSettings?.currency || 'EGP', lang)}
                  </span>
                </div>
                <button onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Footer - Summary + Payment */}
      {cart.length > 0 && (
        <div className="border-t border-slate-100 dark:border-navy-800 p-4 space-y-3 flex-shrink-0">
          {/* Totals */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-slate-500">
              <span>{t('subtotal')}</span>
              <span className="font-medium">{formatCurrency(subtotal, effSettings?.currency || 'EGP', lang)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>{t('discount')}</span>
                <span className="font-medium">-{formatCurrency(discountValue, effSettings?.currency || 'EGP', lang)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>{t('tax')} ({taxRate}%)</span>
                <span className="font-medium">{formatCurrency(taxAmount, effSettings?.currency || 'EGP', lang)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-100 dark:border-navy-800">
              <span>{t('total')}</span>
              <span className="text-brand-600 dark:text-gold-400">{formatCurrency(total, effSettings?.currency || 'EGP', lang)}</span>
            </div>
          </div>

          {/* Quick Payment Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setPaymentMethod('cash'); setPaidAmount(total); setCheckoutOpen(true); }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all active:scale-95"
            >
              <Banknote className="w-5 h-5" />
              {t('cash')}
            </button>
            <button
              onClick={() => { setPaymentMethod('card'); setPaidAmount(total); setCheckoutOpen(true); }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all active:scale-95"
            >
              <CreditCard className="w-5 h-5" />
              {t('card')}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { setPaymentMethod('transfer'); setPaidAmount(total); setCheckoutOpen(true); }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs transition-all active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              {t('transfer')}
            </button>
            <button
              onClick={() => { setPaymentMethod('credit'); setPaidAmount(0); setCheckoutOpen(true); }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs transition-all active:scale-95"
            >
              <FileText className="w-4 h-4" />
              {t('credit')}
            </button>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-200 dark:bg-navy-800 hover:bg-slate-300 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-all active:scale-95"
            >
              <Percent className="w-4 h-4" />
              {t('discount')}
            </button>
          </div>
        </div>
      )}
    </div>
  );

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
        {/* Back + POS title */}
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800">
          {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowRight className="w-5 h-5 rotate-180" />}
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-sm font-bold hidden sm:inline">{isAr ? 'لوحة التحكم' : 'Dashboard'}</span>
        </button>

        <div className="w-px h-7 bg-slate-200 dark:bg-navy-700" />

        {/* Branch selector */}
        <div className="flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-slate-400" />
          <select
            value={effectiveBranch}
            disabled={!isAdminRole(user?.role)}
            onChange={(e) => { setSelectedBranch(e.target.value); loadStock(e.target.value); setCart([]); }}
            className="text-sm border-0 bg-slate-100 dark:bg-navy-800 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 max-w-[130px] sm:max-w-none truncate"
          >
            <option value="">{isAr ? 'اختر الفرع' : 'Select Branch'}</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{isAr ? b.name : (b.name_en || b.name)}</option>)}
          </select>
        </div>

        {currentBranchName && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-800">
            <span className="text-xs font-bold text-gold-700 dark:text-gold-300">{currentBranchName}</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Cart summary in header */}
        {cart.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-50 dark:bg-navy-800 border border-navy-100 dark:border-navy-700">
            <ShoppingCart className="w-4 h-4 text-navy-700 dark:text-gold-400" />
            <span className="text-sm font-bold text-navy-800 dark:text-gold-400">{cart.length}</span>
            <span className="text-xs text-navy-400 dark:text-slate-500">|</span>
            <span className="text-sm font-bold text-navy-800 dark:text-gold-400">{formatCurrency(total, effSettings?.currency || 'EGP', lang)}</span>
          </div>
        )}

        {/* Cashier */}
        <div className="flex items-center gap-2 px-2">
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:inline">{user?.full_name || user?.email}</span>
        </div>
      </header>

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
              <span className="hidden sm:inline text-xs opacity-80">{t('expectedAmount')}: {formatCurrency(activeShift.expected, effSettings?.currency || 'EGP', lang)}</span>
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

        {/* ===== LEFT: CATEGORIES SIDEBAR ===== */}
        <div className={`${catSidebarOpen ? 'w-56' : 'w-0'} hidden md:flex flex-shrink-0 transition-all duration-300 overflow-hidden bg-white dark:bg-navy-900 border-slate-200 dark:border-navy-800 ${isAr ? 'border-l' : 'border-r'}`}>
          <div className="w-56 h-full flex flex-col">
            <div className="px-3 py-3 border-b border-slate-100 dark:border-navy-800">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isAr ? 'الفئات' : 'Categories'}</p>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg mx-1 transition-all ${
                  selectedCategory === ''
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800'
                }`}
                style={{ width: 'calc(100% - 8px)' }}
              >
                <span className="truncate">{t('allCategories')}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCategory === '' ? 'bg-white/20' : 'bg-slate-200 dark:bg-navy-800'}`}>
                  {products.length}
                </span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg mx-1 transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800'
                  }`}
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  <span className="truncate">{isAr ? cat.name : (cat.name_en || cat.name)}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedCategory === cat.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-navy-800'}`}>
                    {categoryProducts[cat.id] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== CENTER: PRODUCTS ===== */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search Bar */}
          <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-navy-900 border-b border-slate-200 dark:border-navy-800">
            <button
              onClick={() => setCatSidebarOpen(!catSidebarOpen)}
              className="hidden md:flex p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
              title={isAr ? 'إظهار/إخفاء الفئات' : 'Toggle Categories'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <div className="relative flex-1">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
              <input
                ref={barcodeRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleBarcodeScan}
                placeholder={isAr ? 'بحث عن منتج أو مسح الباركود...' : 'Search product or scan barcode...'}
                className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/60 focus:border-gold-500 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {!effectiveBranch && (
              <div className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                {isAr ? 'اختر الفرع' : 'Select Branch'}
              </div>
            )}
          </div>

          {/* Mobile Categories Chips */}
          <div className="md:hidden flex items-center gap-2 px-3 py-2 overflow-x-auto border-b border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 flex-shrink-0">
            <button
              onClick={() => setSelectedCategory('')}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === ''
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {t('allCategories')}
              <span className="ms-1 opacity-70">({products.length})</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {isAr ? cat.name : (cat.name_en || cat.name)}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-3 pb-24 sm:p-4 lg:pb-4">
            {!effectiveBranch ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <ShoppingCart className="w-20 h-20 mb-4 opacity-20" />
                <p className="text-lg font-medium">{isAr ? 'اختر الفرع أولاً لعرض المنتجات' : 'Select a branch first to view products'}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Package className="w-20 h-20 mb-4 opacity-20" />
                <p className="text-lg font-medium">{t('noData')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
                {filteredProducts.map((p) => {
                  const isManufactured = p.product_type === 'manufactured';
                  const noRecipe = isManufactured && (recipeMap[p.id]?.length || 0) === 0;
                  const stock = isManufactured ? (sellableStock[p.id] || 0) : (stockMap[p.id] || 0);
                  const outOfStock = stock <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={outOfStock || noRecipe}
                      className={`group relative bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 overflow-hidden transition-all duration-200 ${
                        outOfStock || noRecipe
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:shadow-card-hover hover:border-gold-400 dark:hover:border-gold-600 hover:-translate-y-1 active:scale-[0.97]'
                      }`}
                    >
                      {/* Stock badge */}
                      <div className={`absolute top-2 ${isAr ? 'left-2' : 'right-2'} z-10 px-2 py-0.5 rounded-full text-xs font-bold backdrop-blur-sm ${
                        noRecipe
                          ? 'bg-slate-500/90 text-white'
                          : outOfStock
                            ? 'bg-red-500/90 text-white'
                            : stock <= (p.low_stock_threshold || 5)
                              ? 'bg-amber-400/90 text-amber-900'
                              : 'bg-emerald-400/90 text-emerald-900'
                      }`} title={isManufactured ? t('sellableQty') : t('stock')}>
                        {isManufactured ? (noRecipe ? t('noRecipe') : `~${stock}`) : stock}
                      </div>

                      {/* Image */}
                      <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-50 dark:from-navy-800 dark:to-navy-950 flex items-center justify-center overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-navy-700 group-hover:text-gold-500 transition-colors" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-slate-800 dark:text-white truncate leading-tight">{p.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {isManufactured && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-[10px] font-medium text-purple-700 dark:text-purple-400">{t('manufactured')}</span>
                          )}
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{isAr ? p.category?.name : (p.category?.name_en || p.category?.name)}</p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold text-brand-600 dark:text-gold-400">{formatCurrency(p.sale_price, effSettings?.currency || 'EGP', lang)}</span>
                          {!outOfStock && !noRecipe && (
                            <div className="w-6 h-6 rounded-full bg-gold-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-3.5 h-3.5 text-navy-950" />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT: CART (desktop) ===== */}
        <div className="hidden lg:flex w-[340px] xl:w-[380px] flex-shrink-0 flex-col bg-white dark:bg-navy-900 border-s border-slate-200 dark:border-navy-800">
          {renderCartPanel({})}
        </div>

        {/* ===== MOBILE FLOATING CART BAR ===== */}
        {cart.length > 0 && !mobileCartOpen && (
          <button
            onClick={() => setMobileCartOpen(true)}
            className="lg:hidden fixed bottom-4 start-4 end-4 z-30 flex items-center justify-between gap-2 px-5 py-3.5 rounded-2xl bg-navy-900 text-white border border-gold-500/40 shadow-pos active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2 font-bold text-sm">
              <ShoppingCart className="w-5 h-5 text-gold-400" />
              {isAr ? 'عرض السلة' : 'View Cart'}
              <span className="px-2 py-0.5 rounded-full bg-gold-500 text-navy-950 text-xs font-bold">{cart.length}</span>
            </span>
            <span className="font-bold text-gold-400">{formatCurrency(total, effSettings?.currency || 'EGP', lang)}</span>
          </button>
        )}

        {/* ===== MOBILE CART BOTTOM SHEET ===== */}
        {mobileCartOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex items-end justify-center animate-fade-in">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileCartOpen(false)} />
            <div className="relative w-full max-h-[92vh] bg-white dark:bg-navy-900 rounded-t-2xl shadow-pos overflow-hidden animate-slide-up flex flex-col">
              {renderCartPanel({ onClose: () => setMobileCartOpen(false) })}
            </div>
          </div>
        )}
      </div>

      {/* ===== CHECKOUT MODAL ===== */}
      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title={t('checkout')} size="md">
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-navy-800/60 rounded-xl p-3 text-sm font-medium flex items-center gap-2 border border-slate-100 dark:border-navy-700">
            <Tag className="w-4 h-4 text-brand-500 dark:text-gold-400" />
            <span className="text-slate-600 dark:text-slate-300">{isAr ? 'الفرع' : 'Branch'}: </span>
            <span className="font-bold text-slate-800 dark:text-white">{currentBranchName}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('customer')}</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
            >
              <option value="">--</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('discount')}</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percent')}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="amount">{t('amount')}</option>
                <option value="percent">%</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('discount')}</label>
              <input
                type="number"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('paymentMethod')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['cash', 'card', 'transfer', 'credit'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    paymentMethod === m
                      ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-300 shadow-md'
                      : 'border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {m === 'cash' && <Banknote className="w-5 h-5" />}
                  {m === 'card' && <CreditCard className="w-5 h-5" />}
                  {m === 'transfer' && <Smartphone className="w-5 h-5" />}
                  {m === 'credit' && <FileText className="w-5 h-5" />}
                  {t(m)}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod !== 'credit' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('paid')}</label>
              <input
                type="number"
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-lg font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
          )}

          {/* Summary */}
          <div className="bg-slate-50 dark:bg-navy-800/60 rounded-xl p-4 space-y-2 border border-slate-100 dark:border-navy-700">
            <div className="flex justify-between text-sm"><span className="text-slate-500">{t('subtotal')}</span><span>{formatCurrency(subtotal, effSettings?.currency || 'EGP', lang)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">{t('discount')}</span><span className="text-red-500">-{formatCurrency(discountValue, effSettings?.currency || 'EGP', lang)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">{t('tax')}</span><span>{formatCurrency(taxAmount, effSettings?.currency || 'EGP', lang)}</span></div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200 dark:border-navy-700">
              <span>{t('total')}</span>
              <span className="text-brand-600 dark:text-gold-400">{formatCurrency(total, effSettings?.currency || 'EGP', lang)}</span>
            </div>
            {paymentMethod !== 'credit' && change > 0 && (
              <div className="flex justify-between text-sm font-bold text-emerald-600">
                <span>{t('change')}</span>
                <span>{formatCurrency(change, effSettings?.currency || 'EGP', lang)}</span>
              </div>
            )}
          </div>

          <Button size="lg" className="w-full" onClick={completeSale} disabled={completing || !effectiveBranch}>
            {completing ? (isAr ? 'جاري المعالجة...' : 'Processing...') : t('completeSale')}
          </Button>
        </div>
      </Modal>

      {/* ===== RECEIPT MODAL ===== */}
      <Modal open={!!receiptSaleId} onClose={() => setReceiptSaleId(null)} title={t('printReceipt')} size="sm">
        {lastReceipt && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 ring-2 ring-gold-500/40 flex items-center justify-center mx-auto mb-3">
                <BarcodeIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-base font-semibold text-slate-800 dark:text-white">{t('saleCompleted')}</p>
              <p className="text-sm text-slate-400 mt-1">{lastReceipt.invoice}</p>
            </div>
            <Button size="lg" className="w-full" onClick={printReceipt}>
              <Printer className="w-5 h-5" /> {t('printReceipt')}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
