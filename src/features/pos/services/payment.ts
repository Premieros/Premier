import { pos as posApi, supabase } from '@/api';
import type { RpcResult, OrderType } from '@/lib/types';
import type { ItemPayload } from '../utils/cart';

export interface ProcessSalePayload {
  p_invoice_number: string;
  p_branch_id: string;
  p_shift_id: string | null;
  p_warehouse_id: string | null;
  p_customer_id: string | null;
  p_salesperson_id: string | null;
  p_subtotal: number;
  p_discount_amount: number;
  p_discount_type: 'percent' | 'amount';
  p_tax_amount: number;
  p_bonus_amount: number;
  p_total: number;
  p_paid_amount: number;
  p_payment_method: string;
  p_status: string;
  p_items: ItemPayload[];
  p_order_type: OrderType;
  p_table_id: string | null;
  p_order_id: string | null;
  p_guest_count: number | null;
}

export async function processSaleForOrder(p: ProcessSalePayload): Promise<{ result: RpcResult | null; error: string | null }> {
  const { data, error } = await posApi.processSale(p);
  if (error) return { result: null, error: error.message };
  const result = (data ?? null) as RpcResult | null;
  if (!result?.success) return { result, error: null };
  return { result, error: null };
}

export async function nextInvoiceNumber(): Promise<string | null> {
  const { data, error } = await posApi.nextDocumentNumber({ p_type: 'sale' });
  if (error || !data?.success) return null;
  return (data as { number?: string }).number || null;
}

export async function fetchBranchWarehouseId(branchId: string): Promise<string | null> {
  const { data } = await supabase.from('warehouses').select('id').eq('branch_id', branchId).eq('is_active', true);
  const rows = (data as { id: string }[] | null) || [];
  return rows.length > 0 ? rows[0].id : null;
}
