-- Owners/admins may manage all branches only inside organizations where they
-- hold an owner/admin membership. A plain member row must never grant tenant-wide
-- visibility (important for users who belong to another org as a branch member).

DROP POLICY IF EXISTS auth_select_branches ON public.branches;
CREATE POLICY auth_select_branches ON public.branches
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.membership_role IN ('owner', 'admin')
        AND om.is_active = true
    )
    OR (
      organization_id IS NULL
      AND id = public.get_branch_id()
    )
  );

DROP POLICY IF EXISTS auth_update_branches ON public.branches;
CREATE POLICY auth_update_branches ON public.branches
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.membership_role IN ('owner', 'admin')
        AND om.is_active = true
    )
    OR (
      organization_id IS NULL
      AND id = public.get_branch_id()
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.membership_role IN ('owner', 'admin')
        AND om.is_active = true
    )
    OR (
      organization_id IS NULL
      AND id = public.get_branch_id()
    )
  );
