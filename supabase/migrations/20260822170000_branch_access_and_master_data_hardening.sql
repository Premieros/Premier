-- Branch access hardening: direct branch assignment is authoritative for branch staff.
-- Owners/admins may access all branches only in organizations where they hold
-- an active owner/admin membership. Plain members never receive tenant-wide access.
CREATE OR REPLACE FUNCTION public.user_may_access_branch(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.is_active = true
        AND u.branch_id = p_branch_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.branches b ON b.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.membership_role IN ('owner', 'admin')
        AND om.is_active = true
        AND b.id = p_branch_id
    );
$$;

-- Raw materials remain branch-scoped; users can read their branch only.
DROP POLICY IF EXISTS auth_select_raw_materials ON public.raw_materials;
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

-- Measurement units are non-tenant master data: read-only for authenticated users.
DROP POLICY IF EXISTS auth_select_measurement_units ON public.measurement_units;
CREATE POLICY auth_select_measurement_units ON public.measurement_units
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS auth_insert_measurement_units ON public.measurement_units;
CREATE POLICY auth_insert_measurement_units ON public.measurement_units
  FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
DROP POLICY IF EXISTS auth_update_measurement_units ON public.measurement_units;
CREATE POLICY auth_update_measurement_units ON public.measurement_units
  FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
DROP POLICY IF EXISTS auth_delete_measurement_units ON public.measurement_units;
CREATE POLICY auth_delete_measurement_units ON public.measurement_units
  FOR DELETE TO authenticated USING (public.is_platform_admin());
