-- Create comments table for vehicle_inward
-- This allows admins, installers, coordinators, and accountants to add comments

CREATE TABLE IF NOT EXISTS vehicle_inward_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_inward_id UUID REFERENCES vehicle_inward(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vehicle_inward_comments_vehicle_id ON vehicle_inward_comments(vehicle_inward_id);
CREATE INDEX idx_vehicle_inward_comments_created_at ON vehicle_inward_comments(created_at);

SELECT '✅ Comments table created!' as result;

