-- Branch visibility hardening.
-- Platform admins retain global visibility. Organization owners/admins may
-- manage branches in their organization. Ordinary branch users (including
-- branch managers) see only their assigned branch.

DROP POLICY IF EXISTS auth_select_branches ON public.branches;
CREATE POLICY auth_select_branches ON public.branches
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      organization_id IN (SELECT public.user_organization_ids())
      AND EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = public.branches.organization_id
          AND om.user_id = auth.uid()
          AND om.membership_role IN ('owner', 'admin')
          AND om.is_active
      )
    )
    OR (organization_id IS NULL AND id = public.get_branch_id())
    OR (organization_id IS NOT NULL AND id = public.get_branch_id())
  );

DROP POLICY IF EXISTS auth_update_branches ON public.branches;
CREATE POLICY auth_update_branches ON public.branches
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      organization_id IN (SELECT public.user_organization_ids())
      AND EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = public.branches.organization_id
          AND om.user_id = auth.uid()
          AND om.membership_role IN ('owner', 'admin')
          AND om.is_active
      )
    )
    OR (organization_id IS NULL AND id = public.get_branch_id())
    OR (organization_id IS NOT NULL AND id = public.get_branch_id())
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (
      organization_id IN (SELECT public.user_organization_ids())
      AND EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = public.branches.organization_id
          AND om.user_id = auth.uid()
          AND om.membership_role IN ('owner', 'admin')
          AND om.is_active
      )
    )
    OR (organization_id IS NULL AND id = public.get_branch_id())
    OR (organization_id IS NOT NULL AND id = public.get_branch_id())
  );
