-- Effective subscription module access.
-- Additive migration: branch overrides are nullable and plan feature maps are normalized
-- without changing existing subscription rows or billing state.

ALTER TABLE public.branch_subscriptions
  ADD COLUMN IF NOT EXISTS feature_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Convert the existing descriptive feature arrays to an explicit module map only
-- when a plan has not already been configured as a map. Existing plan names/prices
-- remain unchanged; Super Admin can subsequently refine the map.
UPDATE public.subscription_plans
SET features = CASE id
  WHEN 'enterprise' THEN jsonb_build_object(
    'pos',true,'inventory',true,'warehouses',true,'raw_materials',true,
    'products',true,'categories',true,'components',true,'recipes',true,
    'production',true,'purchases',true,'customers',true,'suppliers',true,
    'expenses',true,'sales',true,'shifts',true,'reports',true,
    'accounting',true,'accounts',true,'users',true,'audit',true,
    'settings',true,'branches',true,'floor_plan',true,'kitchen',true)
  WHEN 'standard' THEN jsonb_build_object(
    'pos',true,'inventory',true,'warehouses',true,'raw_materials',true,
    'products',true,'categories',true,'components',true,'recipes',true,
    'production',true,'purchases',true,'customers',true,'suppliers',true,
    'expenses',true,'sales',true,'shifts',true,'reports',true,
    'accounting',true,'accounts',true,'users',true,'audit',true,
    'settings',true,'branches',false,'floor_plan',true,'kitchen',true)
  WHEN 'basic' THEN jsonb_build_object(
    'pos',true,'inventory',true,'warehouses',true,'raw_materials',true,
    'products',true,'categories',true,'components',true,'recipes',true,
    'production',false,'purchases',false,'customers',true,'suppliers',false,
    'expenses',false,'sales',true,'shifts',true,'reports',false,
    'accounting',false,'accounts',false,'users',true,'audit',false,
    'settings',true,'branches',false,'floor_plan',true,'kitchen',true)
  ELSE COALESCE(features, '{}'::jsonb)
END
WHERE jsonb_typeof(features) <> 'object';

CREATE OR REPLACE FUNCTION public.subscription_status(p_branch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.branch_subscriptions%ROWTYPE;
  p public.subscription_plans%ROWTYPE;
  s text;
  e boolean;
  v_features jsonb;
  v_overrides jsonb;
BEGIN
  SELECT * INTO r FROM public.branch_subscriptions WHERE branch_id = p_branch_id;
  IF r.branch_id IS NULL THEN
    RETURN jsonb_build_object(
      'branch_id', p_branch_id,
      'status', 'none',
      'plan_id', NULL,
      'expired', true,
      'trial_ends_at', NULL,
      'current_period_ends_at', NULL,
      'cancelled_at', NULL,
      'features', '{}'::jsonb,
      'feature_overrides', '{}'::jsonb
    );
  END IF;

  SELECT * INTO p FROM public.subscription_plans WHERE id = r.plan_id;
  s := r.status;
  e := false;

  IF s = 'trial' AND r.trial_ends_at IS NOT NULL AND r.trial_ends_at <= now() THEN
    s := 'expired'; e := true;
  ELSIF s IN ('active','past_due') AND r.current_period_ends_at IS NOT NULL AND r.current_period_ends_at <= now() THEN
    s := 'expired'; e := true;
  ELSIF s IN ('cancelled','expired') THEN
    e := true;
  END IF;

  v_features := CASE
    WHEN jsonb_typeof(COALESCE(p.features, '{}'::jsonb)) = 'object' THEN COALESCE(p.features, '{}'::jsonb)
    ELSE '{}'::jsonb
  END;
  v_overrides := COALESCE(r.feature_overrides, '{}'::jsonb);

  RETURN jsonb_build_object(
    'branch_id', p_branch_id,
    'status', s,
    'plan_id', r.plan_id,
    'expired', e,
    'trial_ends_at', r.trial_ends_at,
    'current_period_ends_at', r.current_period_ends_at,
    'cancelled_at', r.cancelled_at,
    'features', v_features,
    'feature_overrides', v_overrides
  );
END;
$$;

REVOKE ALL ON FUNCTION public.subscription_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscription_status(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_subscription_feature(
  p_branch_id uuid,
  p_feature text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_super_admin() THEN true
    ELSE (
      NOT COALESCE((public.subscription_status(p_branch_id)->>'expired')::boolean, true)
      AND COALESCE((public.subscription_status(p_branch_id)->'feature_overrides'->p_feature)::boolean, true)
      AND COALESCE((public.subscription_status(p_branch_id)->'features'->p_feature)::boolean, true)
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.has_subscription_feature(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_subscription_feature(uuid,text) TO authenticated, service_role;
