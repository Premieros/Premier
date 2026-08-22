-- Raw material definitions are shared master data. Operational quantities remain
-- isolated in raw_material_inventory/raw_material_batches by branch.
DROP POLICY IF EXISTS auth_select_raw_materials ON public.raw_materials;
CREATE POLICY auth_select_raw_materials ON public.raw_materials
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS auth_insert_raw_materials ON public.raw_materials;
CREATE POLICY auth_insert_raw_materials ON public.raw_materials
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS auth_update_raw_materials ON public.raw_materials;
CREATE POLICY auth_update_raw_materials ON public.raw_materials
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS auth_delete_raw_materials ON public.raw_materials;
CREATE POLICY auth_delete_raw_materials ON public.raw_materials
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());
