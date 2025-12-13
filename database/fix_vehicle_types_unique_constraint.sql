-- Fix Vehicle Types and Departments Unique Constraints for Multi-Tenant Support
-- This migration updates the unique constraints to be tenant-scoped

-- ============================================
-- VEHICLE TYPES - Fix Unique Constraint
-- ============================================

-- First, ensure tenant_id column exists (from multi_tenant_schema.sql)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_types') THEN
        ALTER TABLE vehicle_types ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Drop the old global unique constraint on name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'vehicle_types_name_key'
    ) THEN
        ALTER TABLE vehicle_types DROP CONSTRAINT vehicle_types_name_key;
    END IF;
END $$;

-- Create a partial unique index for tenant-scoped records (tenant_id IS NOT NULL)
-- This allows each tenant to have their own "Retail", "Showroom", etc.
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_types_tenant_name_unique 
ON vehicle_types (tenant_id, name) 
WHERE tenant_id IS NOT NULL;

-- Create a unique index for super admin records (tenant_id IS NULL)
-- This ensures super admin records are unique globally
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_types_name_unique_null_tenant 
ON vehicle_types (name) 
WHERE tenant_id IS NULL;

-- ============================================
-- DEPARTMENTS - Fix Unique Constraint
-- ============================================

-- First, ensure tenant_id column exists (from multi_tenant_schema.sql)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'departments') THEN
        ALTER TABLE departments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Drop the old global unique constraint on name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'departments_name_key'
    ) THEN
        ALTER TABLE departments DROP CONSTRAINT departments_name_key;
    END IF;
END $$;

-- Create a partial unique index for tenant-scoped records (tenant_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS departments_tenant_name_unique 
ON departments (tenant_id, name) 
WHERE tenant_id IS NOT NULL;

-- Create a unique index for super admin records (tenant_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS departments_name_unique_null_tenant 
ON departments (name) 
WHERE tenant_id IS NULL;

-- ============================================
-- Success Message
-- ============================================
SELECT '✅ Vehicle Types and Departments unique constraints updated for multi-tenant support!' as result;

