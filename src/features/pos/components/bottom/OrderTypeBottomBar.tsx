import { useState } from 'react';
import { ListOrdered, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useBranchFilter } from '@/lib/useBranchFilter';
import { useSettings } from '@/context/SettingsContext';
import { useActiveOrders } from '../../hooks/useActiveOrders';
import { formatCurrency } from '@/lib/format';

interface Props {
  disabled?: boolean;
}

export function OrderTypeBottomBar({ disabled = false }: Props) {
  const { lang } = useLanguage();
  const ar = lang === 'ar';
  const navigate = useNavigate();
  const branchId = useBranchFilter() || '';
  const { effectiveSettings } = useSettings();
  const currency = effectiveSettings(branchId)?.currency || 'EGP';
  const { orders } = useActiveOrders(branchId);
  const [ordersOpen, setOrdersOpen] = useState(false);

  const openOrder = (orderId: string) => {
    setOrdersOpen(false);
    navigate(`/pos/${orderId}`);
  };

  return (
    <>
      {ordersOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ui-text/35 p-3 pb-16 backdrop-blur-[2px]" onClick={() => setOrdersOpen(false)}>
          <div className="max-h-[70vh] w-full max-w-lg overflow-hidden rounded-2xl border border-ui-border bg-ui-surface shadow-ui-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ui-border px-4 py-3">
              <div className="flex items-center gap-2"><ListOrdered className="h-4 w-4 text-ui-accent" /><span className="text-sm font-black text-ui-text">{ar ? 'الطلبات النشطة' : 'Active orders'}</span><span className="rounded-full bg-ui-primary-soft px-2 py-0.5 text-[10px] font-black text-ui-accent">{orders.length}</span></div>
              <button type="button" onClick={() => setOrdersOpen(false)} className="rounded-lg p-2 text-ui-subtle hover:bg-ui-page-alt" aria-label={ar ? 'إغلاق' : 'Close'}><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {orders.length === 0 ? <div className="py-10 text-center text-xs font-bold text-ui-subtle">{ar ? 'لا توجد طلبات نشطة' : 'No active orders'}</div> : orders.map((order) => <button key={order.id} type="button" onClick={() => openOrder(order.id)} className="mb-2 flex w-full items-center justify-between gap-3 rounded-xl border border-ui-border bg-ui-page-alt p-3 text-start hover:border-ui-primary"><div className="min-w-0"><p className="text-xs font-black text-ui-text">{order.order_number}</p><p className="mt-1 text-[10px] font-bold text-ui-subtle">{order.order_type === 'dine_in' ? (ar ? 'الصالة' : 'Dine-in') : order.order_type === 'delivery' ? 'Delivery' : order.order_type === 'takeaway' ? 'Takeaway' : (ar ? 'طلب سريع' : 'Quick')}</p></div><span className="shrink-0 text-xs font-black text-ui-accent">{formatCurrency(order.total, currency, lang)}</span></button>)}
            </div>
          </div>
        </div>
      )}

      <nav aria-label={ar ? 'الطلبات النشطة' : 'Active orders'} className="fixed inset-x-0 bottom-0 z-[35] pointer-events-none px-2 pb-[max(4px,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-sm pointer-events-auto">
          <div className="flex h-10 items-center rounded-xl border border-ui-border bg-ui-surface/95 p-1 shadow-ui-lg backdrop-blur-xl">
            <button type="button" disabled={disabled} onClick={() => setOrdersOpen(true)} className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-[10px] font-black text-ui-muted hover:bg-ui-page-alt disabled:opacity-50">
              <ListOrdered className="h-4 w-4" /><span>{ar ? 'الطلبات النشطة' : 'Active orders'}</span><span className="rounded-full bg-ui-primary-soft px-1.5 py-0.5 text-[9px] text-ui-accent">{orders.length}</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
