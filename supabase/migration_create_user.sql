-- Migration: User Management - Admin creates users + disable self registration
-- Run this in Supabase SQL Editor AFTER combined_setup.sql (requires is_pos_admin())
--
-- NOTE: auth.admin_create_user() was REMOVED in modern Supabase auth versions,
-- so we insert directly into auth.users + auth.identities with a bcrypt hash.
-- The pgcrypto schema is resolved at runtime so this works on ANY project
-- (extensions schema, public schema, etc).

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
SET search_path = pg_catalog
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_hash text;
  v_pgc_schema text;
BEGIN
  -- Only admins can create users
  IF NOT public.is_pos_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED');
  END IF;

  -- Email uniqueness (both auth accounts and app profiles)
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMAIL_TAKEN');
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
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

  -- Create the auth account (email confirmed so the user can log in immediately)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_anonymous, is_sso_user
  ) VALUES (
    NULL, v_user_id, 'authenticated', 'authenticated', p_email,
    v_hash,
    now(), now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object('full_name', p_full_name),
    now(), now(), false, false
  );

  -- Email identity row (required by GoTrue for email/password sign-in)
  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at, email
  ) VALUES (
    v_user_id, p_email, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email', now(), now(), now(), p_email
  );

  -- Create the app profile. On any failure below, the whole transaction
  -- (including the auth account) is rolled back - no partial accounts.
  INSERT INTO public.users (id, email, full_name, role, branch_id, is_active)
  VALUES (v_user_id, p_email, p_full_name, v_role, p_branch_id, p_is_active);

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'UNKNOWN_ERROR', 'detail', SQLERRM);
END;
$$;

-- ============ 2. LAST ADMIN PROTECTION ============
-- Blocks: deleting the last active admin, deactivating them, or demoting
-- them to a lower role (including self-deletion).
CREATE OR REPLACE FUNCTION protect_last_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
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
