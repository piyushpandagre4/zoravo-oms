-- Fix RLS for Locations Table
-- Run this in Supabase if you're getting RLS errors

-- Enable Row Level Security
ALTER TABLE IF EXISTS locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on locations for authenticated users" ON locations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON locations;
DROP POLICY IF EXISTS "Enable read access for all users" ON locations;

-- Create RLS policies to allow all operations
CREATE POLICY "Allow all operations on locations for authenticated users"
ON locations
FOR ALL
USING (true)
WITH CHECK (true);

SELECT '✅ RLS policies for locations updated successfully!' as result;

