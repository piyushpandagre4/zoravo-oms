-- COMPLETE FIX FOR VEHICLE INWARD TABLE
-- Run this in Supabase SQL Editor to fix ALL issues

-- Step 1: Check current structure of vehicle_inward table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns
WHERE table_name = 'vehicle_inward'
ORDER BY ordinal_position;

-- Step 2: Delete the wrong table (vehicle_inwards with 's')
DROP TABLE IF EXISTS vehicle_inwards CASCADE;

-- Step 3: Ensure the correct table exists and has proper structure
CREATE TABLE IF NOT EXISTS vehicle_inward (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    odometer_reading INTEGER,
    issues_reported TEXT,
    accessories_requested TEXT,
    estimated_cost DECIMAL(10,2),
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_installer_id VARCHAR(255) DEFAULT NULL,
    assigned_manager_id VARCHAR(255) DEFAULT NULL,
    location_id VARCHAR(255) DEFAULT NULL,
    estimated_completion_date DATE,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Make sure columns are VARCHAR not UUID
-- If columns exist but are wrong type, alter them
DO $$ 
BEGIN
    -- Check and fix assigned_installer_id
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='vehicle_inward' AND column_name='assigned_installer_id' 
               AND data_type != 'character varying') THEN
        ALTER TABLE vehicle_inward ALTER COLUMN assigned_installer_id TYPE VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='assigned_installer_id') THEN
        ALTER TABLE vehicle_inward ADD COLUMN assigned_installer_id VARCHAR(255) DEFAULT NULL;
    END IF;
    
    -- Check and fix assigned_manager_id
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='vehicle_inward' AND column_name='assigned_manager_id' 
               AND data_type != 'character varying') THEN
        ALTER TABLE vehicle_inward ALTER COLUMN assigned_manager_id TYPE VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='assigned_manager_id') THEN
        ALTER TABLE vehicle_inward ADD COLUMN assigned_manager_id VARCHAR(255) DEFAULT NULL;
    END IF;
    
    -- Check and fix location_id
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='vehicle_inward' AND column_name='location_id' 
               AND data_type != 'character varying') THEN
        ALTER TABLE vehicle_inward ALTER COLUMN location_id TYPE VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='location_id') THEN
        ALTER TABLE vehicle_inward ADD COLUMN location_id VARCHAR(255) DEFAULT NULL;
    END IF;
    
    -- Add any other missing columns
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
END $$;

-- Step 5: Show final structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'vehicle_inward'
ORDER BY ordinal_position;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_vehicle_id ON vehicle_inward(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inward_status ON vehicle_inward(status);

-- Step 7: Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_vehicle_inward_updated_at ON vehicle_inward;
CREATE TRIGGER update_vehicle_inward_updated_at 
BEFORE UPDATE ON vehicle_inward 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Vehicle inward table fixed successfully!' as message;

