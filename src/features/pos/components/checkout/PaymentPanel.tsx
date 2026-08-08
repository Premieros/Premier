import { ArrowLeft, Banknote, CreditCard, Smartphone, FileText, Tag, UtensilsCrossed, Users } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/lib/format';
import type { PosPaymentMethod } from '@/lib/posMath';
import type { Customer, DiningTable, OrderType } from '@/lib/types';
import { orderTypeLabel } from '../../utils/format';

interface PaymentPanelProps {
  currentBranchName: string;
  orderType: OrderType;
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
  onBack: () => void;
  currency: string;
}

const METHODS: PosPaymentMethod[] = ['cash', 'card', 'transfer', 'credit'];

const METHOD_ICONS: Record<PosPaymentMethod, React.ReactNode> = {
  cash: <Banknote className="w-5 h-5" />,
  card: <CreditCard className="w-5 h-5" />,
  transfer: <Smartphone className="w-5 h-5" />,
  credit: <FileText className="w-5 h-5" />,
};

export function PaymentPanel({
  currentBranchName, orderType, activeTable, activeOrderNumber, guestCount, onGuestCountChange,
  customerId, customers, onCustomerChange,
  discountType, discountAmount, onDiscountTypeChange, onDiscountAmountChange,
  paymentMethod, onPaymentMethodChange, paidAmount, onPaidAmountChange,
  subtotal, discountValue, taxAmount, total, change,
  completing, canComplete, onComplete, onBack, currency,
}: PaymentPanelProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';

  const quickAmounts = [50, 100, 200, 500].map((v) => ({ v, l: formatCurrency(v, currency, lang) }));
  const roundUp = Math.ceil((total || 0) / 50) * 50;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-navy-900">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-navy-800 flex-shrink-0">
        <button onClick={onBack} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors" title={isAr ? 'رجوع' : 'Back'}>
          <ArrowLeft className={`w-5 h-5 ${isAr ? '' : 'rotate-180'}`} />
        </button>
        <h2 className="text-sm font-black text-slate-800 dark:text-white">
          {t('payOrder')}
          {activeOrderNumber && <span className="text-slate-400 font-bold ms-1.5">#{activeOrderNumber}</span>}
        </h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ===== Order context ===== */}
        <div className="rounded-xl bg-slate-50 dark:bg-navy-800/60 border border-slate-100 dark:border-navy-700 p-2.5 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Tag className="w-3.5 h-3.5 text-brand-500 dark:text-gold-400" />
            <span className="font-bold">{currentBranchName}</span>
            {activeTable && (
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold">
                <UtensilsCrossed className="w-3 h-3" /> {activeTable.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>{orderTypeLabel(t, orderType)}</span>
            {orderType === 'dine_in' && (
              <label className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <input
                  type="number"
                  min={1}
                  value={guestCount || ''}
                  placeholder="0"
                  onChange={(e) => onGuestCountChange(parseInt(e.target.value) || null)}
                  className="w-11 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-center text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
              </label>
            )}
          </div>
        </div>

        {/* ===== Discount ===== */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">{t('discount')}</label>
            <select
              value={discountType}
              onChange={(e) => onDiscountTypeChange(e.target.value as 'amount' | 'percent')}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            >
              <option value="amount">{t('amount')}</option>
              <option value="percent">%</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">{t('discount')}</label>
            <input
              type="number"
              value={discountAmount || ''}
              onChange={(e) => onDiscountAmountChange(parseFloat(e.target.value) || 0)}
              min={0}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>
        </div>

        {/* ===== Customer ===== */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">{t('customer')}</label>
          <select
            value={customerId}
            onChange={(e) => onCustomerChange(e.target.value)}
            className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
          >
            <option value="">--</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* ===== Payment method ===== */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">{t('paymentMethod')}</label>
          <div className="grid grid-cols-2 gap-1.5">
            {METHODS.map((m) => (
              <button
                key={m}
                onClick={() => onPaymentMethodChange(m)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                  paymentMethod === m
                    ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-300 shadow-md'
                    : 'border-slate-200 dark:border-navy-700 hover:border-slate-300 dark:hover:border-navy-600 text-slate-600 dark:text-slate-300'
                }`}
              >
                {METHOD_ICONS[m]}
                {t(m)}
              </button>
            ))}
          </div>
        </div>

        {/* ===== Paid amount (non-credit) ===== */}
        {paymentMethod !== 'credit' && (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">{t('paid')}</label>
            <input
              type="number"
              value={paidAmount || ''}
              onChange={(e) => onPaidAmountChange(parseFloat(e.target.value) || 0)}
              min={0}
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 text-xl font-black text-slate-800 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-gold-500/60"
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onPaidAmountChange(total)}
                className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
              >
                {isAr ? 'بالضبط' : 'Exact'}
              </button>
              <button
                onClick={() => onPaidAmountChange(roundUp)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-navy-700 transition-colors"
              >
                {formatCurrency(roundUp, currency, lang)}
              </button>
              {quickAmounts.map((q) => (
                <button
                  key={q.v}
                  onClick={() => onPaidAmountChange(paidAmount + q.v)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-navy-700 transition-colors"
                >
                  {q.l}
                </button>
              ))}
            </div>
            {change > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{t('change')}</span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(change, currency, lang)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Total + confirm ===== */}
      <div className="border-t border-slate-100 dark:border-navy-800 p-3 space-y-2.5 flex-shrink-0">
        <div className="rounded-xl bg-navy-900 dark:bg-navy-800 border border-gold-500/30 p-3 space-y-1">
          <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-400">
            <span>{t('subtotal')}</span>
            <span>{formatCurrency(subtotal, currency, lang)}</span>
          </div>
          {discountValue > 0 && (
            <div className="flex justify-between text-[11px] text-red-400">
              <span>{t('discount')}</span>
              <span>-{formatCurrency(discountValue, currency, lang)}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-400">
              <span>{t('tax')}</span>
              <span>{formatCurrency(taxAmount, currency, lang)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1.5 border-t border-navy-700 dark:border-navy-700">
            <span className="text-sm font-bold text-white">{t('total')}</span>
            <span className="text-xl font-black text-gold-400">{formatCurrency(total, currency, lang)}</span>
          </div>
        </div>

        <Button size="lg" className="w-full !bg-emerald-600 hover:!bg-emerald-700 shadow-lg shadow-emerald-600/25" onClick={onComplete} disabled={completing || !canComplete}>
          {completing ? (isAr ? 'جاري المعالجة...' : 'Processing...') : t('completeSale')}
        </Button>
      </div>
    </div>
  );
}
