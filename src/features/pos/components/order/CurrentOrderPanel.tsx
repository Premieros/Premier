import { useState } from 'react';
import {
  ShoppingCart, Minus, Plus, X, Pause, ChefHat, Banknote, Printer,
  Percent, UtensilsCrossed, Clock, PlusCircle, Check, Circle, Trash2, Pencil, Car, Bike,
} from 'lucide-react';
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
import { TypeChangePicker } from './TypeChangePicker';

interface CurrentOrderPanelProps {
  cart: CartItem[];
  currency: string;
  subtotal: number;
  discountValue: number;
  discountType: 'amount' | 'percent';
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  completing: boolean;
  orderLoading: boolean;
  kitchenSending: boolean;
  orderType: OrderType;
  activeOrderNumber: string | null;
  activeOrderId: string | null;
  activeTable: DiningTable | null;
  guestCount: number | null;
  customerId: string;
  customerById: Record<string, Customer>;
  orderNotes: string;
  activeOrderCreatedAt: string | null;
  orderItems: OrderItem[];
  sentOrderItemIds: Set<string>;
  sessionSent: KitchenSendItem[];
  onSwitchOrderType: (ot: OrderType) => void;
  onGuestCountChange: (n: number | null) => void;
  onDiscountTypeChange: (v: 'amount' | 'percent') => void;
  onDiscountAmountChange: (v: number) => void;
  onUpdateQty: (productId: string, delta: number) => void;
  onSetQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onSetItemDiscount: (productId: string, discount: number) => void;
  onHold: () => void;
  onSendKitchen: () => void;
  onPrint: () => void;
  onPay: () => void;
  onAddItem: () => void;
}

export function CurrentOrderPanel({
  cart, currency, subtotal, discountValue, discountType, discountAmount, taxRate, taxAmount, total,
  completing, orderLoading, kitchenSending, orderType, activeOrderNumber, activeOrderId, activeTable,
  guestCount, customerId, customerById, orderNotes, activeOrderCreatedAt, orderItems, sentOrderItemIds, sessionSent,
  onSwitchOrderType, onGuestCountChange, onDiscountTypeChange, onDiscountAmountChange,
  onUpdateQty, onSetQty, onRemove, onClear, onSetItemDiscount,
  onHold, onSendKitchen, onPrint, onPay, onAddItem,
}: CurrentOrderPanelProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const [showDiscount, setShowDiscount] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const sentState = computeSentState(cart, orderItems, sentOrderItemIds, sessionSent);
  const newCount = cart.filter((i) => (sentState[i.product.id]?.newQty || 0) > 0).length;
  const sentCount = cart.filter((i) => (sentState[i.product.id]?.sentQty || 0) > 0).length;
  const hasSent = sentCount > 0;
  const allSent = cart.length > 0 && newCount === 0;
  const ago = activeOrderCreatedAt ? timeAgo(activeOrderCreatedAt) : null;
  const stage = deriveCartStage(cart, sentState, false);

  let contextText = '';
  if (orderType === 'dine_in') contextText = activeTable?.name || '';
  else if (orderType === 'delivery') {
    contextText = customerId && customerById[customerId] ? customerById[customerId].name : parseDeliveryNotes(orderNotes).phone;
  } else if (orderType === 'drive_thru') {
    contextText = parseCarNotes(orderNotes).plate;
  }

  const empty = cart.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-navy-900">
      {/* ===== Order header ===== */}
      <div className="px-3 py-2.5 border-b border-slate-100 dark:border-navy-800 flex-shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">
              {activeOrderNumber ? `#${activeOrderNumber}` : t('newOrder')}
            </p>
            <p className="text-[11px] text-slate-400">{cart.length} {isAr ? 'صنف' : 'items'}</p>
          </div>
          <OrderStageBadge stage={stage} />
          {activeOrderId && !empty && (
            <button onClick={onClear} className="text-[11px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <OrderTypePill type={orderType} />
          <button
            onClick={() => setTypePickerOpen(true)}
            disabled={!!activeOrderId}
            title={activeOrderId ? t('noChangeAfterSend') : t('changeOrderType')}
            className="flex items-center justify-center p-1.5 rounded-lg bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-navy-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Pencil className="w-3 h-3" />
          </button>

          {contextText && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-navy-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {orderType === 'dine_in' && <UtensilsCrossed className="w-3 h-3 text-emerald-500" />}
              {orderType === 'drive_thru' && <Car className="w-3 h-3 text-sky-500" />}
              {orderType === 'delivery' && <Bike className="w-3 h-3 text-blue-500" />}
              <span className="truncate max-w-[110px]">{contextText}</span>
            </span>
          )}

          {orderType === 'dine_in' && (
            <label className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              {isAr ? 'أفراد' : 'Guests'}:
              <input
                type="number"
                min={1}
                value={guestCount || ''}
                placeholder="0"
                onChange={(e) => onGuestCountChange(parseInt(e.target.value) || null)}
                className="w-12 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-center text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-gold-500"
              />
            </label>
          )}

          {activeOrderCreatedAt && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400 ms-auto">
              <Clock className="w-3 h-3" />
              {formatClockTime(activeOrderCreatedAt, lang)}
              {ago && <span className="hidden xl:inline">· {ago.n != null ? `${ago.n} ${t(ago.key)}` : t(ago.key)}</span>}
            </span>
          )}
        </div>
      </div>

      <TypeChangePicker
        open={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        current={orderType}
        onSelect={onSwitchOrderType}
      />

      {/* ===== Items ===== */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2">
        {empty ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-navy-800 flex items-center justify-center mb-3">
              <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-navy-700" />
            </div>
            <p className="text-sm font-medium">{t('emptyCart')}</p>
            <p className="text-xs text-slate-400 mt-1">{isAr ? 'اضغط على المنتج لإضافته' : 'Tap a product to add it'}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {cart.map((item) => {
              const st = sentState[item.product.id] || { sentQty: 0, newQty: item.quantity, sent: false, partial: false };
              return (
                <div key={item.product.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-navy-800/50 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-semibold text-slate-800 dark:text-white truncate">{item.product.name}</p>
                      {st.partial ? (
                        <span className="shrink-0 flex items-center gap-1">
                          <span className="px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" />{st.sentQty}
                          </span>
                          <span className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold flex items-center gap-0.5">
                            <Circle className="w-2.5 h-2.5" />{st.newQty}
                          </span>
                        </span>
                      ) : st.sent ? (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> {t('itemSent')}
                        </span>
                      ) : (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-bold flex items-center gap-1">
                          <Circle className="w-2.5 h-2.5" /> {t('itemNew')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatCurrency(item.unit_price, currency, lang)}</p>
                    <label className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                      {isAr ? 'خصم' : 'Disc'}
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={item.discount_amount || ''}
                        placeholder="0"
                        onChange={(e) => onSetItemDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                        className="w-14 px-1 py-0.5 rounded border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-[11px] text-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-gold-500"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-1 bg-white dark:bg-navy-800 rounded-lg border border-slate-200 dark:border-navy-700 p-0.5">
                    <button onClick={() => onUpdateQty(item.product.id, -1)} className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onSetQty(item.product.id, parseInt(e.target.value) || 1)}
                      className="w-8 text-center text-sm font-bold bg-transparent text-slate-800 dark:text-white focus:outline-none"
                    />
                    <button onClick={() => onUpdateQty(item.product.id, 1)} className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="w-14 text-end">
                    {item.discount_amount > 0 && (
                      <p className="text-[9px] text-red-400 line-through">{formatCurrency(item.quantity * item.unit_price, currency, lang)}</p>
                    )}
                    <span className="text-[13px] font-bold text-slate-800 dark:text-white">
                      {formatCurrency(item.quantity * item.unit_price - item.discount_amount, currency, lang)}
                    </span>
                  </div>
                  <button onClick={() => onRemove(item.product.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Totals + actions ===== */}
      {!empty && (
        <div className="border-t border-slate-100 dark:border-navy-800 p-3 space-y-2.5 flex-shrink-0">
          <div className="space-y-1">
            <div className="flex justify-between text-[13px] text-slate-500">
              <span>{t('subtotal')}</span>
              <span className="font-medium">{formatCurrency(subtotal, currency, lang)}</span>
            </div>
            {showDiscount && (
              <div className="flex items-center gap-2">
                <select
                  value={discountType}
                  onChange={(e) => onDiscountTypeChange(e.target.value as 'amount' | 'percent')}
                  className="px-1.5 py-1 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-[11px] text-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-gold-500"
                >
                  <option value="amount">{t('amount')}</option>
                  <option value="percent">%</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={discountAmount || ''}
                  placeholder="0"
                  onChange={(e) => onDiscountAmountChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-[12px] text-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </div>
            )}
            {discountValue > 0 && (
              <div className="flex justify-between text-[13px] text-red-500">
                <span>{t('discount')}</span>
                <span className="font-medium">-{formatCurrency(discountValue, currency, lang)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-[13px] text-slate-500">
                <span>{t('tax')} ({taxRate}%)</span>
                <span className="font-medium">{formatCurrency(taxAmount, currency, lang)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black pt-1.5 border-t border-slate-100 dark:border-navy-800">
              <span>{t('total')}</span>
              <span className="text-brand-600 dark:text-gold-400">{formatCurrency(total, currency, lang)}</span>
            </div>
          </div>

          {/* ===== Bottom action bar ===== */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={onAddItem}
              className="flex items-center justify-center gap-1 py-2 rounded-xl bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t('addItem')}</span>
            </button>
            <button
              onClick={() => setShowDiscount((v) => !v)}
              className={`flex items-center justify-center gap-1 py-2 rounded-xl font-bold text-[11px] transition-all active:scale-95 ${
                showDiscount
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Percent className="w-4 h-4" />
              {t('discount')}
            </button>
            <button
              onClick={onPrint}
              disabled={orderLoading || completing}
              className="flex items-center justify-center gap-1 py-2 rounded-xl bg-slate-100 dark:bg-navy-800 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] transition-all active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{t('print')}</span>
            </button>
            <button
              onClick={onHold}
              disabled={completing || orderLoading}
              className="flex items-center justify-center gap-1 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-[11px] transition-all active:scale-95 disabled:opacity-50"
            >
              <Pause className="w-4 h-4" />
              <span className="hidden sm:inline">{t('holdOrder')}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onSendKitchen}
              disabled={allSent || completing || orderLoading || kitchenSending}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <ChefHat className="w-4 h-4" />
              {allSent
                ? t('allSent')
                : newCount > 0 && hasSent
                  ? `${t('sendToKitchen')} (${newCount})`
                  : t('sendToKitchen')}
            </button>
            <button
              onClick={onPay}
              disabled={completing || orderLoading}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/25 transition-all active:scale-95 disabled:opacity-50"
            >
              <Banknote className="w-4 h-4" />
              {t('payOrder')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
