-- Migration: User Management - Admin creates users + disable self registration
-- Run this in Supabase SQL Editor AFTER combined_setup.sql (requires is_pos_admin())

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
  v_auth_result json;
  v_user_id uuid;
  v_role text;
BEGIN
  -- Only admins can create users
  IF NOT is_pos_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED');
  END IF;

  -- Email uniqueness (both auth accounts and app profiles)
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMAIL_TAKEN');
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMAIL_TAKEN');
  END IF;

  v_role := CASE
    WHEN p_role IN ('admin', 'manager', 'cashier', 'salesperson') THEN p_role
    ELSE 'cashier'
  END;

  -- Create the auth account (email confirmed so the user can log in immediately)
  v_auth_result := auth.admin_create_user(
    email := p_email,
    password := p_password,
    user_metadata := jsonb_build_object('full_name', p_full_name),
    email_confirm := true
  );

  v_user_id := (v_auth_result->>'id')::uuid;

  -- Create the app profile. On any failure below, the whole transaction
  -- (including the auth account) is rolled back - no partial accounts.
  INSERT INTO users (id, email, full_name, role, branch_id, is_active)
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
SET search_path = public
AS $$
DECLARE
  v_other_active_admins int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin' AND OLD.is_active THEN
      SELECT count(*) INTO v_other_active_admins
      FROM users
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
    FROM users
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
  USING (is_pos_admin() OR id = auth.uid())
  WITH CHECK (is_pos_admin() OR id = auth.uid());

DROP POLICY IF EXISTS "auth_delete_users" ON users;
CREATE POLICY "auth_delete_users" ON users FOR DELETE TO authenticated
  USING (is_pos_admin());
