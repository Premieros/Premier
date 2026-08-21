-- Branch-scoped warehouse/inventory writes must require the corresponding manage permission.
-- Super admins/owners retain administrative access through is_pos_admin().

drop policy if exists warehouses_insert_branch_isolated on public.warehouses;
drop policy if exists warehouses_update_branch_isolated on public.warehouses;
drop policy if exists warehouses_delete_branch_isolated on public.warehouses;

create policy warehouses_insert_branch_isolated on public.warehouses
  for insert to authenticated
  with check (is_pos_admin() or (branch_id = get_branch_id() and can_permission('warehouses.manage')));
create policy warehouses_update_branch_isolated on public.warehouses
  for update to authenticated
  using (is_pos_admin() or (branch_id = get_branch_id() and can_permission('warehouses.manage')))
  with check (is_pos_admin() or (branch_id = get_branch_id() and can_permission('warehouses.manage')));
create policy warehouses_delete_branch_isolated on public.warehouses
  for delete to authenticated
  using (is_pos_admin() or (branch_id = get_branch_id() and can_permission('warehouses.manage')));

drop policy if exists inventory_insert_branch_isolated on public.inventory;
drop policy if exists inventory_update_branch_isolated on public.inventory;
drop policy if exists inventory_delete_branch_isolated on public.inventory;

create policy inventory_insert_branch_isolated on public.inventory
  for insert to authenticated
  with check (is_pos_admin() or (
    branch_id = get_branch_id()
    and can_permission('inventory.manage')
    and exists (
      select 1 from public.warehouses w
      where w.id = inventory.warehouse_id and w.branch_id = get_branch_id()
    )
  ));
create policy inventory_update_branch_isolated on public.inventory
  for update to authenticated
  using (is_pos_admin() or (
    branch_id = get_branch_id()
    and can_permission('inventory.manage')
    and exists (
      select 1 from public.warehouses w
      where w.id = inventory.warehouse_id and w.branch_id = get_branch_id()
    )
  ))
  with check (is_pos_admin() or (
    branch_id = get_branch_id()
    and can_permission('inventory.manage')
    and exists (
      select 1 from public.warehouses w
      where w.id = inventory.warehouse_id and w.branch_id = get_branch_id()
    )
  ));
create policy inventory_delete_branch_isolated on public.inventory
  for delete to authenticated
  using (is_pos_admin() or (
    branch_id = get_branch_id()
    and can_permission('inventory.manage')
    and exists (
      select 1 from public.warehouses w
      where w.id = inventory.warehouse_id and w.branch_id = get_branch_id()
    )
  ));
