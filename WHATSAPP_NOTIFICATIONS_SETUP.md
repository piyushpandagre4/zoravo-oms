# WhatsApp Notifications Setup Guide

## Overview

The WhatsApp notification system sends automated messages to Installers, Coordinators, Accountants, and Managers based on workflow events in the ZORAVO OMS system.

## Workflow Events

The system sends notifications for the following events:

1. **Vehicle Inward Created** - When coordinator creates a new vehicle entry
   - Notifies: Installers, Managers, Accountants

2. **Installation Complete** - When installer marks all products as complete
   - Notifies: Managers, Accountants

3. **Invoice Number Added** - When accountant adds an invoice number
   - Notifies: Managers

4. **Accountant Completed** - When accountant marks entry as complete
   - Notifies: Coordinators, Managers

5. **Vehicle Delivered** - When coordinator marks vehicle as delivered
   - Notifies: Managers, Accountants

## Database Setup

Run the following SQL in your Supabase SQL Editor:

```sql
-- File: database/create_notification_preferences.sql
```

This creates:
- `notification_preferences` table for user preferences
- Default system settings for WhatsApp configuration
- RLS policies for secure access

## Configuration Steps

### Step 1: Access Settings

1. Log in as **Admin**
2. Navigate to **Settings** → **Notifications** tab

### Step 2: Configure WhatsApp Provider

Choose one of four providers:

#### Option A: MessageAutoSender (Recommended)

1. Log in to [MessageAutoSender](https://app.messageautosender.com/)
2. Go to API Keys section to get your API Key
3. Fill in:
   - **User ID**: Your MessageAutoSender User ID
   - **Password**: Your MessageAutoSender Password
   - **API Key**: Your MessageAutoSender API Key

#### Option B: Twilio

1. Sign up for [Twilio](https://www.twilio.com/)
2. Get your WhatsApp-enabled phone number
3. Get your Account SID and Auth Token from Twilio Dashboard
4. Fill in:
   - **From Number**: Your Twilio WhatsApp number (e.g., +14155238886)
   - **Account SID**: Your Twilio Account SID
   - **Auth Token**: Your Twilio Auth Token

#### Option C: WhatsApp Cloud API

1. Set up [WhatsApp Business Account](https://business.facebook.com/)
2. Get your Business Account ID
3. Generate an Access Token
4. Fill in:
   - **From Number**: Your WhatsApp Business number
   - **Business Account ID**: Your WhatsApp Business Account ID
   - **Access Token**: Your access token

#### Option D: Custom Webhook

1. Set up your own WhatsApp API endpoint
2. Fill in:
   - **Webhook URL**: Your API endpoint URL
   - **API Key** (Optional): For authentication
   - **API Secret** (Optional): For authentication

### Step 3: Enable Notifications

1. Toggle **"Enable WhatsApp Notifications"** to ON
2. Fill in all required fields based on your provider
3. Click **"Save Configuration"**

### Step 4: Configure User Preferences

1. Scroll to **"Notification Preferences by Role"**
2. For each user, configure:
   - **Enable/Disable**: Toggle WhatsApp notifications on/off
   - **Event Checkboxes**: Select which events should trigger notifications
3. **Important**: Ensure users have phone numbers in their profiles (with country code, e.g., +919876543210)
4. Click **"Save Preferences"**

### Step 5: Customize Message Templates

1. Scroll to **"Notification Message Templates"** section
2. Click **"Edit Template"** for any event
3. Customize the message using variables:
   - `{{vehicleNumber}}` - Vehicle registration number
   - `{{customerName}}` - Customer name
   - `{{vehicleId}}` - Short vehicle ID
   - `{{status}}` - Current status
   - `{{recipientName}}` - Recipient's name
   - `{{recipientRole}}` - Recipient's role
4. Click **"Done Editing"** after making changes
5. Click **"Save All Templates"** to persist your changes

## Phone Number Format

Phone numbers must be in international format with country code:
- ✅ Correct: `+919876543210` (India)
- ✅ Correct: `+14155551234` (USA)
- ❌ Incorrect: `9876543210` (missing country code)
- ❌ Incorrect: `919876543210` (missing +)

## User Phone Number Setup

To add phone numbers for users:

1. Go to **Settings** → **Management** tab
2. Edit each user (Installer, Coordinator, Accountant, Manager)
3. Add phone number in international format
4. The notification preferences will automatically use these phone numbers

## Testing

After setup, test notifications:

1. Create a new vehicle entry as Coordinator
   - Installers and Managers should receive WhatsApp notifications

2. Mark all products as complete as Installer
   - Coordinators, Managers, and Accountants should receive notifications

3. Add invoice number as Accountant
   - Managers should receive notifications

## Troubleshooting

### Notifications Not Sending

1. **Check Configuration**:
   - Verify WhatsApp notifications are enabled
   - Verify all required fields are filled
   - Check phone number format (must include country code)

2. **Check User Preferences**:
   - Ensure user has WhatsApp enabled
   - Ensure user has phone number set
   - Verify event checkboxes are checked

3. **Check Provider**:
   - **Twilio**: Verify Account SID and Auth Token are correct
   - **Cloud API**: Verify Access Token is valid
   - **Custom**: Check webhook URL is accessible

4. **Check Browser Console**:
   - Look for error messages in browser developer console
   - Check network tab for failed API calls

### Provider-Specific Issues

#### Twilio
- Ensure your Twilio account has WhatsApp enabled
- Verify your WhatsApp number is verified in Twilio
- Check Twilio Console for error logs

#### WhatsApp Cloud API
- Ensure your Business Account is verified
- Verify access token hasn't expired
- Check Facebook Developer Console for errors

#### Custom Webhook
- Verify your endpoint accepts POST requests
- Check your endpoint logs for incoming requests
- Ensure your endpoint returns proper success/error responses

## Notification Message Templates

Message templates are fully customizable by Admin in Settings → Notifications section. Default templates include:

- **Vehicle Created**: "🚗 *New Vehicle Entry*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nStatus: Pending\n\nPlease check the dashboard for details."
- **Installation Complete**: "✅ *Installation Complete*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nAll products have been installed successfully.\n\nReady for accountant review."
- **Invoice Added**: "🧾 *Invoice Number Added*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nInvoice number has been set by accountant.\n\nPlease check the dashboard for details."
- **Accountant Complete**: "✓ *Accountant Completed*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nInvoice processing completed.\n\nReady for delivery."
- **Vehicle Delivered**: "🎉 *Vehicle Delivered*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nVehicle has been marked as delivered.\n\nThank you for your work!"

All templates can be edited in the Settings → Notifications → Message Templates section.

## Security Notes

- All credentials are stored securely in `system_settings` table
- Sensitive fields (tokens, secrets) are encrypted in transit
- Only Admin users can configure notification settings
- Users can only view their own notification preferences

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database tables are created correctly
3. Test with a single user first
4. Check provider-specific documentation (Twilio/WhatsApp Cloud API)

