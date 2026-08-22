-- Canonical branches RLS: remove every known legacy policy and create one
-- authoritative SELECT/UPDATE policy. This prevents permissive policies from
-- accidentally widening tenant visibility.

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'branches'
      AND cmd IN ('SELECT','UPDATE','ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.branches', p.policyname);
  END LOOP;
END $$;

CREATE POLICY branches_select_canonical ON public.branches
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR id = public.get_branch_id()
    OR organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
        AND om.membership_role IN ('owner', 'admin')
    )
  );

CREATE POLICY branches_update_canonical ON public.branches
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR id = public.get_branch_id()
    OR organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
        AND om.membership_role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR id = public.get_branch_id()
    OR organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.is_active = true
        AND om.membership_role IN ('owner', 'admin')
    )
  );

-- Organization ownership cannot be changed through branch updates.
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
