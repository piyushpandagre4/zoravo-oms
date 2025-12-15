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
   * Get notification preferences for a role, filtered by tenant
   */
  async getPreferencesForRole(
    role: 'installer' | 'coordinator' | 'accountant' | 'manager',
    tenantId?: string | null
  ): Promise<NotificationPreferences[]> {
    try {
      // If tenantId is provided, first get all users from that tenant with the specified role
      let userIds: string[] = []
      
      if (tenantId) {
        const { data: tenantUsers, error: tenantUsersError } = await this.supabase
          .from('tenant_users')
          .select('user_id')
          .eq('tenant_id', tenantId)
          .eq('role', role)

        if (tenantUsersError) {
          console.error('[Notification] Error fetching tenant users:', tenantUsersError)
          return []
        }

        userIds = (tenantUsers || []).map((tu: any) => tu.user_id)
        
        if (userIds.length === 0) {
          console.log(`[Notification] No users found for role ${role} in tenant ${tenantId}`)
          return []
        }
        
        console.log(`[Notification] Found ${userIds.length} users for role ${role} in tenant ${tenantId}`)
      } else {
        console.warn('[Notification] No tenantId provided, fetching preferences for all tenants')
      }

      // Get notification preferences for the role
      let query = this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('role', role)
        .eq('whatsapp_enabled', true)

      // Filter by user_ids if tenantId is provided
      if (tenantId && userIds.length > 0) {
        query = query.in('user_id', userIds)
      }

      const { data: preferences, error } = await query

      if (!error && preferences && preferences.length > 0) {
        const mappedPreferences = preferences.map((p: any) => ({
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
        
        console.log(`[Notification] Found ${mappedPreferences.length} notification preferences for role ${role}${tenantId ? ` in tenant ${tenantId}` : ''}`)
        return mappedPreferences
      }

      // Fallback: get phone numbers from profiles table, filtered by tenant
      let profileQuery = this.supabase
        .from('profiles')
        .select('id, name, phone, role')
        .eq('role', role)

      // Filter by user_ids if tenantId is provided
      if (tenantId && userIds.length > 0) {
        profileQuery = profileQuery.in('id', userIds)
      }

      const { data: profiles, error: profileError } = await profileQuery

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
    console.log('[Notification] notifyVehicleCreated called', { vehicleId, tenantId: vehicleData.tenant_id })
    
    // Get tenant_id from vehicle data or try to get from current context
    const tenantId = vehicleData.tenant_id || null
    
    if (!tenantId) {
      console.warn('[Notification] No tenant_id found in vehicle data, notifications may not work correctly')
    }

    // Check if WhatsApp is enabled (with tenant context)
    const config = await whatsappService.loadConfig(this.supabase, tenantId)
    if (!config || !config.enabled) {
      console.log('[Notification] WhatsApp notifications disabled or config not found, skipping')
      return
    }
    
    // Initialize WhatsApp service
    await whatsappService.initialize(config)
    console.log('[Notification] WhatsApp service initialized')

    const event: WorkflowEvent = {
      type: 'vehicle_inward_created',
      vehicleId,
      vehicleNumber: vehicleData.registration_number,
      customerName: vehicleData.customer_name,
      triggeredBy: vehicleData.created_by,
      triggeredByRole: 'coordinator',
    }

    // Notify installers, managers, and accountants - filtered by tenant
    console.log('[Notification] Fetching preferences for roles: installer, manager, accountant')
    const installers = await this.getPreferencesForRole('installer', tenantId)
    const managers = await this.getPreferencesForRole('manager', tenantId)
    const accountants = await this.getPreferencesForRole('accountant', tenantId)

    console.log('[Notification] Preferences fetched:', {
      installers: installers.length,
      managers: managers.length,
      accountants: accountants.length
    })

    // Log detailed preference info
    console.log('[Notification] Installer preferences:', installers.map(p => ({
      userId: p.userId,
      phone: p.phoneNumber,
      notifyOnVehicleCreated: p.notifyOnVehicleCreated,
      whatsappEnabled: p.whatsappEnabled
    })))
    console.log('[Notification] Manager preferences:', managers.map(p => ({
      userId: p.userId,
      phone: p.phoneNumber,
      notifyOnVehicleCreated: p.notifyOnVehicleCreated,
      whatsappEnabled: p.whatsappEnabled
    })))
    console.log('[Notification] Accountant preferences:', accountants.map(p => ({
      userId: p.userId,
      phone: p.phoneNumber,
      notifyOnVehicleCreated: p.notifyOnVehicleCreated,
      whatsappEnabled: p.whatsappEnabled
    })))

    // Get user names for better logging
    const allUserIds = [
      ...installers.map(p => p.userId),
      ...managers.map(p => p.userId),
      ...accountants.map(p => p.userId)
    ]
    
    let userNamesMap: Map<string, string> = new Map()
    if (allUserIds.length > 0) {
      const { data: profiles } = await this.supabase
        .from('profiles')
        .select('id, name')
        .in('id', allUserIds)
      
      if (profiles) {
        profiles.forEach((p: any) => {
          userNamesMap.set(p.id, p.name || 'Unknown')
        })
      }
    }

    const recipients: NotificationRecipient[] = [
      ...installers.filter(p => p.notifyOnVehicleCreated && p.phoneNumber).map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
        name: userNamesMap.get(p.userId) || 'Unknown',
      })),
      ...managers.filter(p => p.notifyOnVehicleCreated && p.phoneNumber).map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
        name: userNamesMap.get(p.userId) || 'Unknown',
      })),
      ...accountants.filter(p => p.notifyOnVehicleCreated && p.phoneNumber).map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
        name: userNamesMap.get(p.userId) || 'Unknown',
      })),
    ]

    console.log('[Notification] Filtered recipients:', {
      total: recipients.length,
      installers: recipients.filter(r => r.role === 'installer').length,
      managers: recipients.filter(r => r.role === 'manager').length,
      accountants: recipients.filter(r => r.role === 'accountant').length,
      phoneNumbers: recipients.map(r => r.phoneNumber)
    })

    if (recipients.length === 0) {
      console.warn('[Notification] No recipients found. Check notification preferences:')
      console.warn('  - Are users enabled for WhatsApp notifications?')
      console.warn('  - Do users have phone numbers?')
      console.warn('  - Is "Vehicle Created" notification enabled for users?')
      console.warn('  - Are users in the correct tenant?')
      return
    }

    console.log('[Notification] Sending notifications to', recipients.length, 'recipients')
    const result = await whatsappService.sendWorkflowNotification(event, recipients, this.supabase)
    console.log('[Notification] Notification result:', result)
  }

  /**
   * Send notification when installation is complete
   */
  async notifyInstallationComplete(vehicleId: string, vehicleData: any): Promise<void> {
    if (!(await this.isWhatsAppEnabled())) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

    // Get tenant_id from vehicle data
    const tenantId = vehicleData.tenant_id || null

    // Load WhatsApp config with tenant context
    const config = await whatsappService.loadConfig(this.supabase, tenantId)
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

    // Notify managers and accountants - filtered by tenant
    const managers = await this.getPreferencesForRole('manager', tenantId)
    const accountants = await this.getPreferencesForRole('accountant', tenantId)

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

    // Get tenant_id from vehicle data
    const tenantId = vehicleData.tenant_id || null

    // Load WhatsApp config with tenant context
    const config = await whatsappService.loadConfig(this.supabase, tenantId)
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

    // Notify managers - filtered by tenant
    const managers = await this.getPreferencesForRole('manager', tenantId)

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

    // Get tenant_id from vehicle data
    const tenantId = vehicleData.tenant_id || null

    // Load WhatsApp config with tenant context
    const config = await whatsappService.loadConfig(this.supabase, tenantId)
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

    // Notify coordinators and managers - filtered by tenant
    const coordinators = await this.getPreferencesForRole('coordinator', tenantId)
    const managers = await this.getPreferencesForRole('manager', tenantId)

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

    // Get tenant_id from vehicle data
    const tenantId = vehicleData.tenant_id || null

    // Load WhatsApp config with tenant context
    const config = await whatsappService.loadConfig(this.supabase, tenantId)
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

    // Notify managers and accountants - filtered by tenant
    const managers = await this.getPreferencesForRole('manager', tenantId)
    const accountants = await this.getPreferencesForRole('accountant', tenantId)

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

