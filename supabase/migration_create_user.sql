-- Migration: User Management - Admin creates users + disable self registration
-- Run this in Supabase SQL Editor AFTER combined_setup.sql (requires is_pos_admin())
--
-- NOTE: auth.admin_create_user() was REMOVED in modern Supabase auth versions,
-- so we insert directly into auth.users + auth.identities with a bcrypt hash.
-- The pgcrypto schema is resolved at runtime so this works on ANY project
-- (extensions schema, public schema, etc).
--
-- v2 fix: GoTrue breaks login ("Invalid login credentials") when the token
-- columns in auth.users are NULL (it scans them as strings), and unconfirmed
-- emails are blocked at sign-in. This version now:
--   * lowercases the email everywhere (matches GoTrue lookups)
--   * sets the token columns to '' (confirmation_token, recovery_token,
--     email_change, email_change_token_new, email_change_token_current)
--   * sets email_confirmed_at = now() + raw_user_meta_data.email_verified
--   * repairs users that were already created by the old version

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============ 1. CREATE USER RPC ============
-- Only admins can create accounts. Runs in a single transaction:
-- auth account + app profile are all-or-nothing (full rollback on failure).
CREATE OR REPLACE FUNCTION create_user(
  p_email text,
  p_password text,
  p_full_name text DEFAULT NULL,
  p_role text DEFAULT 'cashier',
  p_branch_id uuid DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_hash text;
  v_email text;
  v_pgc_schema text;
  v_u_cols text;
  v_u_vals text;
  v_i_cols text;
  v_i_vals text;
BEGIN
  -- Only admins can create users
  IF NOT public.is_pos_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED');
  END IF;

  v_email := lower(btrim(p_email));

  -- Email uniqueness (both auth accounts and app profiles)
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMAIL_TAKEN');
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE email = v_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMAIL_TAKEN');
  END IF;

  -- Locate the pgcrypto extension schema at runtime (any Supabase project)
  SELECT extnamespace::regnamespace::text INTO v_pgc_schema
  FROM pg_extension WHERE extname = 'pgcrypto';

  IF v_pgc_schema IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNKNOWN_ERROR', 'detail', 'pgcrypto extension is not enabled');
  END IF;

  -- bcrypt-hash the password using the resolved pgcrypto schema
  EXECUTE format('SELECT %I.crypt($1, %I.gen_salt($2, $3))', v_pgc_schema, v_pgc_schema)
    INTO v_hash USING p_password, 'bf', 10;

  v_role := CASE
    WHEN p_role IN ('admin', 'manager', 'cashier', 'salesperson') THEN p_role
    ELSE 'cashier'
  END;

  v_user_id := gen_random_uuid();

  -- Build the auth.users INSERT dynamically, including ONLY columns that exist
  -- and are NOT generated. This adapts automatically to any Supabase version
  -- (email / confirmed_at are generated columns on newer versions).
  -- Token columns are set to '' because GoTrue scans them as strings and
  -- NULL values break login.
  SELECT string_agg(c.col, ', ' ORDER BY c.ord), string_agg(c.val, ', ' ORDER BY c.ord)
  INTO v_u_cols, v_u_vals
  FROM (
    SELECT cols.ordinal_position AS ord, quote_ident(cols.column_name) AS col,
      CASE cols.column_name
        WHEN 'instance_id' THEN 'NULL'
        WHEN 'id' THEN quote_literal(v_user_id)
        WHEN 'aud' THEN '''authenticated'''
        WHEN 'role' THEN '''authenticated'''
        WHEN 'email' THEN quote_literal(v_email)
        WHEN 'encrypted_password' THEN quote_literal(v_hash)
        WHEN 'email_confirmed_at' THEN 'now()'
        WHEN 'confirmation_token' THEN ''''''
        WHEN 'recovery_token' THEN ''''''
        WHEN 'email_change' THEN ''''''
        WHEN 'email_change_token_new' THEN ''''''
        WHEN 'email_change_token_current' THEN ''''''
        WHEN 'raw_app_meta_data' THEN format('jsonb_build_object(''provider'',''email'',''providers'',array[''email'']::text[],''email'',%L)', v_email)
        WHEN 'raw_user_meta_data' THEN format('jsonb_build_object(''full_name'',%L,''email'',%L,''email_verified'',true)', p_full_name, v_email)
        WHEN 'created_at' THEN 'now()'
        WHEN 'updated_at' THEN 'now()'
        WHEN 'is_anonymous' THEN 'false'
        WHEN 'is_sso_user' THEN 'false'
      END AS val
    FROM information_schema.columns cols
    WHERE cols.table_schema = 'auth' AND cols.table_name = 'users'
      AND cols.is_generated = 'NEVER'
      AND cols.column_name IN ('instance_id','id','aud','role','email','encrypted_password','email_confirmed_at','confirmation_token','recovery_token','email_change','email_change_token_new','email_change_token_current','raw_app_meta_data','raw_user_meta_data','created_at','updated_at','is_anonymous','is_sso_user')
  ) c;

  IF v_u_cols IS NULL OR v_u_vals IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNKNOWN_ERROR', 'detail', 'no insertable columns found for auth.users');
  END IF;

  EXECUTE 'INSERT INTO auth.users (' || v_u_cols || ') VALUES (' || v_u_vals || ')';

  -- Build the auth.identities INSERT dynamically the same way
  SELECT string_agg(c.col, ', ' ORDER BY c.ord), string_agg(c.val, ', ' ORDER BY c.ord)
  INTO v_i_cols, v_i_vals
  FROM (
    SELECT cols.ordinal_position AS ord, quote_ident(cols.column_name) AS col,
      CASE cols.column_name
        WHEN 'id' THEN quote_literal(v_user_id)
        WHEN 'provider_id' THEN quote_literal(v_email)
        WHEN 'user_id' THEN quote_literal(v_user_id)
        WHEN 'identity_data' THEN format('jsonb_build_object(''sub'',%L,''email'',%L)', v_user_id::text, v_email)
        WHEN 'provider' THEN '''email'''
        WHEN 'last_sign_in_at' THEN 'now()'
        WHEN 'created_at' THEN 'now()'
        WHEN 'updated_at' THEN 'now()'
        WHEN 'email' THEN quote_literal(v_email)
      END AS val
    FROM information_schema.columns cols
    WHERE cols.table_schema = 'auth' AND cols.table_name = 'identities'
      AND cols.is_generated = 'NEVER'
      AND cols.column_name IN ('id','provider_id','user_id','identity_data','provider','last_sign_in_at','created_at','updated_at','email')
  ) c;

  IF v_i_cols IS NULL OR v_i_vals IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNKNOWN_ERROR', 'detail', 'no insertable columns found for auth.identities');
  END IF;

  EXECUTE 'INSERT INTO auth.identities (' || v_i_cols || ') VALUES (' || v_i_vals || ')';

  -- Create the app profile. On any failure below, the whole transaction
  -- (including the auth account) is rolled back - no partial accounts.
  INSERT INTO public.users (id, email, full_name, role, branch_id, is_active)
  VALUES (v_user_id, v_email, p_full_name, v_role, p_branch_id, p_is_active);

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'UNKNOWN_ERROR', 'detail', SQLERRM);
END;
$$;

-- ============ 1b. REPAIR ALREADY-CREATED USERS ============
-- Users created by the previous version are missing the token values and may
-- not be confirmed - fix them so they can log in. Only touches app users.
DO $$
DECLARE
  v_set text;
BEGIN
  -- Token columns -> '' (only for columns that actually exist)
  SELECT string_agg(c.clause, ', ' ORDER BY c.ord)
  INTO v_set
  FROM (
    SELECT cols.ordinal_position AS ord,
           quote_ident(cols.column_name) || ' = COALESCE(' || quote_ident(cols.column_name) || ', '''')' AS clause
    FROM information_schema.columns cols
    WHERE cols.table_schema = 'auth' AND cols.table_name = 'users'
      AND cols.is_generated = 'NEVER'
      AND cols.column_name IN ('confirmation_token','recovery_token','email_change','email_change_token_new','email_change_token_current')
  ) c;

  IF v_set IS NOT NULL THEN
    EXECUTE 'UPDATE auth.users SET ' || v_set || ' WHERE id IN (SELECT id FROM public.users)';
  END IF;

  -- Confirm their emails
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users'
      AND column_name = 'email_confirmed_at' AND is_generated = 'NEVER'
  ) THEN
    EXECUTE 'UPDATE auth.users SET email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE id IN (SELECT id FROM public.users)';
  END IF;

  -- Mark email as verified in metadata
  EXECUTE 'UPDATE auth.users SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, ''{}''::jsonb), ''{email_verified}'', ''true'', true) WHERE id IN (SELECT id FROM public.users)';
END;
$$;

-- ============ 2. LAST ADMIN PROTECTION ============
-- Blocks: deleting the last active admin, deactivating them, or demoting
-- them to a lower role (including self-deletion).
CREATE OR REPLACE FUNCTION protect_last_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other_active_admins int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin' AND OLD.is_active THEN
      SELECT count(*) INTO v_other_active_admins
      FROM public.users
      WHERE role = 'admin' AND is_active AND id <> OLD.id;
      IF v_other_active_admins = 0 THEN
        RAISE EXCEPTION 'LAST_ADMIN';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  IF OLD.role = 'admin' AND OLD.is_active
     AND (NEW.role IS DISTINCT FROM 'admin' OR NOT NEW.is_active) THEN
    SELECT count(*) INTO v_other_active_admins
    FROM public.users
    WHERE role = 'admin' AND is_active AND id <> OLD.id;
    IF v_other_active_admins = 0 THEN
      RAISE EXCEPTION 'LAST_ADMIN';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_last_admin ON users;
CREATE TRIGGER trg_protect_last_admin
BEFORE UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION protect_last_admin();

-- ============ 3. HARDEN USERS RLS ============
-- Only admins may update/delete user profiles; a user may still update
-- their own profile. Reading profiles stays open for authenticated users.
DROP POLICY IF EXISTS "auth_update_users" ON users;
CREATE POLICY "auth_update_users" ON users FOR UPDATE TO authenticated
  USING (public.is_pos_admin() OR id = auth.uid())
  WITH CHECK (public.is_pos_admin() OR id = auth.uid());

DROP POLICY IF EXISTS "auth_delete_users" ON users;
CREATE POLICY "auth_delete_users" ON users FOR DELETE TO authenticated
  USING (public.is_pos_admin());
