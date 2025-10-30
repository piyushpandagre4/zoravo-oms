-- Add support for comment attachments for vehicle_inward

-- Create comment attachments table for vehicle_inward comments
CREATE TABLE IF NOT EXISTS vehicle_inward_comment_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES vehicle_inward_comments(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_inward_comment_attachments_comment_id ON vehicle_inward_comment_attachments(comment_id);

-- Add attachments_count to comments table to track attachments per comment
ALTER TABLE vehicle_inward_comments ADD COLUMN IF NOT EXISTS attachments_count INTEGER DEFAULT 0;

SELECT '✅ Vehicle inward comment attachments support added!' as result;

