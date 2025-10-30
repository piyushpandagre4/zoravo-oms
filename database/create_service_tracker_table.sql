-- Drop existing table if it has wrong structure
DROP TABLE IF EXISTS service_tracker CASCADE;
DROP TABLE IF EXISTS service_tracker_comments CASCADE;
DROP TABLE IF EXISTS service_tracker_attachments CASCADE;

-- Create Service Tracker table
-- This table stores all service job records

CREATE TABLE service_tracker (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modal_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_number VARCHAR(20) NOT NULL,
    service_description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'new_complaint',
    scheduled_date TIMESTAMP WITH TIME ZONE,
    attachments_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add check constraint separately
ALTER TABLE service_tracker 
ADD CONSTRAINT service_tracker_status_check 
CHECK (status IN ('new_complaint', 'under_inspection', 'sent_to_service_centre', 'received', 'completed'));

-- Create indexes
CREATE INDEX idx_service_tracker_status ON service_tracker(status);
CREATE INDEX idx_service_tracker_customer_name ON service_tracker(customer_name);
CREATE INDEX idx_service_tracker_registration_number ON service_tracker(registration_number);
CREATE INDEX idx_service_tracker_scheduled_date ON service_tracker(scheduled_date);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_service_tracker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_service_tracker_updated_at ON service_tracker;
CREATE TRIGGER update_service_tracker_updated_at
BEFORE UPDATE ON service_tracker
FOR EACH ROW
EXECUTE FUNCTION update_service_tracker_updated_at();

-- Create comments table for service tracker
CREATE TABLE service_tracker_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_tracker_id UUID REFERENCES service_tracker(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'service_manager',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_service_tracker_comments_service_id ON service_tracker_comments(service_tracker_id);
CREATE INDEX idx_service_tracker_comments_created_at ON service_tracker_comments(created_at);

-- Create attachments table for service tracker
CREATE TABLE service_tracker_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_tracker_id UUID REFERENCES service_tracker(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_service_tracker_attachments_service_id ON service_tracker_attachments(service_tracker_id);

SELECT '✅ Service Tracker table created!' as result;

