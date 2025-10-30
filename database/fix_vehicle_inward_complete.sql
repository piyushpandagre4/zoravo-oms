-- Fix vehicle_inward table - Add missing columns
-- Run this in Supabase SQL Editor to complete the vehicle_inward table

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add columns one by one if they don't exist
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='assigned_manager_id') THEN
        ALTER TABLE vehicle_inward ADD COLUMN assigned_manager_id VARCHAR(255) DEFAULT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='location_id') THEN
        ALTER TABLE vehicle_inward ADD COLUMN location_id VARCHAR(255) DEFAULT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='estimated_completion_date') THEN
        ALTER TABLE vehicle_inward ADD COLUMN estimated_completion_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='notes') THEN
        ALTER TABLE vehicle_inward ADD COLUMN notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='status') THEN
        ALTER TABLE vehicle_inward ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='created_at') THEN
        ALTER TABLE vehicle_inward ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='updated_at') THEN
        ALTER TABLE vehicle_inward ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='priority') THEN
        ALTER TABLE vehicle_inward ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='estimated_cost') THEN
        ALTER TABLE vehicle_inward ADD COLUMN estimated_cost DECIMAL(10,2);
    END IF;
END $$;

-- Add trigger for updated_at column if it doesn't exist
DROP TRIGGER IF EXISTS update_vehicle_inward_updated_at ON vehicle_inward;
CREATE TRIGGER update_vehicle_inward_updated_at 
BEFORE UPDATE ON vehicle_inward 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_vehicle_id ON vehicle_inward(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_status ON vehicle_inward(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_installer ON vehicle_inward(assigned_installer_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_manager ON vehicle_inward(assigned_manager_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_location ON vehicle_inward(location_id);

