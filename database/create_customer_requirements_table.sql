-- Customer Requirements Management System

-- Create Customer Requirements table
CREATE TABLE IF NOT EXISTS customer_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(255) NOT NULL,
    customer_number VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    attachments_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop existing constraints if they exist
ALTER TABLE customer_requirements 
DROP CONSTRAINT IF EXISTS customer_requirements_status_check;

ALTER TABLE customer_requirements 
DROP CONSTRAINT IF EXISTS customer_requirements_priority_check;

-- Add check constraints for status and priority
ALTER TABLE customer_requirements 
ADD CONSTRAINT customer_requirements_status_check 
CHECK (status IN ('pending', 'in_progress', 'ordered', 'procedure', 'contacted', 'completed'));

ALTER TABLE customer_requirements 
ADD CONSTRAINT customer_requirements_priority_check 
CHECK (priority IN ('low', 'medium', 'high'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_requirements_status ON customer_requirements(status);
CREATE INDEX IF NOT EXISTS idx_customer_requirements_priority ON customer_requirements(priority);
CREATE INDEX IF NOT EXISTS idx_customer_requirements_customer_name ON customer_requirements(customer_name);
CREATE INDEX IF NOT EXISTS idx_customer_requirements_created_at ON customer_requirements(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_customer_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_requirements_updated_at ON customer_requirements;
CREATE TRIGGER update_customer_requirements_updated_at
BEFORE UPDATE ON customer_requirements
FOR EACH ROW
EXECUTE FUNCTION update_customer_requirements_updated_at();

-- Create comments table for requirements
CREATE TABLE IF NOT EXISTS customer_requirements_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID REFERENCES customer_requirements(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_requirements_comments_requirement_id ON customer_requirements_comments(requirement_id);
CREATE INDEX IF NOT EXISTS idx_customer_requirements_comments_created_at ON customer_requirements_comments(created_at);

-- Create attachments table for requirements
CREATE TABLE IF NOT EXISTS customer_requirements_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID REFERENCES customer_requirements(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_requirements_attachments_requirement_id ON customer_requirements_attachments(requirement_id);

-- Create comment attachments table
CREATE TABLE IF NOT EXISTS customer_requirements_comment_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES customer_requirements_comments(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_requirements_comment_attachments_comment_id ON customer_requirements_comment_attachments(comment_id);

-- Add attachments_count to comments
ALTER TABLE customer_requirements_comments 
ADD COLUMN IF NOT EXISTS attachments_count INTEGER DEFAULT 0;

SELECT '✅ Customer Requirements tables created!' as result;

