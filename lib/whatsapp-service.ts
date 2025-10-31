/**
 * WhatsApp Notification Service
 * Handles sending WhatsApp notifications via WhatsApp Business API
 * Supports multiple providers: Twilio, WhatsApp Cloud API, or custom endpoints
 */

export interface WhatsAppConfig {
  enabled: boolean
  provider: 'twilio' | 'cloud-api' | 'custom' | 'messageautosender'
  apiKey?: string // For MessageAutoSender
  apiSecret?: string
  userId?: string // For MessageAutoSender
  password?: string // For MessageAutoSender
  accountSid?: string // For Twilio
  authToken?: string // For Twilio
  fromNumber?: string // WhatsApp number with country code (e.g., +919876543210)
  webhookUrl?: string // For custom provider or MessageAutoSender API endpoint
  businessAccountId?: string // For WhatsApp Cloud API
  accessToken?: string // For WhatsApp Cloud API
}

export interface MessageTemplate {
  event_type: string
  template: string
}

export interface NotificationRecipient {
  userId: string
  role: 'installer' | 'coordinator' | 'accountant' | 'manager'
  phoneNumber: string // With country code (e.g., +919876543210)
  name?: string
}

export interface NotificationMessage {
  to: string // Phone number with country code
  message: string
  templateId?: string // For template messages
  variables?: Record<string, string> // Template variables
}

export interface WorkflowEvent {
  type: 
    | 'vehicle_inward_created'
    | 'vehicle_status_updated'
    | 'installation_complete'
    | 'invoice_number_added'
    | 'accountant_completed'
    | 'vehicle_delivered'
  vehicleId: string
  vehicleNumber?: string
  customerName?: string
  status?: string
  triggeredBy?: string
  triggeredByRole?: string
  metadata?: Record<string, any>
}

class WhatsAppService {
  private config: WhatsAppConfig | null = null
  private templates: Map<string, string> = new Map()

  /**
   * Initialize WhatsApp service with configuration
   */
  async initialize(config: WhatsAppConfig): Promise<void> {
    this.config = config
  }

  /**
   * Load configuration from database
   */
  async loadConfig(supabase: any): Promise<WhatsAppConfig | null> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_group', 'whatsapp_notifications')
      
      if (error) throw error
      
      if (!data || data.length === 0) {
        return null
      }

      const config: Partial<WhatsAppConfig> = { enabled: false }
      
      data.forEach((setting: any) => {
        const key = setting.setting_key.replace('whatsapp_', '')
        const value = setting.setting_value || ''
        
        // Map database keys to config properties
        switch (key) {
          case 'enabled':
            config.enabled = value === 'true'
            break
          case 'provider':
            config.provider = value as any
            break
          case 'user_id':
            config.userId = value
            break
          case 'password':
            config.password = value
            break
          case 'api_key':
            config.apiKey = value
            break
          case 'api_secret':
            config.apiSecret = value
            break
          case 'from_number':
            config.fromNumber = value
            break
          case 'account_sid':
            config.accountSid = value
            break
          case 'auth_token':
            config.authToken = value
            break
          case 'business_account_id':
            config.businessAccountId = value
            break
          case 'access_token':
            config.accessToken = value
            break
          case 'webhook_url':
            config.webhookUrl = value
            break
        }
      })

      this.config = config as WhatsAppConfig
      return this.config
    } catch (error) {
      console.error('Error loading WhatsApp config:', error)
      return null
    }
  }

  /**
   * Load message templates from database
   */
  async loadMessageTemplates(supabase: any): Promise<Map<string, string>> {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
      
      if (error) throw error
      
      const templates = new Map<string, string>()
      if (data && data.length > 0) {
        data.forEach((template: any) => {
          templates.set(template.event_type, template.template)
        })
      }
      
      return templates
    } catch (error) {
      console.error('Error loading message templates:', error)
      return new Map()
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(message: NotificationMessage): Promise<{ success: boolean; error?: string }> {
    if (!this.config || !this.config.enabled) {
      return { success: false, error: 'WhatsApp notifications are not enabled' }
    }

    try {
      switch (this.config.provider) {
        case 'twilio':
          return await this.sendViaTwilio(message)
        case 'cloud-api':
          return await this.sendViaCloudAPI(message)
        case 'messageautosender':
          return await this.sendViaMessageAutoSender(message)
        case 'custom':
          return await this.sendViaCustom(message)
        default:
          return { success: false, error: 'Unknown provider' }
      }
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error)
      return { success: false, error: error.message || 'Failed to send message' }
    }
  }

  /**
   * Send via Twilio WhatsApp API
   * Uses Next.js API route to avoid CORS issues
   */
  private async sendViaTwilio(message: NotificationMessage): Promise<{ success: boolean; error?: string }> {
    if (!this.config?.accountSid || !this.config?.authToken || !this.config?.fromNumber) {
      return { success: false, error: 'Twilio configuration is incomplete' }
    }

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'twilio',
          config: {
            accountSid: this.config.accountSid,
            authToken: this.config.authToken,
            fromNumber: this.config.fromNumber,
          },
          to: message.to,
          message: message.message,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Failed to send message' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Send via WhatsApp Cloud API
   * Uses Next.js API route to avoid CORS issues
   */
  private async sendViaCloudAPI(message: NotificationMessage): Promise<{ success: boolean; error?: string }> {
    if (!this.config?.businessAccountId || !this.config?.accessToken || !this.config?.fromNumber) {
      return { success: false, error: 'WhatsApp Cloud API configuration is incomplete' }
    }

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'cloud-api',
          config: {
            businessAccountId: this.config.businessAccountId,
            accessToken: this.config.accessToken,
            fromNumber: this.config.fromNumber,
          },
          to: message.to,
          message: message.message,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Failed to send message' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Normalize phone number to include country code if missing
   * Assumes 10-digit numbers are Indian (+91)
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '')
    
    // Remove leading + if present
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1)
    }
    
    // If it's exactly 10 digits, assume it's Indian and add +91
    if (/^\d{10}$/.test(cleaned)) {
      return '91' + cleaned
    }
    
    // If it's 11 digits and starts with 0, remove 0 and add 91 (Indian format)
    if (/^0\d{10}$/.test(cleaned)) {
      return '91' + cleaned.substring(1)
    }
    
    // If it's 12 digits and starts with 91, it's already Indian format
    if (/^91\d{10}$/.test(cleaned)) {
      return cleaned
    }
    
    // Return as-is (should already have country code)
    return cleaned
  }

  /**
   * Send via MessageAutoSender API
   * Uses Next.js API route to avoid CORS issues
   */
  private async sendViaMessageAutoSender(message: NotificationMessage): Promise<{ success: boolean; error?: string }> {
    if (!this.config?.apiKey || !this.config?.userId || !this.config?.password) {
      return { success: false, error: 'MessageAutoSender configuration is incomplete' }
    }

    try {
      // Use Next.js API route to proxy the request (avoids CORS issues)
      const apiUrl = '/api/whatsapp/send'
      
      // Normalize phone number - ensure it has country code
      const phoneNumber = this.normalizePhoneNumber(message.to)
      
      console.log('[WhatsApp] Sending to:', phoneNumber, 'via API proxy')

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'messageautosender',
          config: {
            apiKey: this.config.apiKey,
            userId: this.config.userId,
            password: this.config.password,
            webhookUrl: this.config.webhookUrl || 'https://app.messageautosender.com/api/whatsapp/send',
          },
          to: message.to, // Send original, normalization happens on server
          message: message.message,
        }),
      })

      const result = await response.json()
      console.log('[WhatsApp] API response:', result)

      if (!response.ok || !result.success) {
        const errorMsg = result.error || `HTTP ${response.status}: ${response.statusText}`
        console.error('[WhatsApp] Send failed:', errorMsg)
        return { success: false, error: errorMsg }
      }

      console.log('[WhatsApp] Message sent successfully')
      return { success: true }
    } catch (error: any) {
      console.error('[WhatsApp] Exception:', error)
      return { success: false, error: error.message || 'Failed to connect to WhatsApp API' }
    }
  }

  /**
   * Send via custom webhook
   * Uses Next.js API route to avoid CORS issues
   */
  private async sendViaCustom(message: NotificationMessage): Promise<{ success: boolean; error?: string }> {
    if (!this.config?.webhookUrl) {
      return { success: false, error: 'Custom webhook URL is not configured' }
    }

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'custom',
          config: {
            webhookUrl: this.config.webhookUrl,
            apiKey: this.config.apiKey,
            apiSecret: this.config.apiSecret,
          },
          to: message.to,
          message: message.message,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Webhook returned an error' }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Set message templates (used for custom templates from database)
   */
  setTemplates(templates: Map<string, string>): void {
    this.templates = templates
  }

  /**
   * Generate notification message based on workflow event
   * Uses custom template from database if available, otherwise uses default
   */
  generateWorkflowMessage(event: WorkflowEvent, recipient: NotificationRecipient, supabase?: any): string {
    // Try to load template from database if supabase is provided
    const customTemplate = this.templates.get(event.type)
    
    if (customTemplate) {
      // Replace template variables with actual values
      return this.replaceTemplateVariables(customTemplate, event, recipient)
    }

    // Use default templates if custom template not available
    const vehicleInfo = event.vehicleNumber ? `Vehicle: ${event.vehicleNumber}` : `Vehicle ID: ${event.vehicleId.substring(0, 8)}`
    const customerInfo = event.customerName ? `Customer: ${event.customerName}` : ''

    switch (event.type) {
      case 'vehicle_inward_created':
        return `🚗 *New Vehicle Entry*\n\n${vehicleInfo}\n${customerInfo}\n\nStatus: Pending\n\nPlease check the dashboard for details.`

      case 'vehicle_status_updated':
        return `📝 *Status Updated*\n\n${vehicleInfo}\n${customerInfo}\n\nNew Status: ${event.status || 'Updated'}\n\nPlease check the dashboard for details.`

      case 'installation_complete':
        return `✅ *Installation Complete*\n\n${vehicleInfo}\n${customerInfo}\n\nAll products have been installed successfully.\n\nReady for accountant review.`

      case 'invoice_number_added':
        return `🧾 *Invoice Number Added*\n\n${vehicleInfo}\n${customerInfo}\n\nInvoice number has been set by accountant.\n\nPlease check the dashboard for details.`

      case 'accountant_completed':
        return `✓ *Accountant Completed*\n\n${vehicleInfo}\n${customerInfo}\n\nInvoice processing completed.\n\nReady for delivery.`

      case 'vehicle_delivered':
        return `🎉 *Vehicle Delivered*\n\n${vehicleInfo}\n${customerInfo}\n\nVehicle has been marked as delivered.\n\nThank you for your work!`

      default:
        return `📢 *Notification*\n\n${vehicleInfo}\n${customerInfo}\n\nPlease check the dashboard for updates.`
    }
  }

  /**
   * Replace template variables with actual values
   * Supports variables: {{vehicleNumber}}, {{customerName}}, {{vehicleId}}, {{status}}, etc.
   */
  private replaceTemplateVariables(template: string, event: WorkflowEvent, recipient: NotificationRecipient): string {
    let message = template
    message = message.replace(/\{\{vehicleNumber\}\}/g, event.vehicleNumber || event.vehicleId.substring(0, 8))
    message = message.replace(/\{\{customerName\}\}/g, event.customerName || 'N/A')
    message = message.replace(/\{\{vehicleId\}\}/g, event.vehicleId.substring(0, 8))
    message = message.replace(/\{\{status\}\}/g, event.status || 'N/A')
    message = message.replace(/\{\{recipientName\}\}/g, recipient.name || 'User')
    message = message.replace(/\{\{recipientRole\}\}/g, recipient.role.charAt(0).toUpperCase() + recipient.role.slice(1))
    return message
  }

  /**
   * Send workflow notification to recipients
   */
  async sendWorkflowNotification(
    event: WorkflowEvent,
    recipients: NotificationRecipient[],
    supabase?: any
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const results = { sent: 0, failed: 0, errors: [] as string[] }

    console.log('[WhatsApp] Sending workflow notification:', event.type, 'to', recipients.length, 'recipients')

    // Check if WhatsApp is enabled
    if (!this.config?.enabled) {
      console.warn('[WhatsApp] Notifications are disabled in configuration')
      results.errors.push('WhatsApp notifications are disabled')
      return results
    }

    // Load templates from database if supabase is provided
    if (supabase) {
      const templates = await this.loadMessageTemplates(supabase)
      this.setTemplates(templates)
    }

    for (const recipient of recipients) {
      if (!recipient.phoneNumber) {
        const errorMsg = `No phone number for ${recipient.name || recipient.userId}`
        console.warn('[WhatsApp]', errorMsg)
        results.failed++
        results.errors.push(errorMsg)
        continue
      }

      const message = this.generateWorkflowMessage(event, recipient, supabase)
      console.log('[WhatsApp] Sending to', recipient.phoneNumber, 'Role:', recipient.role)
      
      const result = await this.sendMessage({
        to: recipient.phoneNumber,
        message: message,
      })

      if (result.success) {
        results.sent++
        console.log('[WhatsApp] ✓ Sent to', recipient.phoneNumber)
      } else {
        results.failed++
        const errorMsg = `${recipient.name || recipient.userId} (${recipient.phoneNumber}): ${result.error}`
        console.error('[WhatsApp] ✗ Failed:', errorMsg)
        results.errors.push(errorMsg)
      }
    }

    console.log('[WhatsApp] Notification complete:', results.sent, 'sent,', results.failed, 'failed')
    return results
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService()

