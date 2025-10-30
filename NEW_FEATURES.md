# New Features Documentation

## Overview
This document describes the two major feature implementations for the Zoravo OMS application:
1. Notification System
2. Enhanced Recent Vehicles with Status Management

## 1. Notification System

### Features
- **Real-time Notifications**: Bell icon in the topbar shows notifications with an unread count badge
- **Notification Dropdown**: Clicking the bell icon shows a dropdown with all notifications
- **Notification Types**: Info, Warning, Error, Success, and Reminder
- **Mark as Read**: Individual and bulk mark-as-read functionality
- **Auto-refresh**: Real-time updates using Supabase subscriptions

### Database Schema
The notifications table was added with the following structure:
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Usage Examples
```typescript
// Create a backup reminder
await notificationsService.createBackupReminder(userId)

// Create a vehicle assignment notification
await notificationsService.createVehicleAssignmentNotification(userId, vehicleDetails)

// Create a status update notification
await notificationsService.createStatusUpdateNotification(userId, vehicleId, newStatus)

// Create an overdue payment notification
await notificationsService.createOverduePaymentNotification(userId, invoiceId, amount)
```

### API Reference
The `NotificationsService` class provides the following methods:
- `getUserNotifications(userId, unreadOnly)` - Get notifications for a user
- `getUnreadCount(userId)` - Get count of unread notifications
- `markAsRead(notificationId)` - Mark a notification as read
- `markAllAsRead(userId)` - Mark all notifications as read for a user
- `createNotification(notification)` - Create a new notification

## 2. Enhanced Recent Vehicles with Status Management

### Status Workflow
The system implements a complete status workflow:

1. **Coordinator** (or Manager/Admin):
   - Can update status from `pending` → `in_progress`
   - Can update status from `installation_complete` → `complete_and_delivered`

2. **Installer**:
   - Can update status from `in_progress` → `installation_complete`

### Status Stages
- `pending` - Initial status when vehicle is added
- `in_progress` - Vehicle is being worked on
- `installation_complete` - Installation is complete, awaiting coordinator approval
- `complete_and_delivered` - Completed and delivered to customer

### Features
- **Detailed View**: Click on any vehicle in the Recent Vehicles table to see full details
- **Status Progress Bar**: Visual progress bar showing current status in the workflow
- **Role-based Updates**: Only authorized roles can update to specific statuses
- **Read-Only Details**: Customer, vehicle, and work information displayed in modal
- **Update Actions**: Role-appropriate status update buttons

### Vehicle Details Modal
The modal shows:
- Vehicle Information (Make, Model, Year, Registration, Color)
- Customer Information (Name, Phone, Email, Address)
- Work Details (Issues Reported, Accessories Requested)
- Current Status with Visual Progress Bar
- Status Update Actions (role-dependent)

### Usage
1. Navigate to Dashboard
2. Click on "Recent Vehicles" tab
3. Click on any vehicle row to view details
4. Use the status update buttons to progress through workflow

## Implementation Details

### Files Created
1. `database/create_notifications_table.sql` - Database schema for notifications
2. `lib/notifications-service.ts` - Notification service with helper methods
3. `components/VehicleDetailsModal.tsx` - Modal component for vehicle details

### Files Modified
1. `components/topbar.tsx` - Added notification bell with dropdown
2. `app/(dashboard)/dashboard/page.tsx` - Enhanced Recent Vehicles section

### Database Setup
To set up the notifications system, run the following SQL in your Supabase SQL Editor:

```bash
# Run the SQL file
psql -U postgres -d your_database -f database/create_notifications_table.sql
```

Or copy the contents of `database/create_notifications_table.sql` and run it in the Supabase SQL Editor.

## Security Considerations

### RLS Policies
The notifications table includes Row Level Security (RLS) policies:
- Users can view and update their own notifications
- Authenticated users can insert notifications
- Admins and Managers can delete notifications

### Role-Based Access
Status updates are restricted based on user roles:
- Only coordinators/managers/admins can update pending → in_progress
- Only installers can update in_progress → installation_complete
- Only coordinators/managers/admins can update installation_complete → complete_and_delivered

## Future Enhancements

### Notification System
- Email notifications for important updates
- SMS notifications for urgent items
- Push notifications for mobile app
- Notification preferences per user
- Notification scheduling

### Status Management
- Status history tracking
- Automated status transitions based on conditions
- Email notifications on status changes
- Approval workflow for status transitions
- Comment system for status updates

## Troubleshooting

### Notifications Not Showing
1. Check if the notifications table exists in the database
2. Verify RLS policies are in place
3. Check browser console for errors
4. Ensure Supabase client is properly configured

### Status Updates Not Working
1. Verify user has correct role permissions
2. Check database connection
3. Ensure vehicle_inward table exists with status column
4. Check browser console for errors

## Testing

### Testing Notifications
1. Create a notification manually:
```sql
INSERT INTO notifications (user_id, title, message, type)
VALUES ('user-id', 'Test Notification', 'This is a test', 'info');
```

2. Verify it appears in the bell icon dropdown
3. Test mark as read functionality
4. Test real-time updates

### Testing Status Updates
1. Create a test vehicle with status 'pending'
2. As a coordinator, update to 'in_progress'
3. As an installer, update to 'installation_complete'
4. As a coordinator, update to 'complete_and_delivered'

## Support
For issues or questions about these features, please contact the development team or create an issue in the repository.

