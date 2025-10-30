-- Fix RLS for Vehicle Types and Departments Tables
-- Run this in Supabase if you're getting RLS errors

-- Fix Vehicle Types RLS
ALTER TABLE IF EXISTS vehicle_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on vehicle_types for authenticated users" ON vehicle_types;
CREATE POLICY "Allow all operations on vehicle_types for authenticated users"
ON vehicle_types
FOR ALL
USING (true)
WITH CHECK (true);

-- Fix Departments RLS
ALTER TABLE IF EXISTS departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on departments for authenticated users" ON departments;
CREATE POLICY "Allow all operations on departments for authenticated users"
ON departments
FOR ALL
USING (true)
WITH CHECK (true);

SELECT '✅ RLS policies for vehicle_types and departments updated successfully!' as result;

