-- Create Vehicle Types and Departments tables
-- These tables will be managed from the Settings section

-- Vehicle Types Table
CREATE TABLE IF NOT EXISTS vehicle_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default vehicle types
INSERT INTO vehicle_types (name, status) VALUES
    ('Retail', 'active'),
    ('Showroom', 'active')
ON CONFLICT (name) DO NOTHING;

-- Insert default departments
INSERT INTO departments (name, status) VALUES
    ('Engine', 'active'),
    ('Electrical', 'active'),
    ('Body & Paint', 'active'),
    ('AC & Heating', 'active'),
    ('Interior', 'active')
ON CONFLICT (name) DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicle_types_updated_at
    BEFORE UPDATE ON vehicle_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for vehicle_types
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on vehicle_types for authenticated users" ON vehicle_types;
CREATE POLICY "Allow all operations on vehicle_types for authenticated users"
ON vehicle_types
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable Row Level Security for departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on departments for authenticated users" ON departments;
CREATE POLICY "Allow all operations on departments for authenticated users"
ON departments
FOR ALL
USING (true)
WITH CHECK (true);

-- Show confirmation
SELECT '✅ Vehicle Types and Departments tables created successfully with RLS policies!' as result;

