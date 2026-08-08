import { ShoppingCart, X, Minus, Plus, Pause, ChefHat, Banknote, CreditCard, Smartphone, FileText, Percent } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/format';
import type { PosPaymentMethod } from '@/lib/posMath';
import type { CartItem } from '@/lib/types';

interface CartPanelProps {
  cart: CartItem[];
  currency: string;
  subtotal: number;
  discountValue: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  completing: boolean;
  orderLoading: boolean;
  onUpdateQty: (productId: string, delta: number) => void;
  onSetQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onSetItemDiscount: (productId: string, discount: number) => void;
  onHold: () => void;
  onSendKitchen: () => void;
  onPayment: (method: PosPaymentMethod) => void;
  onOpenCheckout: () => void;
  onClose?: () => void;
}

export function CartPanel({
  cart, currency, subtotal, discountValue, taxRate, taxAmount, total,
  completing, orderLoading,
  onUpdateQty, onSetQty, onRemove, onClear, onSetItemDiscount,
  onHold, onSendKitchen, onPayment, onOpenCheckout, onClose,
}: CartPanelProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
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
            <button onClick={onClear} className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors">
              {t('clearCart')}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors" title={isAr ? 'إغلاق' : 'Close'}>
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
                  <p className="text-xs text-slate-400">{formatCurrency(item.unit_price, currency, lang)}</p>
                  <label className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                    {isAr ? 'خصم' : 'Disc'}
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={item.discount_amount || ''}
                      placeholder="0"
                      onChange={(e) => onSetItemDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                      className="w-16 px-1 py-0.5 rounded border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-[11px] text-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-gold-500"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-navy-800 rounded-lg border border-slate-200 dark:border-navy-700 p-0.5">
                  <button onClick={() => onUpdateQty(item.product.id, -1)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onSetQty(item.product.id, parseInt(e.target.value) || 1)}
                    className="w-9 text-center text-sm font-bold bg-transparent text-slate-800 dark:text-white focus:outline-none"
                  />
                  <button onClick={() => onUpdateQty(item.product.id, 1)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-16 text-end">
                  {item.discount_amount > 0 && (
                    <p className="text-[10px] text-red-400 line-through">{formatCurrency(item.quantity * item.unit_price, currency, lang)}</p>
                  )}
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {formatCurrency(item.quantity * item.unit_price - item.discount_amount, currency, lang)}
                  </span>
                </div>
                <button onClick={() => onRemove(item.product.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
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
              <span className="font-medium">{formatCurrency(subtotal, currency, lang)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>{t('discount')}</span>
                <span className="font-medium">-{formatCurrency(discountValue, currency, lang)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>{t('tax')} ({taxRate}%)</span>
                <span className="font-medium">{formatCurrency(taxAmount, currency, lang)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-100 dark:border-navy-800">
              <span>{t('total')}</span>
              <span className="text-brand-600 dark:text-gold-400">{formatCurrency(total, currency, lang)}</span>
            </div>
          </div>

          {/* Hold Order + Send to Kitchen */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onHold}
              disabled={completing || orderLoading || cart.length === 0}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pause className="w-4 h-4" />
              {t('holdOrder')}
            </button>
            <button
              onClick={onSendKitchen}
              disabled={completing || orderLoading || cart.length === 0}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChefHat className="w-4 h-4" />
              {t('sendToKitchen')}
            </button>
          </div>

          {/* Quick Payment Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onPayment('cash')}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all active:scale-95"
            >
              <Banknote className="w-5 h-5" />
              {t('cash')}
            </button>
            <button
              onClick={() => onPayment('card')}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all active:scale-95"
            >
              <CreditCard className="w-5 h-5" />
              {t('card')}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onPayment('transfer')}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs transition-all active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              {t('transfer')}
            </button>
            <button
              onClick={() => onPayment('credit')}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs transition-all active:scale-95"
            >
              <FileText className="w-4 h-4" />
              {t('credit')}
            </button>
            <button
              onClick={onOpenCheckout}
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
}
