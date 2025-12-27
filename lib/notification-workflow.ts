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
  private supabase: any
  private configCache: Map<string, { config: any; timestamp: number }> = new Map()
  private readonly CONFIG_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly ENABLE_VERBOSE_LOGGING = false // Set to true for debugging

  constructor(supabaseClient?: any) {
    // Allow injecting a Supabase client (for server-side use)
    // If not provided, use default client (for client-side use)
    this.supabase = supabaseClient || createClient()
  }

  /**
   * Helper: Get tenant_id from vehicle data or fetch from current user
   */
  private async getTenantIdWithFallback(vehicleData: any): Promise<string | null> {
    // First, try to get from vehicle data
    let tenantId = vehicleData?.tenant_id || null
    
    // If missing, try to fetch from current user's tenant_users relationship
    if (!tenantId) {
      if (this.ENABLE_VERBOSE_LOGGING) {
        console.warn('[Notification] No tenant_id in vehicle data, fetching from current user...')
      }
      try {
        const { data: { user } } = await this.supabase.auth.getUser()
        if (user) {
          const { data: tenantUser, error: tenantUserError } = await this.supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single()
          
          if (!tenantUserError && tenantUser) {
            tenantId = tenantUser.tenant_id
            if (this.ENABLE_VERBOSE_LOGGING) {
              console.log('[Notification] ✅ Fetched tenant_id from current user:', tenantId)
            }
          } else {
            if (this.ENABLE_VERBOSE_LOGGING) {
              console.error('[Notification] ❌ Could not fetch tenant_id from current user:', tenantUserError)
            }
          }
        }
      } catch (error) {
        if (this.ENABLE_VERBOSE_LOGGING) {
          console.error('[Notification] ❌ Error fetching tenant_id from current user:', error)
        }
      }
    }
    
    return tenantId
  }

  /**
   * Get notification preferences for a role, filtered by tenant
   * 
   * IMPORTANT: This method filters by whatsapp_enabled = true at the database level.
   * Individual notification methods then further filter by specific event preferences.
   * 
   * Filtering logic (AND conditions, all must be true):
   * 1. User must have whatsapp_enabled = true (checked in this method)
   * 2. User must have the specific event preference enabled (checked in notification methods)
   * 3. User must have a valid phone number (checked in notification methods)
   * 
   * @param role - The role to fetch preferences for
   * @param tenantId - Optional tenant ID to filter by tenant
   * @returns Array of notification preferences (already filtered by whatsapp_enabled)
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
          if (this.ENABLE_VERBOSE_LOGGING) {
            console.error('[Notification] Error fetching tenant users:', tenantUsersError)
          }
          return []
        }

        userIds = (tenantUsers || []).map((tu: any) => tu.user_id)
        
        if (userIds.length === 0) {
          if (this.ENABLE_VERBOSE_LOGGING) {
            console.log(`[Notification] No users found for role ${role} in tenant ${tenantId}`)
          }
          return []
        }
        
        if (this.ENABLE_VERBOSE_LOGGING) {
          console.log(`[Notification] Found ${userIds.length} users for role ${role} in tenant ${tenantId}`)
        }
      } else {
        if (this.ENABLE_VERBOSE_LOGGING) {
          console.warn('[Notification] No tenantId provided, fetching preferences for all tenants')
        }
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
        
        // Enhanced logging: Show filtering details
        const withPhone = mappedPreferences.filter(p => p.phoneNumber)
        const withoutPhone = mappedPreferences.filter(p => !p.phoneNumber)
        
        console.log(`[Notification] 📋 Preferences for role ${role}${tenantId ? ` (tenant ${tenantId})` : ''}:`, {
          total: mappedPreferences.length,
          withPhone: withPhone.length,
          withoutPhone: withoutPhone.length,
          enabled: mappedPreferences.filter(p => p.whatsappEnabled).length,
          details: mappedPreferences.map(p => ({
            userId: p.userId,
            hasPhone: !!p.phoneNumber,
            enabled: p.whatsappEnabled,
            phone: p.phoneNumber ? `${p.phoneNumber.substring(0, 4)}...` : 'missing'
          }))
        })
        
        if (withoutPhone.length > 0) {
          console.warn(`[Notification] ⚠️ ${withoutPhone.length} user(s) in role ${role} have no phone number and will not receive notifications`)
        }
        
        return mappedPreferences
      }

      // Fallback: get phone numbers from profiles table, filtered by tenant
      // Only query if we have user IDs (optimization)
      if (tenantId && userIds.length === 0) {
        return []
      }
      
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
      if (this.ENABLE_VERBOSE_LOGGING) {
        console.error('Error fetching notification preferences:', error)
      }
      return []
    }
  }

  /**
   * Check if WhatsApp notifications are enabled
   */
  async isWhatsAppEnabled(tenantId?: string | null): Promise<boolean> {
    try {
      const config = await whatsappService.loadConfig(this.supabase, tenantId)
      return config?.enabled || false
    } catch {
      return false
    }
  }

  /**
   * Get WhatsApp config with caching
   */
  private async getCachedConfig(tenantId: string | null): Promise<any | null> {
    const cacheKey = tenantId || 'global'
    const cached = this.configCache.get(cacheKey)
    const now = Date.now()
    
    // Return cached config if still valid
    if (cached && (now - cached.timestamp) < this.CONFIG_CACHE_TTL) {
      return cached.config
    }
    
    // Load config from database
    const config = await whatsappService.loadConfig(this.supabase, tenantId)
    
    // Cache the result (even if null)
    this.configCache.set(cacheKey, { config, timestamp: now })
    
    return config
  }

  /**
   * Send notification when vehicle inward is created
   */
  async notifyVehicleCreated(vehicleId: string, vehicleData: any): Promise<void> {
    console.log('[Notification] 📢 notifyVehicleCreated called', { 
      vehicleId, 
      tenantIdFromData: vehicleData?.tenant_id,
      vehicleDataKeys: Object.keys(vehicleData || {})
    })
    
    // Get tenant_id from vehicle data or fetch from current user
    const tenantId = await this.getTenantIdWithFallback(vehicleData)
    
    console.log('[Notification] 🔍 Tenant ID resolved:', {
      tenantId,
      source: vehicleData?.tenant_id ? 'vehicleData' : 'fallback'
    })
    
    if (!tenantId) {
      console.error('[Notification] ❌ No tenant_id available, cannot send tenant-specific notifications. Skipping notification.')
      return
    }

    // Validate tenant_id format
    if (tenantId === '00000000-0000-0000-0000-000000000000') {
      console.error('[Notification] ❌ tenant_id is all zeros (invalid), cannot send notifications')
      return
    }

    // Check if WhatsApp is enabled (with tenant context) - use cached config
    console.log('[Notification] 🔧 Loading WhatsApp config for tenant:', tenantId)
    const config = await this.getCachedConfig(tenantId)
    
    console.log('[Notification] 📋 WhatsApp config loaded:', {
      enabled: config?.enabled,
      hasConfig: !!config,
      tenantId
    })
    
    if (!config || !config.enabled) {
      console.warn('[Notification] ⚠️ WhatsApp notifications disabled or config not found, skipping', {
        tenantId,
        hasConfig: !!config,
        configEnabled: config?.enabled
      })
      return
    }
    
    // Initialize WhatsApp service
    console.log('[Notification] 🚀 Initializing WhatsApp service...')
    await whatsappService.initialize(config)
    console.log('[Notification] ✅ WhatsApp service initialized')

    const event: WorkflowEvent = {
      type: 'vehicle_inward_created',
      vehicleId,
      vehicleNumber: vehicleData.registration_number,
      customerName: vehicleData.customer_name,
      triggeredBy: vehicleData.created_by,
      triggeredByRole: 'coordinator',
    }

    // Notify installers, managers, and accountants - filtered by tenant
    // Fetch preferences in parallel to improve performance
    console.log('[Notification] 👥 Fetching notification preferences for roles: installer, manager, accountant', {
      tenantId
    })
    const [installers, managers, accountants] = await Promise.all([
      this.getPreferencesForRole('installer', tenantId),
      this.getPreferencesForRole('manager', tenantId),
      this.getPreferencesForRole('accountant', tenantId)
    ])

    console.log('[Notification] 📊 Preferences fetched:', {
      installers: installers.length,
      managers: managers.length,
      accountants: accountants.length,
      tenantId,
      installerDetails: installers.map(p => ({
        userId: p.userId,
        phone: p.phoneNumber,
        enabled: p.notifyOnVehicleCreated
      })),
      managerDetails: managers.map(p => ({
        userId: p.userId,
        phone: p.phoneNumber,
        enabled: p.notifyOnVehicleCreated
      })),
      accountantDetails: accountants.map(p => ({
        userId: p.userId,
        phone: p.phoneNumber,
        enabled: p.notifyOnVehicleCreated
      }))
    })

    // Get user names for notifications (only if we have recipients)
    const allUserIds = [
      ...installers.map(p => p.userId),
      ...managers.map(p => p.userId),
      ...accountants.map(p => p.userId)
    ]
    
    let userNamesMap: Map<string, string> = new Map()
    // Only fetch profiles if we have potential recipients (optimization)
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

    // Filter recipients: Both whatsapp_enabled (from getPreferencesForRole) AND notifyOnVehicleCreated must be true
    // Also need valid phone number
    const installerRecipients = installers
      .filter(p => {
        const hasPreference = p.notifyOnVehicleCreated === true
        const hasPhone = !!p.phoneNumber
        const isEnabled = p.whatsappEnabled === true
        
        if (!isEnabled || !hasPreference || !hasPhone) {
          if (this.ENABLE_VERBOSE_LOGGING) {
            const reasons = []
            if (!isEnabled) reasons.push('WhatsApp not enabled')
            if (!hasPreference) reasons.push('"Vehicle Created" preference not enabled')
            if (!hasPhone) reasons.push('No phone number')
            console.log(`[Notification] ⏭️ Installer ${p.userId} skipped: ${reasons.join(', ')}`)
          }
          return false
        }
        return true
      })
      .map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
        name: userNamesMap.get(p.userId) || 'Unknown',
      }))

    const managerRecipients = managers
      .filter(p => {
        const hasPreference = p.notifyOnVehicleCreated === true
        const hasPhone = !!p.phoneNumber
        const isEnabled = p.whatsappEnabled === true
        
        if (!isEnabled || !hasPreference || !hasPhone) {
          if (this.ENABLE_VERBOSE_LOGGING) {
            const reasons = []
            if (!isEnabled) reasons.push('WhatsApp not enabled')
            if (!hasPreference) reasons.push('"Vehicle Created" preference not enabled')
            if (!hasPhone) reasons.push('No phone number')
            console.log(`[Notification] ⏭️ Manager ${p.userId} skipped: ${reasons.join(', ')}`)
          }
          return false
        }
        return true
      })
      .map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
        name: userNamesMap.get(p.userId) || 'Unknown',
      }))

    const accountantRecipients = accountants
      .filter(p => {
        const hasPreference = p.notifyOnVehicleCreated === true
        const hasPhone = !!p.phoneNumber
        const isEnabled = p.whatsappEnabled === true
        
        if (!isEnabled || !hasPreference || !hasPhone) {
          if (this.ENABLE_VERBOSE_LOGGING) {
            const reasons = []
            if (!isEnabled) reasons.push('WhatsApp not enabled')
            if (!hasPreference) reasons.push('"Vehicle Created" preference not enabled')
            if (!hasPhone) reasons.push('No phone number')
            console.log(`[Notification] ⏭️ Accountant ${p.userId} skipped: ${reasons.join(', ')}`)
          }
          return false
        }
        return true
      })
      .map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
        name: userNamesMap.get(p.userId) || 'Unknown',
      }))

    const recipients: NotificationRecipient[] = [...installerRecipients, ...managerRecipients, ...accountantRecipients]

    if (recipients.length === 0) {
      console.warn('[Notification] ⚠️ No recipients found. Check notification preferences:', {
        tenantId,
        totalPreferences: installers.length + managers.length + accountants.length,
        installersWithPhone: installers.filter(p => p.phoneNumber).length,
        managersWithPhone: managers.filter(p => p.phoneNumber).length,
        accountantsWithPhone: accountants.filter(p => p.phoneNumber).length,
        installersEnabled: installers.filter(p => p.notifyOnVehicleCreated).length,
        managersEnabled: managers.filter(p => p.notifyOnVehicleCreated).length,
        accountantsEnabled: accountants.filter(p => p.notifyOnVehicleCreated).length
      })
      console.warn('[Notification] 💡 Troubleshooting:')
      console.warn('  - Are users enabled for WhatsApp notifications?')
      console.warn('  - Do users have phone numbers?')
      console.warn('  - Is "Vehicle Created" notification enabled for users?')
      console.warn('  - Are users in the correct tenant?')
      return
    }

    console.log('[Notification] 📤 Sending notifications to', recipients.length, 'recipients:', {
      tenantId,
      recipients: recipients.map(r => ({
        name: r.name,
        role: r.role,
        phone: r.phoneNumber
      }))
    })
    
    const result = await whatsappService.sendWorkflowNotification(event, recipients, this.supabase, tenantId)
    
    console.log('[Notification] ✅ Notification result:', {
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      tenantId
    })
    
    if (result.failed > 0) {
      console.error('[Notification] ❌ Some notifications failed:', result.errors)
    }
  }

  /**
   * Send notification when vehicle status is updated
   */
  async notifyStatusUpdated(vehicleId: string, vehicleData: any, newStatus: string, triggeredByRole?: string): Promise<void> {
    console.log('[Notification] notifyStatusUpdated called', { vehicleId, newStatus, tenantId: vehicleData.tenant_id })
    
    // Get tenant_id from vehicle data or fetch from current user
    const tenantId = await this.getTenantIdWithFallback(vehicleData)
    
    if (!tenantId) {
      console.error('[Notification] ❌ No tenant_id available, cannot send tenant-specific notifications. Skipping notification.')
      return
    }

    if (!(await this.isWhatsAppEnabled(tenantId))) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

    // Load WhatsApp config with tenant context
    const config = await whatsappService.loadConfig(this.supabase, tenantId)
    if (config) {
      await whatsappService.initialize(config)
    }

    // Map specific statuses to their corresponding event types for template matching
    // This ensures the correct template is loaded from the database
    let eventType: WorkflowEvent['type'] = 'vehicle_status_updated'
    const statusLower = newStatus.toLowerCase()
    
    if (statusLower === 'installation_complete') {
      eventType = 'installation_complete'
    } else if (statusLower === 'delivered' || statusLower === 'complete_and_delivered') {
      eventType = 'vehicle_delivered'
    }
    // For other statuses, use 'vehicle_status_updated' as default
    
    console.log(`[Notification] Status update event type mapping: status="${newStatus}" → eventType="${eventType}"`)

    const event: WorkflowEvent = {
      type: eventType,
      vehicleId,
      vehicleNumber: vehicleData.registration_number,
      customerName: vehicleData.customer_name,
      status: newStatus,
      triggeredByRole: triggeredByRole || 'coordinator',
    }

    // Determine which roles should be notified based on status
    // Different statuses may require different recipients
    let rolesToNotify: Array<'installer' | 'coordinator' | 'accountant' | 'manager'> = []
    
    switch (newStatus.toLowerCase()) {
      case 'in_progress':
      case 'under_installation':
        // Notify managers and coordinators when work starts
        rolesToNotify = ['manager', 'coordinator']
        break
      case 'installation_complete':
        // Already handled by notifyInstallationComplete, but include here for completeness
        rolesToNotify = ['manager', 'accountant']
        break
      case 'pending':
        // Notify managers when status goes back to pending
        rolesToNotify = ['manager', 'coordinator']
        break
      default:
        // For other status updates, notify managers and coordinators
        rolesToNotify = ['manager', 'coordinator']
    }

    // Get preferences for relevant roles - filtered by tenant
    const allPreferences: NotificationPreferences[] = []
    for (const role of rolesToNotify) {
      const prefs = await this.getPreferencesForRole(role, tenantId)
      allPreferences.push(...prefs)
    }

    // Get user names for better logging
    const allUserIds = allPreferences.map(p => p.userId)
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

    // Filter recipients based on the correct preference field for this specific status
    // For specific statuses, check the specific preference (e.g., notifyOnInstallationComplete)
    // For generic status updates, check notifyOnStatusUpdated
    const recipients: NotificationRecipient[] = allPreferences
      .filter(p => {
        const hasPhone = !!p.phoneNumber
        const isEnabled = p.whatsappEnabled === true
        
        if (!isEnabled || !hasPhone) {
          if (this.ENABLE_VERBOSE_LOGGING) {
            const reasons = []
            if (!isEnabled) reasons.push('WhatsApp not enabled')
            if (!hasPhone) reasons.push('No phone number')
            console.log(`[Notification] ⏭️ ${p.role} ${p.userId} skipped: ${reasons.join(', ')}`)
          }
          return false
        }
        
        // Check the appropriate preference field based on status
        let hasPreference = false
        const statusLower = newStatus.toLowerCase()
        
        if (statusLower === 'installation_complete') {
          hasPreference = p.notifyOnInstallationComplete === true
          if (!hasPreference && this.ENABLE_VERBOSE_LOGGING) {
            console.log(`[Notification] ⏭️ ${p.role} ${p.userId} skipped: "Installation Complete" preference not enabled`)
          }
        } else {
          // For other status updates, use the generic preference
          hasPreference = p.notifyOnStatusUpdated === true
          if (!hasPreference && this.ENABLE_VERBOSE_LOGGING) {
            console.log(`[Notification] ⏭️ ${p.role} ${p.userId} skipped: "Status Updated" preference not enabled`)
          }
        }
        
        return hasPreference
      })
      .map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
        name: userNamesMap.get(p.userId) || 'Unknown',
      }))

    console.log('[Notification] Status update recipients:', {
      total: recipients.length,
      byRole: {
        installers: recipients.filter(r => r.role === 'installer').length,
        coordinators: recipients.filter(r => r.role === 'coordinator').length,
        managers: recipients.filter(r => r.role === 'manager').length,
        accountants: recipients.filter(r => r.role === 'accountant').length,
      },
      phoneNumbers: recipients.map(r => r.phoneNumber)
    })

    if (recipients.length === 0) {
      console.warn('[Notification] No recipients found for status update. Check notification preferences:')
      console.warn('  - Are users enabled for WhatsApp notifications?')
      console.warn('  - Do users have phone numbers?')
      console.warn('  - Is "Status Updated" notification enabled for users?')
      console.warn('  - Are users in the correct tenant?')
      return
    }

    console.log('[Notification] Sending status update notifications to', recipients.length, 'recipients')
    const result = await whatsappService.sendWorkflowNotification(event, recipients, this.supabase, tenantId)
    console.log('[Notification] Status update notification result:', result)
  }

  /**
   * Send notification when installation is complete
   */
  async notifyInstallationComplete(vehicleId: string, vehicleData: any): Promise<void> {
    // Get tenant_id from vehicle data or fetch from current user
    const tenantId = await this.getTenantIdWithFallback(vehicleData)
    
    if (!tenantId) {
      console.error('[Notification] ❌ No tenant_id available, cannot send tenant-specific notifications. Skipping notification.')
      return
    }

    if (!(await this.isWhatsAppEnabled(tenantId))) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

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
    // IMPORTANT: Both whatsapp_enabled (from getPreferencesForRole) AND notifyOnInstallationComplete must be true
    const managers = await this.getPreferencesForRole('manager', tenantId)
    const accountants = await this.getPreferencesForRole('accountant', tenantId)

    // Filter and log: Show which users are included/excluded and why
    const managerRecipients = managers
      .filter(p => {
        // Both conditions must be true: preference enabled AND has phone number
        const hasPreference = p.notifyOnInstallationComplete === true
        const hasPhone = !!p.phoneNumber
        const isEnabled = p.whatsappEnabled === true
        
        if (!isEnabled) {
          console.log(`[Notification] ⏭️ Manager ${p.userId} skipped: WhatsApp not enabled`)
          return false
        }
        if (!hasPreference) {
          console.log(`[Notification] ⏭️ Manager ${p.userId} skipped: "Installation Complete" preference not enabled`)
          return false
        }
        if (!hasPhone) {
          console.log(`[Notification] ⏭️ Manager ${p.userId} skipped: No phone number`)
          return false
        }
        return true
      })
      .map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      }))

    const accountantRecipients = accountants
      .filter(p => {
        const hasPreference = p.notifyOnInstallationComplete === true
        const hasPhone = !!p.phoneNumber
        const isEnabled = p.whatsappEnabled === true
        
        if (!isEnabled) {
          console.log(`[Notification] ⏭️ Accountant ${p.userId} skipped: WhatsApp not enabled`)
          return false
        }
        if (!hasPreference) {
          console.log(`[Notification] ⏭️ Accountant ${p.userId} skipped: "Installation Complete" preference not enabled`)
          return false
        }
        if (!hasPhone) {
          console.log(`[Notification] ⏭️ Accountant ${p.userId} skipped: No phone number`)
          return false
        }
        return true
      })
      .map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      }))

    const recipients: NotificationRecipient[] = [...managerRecipients, ...accountantRecipients]

    console.log(`[Notification] 📤 Installation Complete: ${recipients.length} recipient(s) will receive notification`, {
      managers: managerRecipients.length,
      accountants: accountantRecipients.length,
      totalConsidered: managers.length + accountants.length,
      totalFiltered: (managers.length + accountants.length) - recipients.length
    })

    if (recipients.length > 0) {
      await whatsappService.sendWorkflowNotification(event, recipients, this.supabase, tenantId)
    } else {
      console.warn('[Notification] ⚠️ No recipients for Installation Complete notification. Check preferences:')
      console.warn('  - Are managers/accountants enabled for WhatsApp?')
      console.warn('  - Is "Installation Complete" checkbox checked for managers/accountants?')
      console.warn('  - Do users have valid phone numbers?')
    }
  }

  /**
   * Send notification when invoice number is added
   */
  async notifyInvoiceAdded(vehicleId: string, vehicleData: any): Promise<void> {
    // Get tenant_id from vehicle data or fetch from current user
    const tenantId = await this.getTenantIdWithFallback(vehicleData)
    
    console.log(`[Notification] 🔔 notifyInvoiceAdded called for vehicle: ${vehicleId}, tenant: ${tenantId || 'MISSING'}`)
    
    if (!tenantId) {
      console.error('[Notification] ❌ No tenant_id available, cannot send tenant-specific notifications. Skipping notification.')
      return
    }

    if (!(await this.isWhatsAppEnabled(tenantId))) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

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
    // IMPORTANT: Both whatsapp_enabled (from getPreferencesForRole) AND notifyOnInvoiceAdded must be true
    console.log(`[Notification] 🔍 Fetching preferences for managers (tenant: ${tenantId})`)
    const managers = await this.getPreferencesForRole('manager', tenantId)
    console.log(`[Notification] 📊 Found ${managers.length} manager(s) for tenant ${tenantId}`)

    const recipients: NotificationRecipient[] = managers
      .filter(p => {
        const hasPreference = p.notifyOnInvoiceAdded === true
        const hasPhone = !!p.phoneNumber
        const isEnabled = p.whatsappEnabled === true
        
        if (!isEnabled) {
          console.log(`[Notification] ⏭️ Manager ${p.userId} skipped: WhatsApp not enabled`)
          return false
        }
        if (!hasPreference) {
          console.log(`[Notification] ⏭️ Manager ${p.userId} skipped: "Invoice Added" preference not enabled`)
          return false
        }
        if (!hasPhone) {
          console.log(`[Notification] ⏭️ Manager ${p.userId} skipped: No phone number`)
          return false
        }
        return true
      })
      .map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      }))

    console.log(`[Notification] 📤 Invoice Added: ${recipients.length} manager(s) will receive notification`, {
      totalConsidered: managers.length,
      totalFiltered: managers.length - recipients.length
    })

    if (recipients.length > 0) {
      console.log(`[Notification] 📤 Sending invoice added notification to ${recipients.length} recipient(s) with tenantId: ${tenantId}`)
      await whatsappService.sendWorkflowNotification(event, recipients, this.supabase, tenantId)
    } else {
      console.warn('[Notification] ⚠️ No recipients for Invoice Added notification. Check preferences:')
      console.warn('  - Are managers enabled for WhatsApp?')
      console.warn('  - Is "Invoice Added" checkbox checked for managers?')
      console.warn('  - Do managers have valid phone numbers?')
    }
  }

  /**
   * Send notification when invoice is issued
   */
  async notifyInvoiceIssued(
    vehicleId: string,
    vehicleData: any,
    invoiceData: { invoiceNumber: string; amount: number; dueDate: string }
  ): Promise<void> {
    const tenantId = await this.getTenantIdWithFallback(vehicleData)
    
    if (!tenantId) {
      console.error('[Notification] ❌ No tenant_id available for invoice issued notification')
      return
    }

    if (!(await this.isWhatsAppEnabled(tenantId))) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

    const config = await whatsappService.loadConfig(this.supabase, tenantId)
    if (config) {
      await whatsappService.initialize(config)
    }

    const event: WorkflowEvent = {
      type: 'invoice_issued',
      vehicleId,
      vehicleNumber: vehicleData.registration_number,
      customerName: vehicleData.customer_name || vehicleData.customers?.name,
      triggeredByRole: 'accountant',
      metadata: {
        invoiceNumber: invoiceData.invoiceNumber,
        amount: invoiceData.amount,
        dueDate: invoiceData.dueDate
      }
    }

    // Notify customer (if phone number available)
    const customerPhone = vehicleData.customers?.phone || vehicleData.customer_phone
    if (customerPhone) {
      const recipients: NotificationRecipient[] = [{
        userId: vehicleData.customer_id || '',
        role: 'customer',
        phoneNumber: customerPhone
      }]
      await whatsappService.sendWorkflowNotification(event, recipients, this.supabase, tenantId)
    }
  }

  /**
   * Send notification when payment is received
   */
  async notifyPaymentReceived(
    vehicleId: string,
    vehicleData: any,
    paymentData: { amount: number; paymentMode: string; invoiceNumber: string }
  ): Promise<void> {
    const tenantId = await this.getTenantIdWithFallback(vehicleData)
    
    if (!tenantId) {
      console.error('[Notification] ❌ No tenant_id available for payment received notification')
      return
    }

    if (!(await this.isWhatsAppEnabled(tenantId))) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

    const config = await whatsappService.loadConfig(this.supabase, tenantId)
    if (config) {
      await whatsappService.initialize(config)
    }

    const event: WorkflowEvent = {
      type: 'payment_received',
      vehicleId,
      vehicleNumber: vehicleData.registration_number,
      customerName: vehicleData.customer_name || vehicleData.customers?.name,
      triggeredByRole: 'accountant',
      metadata: {
        amount: paymentData.amount,
        paymentMode: paymentData.paymentMode,
        invoiceNumber: paymentData.invoiceNumber
      }
    }

    // Notify customer
    const customerPhone = vehicleData.customers?.phone || vehicleData.customer_phone
    if (customerPhone) {
      const recipients: NotificationRecipient[] = [{
        userId: vehicleData.customer_id || '',
        role: 'customer',
        phoneNumber: customerPhone
      }]
      await whatsappService.sendWorkflowNotification(event, recipients, this.supabase, tenantId)
    }
  }

  /**
   * Send notification when invoice becomes overdue
   */
  async notifyInvoiceOverdue(
    vehicleId: string,
    vehicleData: any,
    invoiceData: { invoiceNumber: string; balanceAmount: number; dueDate: string }
  ): Promise<void> {
    const tenantId = await this.getTenantIdWithFallback(vehicleData)
    
    if (!tenantId) {
      console.error('[Notification] ❌ No tenant_id available for invoice overdue notification')
      return
    }

    if (!(await this.isWhatsAppEnabled(tenantId))) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

    const config = await whatsappService.loadConfig(this.supabase, tenantId)
    if (config) {
      await whatsappService.initialize(config)
    }

    const event: WorkflowEvent = {
      type: 'invoice_overdue',
      vehicleId,
      vehicleNumber: vehicleData.registration_number,
      customerName: vehicleData.customer_name || vehicleData.customers?.name,
      triggeredByRole: 'system',
      metadata: {
        invoiceNumber: invoiceData.invoiceNumber,
        balanceAmount: invoiceData.balanceAmount,
        dueDate: invoiceData.dueDate
      }
    }

    // Notify customer
    const customerPhone = vehicleData.customers?.phone || vehicleData.customer_phone
    if (customerPhone) {
      const recipients: NotificationRecipient[] = [{
        userId: vehicleData.customer_id || '',
        role: 'customer',
        phoneNumber: customerPhone
      }]
      await whatsappService.sendWorkflowNotification(event, recipients, this.supabase, tenantId)
    }
  }

  /**
   * Send payment reminder
   */
  async sendInvoiceReminder(
    vehicleId: string,
    vehicleData: any,
    invoiceData: { invoiceNumber: string; amount: number; dueDate: string }
  ): Promise<void> {
    const tenantId = await this.getTenantIdWithFallback(vehicleData)
    
    if (!tenantId) {
      console.error('[Notification] ❌ No tenant_id available for invoice reminder')
      return
    }

    if (!(await this.isWhatsAppEnabled(tenantId))) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

    const config = await whatsappService.loadConfig(this.supabase, tenantId)
    if (config) {
      await whatsappService.initialize(config)
    }

    const event: WorkflowEvent = {
      type: 'invoice_reminder',
      vehicleId,
      vehicleNumber: vehicleData.registration_number,
      customerName: vehicleData.customer_name || vehicleData.customers?.name,
      triggeredByRole: 'accountant',
      metadata: {
        invoiceNumber: invoiceData.invoiceNumber,
        amount: invoiceData.amount,
        dueDate: invoiceData.dueDate
      }
    }

    // Notify customer
    const customerPhone = vehicleData.customers?.phone || vehicleData.customer_phone
    if (customerPhone) {
      const recipients: NotificationRecipient[] = [{
        userId: vehicleData.customer_id || '',
        role: 'customer',
        phoneNumber: customerPhone
      }]
      await whatsappService.sendWorkflowNotification(event, recipients, this.supabase, tenantId)
    }
  }

  /**
   * Send notification when accountant completes
   */
  async notifyAccountantComplete(vehicleId: string, vehicleData: any): Promise<void> {
    // Get tenant_id from vehicle data or fetch from current user
    const tenantId = await this.getTenantIdWithFallback(vehicleData)
    
    console.log(`[Notification] 🔔 notifyAccountantComplete called for vehicle: ${vehicleId}, tenant: ${tenantId || 'MISSING'}`)
    
    if (!tenantId) {
      console.error('[Notification] ❌ No tenant_id available, cannot send tenant-specific notifications. Skipping notification.')
      return
    }

    if (!(await this.isWhatsAppEnabled(tenantId))) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

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
    // IMPORTANT: Both whatsapp_enabled (from getPreferencesForRole) AND notifyOnAccountantComplete must be true
    console.log(`[Notification] 🔍 Fetching preferences for coordinators and managers (tenant: ${tenantId})`)
    const coordinators = await this.getPreferencesForRole('coordinator', tenantId)
    const managers = await this.getPreferencesForRole('manager', tenantId)
    console.log(`[Notification] 📊 Found ${coordinators.length} coordinator(s) and ${managers.length} manager(s) for tenant ${tenantId}`)

    const coordinatorRecipients = coordinators
      .filter(p => {
        const hasPreference = p.notifyOnAccountantComplete === true
        const hasPhone = !!p.phoneNumber
        const isEnabled = p.whatsappEnabled === true
        
        if (!isEnabled || !hasPreference || !hasPhone) {
          // Always log for accountant notifications to diagnose issues
          const reasons = []
          if (!isEnabled) reasons.push('WhatsApp not enabled')
          if (!hasPreference) reasons.push('"Accountant Complete" preference not enabled')
          if (!hasPhone) reasons.push('No phone number')
          console.log(`[Notification] ⏭️ Coordinator ${p.userId} skipped: ${reasons.join(', ')}`)
          return false
        }
        return true
      })
      .map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      }))

    const managerRecipients = managers
      .filter(p => {
        const hasPreference = p.notifyOnAccountantComplete === true
        const hasPhone = !!p.phoneNumber
        const isEnabled = p.whatsappEnabled === true
        
        if (!isEnabled || !hasPreference || !hasPhone) {
          // Always log for accountant notifications to diagnose issues
          const reasons = []
          if (!isEnabled) reasons.push('WhatsApp not enabled')
          if (!hasPreference) reasons.push('"Accountant Complete" preference not enabled')
          if (!hasPhone) reasons.push('No phone number')
          console.log(`[Notification] ⏭️ Manager ${p.userId} skipped: ${reasons.join(', ')}`)
          return false
        }
        return true
      })
      .map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      }))

    const recipients: NotificationRecipient[] = [...coordinatorRecipients, ...managerRecipients]

    console.log(`[Notification] 📤 Accountant Complete: ${recipients.length} recipient(s) will receive notification`, {
      coordinators: coordinatorRecipients.length,
      managers: managerRecipients.length,
      totalConsidered: coordinators.length + managers.length,
      totalFiltered: (coordinators.length + managers.length) - recipients.length
    })

    if (recipients.length > 0) {
      console.log(`[Notification] 📤 Sending accountant complete notification to ${recipients.length} recipient(s) with tenantId: ${tenantId}`)
      await whatsappService.sendWorkflowNotification(event, recipients, this.supabase, tenantId)
    } else {
      console.warn('[Notification] ⚠️ No recipients for Accountant Complete notification. Check preferences:')
      console.warn('  - Are coordinators/managers enabled for WhatsApp?')
      console.warn('  - Is "Accountant Complete" checkbox checked for coordinators/managers?')
      console.warn('  - Do users have valid phone numbers?')
    }
  }

  /**
   * Send notification when vehicle is delivered
   */
  async notifyVehicleDelivered(vehicleId: string, vehicleData: any): Promise<void> {
    // Get tenant_id from vehicle data or fetch from current user
    const tenantId = await this.getTenantIdWithFallback(vehicleData)
    
    if (!tenantId) {
      console.error('[Notification] ❌ No tenant_id available, cannot send tenant-specific notifications. Skipping notification.')
      return
    }

    if (!(await this.isWhatsAppEnabled(tenantId))) {
      console.log('[Notification] WhatsApp notifications disabled, skipping')
      return
    }

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
    // IMPORTANT: Both whatsapp_enabled (from getPreferencesForRole) AND notifyOnVehicleDelivered must be true
    const managers = await this.getPreferencesForRole('manager', tenantId)
    const accountants = await this.getPreferencesForRole('accountant', tenantId)

    const managerRecipients = managers
      .filter(p => {
        const hasPreference = p.notifyOnVehicleDelivered === true
        const hasPhone = !!p.phoneNumber
        const isEnabled = p.whatsappEnabled === true
        
        if (!isEnabled || !hasPreference || !hasPhone) {
          if (this.ENABLE_VERBOSE_LOGGING) {
            const reasons = []
            if (!isEnabled) reasons.push('WhatsApp not enabled')
            if (!hasPreference) reasons.push('"Vehicle Delivered" preference not enabled')
            if (!hasPhone) reasons.push('No phone number')
            console.log(`[Notification] ⏭️ Manager ${p.userId} skipped: ${reasons.join(', ')}`)
          }
          return false
        }
        return true
      })
      .map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      }))

    const accountantRecipients = accountants
      .filter(p => {
        const hasPreference = p.notifyOnVehicleDelivered === true
        const hasPhone = !!p.phoneNumber
        const isEnabled = p.whatsappEnabled === true
        
        if (!isEnabled || !hasPreference || !hasPhone) {
          if (this.ENABLE_VERBOSE_LOGGING) {
            const reasons = []
            if (!isEnabled) reasons.push('WhatsApp not enabled')
            if (!hasPreference) reasons.push('"Vehicle Delivered" preference not enabled')
            if (!hasPhone) reasons.push('No phone number')
            console.log(`[Notification] ⏭️ Accountant ${p.userId} skipped: ${reasons.join(', ')}`)
          }
          return false
        }
        return true
      })
      .map(p => ({
        userId: p.userId,
        role: p.role as any,
        phoneNumber: p.phoneNumber!,
      }))

    const recipients: NotificationRecipient[] = [...managerRecipients, ...accountantRecipients]

    console.log(`[Notification] 📤 Vehicle Delivered: ${recipients.length} recipient(s) will receive notification`, {
      managers: managerRecipients.length,
      accountants: accountantRecipients.length,
      totalConsidered: managers.length + accountants.length,
      totalFiltered: (managers.length + accountants.length) - recipients.length
    })

    if (recipients.length > 0) {
      await whatsappService.sendWorkflowNotification(event, recipients, this.supabase, tenantId)
    } else {
      console.warn('[Notification] ⚠️ No recipients for Vehicle Delivered notification. Check preferences:')
      console.warn('  - Are managers/accountants enabled for WhatsApp?')
      console.warn('  - Is "Vehicle Delivered" checkbox checked for managers/accountants?')
      console.warn('  - Do users have valid phone numbers?')
    }
  }
}

// Export class for server-side use (e.g., background workers)
export { NotificationWorkflowService }

// Export singleton instance for client-side use
export const notificationWorkflow = new NotificationWorkflowService()

