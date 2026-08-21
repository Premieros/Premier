-- Final KDS security hardening.
-- Keep the original RPC signatures for compatibility while enforcing branch isolation.

CREATE OR REPLACE FUNCTION public.route_to_station(
  p_order_id uuid,
  p_station text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_branch uuid;
  v_user_branch uuid;
  v_is_service boolean := (current_user = 'service_role');
BEGIN
  IF p_station NOT IN ('main','grill','salad','drinks','dessert','fryer') THEN
    RAISE EXCEPTION 'Invalid station: %', p_station;
  END IF;

  SELECT o.branch_id INTO v_order_branch
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF v_order_branch IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF NOT v_is_service THEN
    v_user_branch := public.get_branch_id();
    IF v_user_branch IS NULL OR v_order_branch <> v_user_branch THEN
      RAISE EXCEPTION 'BRANCH_ACCESS_DENIED';
    END IF;
  END IF;

  UPDATE public.orders
  SET station = p_station, updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.audit_log(user_id, action, entity, entity_id, details)
  VALUES (auth.uid(), 'route_station', 'order', p_order_id,
    jsonb_build_object('station', p_station));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kitchen_queue(
  p_station text DEFAULT NULL,
  p_branch_id uuid DEFAULT public.get_branch_id()
)
RETURNS TABLE (
  order_id uuid,
  order_number text,
  table_number integer,
  station text,
  kitchen_status text,
  guest_count integer,
  notes text,
  created_at timestamptz,
  items jsonb,
  elapsed_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_branch uuid := public.get_branch_id();
  v_target_branch uuid := p_branch_id;
BEGIN
  IF current_user <> 'service_role' THEN
    IF v_user_branch IS NULL OR v_target_branch IS NULL OR v_target_branch <> v_user_branch THEN
      RAISE EXCEPTION 'BRANCH_ACCESS_DENIED';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    CASE WHEN dt.table_number ~ '^[0-9]+$' THEN dt.table_number::integer ELSE NULL END,
    o.station,
    o.kitchen_status,
    o.guest_count,
    o.notes,
    o.created_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'product_name', p.name,
      'quantity', oi.quantity,
      'modifiers', oi.notes
    )) FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id WHERE oi.order_id = o.id), '[]'::jsonb),
    EXTRACT(EPOCH FROM (now() - o.created_at))::integer
  FROM public.orders o
  LEFT JOIN public.dining_tables dt ON dt.id = o.table_id
  WHERE o.branch_id = v_target_branch
    AND o.kitchen_status IN ('sent', 'cooking', 'ready')
    AND (p_station IS NULL OR o.station = p_station)
  ORDER BY o.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.route_to_station(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_kitchen_queue(text, uuid) TO authenticated, service_role;
