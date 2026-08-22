-- ============================================================================
-- CI stub: minimal Supabase-like environment for a plain Postgres container
-- ----------------------------------------------------------------------------
-- Applied ONLY by the CI verification job BEFORE supabase/migrations/*.sql.
-- It reproduces the pieces of a real Supabase project that the migrations
-- depend on but that a stock Postgres image does not ship with.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END $$;

GRANT anon TO postgres, authenticated;
GRANT authenticated TO postgres;
GRANT service_role TO postgres;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  instance_id uuid,
  aud text,
  role text,
  email text UNIQUE,
  encrypted_password text,
  email_confirmed_at timestamptz,
  confirmation_token text,
  recovery_token text,
  email_change text,
  email_change_token_new text,
  email_change_token_current text,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  is_anonymous boolean,
  is_sso_user boolean
);

CREATE TABLE IF NOT EXISTS auth.identities (
  id uuid PRIMARY KEY,
  provider_id text,
  user_id uuid REFERENCES auth.users(id),
  identity_data jsonb,
  provider text,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  email text
);

CREATE TABLE IF NOT EXISTS auth.sessions (
  id uuid PRIMARY KEY,
  user_id uuid,
  created_at timestamptz
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS $fn$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$fn$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
  LANGUAGE sql STABLE AS $fn$
  SELECT COALESCE(NULLIF(current_setting('app.jwt', true), '')::jsonb, '{}'::jsonb)
$fn$;

-- Mirrors Supabase auth.role() for CI: use an explicit JWT role when present,
-- otherwise the current Postgres role. This is used only for service-role
-- administrative RPC tests; branch users remain governed by branch RLS.
CREATE OR REPLACE FUNCTION auth.role() RETURNS text
  LANGUAGE sql STABLE AS $fn$
  SELECT COALESCE(
    NULLIF(current_setting('app.jwt', true), '')::jsonb ->> 'role',
    current_user::text
  )
$fn$;

CREATE OR REPLACE FUNCTION auth.is_ci_stub() RETURNS boolean
  LANGUAGE sql STABLE AS $fn$ SELECT true $fn$;
