-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('installer', 'coordinator', 'accountant', 'manager')),
    whatsapp_enabled BOOLEAN DEFAULT true,
    phone_number VARCHAR(20), -- Format: +919876543210
    notify_on_vehicle_created BOOLEAN DEFAULT true,
    notify_on_status_updated BOOLEAN DEFAULT true,
    notify_on_installation_complete BOOLEAN DEFAULT true,
    notify_on_invoice_added BOOLEAN DEFAULT true,
    notify_on_accountant_complete BOOLEAN DEFAULT true,
    notify_on_vehicle_delivered BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_role ON notification_preferences(role);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_whatsapp_enabled ON notification_preferences(whatsapp_enabled);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at 
BEFORE UPDATE ON notification_preferences 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Admins can view all notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Admins can manage all notification preferences" ON notification_preferences;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own notification preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Admins can view all preferences
CREATE POLICY "Admins can view all notification preferences" ON notification_preferences
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can manage all preferences
CREATE POLICY "Admins can manage all notification preferences" ON notification_preferences
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create message templates table
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) UNIQUE NOT NULL,
    template TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for event_type
CREATE INDEX IF NOT EXISTS idx_message_templates_event_type ON message_templates(event_type);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
CREATE TRIGGER update_message_templates_updated_at 
BEFORE UPDATE ON message_templates 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then recreate
DROP POLICY IF EXISTS "Admins can manage message templates" ON message_templates;

-- Policy: Admins can manage all templates
CREATE POLICY "Admins can manage message templates" ON message_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Insert default message templates
INSERT INTO message_templates (event_type, template)
VALUES 
    ('vehicle_inward_created', '🚗 *New Vehicle Entry*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nStatus: Pending\n\nPlease check the dashboard for details.'),
    ('installation_complete', '✅ *Installation Complete*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nAll products have been installed successfully.\n\nReady for accountant review.'),
    ('invoice_number_added', '🧾 *Invoice Number Added*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nInvoice number has been set by accountant.\n\nPlease check the dashboard for details.'),
    ('accountant_completed', '✓ *Accountant Completed*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nInvoice processing completed.\n\nReady for delivery.'),
    ('vehicle_delivered', '🎉 *Vehicle Delivered*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nVehicle has been marked as delivered.\n\nThank you for your work!')
ON CONFLICT (event_type) DO NOTHING;

-- Insert default system settings for WhatsApp notifications
INSERT INTO system_settings (setting_key, setting_value, setting_group)
VALUES 
    ('whatsapp_enabled', 'false', 'whatsapp_notifications'),
    ('whatsapp_provider', 'messageautosender', 'whatsapp_notifications'),
    ('whatsapp_user_id', '', 'whatsapp_notifications'),
    ('whatsapp_password', '', 'whatsapp_notifications'),
    ('whatsapp_api_key', '', 'whatsapp_notifications'),
    ('whatsapp_from_number', '', 'whatsapp_notifications'),
    ('whatsapp_account_sid', '', 'whatsapp_notifications'),
    ('whatsapp_auth_token', '', 'whatsapp_notifications'),
    ('whatsapp_business_account_id', '', 'whatsapp_notifications'),
    ('whatsapp_access_token', '', 'whatsapp_notifications'),
    ('whatsapp_webhook_url', '', 'whatsapp_notifications'),
    ('whatsapp_api_secret', '', 'whatsapp_notifications')
ON CONFLICT (setting_key) DO NOTHING;

