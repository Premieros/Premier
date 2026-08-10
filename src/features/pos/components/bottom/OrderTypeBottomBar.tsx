import { Bike, Check, ShoppingBag, Table2, Zap } from 'lucide-react';
import type { OrderType } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  activeType: OrderType | null | undefined;
  onSelect: (type: OrderType) => void;
  disabled?: boolean;
}

const ITEMS = [
  { type: 'dine_in' as OrderType, ar: 'الصالة', en: 'Dine-in', icon: Table2 },
  { type: 'delivery' as OrderType, ar: 'Delivery', en: 'Delivery', icon: Bike },
  { type: 'takeaway' as OrderType, ar: 'Takeaway', en: 'Takeaway', icon: ShoppingBag },
  { type: 'drive_thru' as OrderType, ar: 'طلب سريع', en: 'Quick Order', icon: Zap },
];

export function OrderTypeBottomBar({ activeType, onSelect, disabled = false }: Props) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';

  return (
    <nav
      aria-label={ar ? 'نوع الطلب' : 'Order type'}
      className="fixed inset-x-0 bottom-0 z-[35] pointer-events-none px-2 pb-[max(4px,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto max-w-2xl pointer-events-auto">
        <div className="rounded-2xl border border-slate-200/90 bg-white/96 p-1 shadow-[0_-6px_24px_rgba(15,23,42,.12)] backdrop-blur-xl dark:border-navy-700 dark:bg-navy-900/96">
          <div className="grid grid-cols-4 gap-1">
            {ITEMS.map(({ type, ar: labelAr, en, icon: Icon }) => {
              const active = activeType === type;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(type)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-1.5 transition-all active:scale-[.98] disabled:opacity-50 sm:min-h-12 sm:gap-2 sm:px-2 ${
                    active
                      ? 'bg-navy-950 text-white shadow-md ring-1 ring-gold-400/40 dark:bg-gold-500 dark:text-navy-950'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-800'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                  <span className="truncate text-[10px] font-extrabold leading-none sm:text-xs">
                    {ar ? labelAr : en}
                  </span>
                  {active && <Check className="h-3 w-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
