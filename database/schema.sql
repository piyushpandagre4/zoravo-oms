-- Zoravo OMS Database Schema
-- Car Accessories Workshop Management System

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    registration_number VARCHAR(20) UNIQUE NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(50),
    engine_number VARCHAR(100),
    chassis_number VARCHAR(100),
    vehicle_type VARCHAR(50),
    last_service_date DATE,
    next_service_date DATE,
    warranty_expiry DATE,
    insurance_expiry DATE,
    total_services INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicle inward table (for vehicle check-in/check-out)
CREATE TABLE vehicle_inward (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work orders table
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    assigned_to VARCHAR(255),
    start_date DATE,
    end_date DATE,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    due_date DATE,
    paid_date DATE,
    payment_method VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service trackers table
CREATE TABLE service_trackers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    checkpoint_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follow-ups table
CREATE TABLE follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    next_call_date DATE NOT NULL,
    outcome VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Requirements table
CREATE TABLE requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    requirement TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    estimated_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_vehicles_registration ON vehicles(registration_number);
CREATE INDEX idx_vehicle_inward_vehicle_id ON vehicle_inward(vehicle_id);
CREATE INDEX idx_vehicle_inward_status ON vehicle_inward(status);
CREATE INDEX idx_work_orders_vehicle_id ON work_orders(vehicle_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_invoices_vehicle_id ON invoices(vehicle_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_service_trackers_vehicle_id ON service_trackers(vehicle_id);
CREATE INDEX idx_follow_ups_customer_id ON follow_ups(customer_id);
CREATE INDEX idx_follow_ups_next_call_date ON follow_ups(next_call_date);
CREATE INDEX idx_requirements_customer_id ON requirements(customer_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_inward_updated_at BEFORE UPDATE ON vehicle_inward FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_trackers_updated_at BEFORE UPDATE ON service_trackers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON follow_ups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO customers (name, phone, email, address, city, state, pincode) VALUES
('Rajesh Kumar', '+91 9876543210', 'rajesh@example.com', '123 Civil Lines', 'Nagpur', 'Maharashtra', '440001'),
('Priya Sharma', '+91 8765432109', 'priya@example.com', '456 Sadar', 'Nagpur', 'Maharashtra', '440002'),
('Amit Singh', '+91 7654321098', 'amit@example.com', '789 Dharampeth', 'Nagpur', 'Maharashtra', '440003'),
('Sunita Patel', '+91 6543210987', 'sunita@example.com', '321 Sitabuldi', 'Nagpur', 'Maharashtra', '440004'),
('Vikram Joshi', '+91 5432109876', 'vikram@example.com', '654 Gandhibagh', 'Nagpur', 'Maharashtra', '440005');

-- Insert sample vehicles
INSERT INTO vehicles (customer_id, registration_number, make, model, year, color, engine_number, chassis_number, vehicle_type, last_service_date, next_service_date, warranty_expiry, insurance_expiry, total_services, status) VALUES
((SELECT id FROM customers WHERE name = 'Rajesh Kumar'), 'MH31AB1234', 'Honda', 'City', 2020, 'White', 'H123456789', 'CH123456789', 'Sedan', '2024-12-01', '2025-06-01', '2025-06-15', '2025-03-20', 3, 'in_workshop'),
((SELECT id FROM customers WHERE name = 'Priya Sharma'), 'MH31CD5678', 'Toyota', 'Innova', 2019, 'Silver', 'T234567890', 'CH234567890', 'SUV', '2025-01-10', '2025-04-10', '2024-12-31', '2025-05-15', 8, 'completed'),
((SELECT id FROM customers WHERE name = 'Amit Singh'), 'MH31EF9012', 'Maruti', 'Swift', 2021, 'Red', 'M345678901', 'CH345678901', 'Hatchback', '2024-11-15', '2025-05-15', '2025-08-20', '2025-02-10', 2, 'pending'),
((SELECT id FROM customers WHERE name = 'Sunita Patel'), 'MH31GH3456', 'Hyundai', 'Creta', 2020, 'Blue', 'H456789012', 'CH456789012', 'SUV', '2024-10-20', '2025-04-20', '2025-07-25', '2025-01-30', 4, 'in_workshop'),
((SELECT id FROM customers WHERE name = 'Vikram Joshi'), 'MH31IJ7890', 'Mahindra', 'XUV300', 2022, 'Black', 'M567890123', 'CH567890123', 'SUV', '2024-12-10', '2025-06-10', '2025-09-15', '2025-03-05', 1, 'in_workshop');

-- Insert sample work orders
INSERT INTO work_orders (vehicle_id, order_number, type, description, status, assigned_to, start_date, end_date, estimated_cost, actual_cost) VALUES
((SELECT id FROM vehicles WHERE registration_number = 'MH31AB1234'), 'WO001', 'Regular Service', 'Oil change, filter replacement, brake check', 'completed', 'Rajesh Kumar', '2025-01-15', '2025-01-16', 5000, 5000),
((SELECT id FROM vehicles WHERE registration_number = 'MH31AB1234'), 'WO002', 'AC Repair', 'AC compressor repair and gas refill', 'in_progress', 'Vikram Patel', '2025-01-18', NULL, 3000, NULL),
((SELECT id FROM vehicles WHERE registration_number = 'MH31CD5678'), 'WO003', 'Brake Service', 'Brake pad replacement and disc machining', 'completed', 'Amit Singh', '2025-01-10', '2025-01-12', 8000, 7500),
((SELECT id FROM vehicles WHERE registration_number = 'MH31EF9012'), 'WO004', 'AC Service', 'AC cleaning and gas refill', 'pending', 'Sunita Patel', '2025-01-20', NULL, 2500, NULL),
((SELECT id FROM vehicles WHERE registration_number = 'MH31GH3456'), 'WO005', 'Engine Overhaul', 'Complete engine service and parts replacement', 'in_progress', 'Rajesh Kumar', '2025-01-15', NULL, 15000, NULL);

-- Insert sample invoices
INSERT INTO invoices (vehicle_id, work_order_id, invoice_number, amount, tax_amount, total_amount, status, due_date, paid_date, payment_method, description) VALUES
((SELECT id FROM vehicles WHERE registration_number = 'MH31AB1234'), (SELECT id FROM work_orders WHERE order_number = 'WO001'), 'INV001', 5000, 900, 5900, 'paid', '2025-01-30', '2025-01-16', 'cash', 'Regular Service - WO001'),
((SELECT id FROM vehicles WHERE registration_number = 'MH31AB1234'), (SELECT id FROM work_orders WHERE order_number = 'WO002'), 'INV002', 3000, 540, 3540, 'pending', '2025-02-15', NULL, NULL, 'AC Repair - WO002'),
((SELECT id FROM vehicles WHERE registration_number = 'MH31CD5678'), (SELECT id FROM work_orders WHERE order_number = 'WO003'), 'INV003', 7500, 1350, 8850, 'paid', '2025-01-25', '2025-01-12', 'upi', 'Brake Service - WO003'),
((SELECT id FROM vehicles WHERE registration_number = 'MH31EF9012'), (SELECT id FROM work_orders WHERE order_number = 'WO004'), 'INV004', 2500, 450, 2950, 'overdue', '2025-01-15', NULL, NULL, 'AC Service - WO004'),
((SELECT id FROM vehicles WHERE registration_number = 'MH31GH3456'), (SELECT id FROM work_orders WHERE order_number = 'WO005'), 'INV005', 15000, 2700, 17700, 'pending', '2025-02-20', NULL, NULL, 'Engine Overhaul - WO005');

-- Insert sample service trackers
INSERT INTO service_trackers (vehicle_id, work_order_id, checkpoint_name, status, completed_at, notes) VALUES
((SELECT id FROM vehicles WHERE registration_number = 'MH31AB1234'), (SELECT id FROM work_orders WHERE order_number = 'WO001'), 'Engine Oil Change', 'completed', '2025-01-15 10:00:00', 'Oil changed successfully'),
((SELECT id FROM vehicles WHERE registration_number = 'MH31AB1234'), (SELECT id FROM work_orders WHERE order_number = 'WO001'), 'Filter Replacement', 'completed', '2025-01-15 11:00:00', 'Air and oil filters replaced'),
((SELECT id FROM vehicles WHERE registration_number = 'MH31AB1234'), (SELECT id FROM work_orders WHERE order_number = 'WO001'), 'Brake Check', 'completed', '2025-01-15 12:00:00', 'Brake system checked and adjusted'),
((SELECT id FROM vehicles WHERE registration_number = 'MH31AB1234'), (SELECT id FROM work_orders WHERE order_number = 'WO002'), 'AC Compressor Repair', 'in_progress', NULL, 'Compressor repair in progress'),
((SELECT id FROM vehicles WHERE registration_number = 'MH31CD5678'), (SELECT id FROM work_orders WHERE order_number = 'WO003'), 'Brake Pad Replacement', 'completed', '2025-01-10 14:00:00', 'Front brake pads replaced'),
((SELECT id FROM vehicles WHERE registration_number = 'MH31CD5678'), (SELECT id FROM work_orders WHERE order_number = 'WO003'), 'Disc Machining', 'completed', '2025-01-11 10:00:00', 'Brake discs machined');

-- Insert sample follow-ups
INSERT INTO follow_ups (vehicle_id, customer_id, subject, next_call_date, outcome, notes, status) VALUES
((SELECT id FROM vehicles WHERE registration_number = 'MH31AB1234'), (SELECT id FROM customers WHERE name = 'Rajesh Kumar'), 'Follow up on Honda City service', '2025-01-19', NULL, 'Check service completion status', 'pending'),
((SELECT id FROM vehicles WHERE registration_number = 'MH31CD5678'), (SELECT id FROM customers WHERE name = 'Priya Sharma'), 'Payment reminder for Toyota Innova', '2025-01-20', 'completed', 'Payment received', 'completed'),
((SELECT id FROM vehicles WHERE registration_number = 'MH31EF9012'), (SELECT id FROM customers WHERE name = 'Amit Singh'), 'Service completion confirmation', '2025-01-21', NULL, 'Confirm service completion', 'pending');

-- Insert sample requirements
INSERT INTO requirements (customer_id, vehicle_id, requirement, priority, status, estimated_cost, notes) VALUES
((SELECT id FROM customers WHERE name = 'Rajesh Kumar'), (SELECT id FROM vehicles WHERE registration_number = 'MH31AB1234'), 'Install Car Audio System', 'high', 'pending', 15000, 'Premium audio system installation'),
((SELECT id FROM customers WHERE name = 'Priya Sharma'), (SELECT id FROM vehicles WHERE registration_number = 'MH31CD5678'), 'Replace Windshield', 'medium', 'in_progress', 8000, 'Front windshield replacement'),
((SELECT id FROM customers WHERE name = 'Amit Singh'), (SELECT id FROM vehicles WHERE registration_number = 'MH31EF9012'), 'Install GPS Tracker', 'low', 'completed', 5000, 'GPS tracking device installation');

-- Insert sample payments
INSERT INTO payments (invoice_id, amount, payment_method, payment_date, reference_number, notes) VALUES
((SELECT id FROM invoices WHERE invoice_number = 'INV001'), 5900, 'cash', '2025-01-16', 'CASH001', 'Cash payment received'),
((SELECT id FROM invoices WHERE invoice_number = 'INV003'), 8850, 'upi', '2025-01-12', 'UPI123456789', 'UPI payment received');

