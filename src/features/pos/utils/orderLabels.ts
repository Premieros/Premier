import type { Customer, DiningTable, Order, OrderType } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';

export interface OrderTypeMeta {
  label: TranslationKey;
  icon: 'table' | 'car' | 'bike' | 'zap';
  pill: string;
}

export const ORDER_TYPE_META: Record<OrderType, OrderTypeMeta> = {
  dine_in: {
    label: 'dineIn',
    icon: 'table',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  },
  drive_thru: {
    label: 'driveThru',
    icon: 'car',
    pill: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
  },
  delivery: {
    label: 'delivery',
    icon: 'bike',
    pill: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  },
  takeaway: {
    label: 'takeaway',
    icon: 'zap',
    pill: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  },
};

const CAR_PREFIX = '🚗';
const DELIVERY_PREFIX = '🛵';

export interface CarContext {
  plate: string;
  customer: string;
  people: number;
}

export interface DeliveryContext {
  phone: string;
  address: string;
  note: string;
}

// Structured-but-human-readable note encoding for drive_thru orders.
//   🚗 <plate> | <optional customer> | <optional people count>
export function buildCarNotes(plate: string, customer: string, people: number): string {
  const parts = [CAR_PREFIX, plate.trim()];
  if (customer.trim()) parts.push(customer.trim());
  if (people > 0) parts.push(String(people));
  return parts.join(' | ');
}

export function parseCarNotes(notes: string | null): CarContext {
  if (!notes) return { plate: '', customer: '', people: 0 };
  const [head, customer = '', people = ''] = notes
    .replace(CAR_PREFIX, '')
    .split('|')
    .map((s) => s.trim());
  return { plate: head, customer, people: parseInt(people, 10) || 0 };
}

// Structured-but-human-readable note encoding for delivery orders.
//   🛵 <phone> | <optional address> | <optional note>
export function buildDeliveryNotes(phone: string, address: string, note: string): string {
  const parts = [DELIVERY_PREFIX, phone.trim()];
  if (address.trim()) parts.push(address.trim());
  if (note.trim()) parts.push(note.trim());
  return parts.join(' | ');
}

export function parseDeliveryNotes(notes: string | null): DeliveryContext {
  if (!notes) return { phone: '', address: '', note: '' };
  const [head, address = '', note = ''] = notes
    .replace(DELIVERY_PREFIX, '')
    .split('|')
    .map((s) => s.trim());
  return { phone: head, address, note };
}

// Primary context line shown on order cards and the workspace header.
export function orderContextText(
  order: Order,
  tableById: Record<string, DiningTable>,
  customerById: Record<string, Customer>,
): string {
  switch (order.order_type) {
    case 'dine_in':
      return order.table_id && tableById[order.table_id] ? tableById[order.table_id].name : '';
    case 'drive_thru':
      return parseCarNotes(order.notes).plate;
    case 'delivery': {
      if (order.customer_id && customerById[order.customer_id]) return customerById[order.customer_id].name;
      return parseDeliveryNotes(order.notes).phone;
    }
    default:
      return '';
  }
}
