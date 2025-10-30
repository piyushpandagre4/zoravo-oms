import { createClient } from '@/lib/supabase/client'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success' | 'reminder'
  read: boolean
  action_url?: string
  priority: number
  created_at: string
  updated_at: string
}

class NotificationsService {
  private supabase = createClient()

  // Get all notifications for a user
  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    try {
      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (unreadOnly) {
        query = query.eq('read', false)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) throw error
    } catch (error) {
      console.error('Error marking all as read:', error)
      throw error
    }
  }

  // Create a notification
  async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'>): Promise<Notification> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw error
    }
  }

  // Create system reminders (backup reminders, etc.)
  async createBackupReminder(userId: string): Promise<void> {
    const lastBackupDate = new Date()
    lastBackupDate.setDate(lastBackupDate.getDate() - 1) // Assume last backup was yesterday

    await this.createNotification({
      user_id: userId,
      title: 'Backup Reminder',
      message: 'It\'s time to backup your database. Last backup was on ' + lastBackupDate.toLocaleDateString(),
      type: 'reminder',
      read: false,
      priority: 2,
      action_url: '/settings'
    })
  }

  // Create vehicle assignment notification for installers
  async createVehicleAssignmentNotification(userId: string, vehicleDetails: any): Promise<void> {
    await this.createNotification({
      user_id: userId,
      title: 'New Vehicle Assignment',
      message: `Vehicle ${vehicleDetails.registration_number} has been assigned to you for ${vehicleDetails.accessories_requested || 'installation'}`,
      type: 'info',
      read: false,
      priority: 1,
      action_url: `/dashboard`
    })
  }

  // Create status update notification
  async createStatusUpdateNotification(userId: string, vehicleId: string, status: string): Promise<void> {
    await this.createNotification({
      user_id: userId,
      title: 'Vehicle Status Updated',
      message: `Vehicle status has been updated to ${status.replace('_', ' ')}`,
      type: 'info',
      read: false,
      priority: 0,
      // Send users to the unified dashboard view instead of legacy vehicle page
      action_url: `/dashboard`
    })
  }

  // Create payment overdue notification
  async createOverduePaymentNotification(userId: string, invoiceId: string, amount: number): Promise<void> {
    await this.createNotification({
      user_id: userId,
      title: 'Overdue Payment',
      message: `Payment overdue: ₹${amount.toLocaleString()} for invoice ${invoiceId}`,
      type: 'warning',
      read: false,
      priority: 2,
      action_url: `/accounts/invoices`
    })
  }
}

export const notificationsService = new NotificationsService()

