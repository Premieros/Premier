import type { DiningTableStatus, OrderType } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';

export const ORDER_TYPE_KEY: Record<OrderType, TranslationKey> = {
  dine_in: 'dineIn',
  takeaway: 'takeaway',
  delivery: 'delivery',
  drive_thru: 'driveThru',
} as const;

export const ORDER_TYPES: readonly OrderType[] = ['dine_in', 'takeaway', 'delivery', 'drive_thru'] as const;

export interface TableStatusStyle {
  label: DiningTableStatus;
  card: string;
  badge: string;
  dot: string;
}

export const STATUS_STYLES: Record<DiningTableStatus, TableStatusStyle> = {
  vacant: { label: 'vacant', card: 'border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/70 dark:bg-emerald-900/20', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  occupied: { label: 'occupied', card: 'border-amber-400 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-900/20', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500' },
  reserved: { label: 'reserved', card: 'border-blue-300 dark:border-blue-700/60 bg-blue-50/70 dark:bg-blue-900/20', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-500' },
  closed: { label: 'closed', card: 'border-slate-300 dark:border-slate-700/60 bg-slate-100 dark:bg-navy-800/60', badge: 'bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300', dot: 'bg-slate-400' },
};
