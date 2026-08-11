-- Branch isolation for raw materials and recipe items.
-- Super Admin is global; all other users are restricted to user_branch_id().

ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS branch_id uuid;

UPDATE public.raw_materials rm
SET branch_id = x.branch_id
FROM (
  SELECT ri.raw_material_id, (array_agg(r.branch_id ORDER BY r.branch_id))[1] AS branch_id
  FROM public.recipe_items ri
  JOIN public.recipes r ON r.id = ri.recipe_id
  WHERE r.branch_id IS NOT NULL
  GROUP BY ri.raw_material_id
  HAVING count(DISTINCT r.branch_id) = 1
) x
WHERE rm.id = x.raw_material_id AND rm.branch_id IS NULL;

-- Legacy unassigned materials must be assigned before this migration is deployed to a
-- production database with such rows. Current project data is expected to be seeded.
ALTER TABLE public.raw_materials ALTER COLUMN branch_id SET NOT NULL;

ALTER TABLE public.raw_materials DROP CONSTRAINT IF EXISTS raw_materials_branch_id_fkey;
ALTER TABLE public.raw_materials
  ADD CONSTRAINT raw_materials_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_raw_materials_branch_id ON public.raw_materials(branch_id);

ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS raw_materials_write ON public.raw_materials;
DROP POLICY IF EXISTS raw_materials_select_branch_isolated ON public.raw_materials;
DROP POLICY IF EXISTS raw_materials_insert_branch_isolated ON public.raw_materials;
DROP POLICY IF EXISTS raw_materials_update_branch_isolated ON public.raw_materials;
DROP POLICY IF EXISTS raw_materials_delete_branch_isolated ON public.raw_materials;

CREATE POLICY raw_materials_select_branch_isolated ON public.raw_materials
  FOR SELECT USING (public.is_super_admin() OR branch_id = public.user_branch_id());

CREATE POLICY raw_materials_insert_branch_isolated ON public.raw_materials
  FOR INSERT WITH CHECK (public.is_super_admin() OR branch_id = public.user_branch_id());

CREATE POLICY raw_materials_update_branch_isolated ON public.raw_materials
  FOR UPDATE USING (public.is_super_admin() OR branch_id = public.user_branch_id())
  WITH CHECK (public.is_super_admin() OR branch_id = public.user_branch_id());

CREATE POLICY raw_materials_delete_branch_isolated ON public.raw_materials
  FOR DELETE USING (public.is_super_admin() OR branch_id = public.user_branch_id());

CREATE OR REPLACE FUNCTION public.validate_recipe_item_branch_match()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  recipe_branch uuid;
  material_branch uuid;
BEGIN
  SELECT branch_id INTO recipe_branch FROM public.recipes WHERE id = NEW.recipe_id;
  SELECT branch_id INTO material_branch FROM public.raw_materials WHERE id = NEW.raw_material_id;
  IF recipe_branch IS NULL OR material_branch IS NULL OR recipe_branch <> material_branch THEN
    RAISE EXCEPTION 'RAW_MATERIAL_BRANCH_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_recipe_item_branch ON public.recipe_items;
CREATE TRIGGER trg_validate_recipe_item_branch
BEFORE INSERT OR UPDATE ON public.recipe_items
FOR EACH ROW EXECUTE FUNCTION public.validate_recipe_item_branch_match();
