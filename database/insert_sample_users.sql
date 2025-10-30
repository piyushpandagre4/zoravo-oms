-- Insert Sample Users for Zoravo OMS
-- This script creates sample users with different roles
-- Run this in Supabase SQL Editor AFTER setting up auth

-- NOTE: This requires you to:
-- 1. First create auth users in Supabase Dashboard under Authentication
-- 2. Then update their profiles with the correct roles using the queries below

-- OR use the Supabase Admin API to create users programmatically

-- Sample queries to update profiles after creating auth users:

-- 1. Update admin user (replace <USER_ID> with actual UUID from auth.users)
-- UPDATE profiles SET role = 'admin', name = 'Admin User' WHERE email = 'admin@zoravo.com';

-- 2. Insert/update manager user
-- INSERT INTO profiles (id, email, name, role) 
-- VALUES (
--   '<MANAGER_USER_ID>',
--   'manager@zoravo.com',
--   'Manager User',
--   'manager'
-- ) ON CONFLICT (id) DO UPDATE SET role = 'manager', name = 'Manager User';

-- 3. Insert/update coordinator user
-- INSERT INTO profiles (id, email, name, role) 
-- VALUES (
--   '<COORDINATOR_USER_ID>',
--   'coordinator@zoravo.com',
--   'Coordinator User',
--   'coordinator'
-- ) ON CONFLICT (id) DO UPDATE SET role = 'coordinator', name = 'Coordinator User';

-- 4. Insert/update installer user
-- INSERT INTO profiles (id, email, name, role) 
-- VALUES (
--   '<INSTALLER_USER_ID>',
--   'installer@zoravo.com',
--   'Installer User',
--   'installer'
-- ) ON CONFLICT (id) DO UPDATE SET role = 'installer', name = 'Installer User';

-- 5. Insert/update accountant user
-- INSERT INTO profiles (id, email, name, role) 
-- VALUES (
--   '<ACCOUNTANT_USER_ID>',
--   'accountant@zoravo.com',
--   'Accountant User',
--   'accountant'
-- ) ON CONFLICT (id) DO UPDATE SET role = 'accountant', name = 'Accountant User';

-- ============================================
-- RECOMMENDED APPROACH:
-- ============================================
-- 
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" and create users with these emails:
--    - admin@zoravo.com (Role: admin)
--    - manager@zoravo.com (Role: manager)
--    - coordinator@zoravo.com (Role: coordinator)
--    - installer@zoravo.com (Role: installer)
--    - accountant@zoravo.com (Role: accountant)
--
-- 3. For each user created, get their UUID from the users table
-- 4. Run this query to update their profiles:

-- Update profiles after creating auth users
-- Replace <USER_ID> and email as needed

-- Admin
UPDATE profiles SET role = 'admin', name = 'Admin User' WHERE email = 'admin@zoravo.com';

-- Manager
UPDATE profiles SET role = 'manager', name = 'Manager User' WHERE email = 'manager@zoravo.com';

-- Coordinator
UPDATE profiles SET role = 'coordinator', name = 'Coordinator User' WHERE email = 'coordinator@zoravo.com';

-- Installer
UPDATE profiles SET role = 'installer', name = 'Installer User' WHERE email = 'installer@zoravo.com';

-- Accountant
UPDATE profiles SET role = 'accountant', name = 'Accountant User' WHERE email = 'accountant@zoravo.com';

-- Display all profiles
SELECT * FROM profiles ORDER BY role, created_at;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Sample users setup complete!';
    RAISE NOTICE 'Please create auth users in Supabase Dashboard and run the UPDATE queries above';
END $$;
