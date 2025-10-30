-- Create Call Follow Up table
-- This table stores all customer call follow-up records

CREATE TABLE IF NOT EXISTS call_follow_up (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caller_name VARCHAR(255) NOT NULL,
    caller_number VARCHAR(20) NOT NULL,
    person_to_contact VARCHAR(255) NOT NULL,
    operator VARCHAR(255) NOT NULL,
    assigned_to VARCHAR(255) NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'followed_up', 'not_received', 'completed')),
    notes TEXT,
    response_time INTEGER, -- Time to respond in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_follow_up_status ON call_follow_up(status);
CREATE INDEX IF NOT EXISTS idx_call_follow_up_priority ON call_follow_up(priority);
CREATE INDEX IF NOT EXISTS idx_call_follow_up_operator ON call_follow_up(operator);
CREATE INDEX IF NOT EXISTS idx_call_follow_up_assigned_to ON call_follow_up(assigned_to);
CREATE INDEX IF NOT EXISTS idx_call_follow_up_created_at ON call_follow_up(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_call_follow_up_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_call_follow_up_updated_at ON call_follow_up;
CREATE TRIGGER update_call_follow_up_updated_at
BEFORE UPDATE ON call_follow_up
FOR EACH ROW
EXECUTE FUNCTION update_call_follow_up_updated_at();

-- Create comments table for call follow up
CREATE TABLE IF NOT EXISTS call_follow_up_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_follow_up_id UUID REFERENCES call_follow_up(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'operator',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_call_follow_up_comments_call_id ON call_follow_up_comments(call_follow_up_id);
CREATE INDEX idx_call_follow_up_comments_created_at ON call_follow_up_comments(created_at);

SELECT '✅ Call Follow Up table created!' as result;

