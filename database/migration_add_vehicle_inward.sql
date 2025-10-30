-- Migration: Add vehicle_inward table
-- This adds the missing vehicle_inward table that was causing relationship errors

-- First, create the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vehicle inward table (for vehicle check-in/check-out)
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

-- Create indexes for better performance (use IF NOT EXISTS is not supported, so we'll drop and recreate)
DROP INDEX IF EXISTS idx_vehicle_inward_vehicle_id;
DROP INDEX IF EXISTS idx_vehicle_inward_status;
CREATE INDEX idx_vehicle_inward_vehicle_id ON vehicle_inward(vehicle_id);
CREATE INDEX idx_vehicle_inward_status ON vehicle_inward(status);

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_vehicle_inward_updated_at ON vehicle_inward;
CREATE TRIGGER update_vehicle_inward_updated_at 
BEFORE UPDATE ON vehicle_inward 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

