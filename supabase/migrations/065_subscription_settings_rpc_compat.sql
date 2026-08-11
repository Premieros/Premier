BEGIN;

CREATE OR REPLACE FUNCTION public.subscription_settings_get()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED'; END IF;
  RETURN (SELECT jsonb_build_object(
    'id', true,
    'instapay_id', s.instapay_id,
    'beneficiary_name', s.beneficiary_name,
    'qr_code_url', s.qr_code_url,
    'instructions_ar', s.instructions_ar,
    'instructions_en', s.instructions_en,
    'trial_days', s.trial_days,
    'warning_days', s.warning_days,
    'grace_days', s.grace_period_days,
    'require_receipt', s.require_receipt,
    'allow_monthly', s.monthly_enabled,
    'allow_yearly', s.annual_enabled
  ) FROM public.subscription_settings s WHERE s.id = 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.subscription_settings_update(
  p_instapay_id text,
  p_beneficiary_name text,
  p_qr_code_url text,
  p_instructions_ar text,
  p_instructions_en text,
  p_trial_days integer,
  p_warning_days integer,
  p_grace_days integer,
  p_require_receipt boolean,
  p_allow_monthly boolean,
  p_allow_yearly boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED'; END IF;
  UPDATE public.subscription_settings
  SET instapay_id = COALESCE(p_instapay_id, instapay_id),
      beneficiary_name = COALESCE(p_beneficiary_name, beneficiary_name),
      qr_code_url = COALESCE(p_qr_code_url, qr_code_url),
      instructions_ar = COALESCE(p_instructions_ar, instructions_ar),
      instructions_en = COALESCE(p_instructions_en, instructions_en),
      trial_days = COALESCE(p_trial_days, trial_days),
      warning_days = COALESCE(p_warning_days, warning_days),
      grace_period_days = COALESCE(p_grace_days, grace_period_days),
      require_receipt = COALESCE(p_require_receipt, require_receipt),
      monthly_enabled = COALESCE(p_allow_monthly, monthly_enabled),
      annual_enabled = COALESCE(p_allow_yearly, annual_enabled),
      updated_at = now()
  WHERE id = 1;
  SELECT public.subscription_settings_get() INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.subscription_settings_update(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.subscription_settings_update(text,text,text,text,text,integer,integer,integer,boolean,boolean,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscription_settings_update(text,text,text,text,text,integer,integer,integer,boolean,boolean,boolean) TO authenticated;

COMMIT;
