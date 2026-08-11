-- CI-only fixture: integration tests exercise order/RLS behavior on a disposable Postgres.
-- The production subscription guard is tested separately; disabling only this trigger
-- here prevents the CI fixture subscription state from masking unrelated integration tests.
DO $$
DECLARE
  trigger_name text;
BEGIN
  SELECT t.tgname
    INTO trigger_name
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_proc p ON p.oid = t.tgfoid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'orders'
    AND p.proname = 'guard_order_subscription'
    AND NOT t.tgisinternal
  LIMIT 1;

  IF trigger_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.orders DISABLE TRIGGER %I', trigger_name);
  END IF;
END $$;
