import { useMemo, useState } from 'react';
import { Search, X, UtensilsCrossed, Banknote, Play, Trash2, ListOrdered } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency } from '@/lib/format';
import type { DiningTable, Order, OrderItem } from '@/lib/types';
import type { OrderKitchenSend } from '../../types';
import { orderTypeLabel } from '../../utils/format';
import { deriveOrderState } from '../../utils/orderState';
import { timeAgo } from '../../utils/timeAgo';
import { OrderStatusBadge } from '../order/OrderStatusBadge';

interface ActiveOrdersDrawerProps {
  open: boolean;
  onClose: () => void;
  orders: Order[];
  itemsByOrder: Record<string, OrderItem[]>;
  kitchenSendsByOrder: Record<string, OrderKitchenSend[]>;
  tableById: Record<string, DiningTable>;
  currency: string;
  onResume: (order: Order) => void;
  onPay: (order: Order) => void;
  onCancel: (order: Order) => void;
}

type TypeFilter = 'all' | 'dine_in' | 'takeaway' | 'delivery' | 'drive_thru';

export function ActiveOrdersDrawer({
  open, onClose, orders, itemsByOrder, kitchenSendsByOrder, tableById, currency,
  onResume, onPay, onCancel,
}: ActiveOrdersDrawerProps) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (typeFilter !== 'all' && o.order_type !== typeFilter) return false;
      if (!q) return true;
      const tableName = o.table_id && tableById[o.table_id] ? tableById[o.table_id].name.toLowerCase() : '';
      return o.order_number.toLowerCase().includes(q) || tableName.includes(q);
    });
  }, [orders, typeFilter, query, tableById]);

  const filterChips: Array<{ id: TypeFilter; label: string }> = [
    { id: 'all', label: isAr ? 'الكل' : 'All' },
    { id: 'dine_in', label: t('dineIn') },
    { id: 'takeaway', label: t('takeaway') },
    { id: 'delivery', label: t('delivery') },
    { id: 'drive_thru', label: t('driveThru') },
  ];

  return (
    <>
      {open && <div className="fixed inset-0 top-16 z-40 bg-navy-950/40 backdrop-blur-[1px]" onClick={onClose} />}
      <aside
        className={`fixed top-16 bottom-0 z-50 w-[360px] max-w-[88vw] bg-white dark:bg-navy-900 border-s border-slate-200 dark:border-navy-800 shadow-2xl transition-transform duration-300 flex flex-col ${
          isAr ? 'left-0' : 'right-0'
        } ${open ? 'translate-x-0' : isAr ? '-translate-x-full' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-navy-800 flex-shrink-0">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-brand-500 dark:text-gold-400" />
            {t('activeOrders')}
            <span className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-[11px] font-bold">{orders.length}</span>
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 py-2.5 space-y-2 border-b border-slate-100 dark:border-navy-800 flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {filterChips.map((c) => (
              <button
                key={c.id}
                onClick={() => setTypeFilter(c.id)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                  typeFilter === c.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isAr ? 'بحث برقم الطلب أو الطاولة...' : 'Search order # or table...'}
              className="w-full ps-9 pe-3 py-2 rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t('noOpenOrders')}</p>
            </div>
          ) : (
            filtered.map((order) => {
              const sent = kitchenSendsByOrder[order.id]?.length || 0;
              const itemCount = (itemsByOrder[order.id] || []).reduce((s, i) => s + Number(i.quantity), 0);
              const ago = timeAgo(order.created_at);
              return (
                <div key={order.id} className="p-3 rounded-xl border border-slate-100 dark:border-navy-800 bg-slate-50 dark:bg-navy-800/50 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-black text-slate-800 dark:text-white">{order.order_number}</span>
                      <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-navy-700 text-slate-600 dark:text-slate-300">
                        {orderTypeLabel(t, order.order_type)}
                      </span>
                      {order.table_id && tableById[order.table_id] && (
                        <span className="shrink-0 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300 truncate">
                          {tableById[order.table_id].name}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-brand-600 dark:text-gold-400 shrink-0">
                      {formatCurrency(order.total, currency, lang)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                    <OrderStatusBadge state={deriveOrderState(order, sent > 0)} />
                    <span>
                      {isAr
                        ? `${itemCount} صنف · ${ago.n != null ? `${ago.n} ${t(ago.key)}` : t(ago.key)}`
                        : `${itemCount} items · ${ago.n != null ? `${ago.n} ${t(ago.key)}` : t(ago.key)}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      onClick={() => onPay(order)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all active:scale-95"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      {t('payOrder')}
                    </button>
                    <button
                      onClick={() => onResume(order)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold transition-all active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {t('resumeOrder')}
                    </button>
                    {order.status === 'held' && (
                      <button
                        onClick={() => onCancel(order)}
                        className="ms-auto p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={t('cancelOrder')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
