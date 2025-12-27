# Notification System Refactoring Summary

## 🎯 Goal
Refactor WhatsApp notification system to be asynchronous, scalable, and support all user roles (Admin, Manager, Coordinator).

## ✅ Completed Changes

### 1. Database Schema
- **Created `notification_queue` table** (`database/create_notification_queue.sql`)
  - Stores pending notifications for async processing
  - Includes retry logic and error tracking
  - Proper RLS policies for tenant isolation

- **Fixed `vehicle_inward` RLS policies** (`database/fix_vehicle_inward_rls_all_roles.sql`)
  - Allows ALL tenant users (Admin, Manager, Coordinator) to insert
  - Removed role-based restrictions
  - Maintains tenant isolation

### 2. Notification Queue Service
- **Created `lib/notification-queue.ts`**
  - Fast, non-blocking enqueue operations
  - Just inserts into database (no WhatsApp calls)
  - Methods for all event types:
    - `enqueueVehicleCreated()`
    - `enqueueStatusUpdated()`
    - `enqueueInstallationComplete()`
    - `enqueueInvoiceAdded()`
    - `enqueueAccountantComplete()`
    - `enqueueVehicleDelivered()`

### 3. Refactored User Actions
All user actions now use the queue instead of calling WhatsApp directly:

- **Vehicle Creation** (`app/(dashboard)/inward/new/VehicleInwardPageClient.tsx`)
  - Removed synchronous WhatsApp call
  - Now enqueues notification (instant, non-blocking)

- **Status Updates** (`components/VehicleDetailsModal.tsx`, `app/(dashboard)/vehicles/VehiclesPageClient.tsx`)
  - Removed synchronous WhatsApp calls
  - Now enqueues notifications

- **Installation Complete** (`app/(dashboard)/dashboard/DashboardPageClient.tsx`)
  - Removed synchronous WhatsApp call
  - Now enqueues notification

- **Invoice Added** (`app/(dashboard)/dashboard/DashboardPageClient.tsx`, `app/(dashboard)/accounts/AccountsPageClient.tsx`)
  - Removed synchronous WhatsApp calls
  - Now enqueues notifications

- **Accountant Complete** (`app/(dashboard)/dashboard/DashboardPageClient.tsx`)
  - Removed synchronous WhatsApp call
  - Now enqueues notification

### 4. Background Worker
- **Created `app/api/cron/process-notifications/route.ts`**
  - Processes pending notifications from queue
  - Runs every 5 minutes (configurable in `vercel.json`)
  - Handles retries (max 3 attempts)
  - Updates notification status (pending → processing → sent/failed)
  - Uses admin client to bypass RLS

- **Updated `vercel.json`**
  - Added cron job: `*/5 * * * *` (every 5 minutes)

### 5. Notification Workflow Service
- **Updated `lib/notification-workflow.ts`**
  - Now accepts optional Supabase client (for server-side use)
  - Maintains backward compatibility (uses default client if not provided)
  - Exported class for server-side instantiation

## 🏗️ Architecture

### Before (Synchronous)
```
User Action → Database Insert → WhatsApp API Call → Response
                    ↓
            (Blocks user, slow)
```

### After (Asynchronous)
```
User Action → Database Insert → Enqueue Notification → Response (instant)
                    ↓
            Background Worker → Process Queue → WhatsApp API
                    ↓
            (Non-blocking, fast)
```

## 📋 Database Migrations Required

Run these SQL files in Supabase SQL Editor:

1. `database/create_notification_queue.sql` - Creates queue table
2. `database/fix_vehicle_inward_rls_all_roles.sql` - Fixes RLS policies

## 🔧 Configuration

### Environment Variables
- `CRON_SECRET` (optional) - Secret for protecting cron endpoint
- `SUPABASE_SERVICE_ROLE_KEY` - Required for background worker

### Vercel Cron
The cron job is configured in `vercel.json`:
```json
{
  "path": "/api/cron/process-notifications",
  "schedule": "*/5 * * * *"
}
```

## 🚀 Benefits

1. **Performance**: User actions return instantly (no WhatsApp API blocking)
2. **Scalability**: Background worker can process notifications in batches
3. **Reliability**: Retry logic handles transient failures
4. **Role Support**: All roles (Admin, Manager, Coordinator) can create vehicles
5. **Tenant Isolation**: Proper RLS policies ensure data security

## 📝 Testing Checklist

- [ ] Run database migrations
- [ ] Create vehicle as Admin → Check notification_queue
- [ ] Create vehicle as Manager → Check notification_queue
- [ ] Create vehicle as Coordinator → Check notification_queue
- [ ] Update vehicle status → Check notification_queue
- [ ] Wait 5 minutes → Check if notifications are processed
- [ ] Verify WhatsApp messages are sent
- [ ] Check notification_queue status updates

## 🔍 Monitoring

Check notification queue status:
```sql
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM notification_queue
GROUP BY status;
```

Check failed notifications:
```sql
SELECT * FROM notification_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

## ⚠️ Important Notes

1. **First Deployment**: After deploying, notifications will be queued but not processed until the cron job runs (within 5 minutes)

2. **Testing**: You can manually trigger the worker by calling:
   ```
   GET /api/cron/process-notifications
   Authorization: Bearer <CRON_SECRET>
   ```

3. **RLS Policies**: The background worker uses admin client to bypass RLS. This is safe because:
   - It only processes notifications for valid tenants
   - It respects notification preferences
   - It maintains tenant isolation

4. **Performance**: The queue approach ensures:
   - User actions are never blocked by WhatsApp API
   - Failed notifications can be retried
   - High volume can be handled gracefully

