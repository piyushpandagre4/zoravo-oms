-- UPDATE vehicle_inward table to store ALL data
-- Each visit = new entry = complete customer + vehicle + inward info

-- Add customer columns
ALTER TABLE vehicle_inward 
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS customer_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS customer_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS customer_pincode VARCHAR(10);

-- Add vehicle columns
ALTER TABLE vehicle_inward 
ADD COLUMN IF NOT EXISTS registration_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS make VARCHAR(100) DEFAULT 'Unknown',
ADD COLUMN IF NOT EXISTS model VARCHAR(100),
ADD COLUMN IF NOT EXISTS color VARCHAR(50),
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS engine_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(100);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_phone ON vehicle_inward(customer_phone);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_registration ON vehicle_inward(registration_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_created ON vehicle_inward(created_at);

-- Show final structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'vehicle_inward'
ORDER BY ordinal_position;

SELECT '✅ vehicle_inward table updated to store all data in one place!' as result;

