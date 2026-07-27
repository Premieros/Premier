-- Migration: Phase 2 - Permissions + Enhanced Reports
-- Run this in Supabase SQL Editor AFTER migration_phase1.sql

-- ============ ADD PERMISSIONS COLUMN ============
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}';
