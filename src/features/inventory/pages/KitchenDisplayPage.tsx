import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { DesignSurface, DesignPageHeader } from '@/components/design/DesignSurface';
import { Button } from '@/components/Button';
import { Select } from '@/components/Input';
import { supabase } from '@/api';
import type { KitchenQueueItem } from '@/lib/types';

const STATIONS = [
  { value: 'main', ar: 'الرئيسي', en: 'Main' },
  { value: 'grill', ar: 'المشويات', en: 'Grill' },
  { value: 'salad', ar: 'السلط', en: 'Salad' },
  { value: 'drinks', ar: 'المشروبات', en: 'Drinks' },
  { value: 'dessert', ar: 'الحلويات', en: 'Dessert' },
  { value: 'fryer', ar: 'المقالي', en: 'Fryer' },
] as const;

function elapsedColor(seconds: number): string {
  if (seconds > 600) return 'text-red-600 font-bold';
  if (seconds > 300) return 'text-amber-600 font-semibold';
  return 'text-green-600';
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function KitchenDisplayPage() {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const [station, setStation] = useState('');
  const [items, setItems] = useState<KitchenQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_kitchen_queue', { p_station: station || null });
      if (error) throw error;
      setItems((data ?? []) as KitchenQueueItem[]);
    } catch { /* silent */ }
    setLoading(false);
  }, [station]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const stationName = (v: string) => STATIONS.find(s => s.value === v)?.[ar ? 'ar' : 'en'] ?? v;

  return (
    <DesignSurface testId="kitchen-display">
      <DesignPageHeader title={ar ? 'شاشة المطبخ' : 'Kitchen Display'} subtitle={ar ? 'متابعة الطلبات حسب محطة المطبخ' : 'Track orders by kitchen station'} />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={station} onChange={e => setStation(e.target.value)} className="w-44">
            <option value="">{ar ? 'كل المحطات' : 'All Stations'}</option>
            {STATIONS.map(s => <option key={s.value} value={s.value}>{ar ? s.ar : s.en}</option>)}
          </Select>
          <Button onClick={load} variant="outline"><RefreshCw className="h-4 w-4" /> {ar ? 'تحديث' : 'Refresh'}</Button>
          <span className="text-sm text-ui-muted">{items.length} {ar ? 'طلب' : 'orders'}</span>
        </div>

        {loading && !items.length && <div className="text-ui-muted py-8 text-center">{ar ? 'جاري التحميل...' : 'Loading...'}</div>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map(item => (
            <div key={item.order_id} className="rounded-2xl border border-ui-border bg-ui-surface p-4 shadow-ui-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-ui-text text-lg">#{item.order_number}</span>
                <span className={`text-sm ${elapsedColor(item.elapsed_seconds)}`}>
                  {formatElapsed(item.elapsed_seconds)}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2 text-sm text-ui-muted">
                <span className="rounded bg-ui-primary-soft px-2 py-0.5 text-ui-primary font-semibold">{stationName(item.station)}</span>
                {item.table_number && <span>{ar ? 'طاولة' : 'T'} {item.table_number}</span>}
                {item.guest_count && <span>{ar ? 'ضيوف' : 'Guests'}: {item.guest_count}</span>}
              </div>
              <ul className="space-y-1 mb-3">
                {item.items.map((it, idx) => (
                  <li key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-ui-text">{it.product_name}</span>
                    <span className="text-ui-muted font-bold">×{it.quantity}</span>
                  </li>
                ))}
              </ul>
              {item.notes && <div className="text-xs text-ui-muted italic border-t border-ui-border pt-2">{item.notes}</div>}
            </div>
          ))}
        </div>

        {!loading && !items.length && (
          <div className="text-center py-12 text-ui-muted">{ar ? 'لا توجد طلبات في المطبخ' : 'No orders in kitchen'}</div>
        )}
      </div>
    </DesignSurface>
  );
}
