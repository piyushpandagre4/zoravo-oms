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
  attachment?: {
    type: 'document' | 'image' | 'video'
    filename: string
    data: Buffer | string // Base64 encoded file data
    mimeType?: string
  }
}

export interface WorkflowEvent {
  type: 
    | 'vehicle_inward_created'
    | 'vehicle_status_updated'
    | 'installation_complete'
    | 'invoice_number_added'
    | 'accountant_completed'
    | 'vehicle_delivered'
    | 'invoice_issued'
    | 'payment_received'
    | 'invoice_overdue'
    | 'invoice_reminder'
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
  // Tenant-specific template cache: Map<tenantId, Map<eventType, template>>
  private templatesCache: Map<string, Map<string, string>> = new Map()
  // Cache timestamps per tenant: Map<tenantId, timestamp>
  private templatesCacheTime: Map<string, number> = new Map()
  private readonly TEMPLATES_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get absolute URL for API routes
   * Works in both client-side and server-side contexts
   */
  private getApiUrl(path: string): string {
    // If running server-side, we need an absolute URL
    if (typeof window === 'undefined') {
      // Use environment variable if available, otherwise default to localhost for dev
      let baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      
      // If VERCEL_URL is set, construct the full URL (VERCEL_URL doesn't include protocol)
      if (!baseUrl && process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`
      }
      
      // Fallback to localhost for local development
      if (!baseUrl) {
        baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://your-domain.com' 
          : 'http://localhost:3000'
      }
      
      return `${baseUrl}${path}`
    }
    // Client-side can use relative URLs
    return path
  }

  /**
   * Helper function to add timeout to fetch requests
   */
  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 5000): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`)
      }
      throw error
    }
  }

  /**
   * Initialize WhatsApp service with configuration
   */
  async initialize(config: WhatsAppConfig): Promise<void> {
    this.config = config
  }

  /**
   * Load configuration from database
   */
  async loadConfig(supabase: any, tenantId?: string | null): Promise<WhatsAppConfig | null> {
    try {
      // Helper function to parse config from settings data
      const parseConfig = (data: any[]): WhatsAppConfig | null => {
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

        return config as WhatsAppConfig
      }

      // Try tenant-specific config first if tenantId is provided
      if (tenantId) {
        const { data: tenantData, error: tenantError } = await supabase
          .from('system_settings')
          .select('*')
          .eq('setting_group', 'whatsapp_notifications')
          .eq('tenant_id', tenantId)
        
        if (!tenantError && tenantData && tenantData.length > 0) {
          const config = parseConfig(tenantData)
          if (config) {
            this.config = config
            return this.config
          }
        }
        
        // If tenant-specific config not found, try global config
        console.log(`[WhatsApp] Tenant-specific config not found for ${tenantId}, trying global config...`)
      }
      
      // Load global settings (null tenant_id)
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_group', 'whatsapp_notifications')
        .is('tenant_id', null)
      
      if (error) throw error
      
      const config = parseConfig(data || [])
      if (config) {
        this.config = config
        return this.config
      }

      return null
    } catch (error) {
      console.error('Error loading WhatsApp config:', error)
      return null
    }
  }

  /**
   * Load message templates from database, filtered by tenant
   * Returns tenant-specific templates if available, otherwise global templates
   * Uses tenant-specific caching to avoid repeated database queries
   */
  async loadMessageTemplates(supabase: any, tenantId?: string | null): Promise<Map<string, string>> {
    try {
      // Use 'global' as cache key if no tenantId
      const cacheKey = tenantId || 'global'
      const now = Date.now()
      
      // Check tenant-specific cache first (5-minute TTL)
      const cachedTemplates = this.templatesCache.get(cacheKey)
      const cacheTime = this.templatesCacheTime.get(cacheKey)
      
      if (cachedTemplates && cacheTime && (now - cacheTime) < this.TEMPLATES_CACHE_TTL) {
        console.log(`[WhatsApp] Using cached templates for tenant: ${cacheKey}`)
        return cachedTemplates
      }

      const templates = new Map<string, string>()
      
      // Load tenant-specific and global templates in parallel
      const queries = []
      
      if (tenantId) {
        queries.push(
          supabase
            .from('message_templates')
            .select('*')
            .eq('tenant_id', tenantId)
        )
      }
      
      queries.push(
        supabase
          .from('message_templates')
          .select('*')
          .is('tenant_id', null)
      )
      
      const results = await Promise.all(queries)
      
      // Process tenant-specific templates first
      if (tenantId && results[0]) {
        const { data: tenantTemplates, error: tenantError } = results[0]
        if (!tenantError && tenantTemplates) {
          console.log(`[WhatsApp] Loaded ${tenantTemplates.length} tenant-specific templates for tenant: ${tenantId}`)
          tenantTemplates.forEach((template: any) => {
            templates.set(template.event_type, template.template)
          })
        }
      }
      
      // Process global templates (fallback)
      const globalIndex = tenantId ? 1 : 0
      if (results[globalIndex]) {
        const { data: globalTemplates, error: globalError } = results[globalIndex]
        if (!globalError && globalTemplates) {
          console.log(`[WhatsApp] Loaded ${globalTemplates.length} global templates as fallback`)
          globalTemplates.forEach((template: any) => {
            if (!templates.has(template.event_type)) {
              templates.set(template.event_type, template.template)
            }
          })
        }
      }
      
      // Update tenant-specific cache
      this.templatesCache.set(cacheKey, templates)
      this.templatesCacheTime.set(cacheKey, now)
      
      console.log(`[WhatsApp] Cached templates for tenant: ${cacheKey} (${templates.size} templates)`)
      
      return templates
    } catch (error) {
      console.error('[WhatsApp] Error loading message templates:', error)
      // Return cached templates for this tenant if available, otherwise empty map
      const cacheKey = tenantId || 'global'
      const cachedTemplates = this.templatesCache.get(cacheKey)
      return cachedTemplates || new Map()
    }
  }

  /**
   * Send WhatsApp message (with optional file attachment)
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
   * Send WhatsApp message with PDF document
   */
  async sendDocument(
    to: string,
    message: string,
    pdfBuffer: Buffer,
    filename: string
  ): Promise<{ success: boolean; error?: string }> {
    return await this.sendMessage({
      to,
      message,
      attachment: {
        type: 'document',
        filename,
        data: pdfBuffer.toString('base64'),
        mimeType: 'application/pdf'
      }
    })
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
      const apiUrl = this.getApiUrl('/api/whatsapp/send')
      const response = await this.fetchWithTimeout(apiUrl, {
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
      const apiUrl = this.getApiUrl('/api/whatsapp/send')
      const response = await this.fetchWithTimeout(apiUrl, {
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
      }, 5000)

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
   * - Server-side: Calls MessageAutoSender API directly (no auth needed)
   * - Client-side: Uses Next.js API route to avoid CORS issues
   * Supports text messages and document attachments
   */
  private async sendViaMessageAutoSender(message: NotificationMessage): Promise<{ success: boolean; error?: string }> {
    if (!this.config?.apiKey || !this.config?.userId || !this.config?.password) {
      return { success: false, error: 'MessageAutoSender configuration is incomplete' }
    }

    const isServerSide = typeof window === 'undefined'

    // If running server-side (background worker), call MessageAutoSender API directly
    if (isServerSide) {
      return await this.sendDirectlyToMessageAutoSender(message)
    }

    // If running client-side, use Next.js API route (for authentication and CORS)
    try {
      const apiUrl = this.getApiUrl('/api/whatsapp/send')
      
      console.log('[WhatsApp] Sending via MessageAutoSender (client-side):', {
        apiUrl,
        to: message.to
      })
      
      const requestBody: any = {
        provider: 'messageautosender',
        config: {
          apiKey: this.config.apiKey,
          userId: this.config.userId,
          password: this.config.password,
          webhookUrl: this.config.webhookUrl || 'https://app.messageautosender.com/api/whatsapp/send',
        },
        to: message.to,
        message: message.message,
      }

      if (message.attachment) {
        requestBody.attachment = message.attachment
      }

      const response = await this.fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }, 5000)

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMsg = result.error || `HTTP ${response.status}: ${response.statusText}`
        console.error('[WhatsApp] Send failed:', errorMsg)
        return { success: false, error: errorMsg }
      }
      return { success: true }
    } catch (error: any) {
      console.error('[WhatsApp] Exception:', error)
      return { success: false, error: error.message || 'Failed to connect to WhatsApp API' }
    }
  }

  /**
   * Send directly to MessageAutoSender API (server-side only)
   * This bypasses the Next.js API route and calls the external API directly
   */
  private async sendDirectlyToMessageAutoSender(message: NotificationMessage): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[WhatsApp] Sending directly to MessageAutoSender (server-side):', {
        to: message.to
      })

      // Normalize phone number
      let phoneNumber = message.to.replace(/[^\d+]/g, '')
      if (phoneNumber.startsWith('+')) {
        phoneNumber = phoneNumber.substring(1)
      }
      
      // If it's exactly 10 digits, assume it's Indian and add 91
      if (/^\d{10}$/.test(phoneNumber)) {
        phoneNumber = '91' + phoneNumber
      }
      
      // If it's 11 digits and starts with 0, remove 0 and add 91
      if (/^0\d{10}$/.test(phoneNumber)) {
        phoneNumber = '91' + phoneNumber.substring(1)
      }

      // Construct API URL
      let apiUrl = this.config.webhookUrl || 'https://app.messageautosender.com/api/v1/message/create'
      
      if (this.config.webhookUrl) {
        if (!this.config.webhookUrl.match(/\/api\/v1\/message\/create(\/)?$/i)) {
          const baseUrl = this.config.webhookUrl.replace(/\/$/, '')
          apiUrl = `${baseUrl}/api/v1/message/create`
        } else {
          apiUrl = this.config.webhookUrl
        }
      }

      console.log('[WhatsApp] Using MessageAutoSender API URL:', apiUrl)

      // Try Method 1: API key in header (x-api-key) - preferred method
      const payload = {
        receiverMobileNo: `+${phoneNumber}`,
        message: [message.message], // Must be an array
      }

      let response = await this.fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }, 5000)

      let result: any = null
      let responseRead = false

      // Read response body only once
      if (response.ok) {
        result = await response.json()
        responseRead = true
        
        if (result.success === false || result.error || result.status === 'error') {
          // Try Method 2: Basic Auth as fallback
          console.log('[WhatsApp] Method 1 failed, trying Basic Auth')
          const basicAuth = Buffer.from(`${this.config.userId}:${this.config.password}`).toString('base64')
          response = await this.fetchWithTimeout(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${basicAuth}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }, 5000)
          responseRead = false // Reset flag for new response
        }
      } else if (response.status === 401 || response.status === 403) {
        // Try Method 2: Basic Auth as fallback
        console.log(`[WhatsApp] Method 1 failed with ${response.status}, trying Basic Auth`)
        const basicAuth = Buffer.from(`${this.config.userId}:${this.config.password}`).toString('base64')
        response = await this.fetchWithTimeout(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }, 5000)
        responseRead = false // Reset flag for new response
      }

      // Read response body (only if not already read)
      if (!responseRead) {
        if (!response.ok) {
          const errorText = await response.text()
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { message: errorText || 'Failed to send message' }
          }
          const errorMsg = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`
          console.error('[WhatsApp] Send failed:', errorMsg)
          return { success: false, error: errorMsg }
        }

        result = await response.json()
      }

      // Check result (from either first or second attempt)
      if (result.success === false || result.error || result.status === 'error') {
        const errorMsg = result.error || result.message || 'Failed to send message'
        console.error('[WhatsApp] Send failed:', errorMsg)
        return { success: false, error: errorMsg }
      }

      console.log('[WhatsApp] ✅ Message sent successfully')
      return { success: true }
    } catch (error: any) {
      console.error('[WhatsApp] Exception:', error)
      return { success: false, error: error.message || 'Failed to connect to MessageAutoSender API' }
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
      const apiUrl = this.getApiUrl('/api/whatsapp/send')
      const response = await this.fetchWithTimeout(apiUrl, {
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
      }, 5000)

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
   * Set templates for a specific tenant
   * @param templates - Map of event_type -> template string
   * @param tenantId - Tenant ID (or 'global' if no tenantId)
   */
  setTemplates(templates: Map<string, string>, tenantId?: string | null): void {
    const cacheKey = tenantId || 'global'
    this.templatesCache.set(cacheKey, templates)
    this.templatesCacheTime.set(cacheKey, Date.now())
    console.log(`[WhatsApp] Set templates for tenant: ${cacheKey} (${templates.size} templates)`)
  }
  
  /**
   * Get templates for a specific tenant
   * @param tenantId - Tenant ID (or 'global' if no tenantId)
   * @returns Map of event_type -> template string, or empty Map if not cached
   */
  getTemplates(tenantId?: string | null): Map<string, string> {
    const cacheKey = tenantId || 'global'
    return this.templatesCache.get(cacheKey) || new Map()
  }

  /**
   * Generate notification message based on workflow event
   * Uses custom template from database if available, otherwise uses default
   * @param event - Workflow event details
   * @param recipient - Notification recipient
   * @param tenantId - Tenant ID to get tenant-specific templates
   */
  generateWorkflowMessage(event: WorkflowEvent, recipient: NotificationRecipient, tenantId?: string | null): string {
    // Get tenant-specific templates
    const templates = this.getTemplates(tenantId)
    const customTemplate = templates.get(event.type)
    
    console.log(`[WhatsApp] Generating message for event type: "${event.type}", tenant: ${tenantId || 'global'}`, {
      eventType: event.type,
      tenantId: tenantId || 'global',
      hasCustomTemplate: !!customTemplate,
      availableTemplates: Array.from(templates.keys())
    })
    
    if (customTemplate) {
      console.log(`[WhatsApp] ✅ Using custom template for "${event.type}" (tenant: ${tenantId || 'global'})`)
      // Replace template variables with actual values
      return this.replaceTemplateVariables(customTemplate, event, recipient)
    }
    
    console.log(`[WhatsApp] ⚠️ No custom template found for "${event.type}" (tenant: ${tenantId || 'global'}), using default template`)

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

      case 'invoice_issued':
        const invoiceNumber = event.metadata?.invoiceNumber || 'N/A'
        const amount = event.metadata?.amount || 0
        const dueDate = event.metadata?.dueDate || 'N/A'
        return `🧾 *Invoice Issued*\n\n${vehicleInfo}\n${customerInfo}\n\nInvoice #: ${invoiceNumber}\nAmount: ₹${amount.toLocaleString('en-IN')}\nDue Date: ${dueDate}\n\nPlease make payment before due date.`

      case 'payment_received':
        const paymentAmount = event.metadata?.amount || 0
        const paymentMode = event.metadata?.paymentMode || 'N/A'
        const invNumber = event.metadata?.invoiceNumber || 'N/A'
        return `✅ *Payment Received*\n\n${vehicleInfo}\n${customerInfo}\n\nInvoice #: ${invNumber}\nPayment: ₹${paymentAmount.toLocaleString('en-IN')}\nMode: ${paymentMode}\n\nThank you for your payment!`

      case 'invoice_overdue':
        const overdueInvoiceNumber = event.metadata?.invoiceNumber || 'N/A'
        const balanceAmount = event.metadata?.balanceAmount || 0
        const overdueDueDate = event.metadata?.dueDate || 'N/A'
        return `⚠️ *Payment Overdue*\n\n${vehicleInfo}\n${customerInfo}\n\nInvoice #: ${overdueInvoiceNumber}\nAmount Due: ₹${balanceAmount.toLocaleString('en-IN')}\nDue Date: ${overdueDueDate}\n\nPlease make payment at the earliest.`

      case 'invoice_reminder':
        const reminderInvoiceNumber = event.metadata?.invoiceNumber || 'N/A'
        const reminderAmount = event.metadata?.amount || 0
        const reminderDueDate = event.metadata?.dueDate || 'N/A'
        return `📋 *Payment Reminder*\n\n${vehicleInfo}\n${customerInfo}\n\nInvoice #: ${reminderInvoiceNumber}\nAmount: ₹${reminderAmount.toLocaleString('en-IN')}\nDue Date: ${reminderDueDate}\n\nThis is a friendly reminder about your pending payment.`

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
    supabase?: any,
    tenantId?: string | null
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const results = { sent: 0, failed: 0, errors: [] as string[] }

    // Send workflow notification to recipients

    // Check if WhatsApp is enabled
    if (!this.config?.enabled) {
      console.warn('[WhatsApp] Notifications are disabled in configuration')
      results.errors.push('WhatsApp notifications are disabled')
      return results
    }

    // Load templates from database if supabase is provided
    // Use tenantId passed as parameter, or try to extract from recipients as fallback
    let effectiveTenantId: string | null = tenantId || null
    
    if (!effectiveTenantId && recipients.length > 0 && supabase) {
      // Fallback: Try to get tenant_id from the first recipient's userId
      try {
        const { data: tenantUser } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', recipients[0].userId)
          .limit(1)
          .maybeSingle()
        
        if (tenantUser) {
          effectiveTenantId = tenantUser.tenant_id
          console.log(`[WhatsApp] Extracted tenant_id ${effectiveTenantId} from recipient`)
        }
      } catch (error) {
        console.warn('[WhatsApp] Could not determine tenant_id from recipients:', error)
      }
    }
    
    if (supabase) {
      const templates = await this.loadMessageTemplates(supabase, effectiveTenantId)
      this.setTemplates(templates, effectiveTenantId)
      console.log(`[WhatsApp] Templates loaded for tenant: ${effectiveTenantId || 'global'}`, {
        tenantId: effectiveTenantId || 'global',
        eventTypes: Array.from(templates.keys()),
        templateCount: templates.size
      })
    }

    // Send messages in parallel to improve performance
    const sendPromises = recipients.map(async (recipient) => {
      if (!recipient.phoneNumber) {
        const errorMsg = `No phone number for ${recipient.name || recipient.userId}`
        console.warn('[WhatsApp]', errorMsg)
        return { success: false, error: errorMsg, recipient }
      }

      // Generate message using tenant-specific templates
      const message = this.generateWorkflowMessage(event, recipient, effectiveTenantId)
      
      const result = await this.sendMessage({
        to: recipient.phoneNumber,
        message: message,
      })

      return { ...result, recipient }
    })

    // Wait for all messages to complete
    const sendResults = await Promise.allSettled(sendPromises)
    
    // Process results
    for (const result of sendResults) {
      if (result.status === 'fulfilled') {
        const { success, error, recipient } = result.value
        if (success) {
          results.sent++
        } else {
          results.failed++
          const errorMsg = recipient 
            ? `${recipient.name || recipient.userId} (${recipient.phoneNumber}): ${error}`
            : error || 'Unknown error'
          console.error('[WhatsApp] ✗ Failed:', errorMsg)
          results.errors.push(errorMsg)
        }
      } else {
        results.failed++
        const errorMsg = `Failed to send message: ${result.reason}`
        console.error('[WhatsApp] ✗ Error:', errorMsg)
        results.errors.push(errorMsg)
      }
    }

    return results
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService()

