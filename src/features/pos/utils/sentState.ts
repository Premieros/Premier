import type { CartItem, OrderItem } from '@/lib/types';
import type { KitchenSendItem } from '../types';

export interface SentLineState {
  sentQty: number;
  newQty: number;
  sent: boolean;
  partial: boolean;
}

// Per-product sent/new quantities for the current cart.
//   orderItems      - persisted order_items for the active order (realtime)
//   sentOrderItemIds- order_item ids that already have a kitchen send row
//   sessionSent     - lines returned by the last send_to_kitchen call this session
export function computeSentState(
  cart: CartItem[],
  orderItems: OrderItem[],
  sentOrderItemIds: Set<string>,
  sessionSent: KitchenSendItem[],
): Record<string, SentLineState> {
  const qtyById: Record<string, number> = {};
  for (const item of cart) qtyById[item.product.id] = item.quantity;

  const map: Record<string, SentLineState> = {};
  for (const pid of Object.keys(qtyById)) {
    map[pid] = { sentQty: 0, newQty: qtyById[pid], sent: false, partial: false };
  }

  for (const oi of orderItems) {
    const pid = oi.product_id;
    if (!pid || !map[pid]) continue;
    if (sentOrderItemIds.has(oi.id)) map[pid].sentQty += Number(oi.quantity) || 0;
  }

  for (const s of sessionSent) {
    const pid = s.product_id;
    if (!pid || !map[pid]) continue;
    if (Number(s.quantity) > map[pid].sentQty) map[pid].sentQty = Number(s.quantity);
  }

  for (const pid of Object.keys(map)) {
    const qty = qtyById[pid];
    const sent = Math.min(map[pid].sentQty, qty);
    map[pid].sentQty = sent;
    map[pid].newQty = Math.max(0, qty - sent);
    map[pid].sent = sent > 0 && map[pid].newQty === 0;
    map[pid].partial = sent > 0 && map[pid].newQty > 0;
  }
  return map;
}
