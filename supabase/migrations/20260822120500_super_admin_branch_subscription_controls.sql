create or replace function public.subscription_branch_controls_update(
  p_branch_id uuid,
  p_plan_id text,
  p_status text,
  p_feature_overrides jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_row public.branch_subscriptions;
begin
  if not is_super_admin() then return jsonb_build_object('success', false, 'error', 'super_admin_required'); end if;
  if p_status not in ('active','trialing','past_due','cancelled','expired') then return jsonb_build_object('success', false, 'error', 'invalid_status'); end if;
  if not exists (select 1 from public.branches where id = p_branch_id) then return jsonb_build_object('success', false, 'error', 'branch_not_found'); end if;
  if not exists (select 1 from public.subscription_plans where id = p_plan_id) then return jsonb_build_object('success', false, 'error', 'plan_not_found'); end if;
  insert into public.branch_subscriptions(branch_id, plan_id, status, feature_overrides, updated_at, created_at)
  values (p_branch_id, p_plan_id, p_status, coalesce(p_feature_overrides,'{}'::jsonb), now(), now())
  on conflict (branch_id) do update set plan_id=excluded.plan_id, status=excluded.status, feature_overrides=excluded.feature_overrides, updated_at=now()
  returning * into v_row;
  return jsonb_build_object('success', true, 'branch_id', v_row.branch_id, 'plan_id', v_row.plan_id, 'status', v_row.status, 'feature_overrides', v_row.feature_overrides);
end;
$$;
revoke all on function public.subscription_branch_controls_update(uuid,text,text,jsonb) from public;
grant execute on function public.subscription_branch_controls_update(uuid,text,text,jsonb) to authenticated;
