-- Create User Management System for Zoravo OMS
-- Run this script in Supabase SQL Editor

-- 1. Create user_management table for all users except Admin
CREATE TABLE IF NOT EXISTS user_management (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('coordinator', 'sales_man', 'installer', 'accountant')),
    department VARCHAR(255),
    specialization VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    join_date DATE,
    password_hash VARCHAR(255),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create admin table (single admin user)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Keep locations table (already exists or create if needed)
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

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_management_role ON user_management(role);
CREATE INDEX IF NOT EXISTS idx_user_management_status ON user_management(status);
CREATE INDEX IF NOT EXISTS idx_user_management_email ON user_management(email);
CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);

-- 5. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_management_updated_at ON user_management;
CREATE TRIGGER update_user_management_updated_at
    BEFORE UPDATE ON user_management
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Insert sample data for other roles
INSERT INTO user_management (name, email, phone, role, department, status, join_date) VALUES
    ('Priya Sharma', 'priya@zoravo.com', '+91 9876543211', 'coordinator', 'Operations', 'active', '2022-12-01'),
    ('Rahul Verma', 'rahul@zoravo.com', '+91 8765432110', 'sales_man', 'Sales', 'active', '2023-01-10'),
    ('Anita Singh', 'anita@zoravo.com', '+91 7654321099', 'coordinator', 'Service', 'active', '2023-02-15'),
    ('Vikram Patel', 'vikram@zoravo.com', '+91 6543210987', 'installer', 'AC & Interior', 'active', '2023-04-05'),
    ('Kiran Mehta', 'kiran@zoravo.com', '+91 9876543212', 'accountant', 'Finance', 'active', '2023-03-10')
ON CONFLICT (email) DO NOTHING;

-- 8. Insert sample locations
INSERT INTO locations (name, address, capacity, status, established) VALUES
    ('Main Workshop', '123 Industrial Area, Nagpur', 20, 'active', '2020-01-01'),
    ('Service Center 1', '456 Commercial Street, Nagpur', 15, 'active', '2021-06-15'),
    ('Express Service', '789 Highway Road, Nagpur', 10, 'maintenance', '2022-03-20')
ON CONFLICT DO NOTHING;

-- 9. Important: Insert admin user (change credentials in production!)
-- For demo: username: admin, password: admin123
INSERT INTO admin_users (name, email, phone, password_hash) VALUES
    ('Demo Admin', 'admin@zoravo.com', '+91 9876543210', 'demo_hash_change_in_production')
ON CONFLICT (email) DO NOTHING;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'User Management System created successfully!';
    RAISE NOTICE 'Admin User: admin@zoravo.com';
    RAISE NOTICE 'Roles: coordinator, sales_man, installer, accountant';
END $$;

