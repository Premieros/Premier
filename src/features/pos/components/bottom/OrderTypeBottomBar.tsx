import { Bike, Check, ShoppingBag, Table2, Zap } from 'lucide-react';
import type { OrderType } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';

interface OrderTypeBottomBarProps {
  activeType: OrderType | null | undefined;
  onSelect: (type: OrderType) => void;
  onChooseTable: () => void;
  disabled?: boolean;
}

const ITEMS: Array<{ type: OrderType; ar: string; en: string; icon: typeof Table2 }> = [
  { type: 'dine_in', ar: 'الصالة', en: 'Dine-in', icon: Table2 },
  { type: 'delivery', ar: 'Delivery', en: 'Delivery', icon: Bike },
  { type: 'takeaway', ar: 'Takeaway', en: 'Takeaway', icon: ShoppingBag },
  // Existing backend type retained; this is the fast cashier path in the new UX.
  { type: 'drive_thru', ar: 'طلب سريع', en: 'Quick Order', icon: Zap },
];

export function OrderTypeBottomBar({ activeType, onSelect, onChooseTable, disabled = false }: OrderTypeBottomBarProps) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const dineIn = activeType === 'dine_in';

  return (
    <div className="fixed inset-x-0 bottom-0 z-[35] px-2 pb-[max(8px,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="mx-auto max-w-6xl pointer-events-auto">
        <div className="rounded-[22px] border border-slate-200/90 dark:border-navy-700 bg-white/96 dark:bg-navy-900/96 backdrop-blur-xl shadow-[0_-10px_35px_rgba(15,23,42,0.14)] dark:shadow-[0_-10px_35px_rgba(0,0,0,0.34)] p-1.5">
          <div className="flex items-stretch gap-1.5">
            {ITEMS.map(({ type, ar, en, icon: Icon }) => {
              const active = activeType === type;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(type)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex-1 min-w-0 min-h-[58px] sm:min-h-[64px] flex items-center justify-center gap-2 rounded-[17px] px-2.5 sm:px-4 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${active ? 'bg-navy-950 dark:bg-gold-500 text-white dark:text-navy-950 shadow-lg ring-2 ring-gold-400/30' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800'}`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <span className="text-[11px] sm:text-sm font-black truncate">{isAr ? ar : en}</span>
                  {active && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />}
                </button>
              );
            })}
            <button
              type="button"
              disabled={disabled || !dineIn}
              onClick={onChooseTable}
              className={`hidden sm:flex flex-[0.9] min-w-0 items-center justify-center gap-2 rounded-[17px] px-3 min-h-[64px] text-xs font-black transition-all active:scale-[0.98] ${dineIn ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-100 dark:bg-navy-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'}`}
            >
              <Table2 className="w-5 h-5 flex-shrink-0" />
              <span>{isAr ? 'الطاولات' : 'Tables'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
