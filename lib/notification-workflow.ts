/**
 * Notification Workflow Service
 * Handles triggering notifications based on workflow events
 */

import { createClient } from '@/lib/supabase/client'
import { whatsappService, type WorkflowEvent, type NotificationRecipient } from './whatsapp-service'

export interface NotificationPreferences {
  userId: string
  role: string
  whatsappEnabled: boolean
  phoneNumber?: string
  notifyOnVehicleCreated?: boolean
  notifyOnStatusUpdated?: boolean
  notifyOnInstallationComplete?: boolean
  notifyOnInvoiceAdded?: boolean
  notifyOnAccountantComplete?: boolean
  notifyOnVehicleDelivered?: boolean
}

class NotificationWorkflowService {
  private supabase = createClient()

  /**
   * Get notification preferences for a role
   */
  async getPreferencesForRole(role: 'installer' | 'coordinator' | 'accountant' | 'manager'): Promise<NotificationPreferences[]> {
    try {
      // First, try to get from notification_preferences table
      const { data: preferences, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('role', role)
        .eq('whatsapp_enabled', true)

      if (!error && preferences && preferences.length > 0) {
        return preferences.map((p: any) => ({
          userId: p.user_id,
          role: p.role,
          whatsappEnabled: p.whatsapp_enabled,
          phoneNumber: p.phone_number,
          notifyOnVehicleCreated: p.notify_on_vehicle_created,
          notifyOnStatusUpdated: p.notify_on_status_updated,
          notifyOnInstallationComplete: p.notify_on_installation_complete,
          notifyOnInvoiceAdded: p.notify_on_invoice_added,
          notifyOnAccountantComplete: p.notify_on_accountant_complete,
          notifyOnVehicleDelivered: p.notify_on_vehicle_delivered,
        }))
      }

      // Fallback: get phone numbers from profiles table
      const { data: profiles, error: profileError } = await this.supabase
        .from('profiles')
        .select('id, name, phone, role')
        .eq('role', role)

      if (profileError) throw profileError

      return (profiles || []).map((profile: any) => ({
        userId: profile.id,
        role: profile.role,
        whatsappEnabled: true, // Default enabled
        phoneNumber: profile.phone,
        notifyOnVehicleCreated: true,
        notifyOnStatusUpdated: true,
        notifyOnInstallationComplete: true,
        notifyOnInvoiceAdded: true,
        notifyOnAccountantComplete: true,
        notifyOnVehicleDelivered: true,
      }))
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
      return []
    }
  }

  /**
   * Check if WhatsApp notifications are enabled
   */
  async isWhatsAppEnabled(): Promise<boolean> {
    try {
      const config = await whatsappService.loadConfig(this.supabase)
      return config?.enabled || false
    } catch {
      return false
    }
  }

  /**
   * Send notification when vehicle inward is created
   */
  async notifyVehicleCreated(vehicleId: string, vehicleData: any): Promise<void> {
    if (!(await this.isWhatsAppEnabled())) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

    // Load WhatsApp config
    const config = await whatsappService.loadConfig(this.supabase)
    if (config) {
      await whatsappService.initialize(config)
    }

    const event: WorkflowEvent = {
      type: 'vehicle_inward_created',
      vehicleId,
      vehicleNumber: vehicleData.registration_number,
      customerName: vehicleData.customer_name,
      triggeredBy: vehicleData.created_by,
      triggeredByRole: 'coordinator',
    }

    // Notify installers, managers, and accountants
    const installers = await this.getPreferencesForRole('installer')
    const managers = await this.getPreferencesForRole('manager')
    const accountants = await this.getPreferencesForRole('accountant')

    const recipients: NotificationRecipient[] = [
      ...installers.filter(p => p.notifyOnVehicleCreated && p.phoneNumber).map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      })),
      ...managers.filter(p => p.notifyOnVehicleCreated && p.phoneNumber).map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      })),
      ...accountants.filter(p => p.notifyOnVehicleCreated && p.phoneNumber).map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      })),
    ]

    if (recipients.length > 0) {
      await whatsappService.sendWorkflowNotification(event, recipients, this.supabase)
    }
  }

  /**
   * Send notification when installation is complete
   */
  async notifyInstallationComplete(vehicleId: string, vehicleData: any): Promise<void> {
    if (!(await this.isWhatsAppEnabled())) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

    // Load WhatsApp config
    const config = await whatsappService.loadConfig(this.supabase)
    if (config) {
      await whatsappService.initialize(config)
    }

    const event: WorkflowEvent = {
      type: 'installation_complete',
      vehicleId,
      vehicleNumber: vehicleData.registration_number,
      customerName: vehicleData.customer_name,
      status: 'installation_complete',
    }

    // Notify managers and accountants
    const managers = await this.getPreferencesForRole('manager')
    const accountants = await this.getPreferencesForRole('accountant')

    const recipients: NotificationRecipient[] = [
      ...managers.filter(p => p.notifyOnInstallationComplete && p.phoneNumber).map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      })),
      ...accountants.filter(p => p.notifyOnInstallationComplete && p.phoneNumber).map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      })),
    ]

    if (recipients.length > 0) {
      await whatsappService.sendWorkflowNotification(event, recipients, this.supabase)
    }
  }

  /**
   * Send notification when invoice number is added
   */
  async notifyInvoiceAdded(vehicleId: string, vehicleData: any): Promise<void> {
    if (!(await this.isWhatsAppEnabled())) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

    // Load WhatsApp config
    const config = await whatsappService.loadConfig(this.supabase)
    if (config) {
      await whatsappService.initialize(config)
    }

    const event: WorkflowEvent = {
      type: 'invoice_number_added',
      vehicleId,
      vehicleNumber: vehicleData.registration_number,
      customerName: vehicleData.customer_name,
      triggeredByRole: 'accountant',
    }

    // Notify managers
    const managers = await this.getPreferencesForRole('manager')

    const recipients: NotificationRecipient[] = managers
      .filter(p => p.notifyOnInvoiceAdded && p.phoneNumber)
      .map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      }))

    if (recipients.length > 0) {
      await whatsappService.sendWorkflowNotification(event, recipients, this.supabase)
    }
  }

  /**
   * Send notification when accountant completes
   */
  async notifyAccountantComplete(vehicleId: string, vehicleData: any): Promise<void> {
    if (!(await this.isWhatsAppEnabled())) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

    // Load WhatsApp config
    const config = await whatsappService.loadConfig(this.supabase)
    if (config) {
      await whatsappService.initialize(config)
    }

    const event: WorkflowEvent = {
      type: 'accountant_completed',
      vehicleId,
      vehicleNumber: vehicleData.registration_number,
      customerName: vehicleData.customer_name,
      status: 'completed',
      triggeredByRole: 'accountant',
    }

    // Notify coordinators and managers
    const coordinators = await this.getPreferencesForRole('coordinator')
    const managers = await this.getPreferencesForRole('manager')

    const recipients: NotificationRecipient[] = [
      ...coordinators.filter(p => p.notifyOnAccountantComplete && p.phoneNumber).map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      })),
      ...managers.filter(p => p.notifyOnAccountantComplete && p.phoneNumber).map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      })),
    ]

    if (recipients.length > 0) {
      await whatsappService.sendWorkflowNotification(event, recipients, this.supabase)
    }
  }

  /**
   * Send notification when vehicle is delivered
   */
  async notifyVehicleDelivered(vehicleId: string, vehicleData: any): Promise<void> {
    if (!(await this.isWhatsAppEnabled())) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

    // Load WhatsApp config
    const config = await whatsappService.loadConfig(this.supabase)
    if (config) {
      await whatsappService.initialize(config)
    }

    const event: WorkflowEvent = {
      type: 'vehicle_delivered',
      vehicleId,
      vehicleNumber: vehicleData.registration_number,
      customerName: vehicleData.customer_name,
      status: 'delivered',
      triggeredByRole: 'coordinator',
    }

    // Notify managers and accountants
    const managers = await this.getPreferencesForRole('manager')
    const accountants = await this.getPreferencesForRole('accountant')

    const recipients: NotificationRecipient[] = [
      ...managers.filter(p => p.notifyOnVehicleDelivered && p.phoneNumber).map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      })),
      ...accountants.filter(p => p.notifyOnVehicleDelivered && p.phoneNumber).map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      })),
    ]

    if (recipients.length > 0) {
      await whatsappService.sendWorkflowNotification(event, recipients, this.supabase)
    }
  }
}

export const notificationWorkflow = new NotificationWorkflowService()

