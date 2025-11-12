-- Add vehicle_name column to customer_requirements table

ALTER TABLE customer_requirements 
ADD COLUMN IF NOT EXISTS vehicle_name VARCHAR(255);

-- Create index for vehicle_name for better search performance
CREATE INDEX IF NOT EXISTS idx_customer_requirements_vehicle_name ON customer_requirements(vehicle_name);

SELECT '✅ Vehicle name column added to customer_requirements table!' as result;

