import { useMemo, useState } from 'react';
import { Phone, MapPin, StickyNote, Search, X, Check } from 'lucide-react';
import { Button } from '@/components/Button';
import { useLanguage } from '@/context/LanguageContext';
import type { Customer, OrderType } from '@/lib/types';
import { buildDeliveryNotes } from '../../utils/orderLabels';

interface DeliveryOrderStepProps {
  customers: Customer[];
  onStart: (opts: { orderType: OrderType; customerId?: string; notes: string }) => void;
}

export function DeliveryOrderStep({ customers, onStart }: DeliveryOrderStepProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [customers, query]);

  const canStart = selected !== null || phone.trim().length > 0;

  const submit = () => {
    const phoneValue = selected?.phone || phone;
    onStart({
      orderType: 'delivery',
      customerId: selected?.id,
      notes: buildDeliveryNotes(phoneValue, address, notes),
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-2xl">
            🛵
          </div>
          <div>
            <p className="text-lg font-black text-slate-900 dark:text-white">{t('delivery')}</p>
            <p className="text-xs text-slate-400">{isAr ? 'أدخل بيانات العميل والعنوان' : 'Enter customer and address details'}</p>
          </div>
        </div>

        <div>
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <Search className="w-4 h-4" /> {t('searchCustomer')}
          </span>
          {selected ? (
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-brand-300 dark:border-gold-500/50 bg-brand-50 dark:bg-brand-900/20">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selected.name}</p>
                {selected.phone && <p className="text-[11px] text-slate-500 dark:text-slate-400">{selected.phone}</p>}
              </div>
              <button onClick={() => { setSelected(null); setQuery(''); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-navy-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchCustomer')}
                className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold-500/50 focus:outline-none"
              />
              {results.length > 0 && (
                <div className="absolute inset-x-0 top-full mt-1.5 z-10 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 shadow-lg overflow-hidden">
                  {results.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelected(c); setPhone(c.phone || ''); setQuery(''); }}
                      className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-start hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{c.name}</p>
                        {c.phone && <p className="text-[11px] text-slate-400">{c.phone}</p>}
                      </div>
                      <Check className="w-4 h-4 text-brand-500 dark:text-gold-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <label className="block">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <Phone className="w-4 h-4" /> {t('phone')} <span className="text-red-500">*</span>
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={isAr ? 'رقم الهاتف' : 'Phone number'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold-500/50 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <MapPin className="w-4 h-4" /> {t('address')}
          </span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={isAr ? 'العنوان' : 'Address'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold-500/50 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <StickyNote className="w-4 h-4" /> {t('notes')}
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={isAr ? 'ملاحظات الطلب...' : 'Order notes...'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-gold-500/50 focus:outline-none resize-none"
          />
        </label>

        <Button size="lg" className="w-full" disabled={!canStart} onClick={submit}>
          {t('startOrder')}
        </Button>
      </div>
    </div>
  );
}
