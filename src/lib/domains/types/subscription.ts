export type SubscriptionStatusValue =
  | 'none'
  | 'trial'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired';

export type SubscriptionFeatureMap = Record<string, boolean>;

export interface SubscriptionStatus {
  branch_id: string;
  status: SubscriptionStatusValue;
  plan_id: string | null;
  expired: boolean;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  cancelled_at: string | null;
  feature_overrides?: SubscriptionFeatureMap;
  features?: SubscriptionFeatureMap;
}

export interface SubscriptionPlan {
  id: string;
  name_ar: string;
  name_en: string;
  monthly_price_egp: number;
  yearly_price_egp: number;
  features: SubscriptionFeatureMap;
  is_active: boolean;
  created_at: string;
}
