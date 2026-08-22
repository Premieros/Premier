-- Finalize branch visibility semantics.
-- Branch staff are authoritative from users.branch_id; org owners/admins use membership.
DROP POLICY IF EXISTS auth_select_branches ON public.branches;
CREATE POLICY auth_select_branches ON public.branches
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR id = public.get_branch_id()
    OR organization_id IN (SELECT public.user_organization_ids())
  );

DROP POLICY IF EXISTS auth_update_branches ON public.branches;
CREATE POLICY auth_update_branches ON public.branches
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR id = public.get_branch_id()
    OR organization_id IN (SELECT public.user_organization_ids())
  )
  WITH CHECK (
    public.is_platform_admin()
    OR id = public.get_branch_id()
    OR organization_id IN (SELECT public.user_organization_ids())
  );

-- Raw materials are operational master data and remain branch-scoped.
-- Their inventory/batches/recipes are already branch-scoped; do not make the
-- raw_materials catalog global merely to satisfy a legacy generic-master test.
