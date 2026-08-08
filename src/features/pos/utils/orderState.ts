import type { Order } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';

export type PosOrderState = 'open' | 'sent' | 'hold' | 'payment' | 'paid' | 'closed';

export interface OrderStateStyle {
  label: TranslationKey;
  badge: string;
  dot: string;
  text: string;
}

export function deriveOrderState(order: Order, hasKitchenSends: boolean): PosOrderState {
  if (order.status === 'held') return 'hold';
  if (order.status === 'cancelled') return 'closed';
  if (order.status === 'completed') return 'paid';
  return hasKitchenSends ? 'sent' : 'open';
}

export const ORDER_STATE_STYLES: Record<PosOrderState, OrderStateStyle> = {
  open: {
    label: 'open',
    badge: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    dot: 'bg-brand-500',
    text: 'text-brand-700 dark:text-brand-300',
  },
  sent: {
    label: 'inKitchen',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    dot: 'bg-orange-500',
    text: 'text-orange-700 dark:text-orange-300',
  },
  hold: {
    label: 'holdOrder',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  payment: {
    label: 'payOrder',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  paid: {
    label: 'paid',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    dot: 'bg-green-500',
    text: 'text-green-700 dark:text-green-300',
  },
  closed: {
    label: 'orderClosed',
    badge: 'bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
    dot: 'bg-slate-400',
    text: 'text-slate-600 dark:text-slate-300',
  },
};
