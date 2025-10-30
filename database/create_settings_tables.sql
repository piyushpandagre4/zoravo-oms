-- Create Settings Tables for Zoravo OMS
-- Run this script in Supabase SQL Editor

-- 1. Create installers table
CREATE TABLE IF NOT EXISTS installers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    specialization VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    join_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create managers table
CREATE TABLE IF NOT EXISTS managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    department VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    join_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    capacity INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    established DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_group VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_installers_status ON installers(status);
CREATE INDEX IF NOT EXISTS idx_managers_status ON managers(status);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
CREATE INDEX IF NOT EXISTS idx_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_group ON system_settings(setting_group);

-- 6. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_installers_updated_at ON installers;
CREATE TRIGGER update_installers_updated_at
    BEFORE UPDATE ON installers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_managers_updated_at ON managers;
CREATE TRIGGER update_managers_updated_at
    BEFORE UPDATE ON managers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Insert default system settings (optional - you can customize these)
INSERT INTO system_settings (setting_key, setting_value, setting_group) VALUES
    ('profile_name', 'Demo Admin', 'profile'),
    ('profile_email', 'info@zoravo.com', 'profile'),
    ('profile_phone', '+91 9876543210', 'profile'),
    ('company_name', 'R S Cars - Nagpur', 'company'),
    ('company_address', '123 Main Street, Nagpur', 'company'),
    ('company_phone', '+91 9876543210', 'company'),
    ('company_email', 'info@zoravo.com', 'company'),
    ('email_notifications', 'true', 'notifications'),
    ('sms_notifications', 'false', 'notifications'),
    ('push_notifications', 'true', 'notifications'),
    ('two_factor_auth', 'false', 'security'),
    ('session_timeout', '30', 'security'),
    ('password_expiry', '90', 'security')
ON CONFLICT (setting_key) DO NOTHING;

-- 9. Insert some sample data (optional)
-- Installers
INSERT INTO installers (name, phone, specialization, status, join_date) VALUES
    ('Rajesh Kumar', '+91 9876543210', 'Engine & Transmission', 'active', '2023-01-15'),
    ('Suresh Singh', '+91 8765432109', 'Electrical & Electronics', 'active', '2023-02-20'),
    ('Amit Sharma', '+91 7654321098', 'Body & Paint', 'inactive', '2023-03-10'),
    ('Vikram Patel', '+91 6543210987', 'AC & Interior', 'active', '2023-04-05')
ON CONFLICT DO NOTHING;

-- Managers
INSERT INTO managers (name, phone, department, status, join_date) VALUES
    ('Priya Sharma', '+91 9876543211', 'Operations', 'active', '2022-12-01'),
    ('Rahul Verma', '+91 8765432110', 'Service', 'active', '2023-01-10'),
    ('Anita Singh', '+91 7654321099', 'Quality Control', 'active', '2023-02-15')
ON CONFLICT DO NOTHING;

-- Locations
INSERT INTO locations (name, address, capacity, status, established) VALUES
    ('Main Workshop', '123 Industrial Area, Nagpur', 20, 'active', '2020-01-01'),
    ('Service Center 1', '456 Commercial Street, Nagpur', 15, 'active', '2021-06-15'),
    ('Express Service', '789 Highway Road, Nagpur', 10, 'maintenance', '2022-03-20')
ON CONFLICT DO NOTHING;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Settings tables created successfully!';
END $$;

