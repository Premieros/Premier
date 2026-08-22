import { supabase } from '@/lib/supabase';
import type { ApiError, ApiResult } from '../types';
import type { RpcResult, SubscriptionStatus, SubscriptionPlan } from '@/lib/types';
import { rpc } from '../rpc';

export const subscriptions = {
  registerTenant(p: { p_store_name: string; p_owner_name: string; p_email: string; p_password: string; p_store_name_en?: string | null; p_phone?: string | null; p_address?: string | null; p_currency?: string | null }): ApiResult<RpcResult & { organization_id?: string; branch_id?: string; warehouse_id?: string; user_id?: string; membership_role?: string; trial_days?: number }> { return rpc('register_tenant', p); },
  status(p: { p_branch_id: string }): ApiResult<SubscriptionStatus> { return rpc('subscription_status', p); },
  activate(p: { p_branch_id: string; p_plan_id: string; p_billing_period?: 'monthly' | 'yearly'; p_activate?: boolean }): ApiResult<RpcResult & { price_egp?: number }> { return rpc('activate_subscription', p); },
  async listPlans(): ApiResult<SubscriptionPlan[]> { const res = await supabase.from('subscription_plans').select('*').order('monthly_price_egp', { ascending: true }); return { data: (res.data as SubscriptionPlan[] | null) ?? null, error: res.error as ApiError | null }; },
  updateBranchControls(p: { p_branch_id: string; p_plan_id: string; p_status: string; p_feature_overrides: Record<string, boolean> }) { return rpc('subscription_branch_controls_update', p); },
  updatePlan(p: { p_plan_id: string; p_monthly_price_egp: number; p_yearly_price_egp: number; p_features: Record<string, boolean>; p_is_active?: boolean }) { return rpc('subscription_plan_update', p); },
};
