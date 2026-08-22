-- Branch scope precedence hardening.
-- An Owner/Admin is scoped by organization membership. Their users.branch_id
-- must not widen visibility into another organization. Direct branch_id access
-- remains for branch-scoped staff/manager accounts.

DROP POLICY IF EXISTS branches_select_canonical ON public.branches;
DROP POLICY IF EXISTS branches_update_canonical ON public.branches;

CREATE POLICY branches_select_canonical ON public.branches
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.is_active = true
          AND om.membership_role IN ('owner', 'admin')
      )
    )
    OR (
      id = public.get_branch_id()
      AND NOT EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.is_active = true
          AND om.membership_role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY branches_update_canonical ON public.branches
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.is_active = true
          AND om.membership_role IN ('owner', 'admin')
      )
    )
    OR (
      id = public.get_branch_id()
      AND NOT EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.is_active = true
          AND om.membership_role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (
      organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.is_active = true
          AND om.membership_role IN ('owner', 'admin')
      )
    )
    OR (
      id = public.get_branch_id()
      AND NOT EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.is_active = true
          AND om.membership_role IN ('owner', 'admin')
      )
    )
  );
