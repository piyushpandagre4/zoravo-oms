-- Create notification_queue table for async WhatsApp processing
-- This decouples WhatsApp notifications from user actions, improving performance

-- Step 1: Create notification_queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_tenant ON notification_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_event_type ON notification_queue(event_type);

-- Step 3: Enable RLS
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist
DROP POLICY IF EXISTS "Tenant users can insert notifications" ON notification_queue;
DROP POLICY IF EXISTS "Tenant users can view their notifications" ON notification_queue;
DROP POLICY IF EXISTS "Service role can process notifications" ON notification_queue;
DROP POLICY IF EXISTS "Super admins can view all notifications" ON notification_queue;

-- Step 5: Create INSERT policy - Allow any authenticated tenant user to enqueue notifications
CREATE POLICY "Tenant users can insert notifications" ON notification_queue
  FOR INSERT
  WITH CHECK (
    -- Super admin can insert for any tenant
    is_super_admin()
    OR
    -- Authenticated users can insert for their own tenant
    (
      auth.uid() IS NOT NULL
      AND (
        -- Check if tenant_id is in user's tenant_ids array
        tenant_id = ANY(get_user_tenant_ids())
        OR
        -- Direct check: tenant_id exists in tenant_users for this user
        tenant_id IN (
          SELECT tu.tenant_id 
          FROM tenant_users tu
          WHERE tu.user_id = auth.uid()
        )
      )
    )
  );

-- Step 6: Create SELECT policy - Users can view notifications for their tenant
CREATE POLICY "Tenant users can view their notifications" ON notification_queue
  FOR SELECT
  USING (
    -- Super admin can view all
    is_super_admin()
    OR
    -- Users can view notifications for their tenant
    tenant_id = ANY(get_user_tenant_ids())
  );

-- Step 7: Create policy for service role (background worker) to process notifications
-- This allows the background worker to update notification status
CREATE POLICY "Service role can process notifications" ON notification_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Step 8: Super admin policy (explicit access)
CREATE POLICY "Super admins can view all notifications" ON notification_queue
  FOR SELECT
  USING (is_super_admin());

-- Step 9: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_notification_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_queue_updated_at_trigger ON notification_queue;
CREATE TRIGGER update_notification_queue_updated_at_trigger
  BEFORE UPDATE ON notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_queue_updated_at();

-- Step 10: Verify table and policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notification_queue'
ORDER BY policyname;

