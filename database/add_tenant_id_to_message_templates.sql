-- Add tenant_id support to message_templates table
-- This allows each tenant to have their own custom message templates

-- Step 1: Add tenant_id column if it doesn't exist
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Step 2: Drop the old unique constraint on event_type only
DROP INDEX IF EXISTS idx_message_templates_event_type;
ALTER TABLE message_templates 
DROP CONSTRAINT IF EXISTS message_templates_event_type_key;

-- Step 3: Create a new unique constraint on (tenant_id, event_type)
-- This allows:
-- - Each tenant to have their own templates (tenant_id IS NOT NULL)
-- - Global default templates (tenant_id IS NULL) for fallback
CREATE UNIQUE INDEX IF NOT EXISTS message_templates_tenant_event_unique 
ON message_templates (tenant_id, event_type);

-- Step 4: Create index for faster tenant-based queries
CREATE INDEX IF NOT EXISTS idx_message_templates_tenant_id 
ON message_templates(tenant_id);

-- Step 5: Update RLS policies to support tenant filtering
-- Drop old policy
DROP POLICY IF EXISTS "Admins can manage message templates" ON message_templates;

-- Policy: Users can view templates for their tenant(s) or global templates
CREATE POLICY "Users can view tenant message templates" ON message_templates
    FOR SELECT USING (
        -- Global templates (tenant_id IS NULL) are visible to all
        tenant_id IS NULL
        OR
        -- Tenant-specific templates are visible to users in that tenant
        tenant_id IN (
            SELECT tenant_id 
            FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Admins can manage templates for their tenant
CREATE POLICY "Admins can manage tenant message templates" ON message_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tenant_users
            WHERE tenant_users.user_id = auth.uid()
            AND tenant_users.tenant_id = message_templates.tenant_id
            AND tenant_users.role = 'admin'
        )
    );

-- Step 6: Migrate existing templates to be global (tenant_id = NULL)
-- This preserves existing templates as global defaults
UPDATE message_templates 
SET tenant_id = NULL 
WHERE tenant_id IS NULL; -- Only update if not already set

-- Success message
SELECT '✅ Message templates table updated for multi-tenant support!' as result;

