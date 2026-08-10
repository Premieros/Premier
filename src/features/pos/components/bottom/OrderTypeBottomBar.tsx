import { Bike, Car, Check, ShoppingBag, Table2 } from 'lucide-react';
import type { OrderType } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';

interface OrderTypeBottomBarProps {
  activeType: OrderType | null | undefined;
  onSelect: (type: OrderType) => void;
  onChooseTable: () => void;
  disabled?: boolean;
}

const ITEMS: Array<{
  type: OrderType;
  ar: string;
  en: string;
  icon: typeof Table2;
}> = [
  { type: 'dine_in', ar: 'الصالة', en: 'Dine-in', icon: Table2 },
  { type: 'delivery', ar: 'دليفري', en: 'Delivery', icon: Bike },
  { type: 'takeaway', ar: 'تيك أواي', en: 'Take Away', icon: ShoppingBag },
  { type: 'drive_thru', ar: 'من السيارة', en: 'Drive Thru', icon: Car },
];

export function OrderTypeBottomBar({ activeType, onSelect, onChooseTable, disabled = false }: OrderTypeBottomBarProps) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const dineIn = activeType === 'dine_in';

  return (
    <div className="fixed inset-x-0 bottom-0 z-35 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="mx-auto max-w-5xl pointer-events-auto">
        <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(15,23,42,0.12)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.28)] p-1.5">
          <div className="flex items-stretch gap-1">
            {ITEMS.map(({ type, ar, en, icon: Icon }) => {
              const active = activeType === type;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(type)}
                  className={`relative flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-xl px-2 py-3 sm:py-3.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${
                    active
                      ? 'bg-navy-950 dark:bg-gold-500 text-white dark:text-navy-950 shadow-md'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-[11px] sm:text-xs font-black truncate">{isAr ? ar : en}</span>
                  {active && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              );
            })}

            <button
              type="button"
              disabled={disabled || !dineIn}
              onClick={onChooseTable}
              className={`flex-[1.15] min-w-0 flex items-center justify-center gap-1.5 rounded-xl px-2 py-3 sm:py-3.5 text-[11px] sm:text-xs font-black transition-all active:scale-[0.98] ${
                dineIn
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-100 dark:bg-navy-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <Table2 className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{isAr ? 'اختيار الطاولة' : 'Choose Table'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
