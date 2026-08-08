import { Tag, UtensilsCrossed, Banknote, CreditCard, Smartphone, FileText } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/lib/format';
import type { PosPaymentMethod } from '@/lib/posMath';
import type { Customer, DiningTable, OrderType } from '@/lib/types';
import { ORDER_TYPES } from '../../utils/orderTypes';
import { orderTypeLabel } from '../../utils/format';

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  currentBranchName: string;
  orderType: OrderType;
  onSwitchOrderType: (ot: OrderType) => void;
  activeTable: DiningTable | null;
  activeOrderNumber: string | null;
  guestCount: number | null;
  onGuestCountChange: (n: number | null) => void;
  customerId: string;
  customers: Customer[];
  onCustomerChange: (id: string) => void;
  discountType: 'amount' | 'percent';
  discountAmount: number;
  onDiscountTypeChange: (v: 'amount' | 'percent') => void;
  onDiscountAmountChange: (v: number) => void;
  paymentMethod: PosPaymentMethod;
  onPaymentMethodChange: (m: PosPaymentMethod) => void;
  paidAmount: number;
  onPaidAmountChange: (v: number) => void;
  subtotal: number;
  discountValue: number;
  taxAmount: number;
  total: number;
  change: number;
  completing: boolean;
  canComplete: boolean;
  onComplete: () => void;
  currency: string;
}

export function CheckoutModal({
  open, onClose, currentBranchName,
  orderType, onSwitchOrderType, activeTable, activeOrderNumber,
  guestCount, onGuestCountChange,
  customerId, customers, onCustomerChange,
  discountType, discountAmount, onDiscountTypeChange, onDiscountAmountChange,
  paymentMethod, onPaymentMethodChange, paidAmount, onPaidAmountChange,
  subtotal, discountValue, taxAmount, total, change,
  completing, canComplete, onComplete, currency,
}: CheckoutModalProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <Modal open={open} onClose={onClose} title={t('checkout')} size="md">
      <div className="space-y-4">
        <div className="bg-slate-50 dark:bg-navy-800/60 rounded-xl p-3 text-sm font-medium flex items-center gap-2 border border-slate-100 dark:border-navy-700">
          <Tag className="w-4 h-4 text-brand-500 dark:text-gold-400" />
          <span className="text-slate-600 dark:text-slate-300">{isAr ? 'الفرع' : 'Branch'}: </span>
          <span className="font-bold text-slate-800 dark:text-white">{currentBranchName}</span>
        </div>

        {(orderType !== 'takeaway' || activeTable || activeOrderNumber) && (
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-navy-800/60 rounded-xl p-3 text-sm border border-slate-100 dark:border-navy-700">
            <UtensilsCrossed className="w-4 h-4 text-brand-500 dark:text-gold-400" />
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-navy-800 p-0.5">
              {ORDER_TYPES.map((ot) => (
                <button
                  key={ot}
                  type="button"
                  onClick={() => onSwitchOrderType(ot)}
                  className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all ${
                    orderType === ot
                      ? 'bg-white dark:bg-navy-700 text-brand-700 dark:text-gold-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {orderTypeLabel(t, ot)}
                </button>
              ))}
            </div>
            {activeTable && (
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{activeTable.name}</span>
            )}
            {activeOrderNumber && (
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{isAr ? 'طلب' : 'Order'}: {activeOrderNumber}</span>
            )}
            {orderType === 'dine_in' && (
              <span className="flex items-center gap-1 ms-auto">
                <span className="text-xs text-slate-500 dark:text-slate-400">{t('guestCount')}:</span>
                <input
                  type="number"
                  min={1}
                  value={guestCount || ''}
                  placeholder="0"
                  onChange={(e) => onGuestCountChange(parseInt(e.target.value) || null)}
                  className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-sm text-slate-800 dark:text-white focus:ring-2 focus:ring-gold-500/50"
                />
              </span>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('customer')}</label>
          <select
            value={customerId}
            onChange={(e) => onCustomerChange(e.target.value)}
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
              onChange={(e) => onDiscountTypeChange(e.target.value as 'amount' | 'percent')}
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
              onChange={(e) => onDiscountAmountChange(parseFloat(e.target.value) || 0)}
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
                onClick={() => onPaymentMethodChange(m)}
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
              onChange={(e) => onPaidAmountChange(parseFloat(e.target.value) || 0)}
              min={0}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-sm text-slate-800 dark:text-white text-lg font-bold focus:ring-2 focus:ring-gold-500/50"
            />
          </div>
        )}

        {/* Summary */}
        <div className="bg-slate-50 dark:bg-navy-800/60 rounded-xl p-4 space-y-2 border border-slate-100 dark:border-navy-700">
          <div className="flex justify-between text-sm"><span className="text-slate-500">{t('subtotal')}</span><span>{formatCurrency(subtotal, currency, lang)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">{t('discount')}</span><span className="text-red-500">-{formatCurrency(discountValue, currency, lang)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-500">{t('tax')}</span><span>{formatCurrency(taxAmount, currency, lang)}</span></div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200 dark:border-navy-700">
            <span>{t('total')}</span>
            <span className="text-brand-600 dark:text-gold-400">{formatCurrency(total, currency, lang)}</span>
          </div>
          {paymentMethod !== 'credit' && change > 0 && (
            <div className="flex justify-between text-sm font-bold text-emerald-600">
              <span>{t('change')}</span>
              <span>{formatCurrency(change, currency, lang)}</span>
            </div>
          )}
        </div>

        <Button size="lg" className="w-full" onClick={onComplete} disabled={completing || !canComplete}>
          {completing ? (isAr ? 'جاري المعالجة...' : 'Processing...') : t('completeSale')}
        </Button>
      </div>
    </Modal>
  );
}
