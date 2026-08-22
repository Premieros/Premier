-- Restore branch isolation after tenant_data_isolation replaced the
-- raw_materials SELECT policy with USING (true).
-- Raw materials are branch-owned data and must follow the same canonical
-- organization/branch access helper as the rest of the ERP.

DROP POLICY IF EXISTS auth_select_raw_materials ON public.raw_materials;
DROP POLICY IF EXISTS raw_materials_select ON public.raw_materials;
DROP POLICY IF EXISTS raw_materials_select_branch_isolated ON public.raw_materials;

CREATE POLICY auth_select_raw_materials ON public.raw_materials
  FOR SELECT TO authenticated
  USING (public.user_may_access_branch(branch_id));

DROP POLICY IF EXISTS auth_insert_raw_materials ON public.raw_materials;
CREATE POLICY auth_insert_raw_materials ON public.raw_materials
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR (public.can_permission('raw_materials.manage') AND public.user_may_access_branch(branch_id))
  );

DROP POLICY IF EXISTS auth_update_raw_materials ON public.raw_materials;
CREATE POLICY auth_update_raw_materials ON public.raw_materials
  FOR UPDATE TO authenticated
  USING (public.user_may_access_branch(branch_id))
  WITH CHECK (
    public.is_platform_admin()
    OR (public.can_permission('raw_materials.manage') AND public.user_may_access_branch(branch_id))
  );

DROP POLICY IF EXISTS auth_delete_raw_materials ON public.raw_materials;
CREATE POLICY auth_delete_raw_materials ON public.raw_materials
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin()
    OR (public.can_permission('raw_materials.manage') AND public.user_may_access_branch(branch_id))
  );
