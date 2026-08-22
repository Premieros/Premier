-- Normalize legacy descriptive feature arrays into canonical module flags.
-- Existing plan capabilities are preserved while making per-module gates machine-readable.
update public.subscription_plans
set features = case id
  when 'basic' then jsonb_build_object(
    'dashboard', true,
    'pos', true,
    'inventory', true,
    'raw_materials', true,
    'products', true,
    'reports', false,
    'accounting', false,
    'purchases', false,
    'production', false,
    'kitchen', true,
    'customers', false,
    'suppliers', false,
    'branches', false,
    'users', true
  )
  when 'standard' then jsonb_build_object(
    'dashboard', true,
    'pos', true,
    'inventory', true,
    'raw_materials', true,
    'products', true,
    'reports', true,
    'accounting', true,
    'purchases', true,
    'production', true,
    'kitchen', true,
    'customers', true,
    'suppliers', true,
    'branches', false,
    'users', true
  )
  when 'enterprise' then jsonb_build_object(
    'dashboard', true,
    'pos', true,
    'inventory', true,
    'raw_materials', true,
    'products', true,
    'reports', true,
    'accounting', true,
    'purchases', true,
    'production', true,
    'kitchen', true,
    'customers', true,
    'suppliers', true,
    'branches', true,
    'users', true
  )
  else coalesce(features, '{}'::jsonb)
end
where id in ('basic','standard','enterprise');

create or replace function public.branch_feature_enabled(p_branch_id uuid, p_feature text)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((bs.feature_overrides ->> p_feature)::boolean, (sp.features ->> p_feature)::boolean, false)
  from public.branch_subscriptions bs
  join public.subscription_plans sp on sp.id = bs.plan_id
  where bs.branch_id = p_branch_id and bs.status in ('active','trial','trialing')
  limit 1;
$$;
