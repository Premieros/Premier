import type { Order, OrderItem } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';
import type { OrderKitchenSend } from '../types';

// Operational stage of an active order, independent of its persisted status.
//   open    - items exist but none sent to the kitchen yet
//   kitchen - some items sent, some not (partial)
//   ready   - ALL item quantities sent to the kitchen -> ready for payment
//   hold    - order was held (paused)
export type OrderStage = 'open' | 'kitchen' | 'ready' | 'hold';

export interface OrderStageStyle {
  label: TranslationKey;
  badge: string;
  dot: string;
}

export function deriveOrderStage(order: Order, items: OrderItem[], sends: OrderKitchenSend[]): OrderStage {
  if (order.status === 'held') return 'hold';
  const sentIds = new Set(sends.map((s) => s.order_item_id));
  let total = 0;
  let sent = 0;
  for (const it of items) {
    const qty = Number(it.quantity) || 0;
    total += qty;
    if (sentIds.has(it.id)) sent += qty;
  }
  if (total === 0) return 'open';
  if (sent === 0) return 'open';
  if (sent < total) return 'kitchen';
  return 'ready';
}

export const ORDER_STAGE_STYLES: Record<OrderStage, OrderStageStyle> = {
  open: {
    label: 'open',
    badge: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    dot: 'bg-brand-500',
  },
  kitchen: {
    label: 'inKitchen',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  ready: {
    label: 'readyForPayment',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  hold: {
    label: 'holdOrder',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
};

export function stageOfOrder(
  order: Order,
  itemsByOrder: Record<string, OrderItem[]>,
  sendsByOrder: Record<string, OrderKitchenSend[]>,
): OrderStage {
  return deriveOrderStage(order, itemsByOrder[order.id] || [], sendsByOrder[order.id] || []);
}

// Stage of the current workspace cart, using per-product sent/new quantities
// (from computeSentState) merged with the session's last kitchen send.
export function deriveCartStage(
  cart: Array<{ product: { id: string }; quantity: number }>,
  sentState: Record<string, { sentQty: number; newQty: number }>,
  held: boolean,
): OrderStage {
  if (held) return 'hold';
  let newQty = 0;
  let sentQty = 0;
  for (const item of cart) {
    const st = sentState[item.product.id];
    const qty = Number(item.quantity) || 0;
    const sent = Math.min(st?.sentQty || 0, qty);
    sentQty += sent;
    newQty += Math.max(0, qty - sent);
  }
  if (sentQty === 0) return 'open';
  if (newQty > 0) return 'kitchen';
  return 'ready';
}
