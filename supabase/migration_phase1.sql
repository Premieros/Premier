-- Migration: Phase 1 - RLS Fixes + Missing FKs
-- Run this in Supabase SQL Editor AFTER combined_setup.sql

-- ============ RLS FIXES ============

-- audit_log: DELETE should be admin-only (was open to all authenticated)
DROP POLICY IF EXISTS "auth_delete_audit_log" ON audit_log;
CREATE POLICY "auth_delete_audit_log" ON audit_log FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- audit_log: UPDATE should be admin-only
DROP POLICY IF EXISTS "auth_update_audit_log" ON audit_log;
CREATE POLICY "auth_update_audit_log" ON audit_log FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- users: INSERT allowed for self (own profile) or admin
DROP POLICY IF EXISTS "auth_insert_users" ON users;
CREATE POLICY "auth_insert_users" ON users FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- users: DELETE should be admin-only
DROP POLICY IF EXISTS "auth_delete_users" ON users;
CREATE POLICY "auth_delete_users" ON users FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============ MISSING FOREIGN KEYS ============

-- sales.cashier_id → users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_cashier_id_fkey'
  ) THEN
    ALTER TABLE sales ADD CONSTRAINT sales_cashier_id_fkey
      FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- sales.salesperson_id → users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_salesperson_id_fkey'
  ) THEN
    ALTER TABLE sales ADD CONSTRAINT sales_salesperson_id_fkey
      FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- purchases.buyer_id → users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchases_buyer_id_fkey'
  ) THEN
    ALTER TABLE purchases ADD CONSTRAINT purchases_buyer_id_fkey
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- expenses.created_by → users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_created_by_fkey'
  ) THEN
    ALTER TABLE expenses ADD CONSTRAINT expenses_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- audit_log.user_id → users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_log_user_id_fkey'
  ) THEN
    ALTER TABLE audit_log ADD CONSTRAINT audit_log_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;
