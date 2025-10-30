-- Create Locations Table for Vehicle Inward Form
-- This table stores all workshop/service locations

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    capacity VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    established DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default locations
INSERT INTO locations (name, address, capacity, status, established) VALUES
    ('Main Workshop', '123 Industrial Area, Nagpur', '20 vehicles', 'active', '2020-01-15'),
    ('Service Center 1', '456 Commercial Street, Nagpur', '15 vehicles', 'active', '2021-03-10'),
    ('Express Service', '789 Highway Road, Nagpur', '10 vehicles', 'active', '2022-03-20')
ON CONFLICT DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
CREATE INDEX IF NOT EXISTS idx_locations_created ON locations(created_at);

-- Enable Row Level Security
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on locations for authenticated users" ON locations;

-- Create RLS policies to allow all operations
CREATE POLICY "Allow all operations on locations for authenticated users"
ON locations
FOR ALL
USING (true)
WITH CHECK (true);

-- Show confirmation
SELECT '✅ Locations table created successfully with RLS policies!' as result;

