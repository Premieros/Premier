import { Table2, Car, Bike, Zap, ListOrdered } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { OrderType } from '@/lib/types';
import { ORDER_TYPE_META } from '../../utils/orderLabels';

interface OrderTypePickerProps {
  onSelect: (type: OrderType) => void;
  onActiveOrders: () => void;
}

const ICONS = { table: Table2, car: Car, bike: Bike, zap: Zap } as const;

const CARDS: Array<{ type: OrderType; icon: keyof typeof ICONS; emoji: string; descAr: string; descEn: string }> = [
  { type: 'dine_in', icon: 'table', emoji: '🪑', descAr: 'داخل الصالة', descEn: 'Dine-in' },
  { type: 'drive_thru', icon: 'car', emoji: '🚗', descAr: 'الطلب من السيارة', descEn: 'Drive thru' },
  { type: 'delivery', icon: 'bike', emoji: '🛵', descAr: 'توصيل للعميل', descEn: 'Delivery' },
  { type: 'takeaway', icon: 'zap', emoji: '⚡', descAr: 'استلام سريع', descEn: 'Quick pickup' },
];

export function OrderTypePicker({ onSelect, onActiveOrders }: OrderTypePickerProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <p className="text-2xl font-black text-slate-900 dark:text-white">{t('chooseOrderType')}</p>
          <p className="text-sm text-slate-400 mt-1">
            {isAr ? 'كيف سيتم تقديم هذا الطلب؟' : 'How will this order be served?'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CARDS.map((c) => {
            const meta = ORDER_TYPE_META[c.type];
            const Icon = ICONS[c.icon];
            return (
              <button
                key={c.type}
                onClick={() => onSelect(c.type)}
                className="group relative flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 hover:border-brand-400 dark:hover:border-gold-500/60 hover:shadow-card-hover transition-all active:scale-[0.98]"
              >
                <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center border ${meta.pill}`}>
                  <span className="absolute -top-2.5 -start-2.5 text-xl drop-shadow-sm" aria-hidden>{c.emoji}</span>
                  <Icon className="w-7 h-7" />
                </div>
                <div className="text-start min-w-0">
                  <p className="text-base font-black text-slate-900 dark:text-white">{t(meta.label)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{isAr ? c.descAr : c.descEn}</p>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={onActiveOrders}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 dark:border-navy-800 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors"
        >
          <ListOrdered className="w-4 h-4" />
          {t('openActiveOrders')}
        </button>
      </div>
    </div>
  );
}
