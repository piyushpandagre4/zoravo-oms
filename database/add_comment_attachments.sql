-- Add support for comment-specific attachments

-- Create comment attachments table
CREATE TABLE IF NOT EXISTS service_tracker_comment_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES service_tracker_comments(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment_id ON service_tracker_comment_attachments(comment_id);

-- Add attachments_count to comments table to track attachments per comment
ALTER TABLE service_tracker_comments ADD COLUMN IF NOT EXISTS attachments_count INTEGER DEFAULT 0;

SELECT '✅ Comment attachments support added!' as result;

