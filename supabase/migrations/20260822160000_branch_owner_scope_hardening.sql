-- Tenant hardening: an Owner is scoped to their organization; only
-- platform Super Admin can see all organizations.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.is_active = true
      AND u.role = 'super_admin'
  );
$$;

DROP POLICY IF EXISTS auth_select_branches ON public.branches;
CREATE POLICY auth_select_branches ON public.branches
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
    OR (organization_id IS NULL AND id = public.get_branch_id())
  );

DROP POLICY IF EXISTS auth_update_branches ON public.branches;
CREATE POLICY auth_update_branches ON public.branches
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
    OR (organization_id IS NULL AND id = public.get_branch_id())
  )
  WITH CHECK (
    public.is_platform_admin()
    OR organization_id IN (SELECT public.user_organization_ids())
    OR (organization_id IS NULL AND id = public.get_branch_id())
  );

-- Direct writes cannot move a branch between tenants.
CREATE OR REPLACE FUNCTION public.guard_branch_org_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'ORG_CHANGE_FORBIDDEN: organization_id is immutable after creation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_branch_org ON public.branches;
CREATE TRIGGER trg_guard_branch_org
BEFORE UPDATE ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.guard_branch_org_immutable();
