# Subscription Expiry and Inactive Session Management

This document explains how the application automatically manages inactive sessions when subscription plans expire.

## Overview

The system automatically deactivates tenants when their subscription expires and maintains inactive session state to prevent access to the application.

## Features

- ✅ **Automatic Deactivation**: Tenants are automatically deactivated when subscription expires
- ✅ **Session Management**: Active sessions are blocked when subscription expires
- ✅ **Real-time Checks**: Subscription status is checked every 5 minutes during active sessions
- ✅ **Admin Access**: Admins can still access Settings page to submit payment proof
- ✅ **Daily Cron Job**: Automatic expiry check runs daily at midnight UTC (5:30 AM IST)

## How It Works

### 1. Automatic Deactivation (Cron Job)

A daily cron job runs at **00:00 UTC** (5:30 AM IST) that:
- Checks all tenants with subscriptions
- Identifies tenants with expired subscriptions (`billing_period_end < current_date`)
- Automatically sets `is_active = false` for expired tenants
- Updates `subscription_status = 'inactive'`

**API Endpoint:** `/api/cron/check-subscription-expiry`

### 2. Session Management (SubscriptionGuard)

The `SubscriptionGuard` component:
- Wraps all dashboard routes
- Checks subscription status on page load
- Re-checks every 5 minutes during active sessions
- Blocks access when tenant is inactive or subscription expired
- Shows blur overlay with message to submit payment proof
- Allows access to Settings and About pages even when expired

### 3. Access Control

**When Subscription Expires:**
- All dashboard pages are blocked (blurred overlay)
- Users see message: "Subscription Expired"
- Users can click "Go to Settings" to submit payment proof
- Settings and About pages remain accessible

**When Tenant is Inactive:**
- Same behavior as expired subscription
- Message shows: "Account Inactive"
- Admin users can still access Settings to reactivate

## API Endpoint

**URL:** `/api/cron/check-subscription-expiry`

**Method:** `POST` or `GET`

**Authentication:** Optional (recommended for production)

### Headers (Optional)
- `Authorization: Bearer <CRON_SECRET>` - Required if `CRON_SECRET` is set in environment variables

### Response
```json
{
  "success": true,
  "message": "Subscription expiry check completed",
  "deactivated": 2,
  "errors": []
}
```

## Environment Variables

Add to your `.env.local` or deployment environment:

```env
# Optional: For securing the cron endpoint
CRON_SECRET=your_secure_random_string
```

## Cron Schedule

The subscription expiry check is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-subscription-expiry",
      "schedule": "0 0 * * *"
    }
  ]
}
```

This runs daily at **00:00 UTC** (5:30 AM IST).

## Manual Testing

You can manually trigger the expiry check:

```bash
curl -X POST https://your-domain.com/api/cron/check-subscription-expiry \
  -H "Authorization: Bearer your_cron_secret"
```

Or visit in browser (if no auth required):
```
https://your-domain.com/api/cron/check-subscription-expiry
```

## Subscription Status Logic

A tenant is considered **active** if:
1. `is_active = true` AND
2. (No subscription exists OR subscription `billing_period_end` is in the future)

A tenant is considered **inactive** if:
1. `is_active = false` OR
2. Subscription exists AND `billing_period_end` < current date

## Reactivation

To reactivate a tenant:
1. Admin submits payment proof in Settings
2. Super Admin approves payment proof
3. Super Admin activates tenant (sets `is_active = true`)
4. Subscription is updated with new `billing_period_end` date

## Security Considerations

1. **Cron Secret**: Always set `CRON_SECRET` in production
2. **Session Validation**: Subscription status is checked on every page load
3. **Periodic Checks**: Status is re-validated every 5 minutes
4. **Multi-Tenant Isolation**: Each tenant's status is checked independently

## Troubleshooting

### Tenants Not Being Deactivated

1. **Check Cron Job**: Verify cron job is running in Vercel dashboard
2. **Check Logs**: Review server logs for errors
3. **Manual Trigger**: Test manually using the API endpoint
4. **Verify Subscription Dates**: Check `billing_period_end` dates in database

### Users Can Still Access After Expiry

1. **Check SubscriptionGuard**: Verify it's wrapping dashboard routes
2. **Check Session Storage**: Verify `current_tenant_id` is set correctly
3. **Check Database**: Verify `is_active` is set to `false` for expired tenants
4. **Clear Browser Cache**: Users may need to refresh page

### Periodic Checks Not Working

1. **Check Browser Console**: Look for errors in console
2. **Verify Interval**: Check that `setInterval` is running (5 minutes)
3. **Check Network**: Verify API calls are being made

## Database Requirements

The system requires:

1. **tenants** table with:
   - `id` (UUID)
   - `is_active` (BOOLEAN)
   - `subscription_status` (VARCHAR)

2. **subscriptions** table with:
   - `tenant_id` (UUID, references tenants.id)
   - `billing_period_end` (TIMESTAMP)
   - `status` (VARCHAR)

## Support

For issues or questions:
- Check server logs
- Review Vercel cron job logs
- Test manually using API endpoint
- Contact support: social@sunkool.in

