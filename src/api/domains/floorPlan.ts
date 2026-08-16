import type { ApiResult } from '../types';
import type { RpcResult, OrderType } from '@/lib/types';
import { rpc } from '../rpc';

export const floorPlan = {
  createOrder(p: { p_branch_id: string; p_order_type?: OrderType; p_table_id?: string | null; p_customer_id?: string | null; p_guest_count?: number | null; p_notes?: string | null; p_items: { product_id: string; unit_name: string; quantity: number; unit_price: number; discount_amount: number; bonus_quantity: number; total: number; notes?: string | null }[]; p_subtotal?: number; p_discount_amount?: number; p_discount_type?: 'percent' | 'amount'; p_tax_amount?: number; p_total?: number; p_cashier_id?: string | null }): ApiResult<RpcResult> { return rpc('create_order', p); },
  setOrderStatus(p: { p_order_id: string; p_status: string; p_notes?: string | null }): ApiResult<RpcResult> { return rpc('set_order_status', p); },
  updateOrder(p: { p_order_id: string; p_order_type?: OrderType; p_table_id?: string | null; p_customer_id?: string | null; p_guest_count?: number | null; p_notes?: string | null; p_items: { product_id: string; unit_name: string; quantity: number; unit_price: number; discount_amount: number; bonus_quantity: number; total: number; notes?: string | null }[]; p_subtotal?: number; p_discount_amount?: number; p_discount_type?: 'percent' | 'amount'; p_tax_amount?: number; p_total?: number; p_status?: 'open' | 'held' }): ApiResult<RpcResult> { return rpc('update_order', p); },
  setTableStatus(p: { p_table_id: string; p_status: string }): ApiResult<RpcResult> { return rpc('set_table_status', p); },
  detachOrder(p: { p_order_id: string }): ApiResult<RpcResult> { return rpc('detach_order', p); },
};
