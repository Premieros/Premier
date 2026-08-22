import type { User } from '@supabase/supabase-js';

export const SUBSCRIPTION_FEATURE_KEYS = [
  'pos','inventory','warehouses','raw_materials','products','categories','components','recipes',
  'production','purchases','customers','suppliers','expenses','sales','shifts','reports',
  'accounting','accounts','users','audit','settings','branches','floor_plan','kitchen',
] as const;
export type SubscriptionFeatureKey = typeof SUBSCRIPTION_FEATURE_KEYS[number];

type SubscriptionState = {
  expired?: boolean;
  features?: Record<string, boolean>;
  feature_overrides?: Record<string, boolean>;
};

export function canAccessSubscriptionFeature(
  user: Pick<User, 'id'> & { role?: string | null; branch_id?: string | null },
  subscription: SubscriptionState | null | undefined,
  feature: SubscriptionFeatureKey,
): boolean {
  if (user.role === 'super_admin') return true;
  if (!user.branch_id) return true;
  if (!subscription || subscription.expired) return false;
  if (subscription.feature_overrides?.[feature] === false) return false;
  if (subscription.features?.[feature] === false) return false;
  return true;
}
