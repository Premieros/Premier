-- Super Admin-only subscription plan pricing/feature controls.
create or replace function public.subscription_plan_update(
  p_plan_id text,
  p_monthly_price_egp numeric,
  p_yearly_price_egp numeric,
  p_features jsonb,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.subscription_plans;
begin
  if not is_super_admin() then
    return jsonb_build_object('success', false, 'error', 'super_admin_required');
  end if;
  if p_monthly_price_egp < 0 or p_yearly_price_egp < 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_price');
  end if;
  if not exists (select 1 from public.subscription_plans where id = p_plan_id) then
    return jsonb_build_object('success', false, 'error', 'plan_not_found');
  end if;
  update public.subscription_plans
  set monthly_price_egp = p_monthly_price_egp,
      yearly_price_egp = p_yearly_price_egp,
      features = coalesce(p_features, '{}'::jsonb),
      is_active = coalesce(p_is_active, true)
  where id = p_plan_id
  returning * into v_row;
  return jsonb_build_object(
    'success', true,
    'id', v_row.id,
    'monthly_price_egp', v_row.monthly_price_egp,
    'yearly_price_egp', v_row.yearly_price_egp,
    'features', v_row.features,
    'is_active', v_row.is_active
  );
end;
$$;

revoke all on function public.subscription_plan_update(text,numeric,numeric,jsonb,boolean) from public;
grant execute on function public.subscription_plan_update(text,numeric,numeric,jsonb,boolean) to authenticated;
