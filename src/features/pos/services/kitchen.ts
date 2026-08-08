import { pos as posApi } from '@/api';
import type { KitchenSendResult } from '../types';

export async function sendOrderToKitchen(p: { p_order_id: string; p_sent_by?: string | null }): Promise<KitchenSendResult> {
  const { data, error } = await posApi.sendToKitchen(p);
  const r = (data ?? null) as KitchenSendResult | null;
  if (error) return { success: false, error: 'RPC_ERROR', detail: error.message };
  return r ?? { success: false, error: 'NO_DATA' };
}
