/*
# Branch-level data isolation for non-admin users

## Overview
Adds a database helper function `is_pos_admin()` that checks whether the
current authenticated user has the 'admin' role in the `users` table.
Then updates RLS policies on branch-scoped tables (sales, purchases,
expenses) so that:
- Admin users can see and manage ALL rows across all branches.
- Non-admin users (manager, cashier, salesperson) can only see and manage
  rows belonging to their own branch (matched via `branch_id`).

Tables that are shared reference data (products, categories, customers,
suppliers, warehouses, branches, settings, product_units, inventory,
audit_log, users) remain visible to all authenticated staff since they
are not branch-scoped operational data.

## New Functions
- `is_pos_admin()` — returns boolean, true if current auth user role = 'admin'

## Modified Tables
- `sales` — SELECT/INSERT/UPDATE/DELETE policies now check branch_id
- `purchases` — SELECT/INSERT/UPDATE/DELETE policies now check branch_id
- `expenses` — SELECT/INSERT/UPDATE/DELETE policies now check branch_id

## Security
- Non-admin users are restricted to their branch_id.
- Admin users bypass the branch filter.
- All policies still require authentication.
*/

-- ============ HELPER FUNCTION ============
CREATE OR REPLACE FUNCTION is_pos_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  );
$$;

-- ============ SALES ============
DROP POLICY IF EXISTS "auth_select_sales" ON sales;
CREATE POLICY "auth_select_sales" ON sales FOR SELECT
  TO authenticated USING (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  ));

DROP POLICY IF EXISTS "auth_insert_sales" ON sales;
CREATE POLICY "auth_insert_sales" ON sales FOR INSERT
  TO authenticated WITH CHECK (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  ));

DROP POLICY IF EXISTS "auth_update_sales" ON sales;
CREATE POLICY "auth_update_sales" ON sales FOR UPDATE
  TO authenticated USING (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  )) WITH CHECK (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  ));

DROP POLICY IF EXISTS "auth_delete_sales" ON sales;
CREATE POLICY "auth_delete_sales" ON sales FOR DELETE
  TO authenticated USING (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  ));

-- ============ PURCHASES ============
DROP POLICY IF EXISTS "auth_select_purchases" ON purchases;
CREATE POLICY "auth_select_purchases" ON purchases FOR SELECT
  TO authenticated USING (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  ));

DROP POLICY IF EXISTS "auth_insert_purchases" ON purchases;
CREATE POLICY "auth_insert_purchases" ON purchases FOR INSERT
  TO authenticated WITH CHECK (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  ));

DROP POLICY IF EXISTS "auth_update_purchases" ON purchases;
CREATE POLICY "auth_update_purchases" ON purchases FOR UPDATE
  TO authenticated USING (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  )) WITH CHECK (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  ));

DROP POLICY IF EXISTS "auth_delete_purchases" ON purchases;
CREATE POLICY "auth_delete_purchases" ON purchases FOR DELETE
  TO authenticated USING (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  ));

-- ============ EXPENSES ============
DROP POLICY IF EXISTS "auth_select_expenses" ON expenses;
CREATE POLICY "auth_select_expenses" ON expenses FOR SELECT
  TO authenticated USING (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  ));

DROP POLICY IF EXISTS "auth_insert_expenses" ON expenses;
CREATE POLICY "auth_insert_expenses" ON expenses FOR INSERT
  TO authenticated WITH CHECK (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  ));

DROP POLICY IF EXISTS "auth_update_expenses" ON expenses;
CREATE POLICY "auth_update_expenses" ON expenses FOR UPDATE
  TO authenticated USING (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  )) WITH CHECK (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  ));

DROP POLICY IF EXISTS "auth_delete_expenses" ON expenses;
CREATE POLICY "auth_delete_expenses" ON expenses FOR DELETE
  TO authenticated USING (is_pos_admin() OR branch_id IS NULL OR branch_id = (
    SELECT users.branch_id FROM users WHERE users.id = auth.uid()
  ));