BEGIN;

CREATE TABLE IF NOT EXISTS public.subscription_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  instapay_id text NOT NULL DEFAULT '',
  beneficiary_name text NOT NULL DEFAULT '',
  qr_code_url text NOT NULL DEFAULT '',
  instructions_ar text NOT NULL DEFAULT '',
  instructions_en text NOT NULL DEFAULT '',
  trial_days integer NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  warning_days integer NOT NULL DEFAULT 7 CHECK (warning_days >= 0),
  grace_period_days integer NOT NULL DEFAULT 0 CHECK (grace_period_days >= 0),
  require_receipt boolean NOT NULL DEFAULT true,
  monthly_enabled boolean NOT NULL DEFAULT true,
  annual_enabled boolean NOT NULL DEFAULT true,
  max_receipt_size_mb integer NOT NULL DEFAULT 10 CHECK (max_receipt_size_mb > 0),
  allowed_receipt_types text[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','application/pdf'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.subscription_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscription_settings_super_admin_select ON public.subscription_settings;
DROP POLICY IF EXISTS subscription_settings_super_admin_update ON public.subscription_settings;
DROP POLICY IF EXISTS subscription_settings_super_admin_insert ON public.subscription_settings;
CREATE POLICY subscription_settings_super_admin_select ON public.subscription_settings FOR SELECT USING (public.is_super_admin());
CREATE POLICY subscription_settings_super_admin_update ON public.subscription_settings FOR UPDATE USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY subscription_settings_super_admin_insert ON public.subscription_settings FOR INSERT WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.subscription_settings_get()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED'; END IF;
  RETURN (SELECT to_jsonb(s) - 'created_at' - 'updated_at' FROM public.subscription_settings s WHERE s.id = 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.subscription_settings_update(p_settings jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED'; END IF;
  UPDATE public.subscription_settings
  SET instapay_id = COALESCE(p_settings->>'instapay_id', instapay_id),
      beneficiary_name = COALESCE(p_settings->>'beneficiary_name', beneficiary_name),
      qr_code_url = COALESCE(p_settings->>'qr_code_url', qr_code_url),
      instructions_ar = COALESCE(p_settings->>'instructions_ar', instructions_ar),
      instructions_en = COALESCE(p_settings->>'instructions_en', instructions_en),
      trial_days = COALESCE((p_settings->>'trial_days')::integer, trial_days),
      warning_days = COALESCE((p_settings->>'warning_days')::integer, warning_days),
      grace_period_days = COALESCE((p_settings->>'grace_period_days')::integer, grace_period_days),
      require_receipt = COALESCE((p_settings->>'require_receipt')::boolean, require_receipt),
      monthly_enabled = COALESCE((p_settings->>'monthly_enabled')::boolean, monthly_enabled),
      annual_enabled = COALESCE((p_settings->>'annual_enabled')::boolean, annual_enabled),
      max_receipt_size_mb = COALESCE((p_settings->>'max_receipt_size_mb')::integer, max_receipt_size_mb),
      allowed_receipt_types = COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_settings->'allowed_receipt_types')), allowed_receipt_types),
      updated_at = now()
  WHERE id = 1;
  SELECT to_jsonb(s) - 'created_at' - 'updated_at' INTO result FROM public.subscription_settings s WHERE s.id = 1;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.subscription_settings_get() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.subscription_settings_update(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscription_settings_get() TO authenticated;
GRANT EXECUTE ON FUNCTION public.subscription_settings_update(jsonb) TO authenticated;

COMMIT;
