-- COMPLETE FIX FOR VEHICLE INWARD
-- Run this in Supabase SQL Editor

-- Step 1: Add short_id column for ZO01, ZO02 formatting
ALTER TABLE vehicle_inward 
ADD COLUMN IF NOT EXISTS short_id VARCHAR(10) UNIQUE;

-- Step 2: Add all customer and vehicle columns
ALTER TABLE vehicle_inward 
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS customer_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS customer_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS customer_pincode VARCHAR(10);

ALTER TABLE vehicle_inward 
ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS make VARCHAR(100) DEFAULT 'Unknown',
ADD COLUMN IF NOT EXISTS model VARCHAR(100),
ADD COLUMN IF NOT EXISTS color VARCHAR(50),
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS engine_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(100);

-- Step 3: Create function to generate short IDs
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
    new_short_id VARCHAR(10);
BEGIN
    -- Get the next number
    SELECT COALESCE(MAX(CAST(SUBSTRING(short_id FROM 3) AS INTEGER)), 0) + 1
    INTO next_num
    FROM vehicle_inward
    WHERE short_id IS NOT NULL AND short_id ~ '^ZO[0-9]+$';
    
    -- Format as ZO01, ZO02, etc.
    new_short_id := 'ZO' || LPAD(next_num::TEXT, 2, '0');
    
    NEW.short_id := new_short_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to auto-generate short IDs
DROP TRIGGER IF EXISTS set_short_id ON vehicle_inward;
CREATE TRIGGER set_short_id
BEFORE INSERT ON vehicle_inward
FOR EACH ROW
WHEN (NEW.short_id IS NULL)
EXECUTE FUNCTION generate_short_id();

-- Step 5: Update existing records with short IDs
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 1;
BEGIN
    FOR rec IN SELECT id FROM vehicle_inward WHERE short_id IS NULL ORDER BY created_at
    LOOP
        UPDATE vehicle_inward 
        SET short_id = 'ZO' || LPAD(counter::TEXT, 2, '0')
        WHERE id = rec.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_phone ON vehicle_inward(customer_phone);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_registration ON vehicle_inward(registration_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_status ON vehicle_inward(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_created ON vehicle_inward(created_at);

SELECT '✅ All fixes applied! Now refresh your app.' as result;

