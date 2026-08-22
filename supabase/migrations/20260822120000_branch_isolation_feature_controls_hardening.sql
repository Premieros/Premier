-- Branch isolation + subscription feature controls hardening.
-- No authenticated branch user may use NULL-branch rows as a cross-branch escape hatch.
-- Raw-material data is authenticated application data, never public/anon data.
-- Per-branch feature overrides are stored separately from the plan definition.

alter table public.branch_subscriptions
  add column if not exists feature_overrides jsonb not null default '{}'::jsonb;

drop policy if exists auth_select_warehouses on public.warehouses;
drop policy if exists auth_insert_warehouses on public.warehouses;
drop policy if exists auth_update_warehouses on public.warehouses;
drop policy if exists auth_delete_warehouses on public.warehouses;
drop policy if exists warehouses_select on public.warehouses;
drop policy if exists warehouses_write on public.warehouses;

create policy warehouses_select_branch_isolated on public.warehouses
  for select to authenticated using (is_pos_admin() or branch_id = get_branch_id());
create policy warehouses_insert_branch_isolated on public.warehouses
  for insert to authenticated with check (is_pos_admin() or branch_id = get_branch_id());
create policy warehouses_update_branch_isolated on public.warehouses
  for update to authenticated using (is_pos_admin() or branch_id = get_branch_id())
  with check (is_pos_admin() or branch_id = get_branch_id());
create policy warehouses_delete_branch_isolated on public.warehouses
  for delete to authenticated using (is_pos_admin() or branch_id = get_branch_id());

drop policy if exists auth_select_inventory on public.inventory;
drop policy if exists auth_insert_inventory on public.inventory;
drop policy if exists auth_update_inventory on public.inventory;
drop policy if exists auth_delete_inventory on public.inventory;
drop policy if exists inventory_select on public.inventory;
drop policy if exists inventory_write on public.inventory;

create policy inventory_select_branch_isolated on public.inventory
  for select to authenticated using (is_pos_admin() or exists (select 1 from public.warehouses w where w.id = inventory.warehouse_id and w.branch_id = get_branch_id()));
create policy inventory_insert_branch_isolated on public.inventory
  for insert to authenticated with check (is_pos_admin() or exists (select 1 from public.warehouses w where w.id = inventory.warehouse_id and w.branch_id = get_branch_id()));
create policy inventory_update_branch_isolated on public.inventory
  for update to authenticated using (is_pos_admin() or exists (select 1 from public.warehouses w where w.id = inventory.warehouse_id and w.branch_id = get_branch_id()))
  with check (is_pos_admin() or exists (select 1 from public.warehouses w where w.id = inventory.warehouse_id and w.branch_id = get_branch_id()));
create policy inventory_delete_branch_isolated on public.inventory
  for delete to authenticated using (is_pos_admin() or exists (select 1 from public.warehouses w where w.id = inventory.warehouse_id and w.branch_id = get_branch_id()));

drop policy if exists raw_materials_select_branch_isolated on public.raw_materials;
drop policy if exists raw_materials_insert_branch_isolated on public.raw_materials;
drop policy if exists raw_materials_update_branch_isolated on public.raw_materials;
drop policy if exists raw_materials_delete_branch_isolated on public.raw_materials;
create policy raw_materials_select_branch_isolated on public.raw_materials
  for select to authenticated using (is_pos_admin() or branch_id = get_branch_id());
create policy raw_materials_insert_branch_isolated on public.raw_materials
  for insert to authenticated with check (is_pos_admin() or branch_id = get_branch_id());
create policy raw_materials_update_branch_isolated on public.raw_materials
  for update to authenticated using (is_pos_admin() or branch_id = get_branch_id())
  with check (is_pos_admin() or branch_id = get_branch_id());
create policy raw_materials_delete_branch_isolated on public.raw_materials
  for delete to authenticated using (is_pos_admin() or branch_id = get_branch_id());

create or replace function public.branch_feature_enabled(p_branch_id uuid, p_feature text)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((bs.feature_overrides ->> p_feature)::boolean, (sp.features ->> p_feature)::boolean, false)
  from public.branch_subscriptions bs
  join public.subscription_plans sp on sp.id = bs.plan_id
  where bs.branch_id = p_branch_id and bs.status in ('active','trialing')
  limit 1;
$$;

create or replace function public.current_branch_feature_enabled(p_feature text)
returns boolean language sql stable security definer set search_path = public
as $$ select is_super_admin() or public.branch_feature_enabled(get_branch_id(), p_feature); $$;

revoke all on function public.branch_feature_enabled(uuid,text) from public;
revoke all on function public.current_branch_feature_enabled(text) from public;
grant execute on function public.branch_feature_enabled(uuid,text) to authenticated;
grant execute on function public.current_branch_feature_enabled(text) to authenticated;
