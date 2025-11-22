# Daily Vehicle Report Automation Setup

This document explains how to set up the automated daily vehicle report system that sends PDF reports to managers and coordinators.

## Overview

The system automatically sends daily PDF reports via **email** to all managers and coordinators at **7:30 PM IST** containing:
- **Vehicles scheduled for tomorrow** (based on `estimated_completion_date`)
- **Pending vehicles** (vehicles with status = 'pending')

Each manager/coordinator receives a personalized PDF report with only the vehicles assigned to them.

## Features

- ✅ Automated daily delivery via **Email AND WhatsApp** at **7:30 PM IST** (14:00 UTC)
- ✅ Professional PDF reports with complete vehicle details
- ✅ **Multi-tenant support**: Processes ALL active tenants automatically
- ✅ **Tenant-specific WhatsApp configuration**: Each tenant can have its own WhatsApp API settings
- ✅ **Global config fallback**: If tenant-specific config not found, uses global WhatsApp settings
- ✅ Filters vehicles by assigned manager/coordinator
- ✅ Includes customer info, vehicle specs, status, priority, and more
- ✅ Dual delivery: Sends to both Email and WhatsApp simultaneously
- ✅ WhatsApp PDF attachment support
- ✅ Comprehensive logging with tenant context for easy debugging
- ✅ Phone number auto-formatting (adds +91 for Indian numbers)

## API Endpoint

**URL:** `/api/reports/daily-vehicle-report`

**Method:** `POST` or `GET`

**Authentication:** Optional (recommended for production)

### Query Parameters

- `tenantId` (optional): Process reports for a specific tenant only
- `test` (optional): Set to `true` to send test reports even if no vehicles found

### Headers (Optional)

- `Authorization: Bearer <CRON_SECRET>` - Required if `CRON_SECRET` is set in environment variables

## Environment Variables

Add these to your `.env.local` or deployment environment:

```env
# Required for email sending (fallback)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=social@sunkool.in

# Required for WhatsApp sending (primary method)
# Configure WhatsApp settings in Settings → Notifications
# Or set these if using environment variables:
# WHATSAPP_ENABLED=true
# WHATSAPP_PROVIDER=messageautosender
# WHATSAPP_API_KEY=your_api_key
# WHATSAPP_USER_ID=your_user_id
# WHATSAPP_PASSWORD=your_password

# Optional: For securing the cron endpoint
CRON_SECRET=your_secure_random_string
```

**Note:** 
- WhatsApp configuration is stored in the database (`system_settings` table) and can be configured through the Settings page
- Phone numbers for managers/coordinators should be stored in `notification_preferences` table with `whatsapp_enabled = true`
- If phone number is not found in `notification_preferences`, the system will check the `profiles` table for a phone number
- Reports are sent to **BOTH Email and WhatsApp** (if phone number available) - not as fallback

## Setting Up Automated Daily Execution

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

1. The `vercel.json` file is already configured in the project root:

```json
{
  "crons": [
    {
      "path": "/api/reports/daily-vehicle-report",
      "schedule": "0 14 * * *"
    },
    {
      "path": "/api/cron/check-subscription-expiry",
      "schedule": "0 0 * * *"
    }
  ]
}
```

- Daily reports run at **14:00 UTC** (7:30 PM IST) - sends PDF reports to Coordinators and Managers
- Subscription expiry check runs at **00:00 UTC** (5:30 AM IST) - automatically deactivates expired tenants

2. Deploy to Vercel - cron jobs are automatically set up.

### Option 2: External Cron Service (cron-job.org, EasyCron, etc.)

1. Sign up for a cron service
2. Create a new cron job with:
   - **URL:** `https://your-domain.com/api/reports/daily-vehicle-report`
   - **Schedule:** Daily at your preferred time (e.g., 8:00 AM IST)
   - **Method:** POST
   - **Headers:** 
     ```
     Authorization: Bearer your_cron_secret
     Content-Type: application/json
     ```

### Option 3: Server Cron (For self-hosted deployments)

Add to your server's crontab:

```bash
# Run daily at 8:00 AM IST
0 8 * * * curl -X POST https://your-domain.com/api/reports/daily-vehicle-report \
  -H "Authorization: Bearer your_cron_secret" \
  -H "Content-Type: application/json"
```

### Option 4: Manual Testing

You can manually trigger the report by visiting:

```
https://your-domain.com/api/reports/daily-vehicle-report?test=true
```

Or using curl:

```bash
curl -X POST https://your-domain.com/api/reports/daily-vehicle-report?test=true \
  -H "Authorization: Bearer your_cron_secret"
```

## How It Works

1. **Fetches Active Tenants**: Gets all active tenants from the database
2. **Finds Managers/Coordinators**: For each tenant, finds all users with role 'manager' or 'coordinator'
3. **Queries Vehicles**: For each manager/coordinator:
   - Finds vehicles with `estimated_completion_date` = tomorrow
   - Finds vehicles with `status` = 'pending'
   - Filters by `assigned_manager_id` matching the manager's user ID
4. **Generates PDF**: Creates a professional PDF report with all vehicle details
5. **Sends via Email** (Always):
   - Sends email with PDF attachment to manager's email address
   - Includes professional HTML template with summary
6. **Sends via WhatsApp** (If phone number available):
   - Gets manager's phone number from `notification_preferences` or `profiles` table
   - Sends text message with summary
   - Sends PDF as document attachment
   - Both Email and WhatsApp are sent independently (not fallback)

## PDF Report Contents

Each PDF includes:

- **Header**: Report date, tenant name, manager name
- **Next Day Vehicles Section**: All vehicles scheduled for tomorrow
- **Pending Vehicles Section**: All pending vehicles
- **Vehicle Details**: For each vehicle:
  - Customer name and phone
  - Vehicle registration number, model, make, color, year
  - Expected completion date
  - Status and priority
  - Issues reported
  - Accessories requested
  - Estimated cost
  - Notes
- **Summary**: Total counts

## Delivery Methods

### Email Delivery
- **Always sent** to manager's email address
- Professional HTML template with summary statistics
- PDF attachment included
- Clear call-to-action

### WhatsApp Delivery
- **Sent if phone number is available** and WhatsApp is enabled
- Text message with summary statistics
- PDF document attachment
- Formatted with emojis for better readability

**Note:** Both Email and WhatsApp are sent **simultaneously and independently**. If one fails, the other still succeeds.

## Troubleshooting

### Reports Not Being Sent

1. **Check Environment Variables**: Ensure `RESEND_API_KEY` is set
2. **Check Logs**: Review server logs for errors
3. **Test Manually**: Use the `?test=true` parameter to trigger manually
4. **Verify Managers Exist**: Ensure managers/coordinators are properly linked to tenants in `tenant_users` table
5. **Check Vehicle Assignments**: Verify vehicles have `assigned_manager_id` set correctly

### PDF Generation Issues

- Ensure `pdfkit` package is installed: `npm install pdfkit @types/pdfkit`
- Check server has sufficient memory for PDF generation
- Review error logs for specific PDF generation errors

### Email Delivery Issues

- Verify Resend API key is valid
- Check Resend dashboard for delivery status
- Ensure `RESEND_FROM_EMAIL` is a verified domain in Resend
- Check spam folders

### WhatsApp Delivery Issues

- **Verify WhatsApp is enabled**: Check Settings → Notifications for each tenant
- **Phone Number Setup**: 
  - Phone numbers should be stored in `notification_preferences` table with `whatsapp_enabled = true`
  - If tenant-specific preferences not found, system checks `profiles` table
  - Phone numbers should include country code (e.g., +919876543210)
  - System automatically formats Indian numbers (+91 prefix)
- **WhatsApp Configuration**:
  - Each tenant can have its own WhatsApp config in `system_settings` table
  - If tenant-specific config not found, system falls back to global config (null tenant_id)
  - Verify API key, user ID, and password are configured correctly
- **Multi-Tenant Support**:
  - System processes ALL active tenants automatically
  - Each tenant's WhatsApp config is loaded independently
  - Phone numbers are fetched with tenant context
- **Review Logs**: Check server logs for detailed WhatsApp sending status per tenant
- **Note**: WhatsApp delivery failure does not affect Email delivery - both are sent independently

## Database Requirements

The system requires:

1. **vehicle_inward** table with:
   - `tenant_id` (UUID)
   - `assigned_manager_id` (UUID, references profiles.id)
   - `estimated_completion_date` (DATE)
   - `status` (VARCHAR)
   - All vehicle and customer fields

2. **tenant_users** table with:
   - `tenant_id` (UUID)
   - `user_id` (UUID, references profiles.id)
   - `role` (VARCHAR: 'manager' or 'coordinator')

3. **profiles** table with:
   - `id` (UUID, references auth.users.id)
   - `email` (TEXT)
   - `name` (TEXT)
   - `role` (TEXT)

## Security Considerations

1. **Cron Secret**: Always set `CRON_SECRET` in production to prevent unauthorized access
2. **Rate Limiting**: Consider adding rate limiting for the endpoint
3. **Error Handling**: Errors are logged but don't expose sensitive information
4. **Multi-Tenant Isolation**: Each tenant's data is properly isolated

## Customization

### Change Report Time

Edit the cron schedule in `vercel.json` or your cron service:
- `0 8 * * *` = 8:00 AM UTC daily
- `0 9 * * *` = 9:00 AM UTC daily
- Adjust timezone as needed

### Modify PDF Template

Edit `lib/pdf-service.ts` to customize:
- Colors and styling
- Layout and sections
- Additional fields

### Modify Email Template

Edit `lib/email-service.ts` function `generateDailyReportEmailHTML()` to customize:
- Email design
- Content and messaging
- Additional information

## Support

For issues or questions:
- Check server logs
- Review Resend dashboard for email delivery status
- Test with `?test=true` parameter
- Contact support: social@sunkool.in

