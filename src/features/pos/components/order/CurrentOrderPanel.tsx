import { useState } from 'react';
import { ShoppingCart, Minus, Plus, X, Pause, ChefHat, Banknote, Printer, Percent, UtensilsCrossed, Clock, Check, Trash2, Car, Bike } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/format';
import type { CartItem, Customer, DiningTable, OrderItem, OrderType } from '@/lib/types';
import type { KitchenSendItem } from '../../types';
import { computeSentState } from '../../utils/sentState';
import { formatClockTime, timeAgo } from '../../utils/timeAgo';
import { deriveCartStage } from '../../utils/orderStage';
import { parseCarNotes, parseDeliveryNotes } from '../../utils/orderLabels';
import { OrderTypePill } from './OrderTypePill';
import { OrderStageBadge } from './OrderStageBadge';

interface CurrentOrderPanelProps {
  cart: CartItem[]; currency: string; subtotal: number; discountValue: number; discountType: 'amount' | 'percent'; discountAmount: number; taxRate: number; taxAmount: number; total: number; completing: boolean; orderLoading: boolean; kitchenSending: boolean; orderType: OrderType; activeOrderNumber: string | null; activeOrderId: string | null; activeTable: DiningTable | null; guestCount: number | null; customerId: string; customerById: Record<string, Customer>; orderNotes: string; activeOrderCreatedAt: string | null; orderItems: OrderItem[]; sentOrderItemIds: Set<string>; sessionSent: KitchenSendItem[];
  onSwitchOrderType: (ot: OrderType) => void; onGuestCountChange: (n: number | null) => void; onDiscountTypeChange: (v: 'amount' | 'percent') => void; onDiscountAmountChange: (v: number) => void; onUpdateQty: (productId: string, delta: number) => void; onSetQty: (productId: string, qty: number) => void; onRemove: (productId: string) => void; onClear: () => void; onSetItemDiscount: (productId: string, discount: number) => void; onHold: () => void; onSendKitchen: () => void; onPrint: () => void; onPay: () => void; onAddItem: () => void;
}

export function CurrentOrderPanel({ cart, currency, subtotal, discountValue, discountAmount, total, completing, orderLoading, kitchenSending, orderType, activeOrderNumber, activeOrderId, activeTable, guestCount, customerId, customerById, orderNotes, activeOrderCreatedAt, orderItems, sentOrderItemIds, sessionSent, onGuestCountChange, onDiscountTypeChange, onDiscountAmountChange, onUpdateQty, onRemove, onClear, onHold, onSendKitchen, onPrint, onPay }: CurrentOrderPanelProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const [showDiscount, setShowDiscount] = useState(false);
  const sentState = computeSentState(cart, orderItems, sentOrderItemIds, sessionSent);
  const newCount = cart.filter((i) => (sentState[i.product.id]?.newQty || 0) > 0).length;
  const allSent = cart.length > 0 && newCount === 0;
  const ago = activeOrderCreatedAt ? timeAgo(activeOrderCreatedAt) : null;
  const stage = deriveCartStage(cart, sentState, false);
  let contextText = '';
  if (orderType === 'dine_in') contextText = activeTable?.name || '';
  else if (orderType === 'delivery') contextText = customerId && customerById[customerId] ? customerById[customerId].name : parseDeliveryNotes(orderNotes).phone;
  else if (orderType === 'drive_thru') contextText = parseCarNotes(orderNotes).plate;
  const empty = cart.length === 0;

  return <div className="flex flex-col h-full min-h-0 bg-white dark:bg-navy-900">
    <div className="px-3 py-2.5 border-b border-slate-100 dark:border-navy-800 flex-shrink-0 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center"><ShoppingCart className="w-4 h-4 text-brand-600 dark:text-brand-400" /></div>
        <div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-900 dark:text-white truncate">{activeOrderNumber ? `#${activeOrderNumber}` : t('newOrder')}</p><p className="text-[11px] text-slate-400">{cart.length} {isAr ? 'صنف' : 'items'}</p></div>
        <OrderStageBadge stage={stage} />
        {activeOrderId && !empty && <button onClick={onClear} className="text-[11px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <OrderTypePill type={orderType} />
        {contextText && <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-navy-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">{orderType === 'dine_in' && <UtensilsCrossed className="w-3 h-3 text-emerald-500" />}{orderType === 'drive_thru' && <Car className="w-3 h-3 text-sky-500" />}{orderType === 'delivery' && <Bike className="w-3 h-3 text-blue-500" />}<span className="truncate max-w-[110px]">{contextText}</span></span>}
        {orderType === 'dine_in' && <label className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">{isAr ? 'أفراد' : 'Guests'}:<input type="number" min={1} value={guestCount || ''} placeholder="0" onChange={(e) => onGuestCountChange(parseInt(e.target.value) || null)} className="w-12 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-center text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-gold-500" /></label>}
        {activeOrderCreatedAt && <span className="flex items-center gap-1 text-[11px] text-slate-400 ms-auto"><Clock className="w-3 h-3" />{formatClockTime(activeOrderCreatedAt, lang)}{ago && <span className="hidden xl:inline">· {ago.n != null ? `${ago.n} ${t(ago.key)}` : t(ago.key)}</span>}</span>}
      </div>
    </div>

    <div className="flex-1 overflow-y-auto px-2.5 py-2">
      {empty ? <div className="flex flex-col items-center justify-center h-full text-slate-400"><div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-navy-800 flex items-center justify-center mb-3"><ShoppingCart className="w-10 h-10 text-slate-300 dark:text-navy-700" /></div><p className="text-sm font-medium">{t('emptyCart')}</p><p className="text-xs text-slate-400 mt-1">{isAr ? 'اضغط على المنتج لإضافته' : 'Tap a product to add it'}</p></div> : <div className="space-y-1.5">{cart.map((item) => {
        const st = sentState[item.product.id] || { sentQty: 0, newQty: item.quantity, sent: false, partial: false };
        return <div key={item.product.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-navy-800/50 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors group">
          <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5"><p className="truncate text-xs font-black text-slate-800 dark:text-white">{item.product.name}</p>{st.sent && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}</div>{item.modifiers?.length ? <p className="mt-0.5 truncate text-[10px] text-slate-400">{item.modifiers.map(m => m.name).join(' · ')}</p> : null}</div>
          <div className="flex items-center gap-1"><button onClick={() => onUpdateQty(item.product.id, -1)} className="h-7 w-7 rounded-lg border border-slate-200 dark:border-navy-700 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button><span className="w-6 text-center text-xs font-black">{item.quantity}</span><button onClick={() => onUpdateQty(item.product.id, 1)} className="h-7 w-7 rounded-lg bg-gold-500 text-navy-950 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button></div>
          <span className="w-20 text-end text-xs font-black">{formatCurrency(item.quantity * item.unit_price - (item.discount_amount || 0), currency, lang)}</span><button onClick={() => onRemove(item.product.id)} className="p-1 text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
        </div>;
      })}</div>}
    </div>

    <div className="border-t border-slate-100 dark:border-navy-800 p-3 flex-shrink-0 space-y-2">
      <div className="grid grid-cols-3 gap-2"><div className="rounded-xl bg-slate-50 p-2 dark:bg-navy-800"><p className="text-[10px] text-slate-400">{t('subtotal')}</p><p className="text-xs font-black">{formatCurrency(subtotal, currency, lang)}</p></div><div className="rounded-xl bg-slate-50 p-2 dark:bg-navy-800"><p className="text-[10px] text-slate-400">{t('discount')}</p><p className="text-xs font-black">{formatCurrency(discountValue, currency, lang)}</p></div><div className="rounded-xl bg-gold-50 p-2 dark:bg-gold-900/20"><p className="text-[10px] text-slate-400">{t('total')}</p><p className="text-sm font-black text-gold-600">{formatCurrency(total, currency, lang)}</p></div></div>
      <div className="flex gap-2"><button onClick={() => setShowDiscount(!showDiscount)} className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-black dark:bg-navy-800"><Percent className="mx-auto h-4 w-4" /></button><button onClick={onHold} disabled={empty || orderLoading} className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-black disabled:opacity-40 dark:bg-navy-800"><Pause className="mx-auto h-4 w-4" /></button><button onClick={onSendKitchen} disabled={empty || kitchenSending || allSent} className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-black disabled:opacity-40 dark:bg-navy-800"><ChefHat className="mx-auto h-4 w-4" /></button><button onClick={onPrint} disabled={empty} className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-black disabled:opacity-40 dark:bg-navy-800"><Printer className="mx-auto h-4 w-4" /></button><button onClick={onPay} disabled={empty || completing} className="flex-[2] rounded-xl bg-emerald-600 py-2 text-xs font-black text-white disabled:opacity-40"><Banknote className="mx-auto h-4 w-4" />{isAr ? 'الدفع' : 'Pay'}</button></div>
      {showDiscount && <div className="rounded-xl border border-slate-200 p-2 dark:border-navy-700"><div className="flex gap-2"><button onClick={() => onDiscountTypeChange('percent')} className="flex-1 rounded-lg bg-slate-100 p-2 text-xs font-black dark:bg-navy-800">%</button><button onClick={() => onDiscountTypeChange('amount')} className="flex-1 rounded-lg bg-slate-100 p-2 text-xs font-black dark:bg-navy-800">{currency}</button><input type="number" value={discountAmount || ''} onChange={(e) => onDiscountAmountChange(parseFloat(e.target.value) || 0)} className="w-24 rounded-lg border p-2 text-center text-xs dark:border-navy-700 dark:bg-navy-800" /></div></div>}
    </div>
  </div>;
}
