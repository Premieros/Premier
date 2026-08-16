import type { ApiResult } from '../types';
import type { RpcResult } from '@/lib/types';
import { rpc } from '../rpc';

export const manufacturing = {
  createOrder(p: { p_product_id: string; p_branch_id: string; p_warehouse_id: string | null; p_quantity: number; p_batch_number: string | null; p_planned_at: string | null; p_notes: string | null }): ApiResult<RpcResult> { return rpc('create_production_order', p); },
  startOrder(p: { p_order_id: string }): ApiResult<RpcResult> { return rpc('start_production_order', p); },
  completeOrder(p: { p_order_id: string; p_waste: { raw_material_id: string; quantity: number; reason: string | null }[] | null }): ApiResult<RpcResult> { return rpc('complete_production_order', p); },
  cancelOrder(p: { p_order_id: string; p_reason: string | null }): ApiResult<RpcResult> { return rpc('cancel_production_order', p); },
};
