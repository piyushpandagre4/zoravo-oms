-- Add short ID column to vehicle_inward table
-- This will generate IDs like ZO01, ZO02, ZO03...

-- Add the short_id column
ALTER TABLE vehicle_inward 
ADD COLUMN IF NOT EXISTS short_id VARCHAR(10) UNIQUE;

-- Create a function to generate short IDs
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

-- Create trigger to auto-generate short IDs
DROP TRIGGER IF EXISTS set_short_id ON vehicle_inward;
CREATE TRIGGER set_short_id
BEFORE INSERT ON vehicle_inward
FOR EACH ROW
WHEN (NEW.short_id IS NULL)
EXECUTE FUNCTION generate_short_id();

-- Update existing records
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

SELECT '✅ Short ID column added and populated!' as result;

