-- Check and fix vehicle_inward table structure
-- Run this in Supabase SQL Editor

-- First, check what columns currently exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'vehicle_inward'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add missing columns
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='assigned_manager_id') THEN
        ALTER TABLE vehicle_inward ADD COLUMN assigned_manager_id VARCHAR(255) DEFAULT NULL;
        RAISE NOTICE 'Added assigned_manager_id column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='location_id') THEN
        ALTER TABLE vehicle_inward ADD COLUMN location_id VARCHAR(255) DEFAULT NULL;
        RAISE NOTICE 'Added location_id column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='estimated_completion_date') THEN
        ALTER TABLE vehicle_inward ADD COLUMN estimated_completion_date DATE;
        RAISE NOTICE 'Added estimated_completion_date column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='notes') THEN
        ALTER TABLE vehicle_inward ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='status') THEN
        ALTER TABLE vehicle_inward ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
        RAISE NOTICE 'Added status column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='created_at') THEN
        ALTER TABLE vehicle_inward ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='updated_at') THEN
        ALTER TABLE vehicle_inward ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='priority') THEN
        ALTER TABLE vehicle_inward ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
        RAISE NOTICE 'Added priority column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='vehicle_inward' AND column_name='estimated_cost') THEN
        ALTER TABLE vehicle_inward ADD COLUMN estimated_cost DECIMAL(10,2);
        RAISE NOTICE 'Added estimated_cost column';
    END IF;
    
    RAISE NOTICE 'All columns check complete';
END $$;

-- Show final structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'vehicle_inward'
ORDER BY ordinal_position;

