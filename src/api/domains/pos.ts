import type { ApiResult, SaleItemInput } from '../types';
import type { RpcResult, Shift, OrderType } from '@/lib/types';
import { rpc } from '../rpc';

export const pos = {
  getActiveShift(p: { p_branch_id: string }): ApiResult<Shift> { return rpc('get_active_shift', p); },
  sendToKitchen(p: { p_order_id: string; p_sent_by?: string | null }): ApiResult<RpcResult & { order_id?: string; sent?: unknown[]; items_sent_count?: number; all_sent?: boolean }> { return rpc('send_to_kitchen', p); },
  nextDocumentNumber(p: { p_type: string }): ApiResult<RpcResult> { return rpc('next_document_number', p); },
  processSale(p: { p_invoice_number: string; p_branch_id: string; p_shift_id: string | null; p_warehouse_id: string | null; p_customer_id: string | null; p_salesperson_id: string | null; p_subtotal: number; p_discount_amount: number; p_discount_type: 'percent' | 'amount'; p_tax_amount: number; p_bonus_amount: number; p_total: number; p_paid_amount: number; p_payment_method: string; p_status: string; p_items: SaleItemInput[]; p_order_type?: OrderType; p_table_id?: string | null; p_order_id?: string | null; p_guest_count?: number | null }): ApiResult<RpcResult> { return rpc('process_sale', p); },
};
