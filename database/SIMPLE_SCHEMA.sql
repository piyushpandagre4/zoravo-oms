-- SIMPLE VEHICLE INWARD SCHEMA
-- Everything in one table - no relationships, no complexity
-- Each visit = new entry = that's it!

-- Drop old complex tables if they exist
DROP TABLE IF EXISTS vehicle_inward CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Create simple ALL-IN-ONE vehicle_inward table
CREATE TABLE vehicle_inward (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Customer info (stored directly - no separate table)
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    customer_address TEXT,
    customer_city VARCHAR(100),
    customer_state VARCHAR(100),
    customer_pincode VARCHAR(10),
    
    -- Vehicle info (stored directly - no separate table)
    registration_number VARCHAR(50) NOT NULL,
    make VARCHAR(100) DEFAULT 'Unknown',
    model VARCHAR(100) NOT NULL,
    color VARCHAR(50),
    year INTEGER,
    vehicle_type VARCHAR(50),
    engine_number VARCHAR(100),
    chassis_number VARCHAR(100),
    
    -- Inward/service details
    odometer_reading INTEGER,
    issues_reported TEXT,
    accessories_requested TEXT,
    estimated_cost DECIMAL(10,2),
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_installer_id VARCHAR(255),
    assigned_manager_id VARCHAR(255),
    location_id VARCHAR(255),
    estimated_completion_date DATE,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common searches
CREATE INDEX idx_vehicle_inward_phone ON vehicle_inward(customer_phone);
CREATE INDEX idx_vehicle_inward_registration ON vehicle_inward(registration_number);
CREATE INDEX idx_vehicle_inward_status ON vehicle_inward(status);
CREATE INDEX idx_vehicle_inward_created ON vehicle_inward(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicle_inward_updated_at 
BEFORE UPDATE ON vehicle_inward 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

SELECT '✅ Simple schema created! Now everything is in vehicle_inward table.' as result;

