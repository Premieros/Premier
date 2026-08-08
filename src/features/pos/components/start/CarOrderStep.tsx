import { useState } from 'react';
import { Car, User, Users } from 'lucide-react';
import { Button } from '@/components/Button';
import { useLanguage } from '@/context/LanguageContext';
import type { OrderType } from '@/lib/types';
import { buildCarNotes } from '../../utils/orderLabels';

interface CarOrderStepProps {
  onStart: (opts: { orderType: OrderType; guestCount: number | null; notes: string }) => void;
}

export function CarOrderStep({ onStart }: CarOrderStepProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const [plate, setPlate] = useState('');
  const [customer, setCustomer] = useState('');
  const [people, setPeople] = useState(1);

  const canStart = plate.trim().length > 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-2xl">
            🚗
          </div>
          <div>
            <p className="text-lg font-black text-slate-900 dark:text-white">{t('carOrder')}</p>
            <p className="text-xs text-slate-400">{isAr ? 'أدخل رقم اللوحة لبدء الطلب' : 'Enter the plate to start'}</p>
          </div>
        </div>

        <label className="block">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <Car className="w-4 h-4" /> {t('carPlate')} <span className="text-red-500">*</span>
          </span>
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder={isAr ? 'مثال: 1234 أ ب ج' : 'e.g. ABC-1234'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold-500/50 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <User className="w-4 h-4" /> {t('customerName')} <span className="text-xs text-slate-400">({isAr ? 'اختياري' : 'optional'})</span>
          </span>
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder={isAr ? 'اسم العميل' : 'Customer name'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold-500/50 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <Users className="w-4 h-4" /> {t('peopleCount')} <span className="text-xs text-slate-400">({isAr ? 'اختياري' : 'optional'})</span>
          </span>
          <input
            type="number"
            min={0}
            value={people}
            onChange={(e) => setPeople(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-gold-500/50 focus:outline-none"
          />
        </label>

        <Button
          size="lg"
          className="w-full"
          disabled={!canStart}
          onClick={() => onStart({ orderType: 'drive_thru', guestCount: people > 0 ? people : null, notes: buildCarNotes(plate, customer, people) })}
        >
          {t('startOrder')}
        </Button>
      </div>
    </div>
  );
}
