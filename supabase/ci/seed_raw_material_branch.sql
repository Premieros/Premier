-- CI-only helper. Never apply this file to real Supabase.
-- Integration fixtures seed as the postgres role and historically omitted branch_id.
-- Production/application writes remain protected by the NOT NULL + RLS rules in 060.

CREATE OR REPLACE FUNCTION public.ci_default_raw_material_branch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch uuid;
BEGIN
  IF current_user = 'postgres' AND NEW.branch_id IS NULL THEN
    SELECT id INTO v_branch
    FROM public.branches
    ORDER BY created_at, id
    LIMIT 1;

    IF v_branch IS NULL THEN
      RAISE EXCEPTION 'CI_NO_BRANCH_AVAILABLE';
    END IF;

    NEW.branch_id := v_branch;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ci_default_raw_material_branch ON public.raw_materials;
CREATE TRIGGER trg_ci_default_raw_material_branch
BEFORE INSERT ON public.raw_materials
FOR EACH ROW
EXECUTE FUNCTION public.ci_default_raw_material_branch();
