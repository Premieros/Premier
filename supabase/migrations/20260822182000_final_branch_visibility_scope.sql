-- Final branch visibility contract.
-- Later migrations must not broaden access via user_organization_ids(),
-- because that helper can include ordinary memberships. Organization-wide
-- branch visibility is reserved for active owner/admin memberships.

DROP POLICY IF EXISTS auth_select_branches ON public.branches;
CREATE POLICY auth_select_branches ON public.branches
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR id = public.get_branch_id()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = public.branches.organization_id
        AND om.user_id = auth.uid()
        AND om.membership_role IN ('owner', 'admin')
        AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS auth_update_branches ON public.branches;
CREATE POLICY auth_update_branches ON public.branches
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR id = public.get_branch_id()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = public.branches.organization_id
        AND om.user_id = auth.uid()
        AND om.membership_role IN ('owner', 'admin')
        AND om.is_active = true
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR id = public.get_branch_id()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = public.branches.organization_id
        AND om.user_id = auth.uid()
        AND om.membership_role IN ('owner', 'admin')
        AND om.is_active = true
    )
  );
