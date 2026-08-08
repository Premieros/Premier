import { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/format';
import type { DiningTable, Order, OrderItem } from '@/lib/types';
import type { OrderKitchenSend } from '../../types';
import { STATUS_STYLES } from '../../utils/orderTypes';
import { stageOfOrder } from '../../utils/orderStage';
import { OrderStageBadge } from '../order/OrderStageBadge';
import { TableActionModal } from './TableActionModal';

interface TablePickerStepProps {
  tables: DiningTable[];
  ordersByTable: Record<string, Order[]>;
  itemsByOrder: Record<string, OrderItem[]>;
  kitchenSendsByOrder: Record<string, OrderKitchenSend[]>;
  currency: string;
  preselectedTableId: string | null;
  onStart: (table: DiningTable, guests: number) => void;
  onResume: (order: Order) => void;
  onPay: (order: Order) => void;
}

type StatusFilter = 'all' | 'vacant' | 'occupied' | 'reserved';

export function TablePickerStep({
  tables, ordersByTable, itemsByOrder, kitchenSendsByOrder, currency,
  preselectedTableId, onStart, onResume, onPay,
}: TablePickerStepProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<DiningTable | null>(null);

  useEffect(() => {
    if (!preselectedTableId) return;
    const tb = tables.find((x) => x.id === preselectedTableId);
    if (tb) setSelected(tb);
  }, [preselectedTableId, tables]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tables.filter((tb) => {
      if (statusFilter !== 'all' && tb.status !== statusFilter) return false;
      if (!q) return true;
      return tb.name.toLowerCase().includes(q);
    });
  }, [tables, statusFilter, query]);

  const chips: Array<{ id: StatusFilter; label: string }> = [
    { id: 'all', label: isAr ? 'الكل' : 'All' },
    { id: 'vacant', label: t('vacant') },
    { id: 'occupied', label: t('occupied') },
    { id: 'reserved', label: t('reserved') },
  ];

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchTable')}
              className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {chips.map((c) => (
              <button
                key={c.id}
                onClick={() => setStatusFilter(c.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  statusFilter === c.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{isAr ? 'لا توجد طاولات مطابقة' : 'No matching tables'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((tb) => {
                const st = STATUS_STYLES[tb.status] || STATUS_STYLES.vacant;
                const tableOrders = ordersByTable[tb.id] || [];
                const order = tableOrders[0];
                const stage = order ? stageOfOrder(order, itemsByOrder, kitchenSendsByOrder) : null;
                return (
                  <button
                    key={tb.id}
                    onClick={() => setSelected(tb)}
                    className={`relative rounded-2xl border-2 p-3.5 text-start transition-all active:scale-[0.98] ${st.card} ${
                      tb.status === 'closed' ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-card-hover hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{tb.name}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${st.badge}`}>{t(st.label)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <Users className="w-3 h-3" /> {tb.capacity}
                    </div>
                    {order && (
                      <div className="mt-2 space-y-1 border-t border-black/5 dark:border-white/5 pt-2">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-black text-slate-800 dark:text-white">{order.order_number}</span>
                          <span className="text-[11px] font-bold text-brand-600 dark:text-gold-400">{formatCurrency(order.total, currency, lang)}</span>
                        </div>
                        {stage && <OrderStageBadge stage={stage} className="scale-90 origin-start" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <TableActionModal
        table={selected}
        onClose={() => setSelected(null)}
        orders={selected ? ordersByTable[selected.id] || [] : []}
        itemsByOrder={itemsByOrder}
        kitchenSendsByOrder={kitchenSendsByOrder}
        currency={currency}
        onStart={(guests) => selected && onStart(selected, guests)}
        onResume={onResume}
        onPay={onPay}
      />
    </>
  );
}
