import { Table2, Car, Bike, Zap } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useLanguage } from '@/context/LanguageContext';
import type { OrderType } from '@/lib/types';
import { ORDER_TYPE_META } from '../../utils/orderLabels';

interface TypeChangePickerProps {
  open: boolean;
  onClose: () => void;
  current: OrderType;
  onSelect: (type: OrderType) => void;
}

const ICONS = { table: Table2, car: Car, bike: Bike, zap: Zap } as const;

const ORDER: OrderType[] = ['dine_in', 'drive_thru', 'delivery', 'takeaway'];

export function TypeChangePicker({ open, onClose, current, onSelect }: TypeChangePickerProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <Modal open={open} onClose={onClose} title={t('changeOrderType')} size="sm">
      <div className="space-y-2">
        {ORDER.map((type) => {
          const meta = ORDER_TYPE_META[type];
          const Icon = ICONS[meta.icon];
          const active = type === current;
          return (
            <button
              key={type}
              onClick={() => { onClose(); onSelect(type); }}
              disabled={active}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all active:scale-[0.98] ${
                active
                  ? 'border-brand-400 dark:border-gold-500/60 bg-brand-50 dark:bg-brand-900/20 cursor-default'
                  : 'border-slate-200 dark:border-navy-800 hover:border-brand-300 dark:hover:border-gold-500/40 hover:bg-slate-50 dark:hover:bg-navy-800'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${meta.pill}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-start flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{t(meta.label)}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {active ? (isAr ? 'النوع الحالي' : 'Current type') : isAr ? 'تحويل الطلب الحالي' : 'Switch current order'}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
