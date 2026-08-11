import { supabase } from '@/lib/supabase';
import type { RpcResult, Shift, TreasuryBalance, OrderType, SubscriptionStatus, SubscriptionPlan } from '@/lib/types';
import type { ApiError, ApiResult, SaleItemInput, PurchaseItemInput, JournalLineInput, RefundItemInput } from './types';

const rpc = async <R>(name: string, args: object): ApiResult<R> => {
  const res = await (supabase.rpc as unknown as (n: string, a: object) => Promise<{ data: unknown; error: ApiError | null }>)(name, args);
  return { data: (res.data as R | null) ?? null, error: res.error };
};

export const pos = {
  getActiveShift(p: { p_branch_id: string }): ApiResult<Shift> { return rpc('get_active_shift', p); },
  sendToKitchen(p: { p_order_id: string; p_sent_by?: string | null }): ApiResult<RpcResult & { order_id?: string; sent?: unknown[]; items_sent_count?: number; all_sent?: boolean }> { return rpc('send_to_kitchen', p); },
  processSale(p: { p_invoice_number: string; p_branch_id: string; p_shift_id: string | null; p_warehouse_id: string | null; p_customer_id: string | null; p_salesperson_id: string | null; p_subtotal: number; p_discount_amount: number; p_discount_type: 'percent' | 'amount'; p_tax_amount: number; p_bonus_amount: number; p_total: number; p_paid_amount: number; p_payment_method: string; p_status: string; p_items: SaleItemInput[]; p_order_type?: OrderType; p_table_id?: string | null; p_order_id?: string | null; p_guest_count?: number | null }): ApiResult<RpcResult> { return rpc('process_sale', p); },
};

export const floorPlan = {
  createOrder(p: { p_branch_id: string; p_order_type?: OrderType; p_table_id?: string | null; p_customer_id?: string | null; p_guest_count?: number | null; p_notes?: string | null; p_items: { product_id: string; unit_name: string; quantity: number; unit_price: number; discount_amount: number; bonus_quantity: number; total: number; notes?: string | null }[]; p_subtotal?: number; p_discount_amount?: number; p_discount_type?: 'percent' | 'amount'; p_tax_amount?: number; p_total?: number; p_cashier_id?: string | null }): ApiResult<RpcResult> { return rpc('create_order', p); },
  setOrderStatus(p: { p_order_id: string; p_status: string; p_notes?: string | null }): ApiResult<RpcResult> { return rpc('set_order_status', p); },
  updateOrder(p: { p_order_id: string; p_order_type?: OrderType; p_table_id?: string | null; p_customer_id?: string | null; p_guest_count?: number | null; p_notes?: string | null; p_items: { product_id: string; unit_name: string; quantity: number; unit_price: number; discount_amount: number; bonus_quantity: number; total: number; notes?: string | null }[]; p_subtotal?: number; p_discount_amount?: number; p_discount_type?: 'percent' | 'amount'; p_tax_amount?: number; p_total?: number; p_status?: 'open' | 'held' }): ApiResult<RpcResult> { return rpc('update_order', p); },
  setTableStatus(p: { p_table_id: string; p_status: string }): ApiResult<RpcResult> { return rpc('set_table_status', p); },
  detachOrder(p: { p_order_id: string }): ApiResult<RpcResult> { return rpc('detach_order', p); },
};

export const trade = {
  nextDocumentNumber(p: { p_type: string }): ApiResult<RpcResult> { return rpc('next_document_number', p); },
  processPurchase(p: { p_invoice_number: string; p_supplier_id: string; p_branch_id: string | null; p_warehouse_id: string | null; p_subtotal: number; p_discount_amount: number; p_tax_amount: number; p_total: number; p_paid_amount: number; p_payment_method: string; p_status: string; p_notes: string | null; p_items: PurchaseItemInput[] }): ApiResult<RpcResult> { return rpc('process_purchase', p); },
  processRefund(p: { p_sale_id: string; p_items: RefundItemInput[]; p_reason: string | null }): ApiResult<RpcResult> { return rpc('process_refund', p); },
};

export const shifts = {
  open(p: { p_branch_id: string; p_opening_amount: number; p_notes: string | null }): ApiResult<RpcResult> { return rpc('open_shift', p); },
  close(p: { p_shift_id: string; p_actual_amount: number; p_notes: string | null }): ApiResult<RpcResult> { return rpc('close_shift', p); },
};

export const inventory = {
  adjustStock(p: { p_inventory_id: string; p_new_quantity: number; p_reason: string | null }): ApiResult<RpcResult> { return rpc('adjust_stock', p); },
  adjustRawStock(p: { p_raw_material_id: string; p_branch_id: string; p_new_quantity: number; p_reason: string | null }): ApiResult<RpcResult> { return rpc('adjust_raw_stock', p); },
  createTransfer(p: { p_from_warehouse_id: string; p_to_warehouse_id: string; p_branch_id: string; p_items: { product_id: string; quantity: number; unit_cost: number }[]; p_reason: string | null; p_notes: string | null }): ApiResult<RpcResult> { return rpc('create_warehouse_transfer', p); },
  approveTransfer(p: { p_transfer_id: string }): ApiResult<RpcResult> { return rpc('approve_warehouse_transfer', p); },
  rejectTransfer(p: { p_transfer_id: string; p_reason: string | null }): ApiResult<RpcResult> { return rpc('reject_warehouse_transfer', p); },
};

export const subscriptions = {
  registerBranch(p: { p_store_name: string; p_owner_name: string; p_email: string; p_password: string; p_store_name_en?: string | null; p_phone?: string | null; p_address?: string | null; p_currency?: string | null }): ApiResult<RpcResult & { branch_id?: string; warehouse_id?: string; user_id?: string; trial_days?: number }> { return rpc('register_branch', p); },
  status(p: { p_branch_id: string }): ApiResult<SubscriptionStatus> { return rpc('subscription_status', p); },
  activate(p: { p_branch_id: string; p_plan_id: string; p_billing_period?: 'monthly' | 'yearly'; p_activate?: boolean }): ApiResult<RpcResult & { price_egp?: number }> { return rpc('activate_subscription', p); },
  submitInstaPay(p: { p_branch_id: string; p_plan_id: string; p_amount: number; p_billing_period: 'monthly' | 'yearly'; p_reference?: string | null; p_receipt_url?: string | null }): ApiResult<RpcResult & { status?: string }> { return rpc('submit_instapay_payment', p); },
  reviewInstaPay(p: { p_payment_id: string; p_approve: boolean; p_rejection_reason?: string | null }): ApiResult<RpcResult & { status?: string; branch_id?: string }> { return rpc('review_instapay_payment', p); },
  async listPlans(): ApiResult<SubscriptionPlan[]> {
    const res = await supabase.from('subscription_plans').select('*').order('monthly_price_egp', { ascending: true });
    return { data: (res.data as SubscriptionPlan[] | null) ?? null, error: res.error as ApiError | null };
  },
  async listPayments(): ApiResult<Array<{ id: string; branch_id: string; plan_id: string | null; amount: number; billing_period: 'monthly' | 'yearly'; reference: string | null; receipt_url: string | null; status: 'pending' | 'approved' | 'rejected'; submitted_at: string; rejection_reason: string | null }>> {
    const res = await supabase.from('subscription_payments').select('id,branch_id,plan_id,amount,billing_period,reference,receipt_url,status,submitted_at,rejection_reason').order('submitted_at', { ascending: false });
    return { data: (res.data as Array<{ id: string; branch_id: string; plan_id: string | null; amount: number; billing_period: 'monthly' | 'yearly'; reference: string | null; receipt_url: string | null; status: 'pending' | 'approved' | 'rejected'; submitted_at: string; rejection_reason: string | null }> | null) ?? null, error: res.error as ApiError | null };
  },
};

export const admin = {
  createUser(p: { p_email: string; p_password: string; p_full_name: string; p_role: string; p_branch_id: string | null; p_is_active: boolean; p_username: string }): ApiResult<RpcResult> { return rpc('create_user', p); },
  updateUserPassword(p: { p_user_id: string; p_new_password: string }): ApiResult<null> { return rpc('update_user_password', p); },
  deleteUser(p: { p_user_id: string }): ApiResult<null> { return rpc('delete_user', p); },
  getLoginEmail(p: { p_username: string }): ApiResult<{ success?: boolean; email?: string; error?: string }> { return rpc('get_login_email', p); },
  recordLoginFailure(p: { p_username: string }): ApiResult<{ success?: boolean }> { return rpc('record_login_failure', p); },
  recordLoginSuccess(p: { p_user_id: string }): ApiResult<{ success?: boolean; error?: string }> { return rpc('record_login_success', p); },
  seedDemoData(p: { p_branch_id: string }): ApiResult<RpcResult & { seeded?: number; existing?: boolean; products?: number; customers?: number; tables?: number }> { return rpc('seed_demo_data', p); },
  deleteDemoData(p: { p_branch_id: string }): ApiResult<RpcResult & { orders?: number; sales?: number; customers?: number; products?: number; tables?: number }> { return rpc('delete_demo_data', p); },
};
