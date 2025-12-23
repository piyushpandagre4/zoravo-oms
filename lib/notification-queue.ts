/**
 * Notification Queue Service
 * Handles enqueueing notifications for async processing
 * This decouples WhatsApp from user actions, improving performance
 */

import { createClient } from '@/lib/supabase/client'

export type NotificationEventType = 
  | 'vehicle_inward_created'
  | 'vehicle_status_updated'
  | 'installation_complete'
  | 'invoice_number_added'
  | 'accountant_completed'
  | 'vehicle_delivered'

export interface NotificationQueueItem {
  tenant_id: string
  event_type: NotificationEventType
  payload: {
    vehicleId: string
    vehicleData: any
    status?: string
    triggeredByRole?: string
    [key: string]: any
  }
}

export interface QueueStatus {
  exists: boolean
  queueId?: string
  status?: 'pending' | 'processing' | 'sent' | 'failed'
  retryCount?: number
  errorMessage?: string
  createdAt?: string
  processedAt?: string
}

export interface EnqueueResult {
  success: boolean
  queueId?: string
  error?: string
}

class NotificationQueueService {
  private supabase = createClient()

  /**
   * Helper method to resolve and validate tenant_id from vehicle data or database
   * This ensures consistent tenant_id handling across all notification types
   */
  private async resolveTenantId(vehicleId: string, vehicleData: any): Promise<string | null> {
    let tenantId = vehicleData?.tenant_id
    
    // If tenant_id is missing or invalid, try to fetch from database
    if (!tenantId || tenantId === '00000000-0000-0000-0000-000000000000') {
      console.warn('[NotificationQueue] ⚠️ No valid tenant_id in vehicle data, attempting to fetch...', {
        vehicleId,
        vehicleDataKeys: Object.keys(vehicleData || {}),
        vehicleDataTenantId: vehicleData?.tenant_id
      })
      
      try {
        const { data: vehicleRecord, error } = await this.supabase
          .from('vehicle_inward')
          .select('tenant_id')
          .eq('id', vehicleId)
          .single()
        
        if (!error && vehicleRecord?.tenant_id) {
          tenantId = vehicleRecord.tenant_id
          console.log('[NotificationQueue] ✅ Fetched tenant_id from vehicle record:', tenantId)
        } else {
          console.error('[NotificationQueue] ❌ Could not fetch tenant_id from vehicle record:', error)
        }
      } catch (error: any) {
        console.error('[NotificationQueue] ❌ Exception fetching tenant_id:', error)
      }
    }
    
    // Validate tenant_id format (should be a valid UUID)
    if (tenantId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(tenantId)) {
        console.error('[NotificationQueue] ❌ Invalid tenant_id format:', {
          tenantId,
          vehicleId
        })
        return null
      }
      
      // Check for all-zeros UUID (common default/error value)
      if (tenantId === '00000000-0000-0000-0000-000000000000') {
        console.error('[NotificationQueue] ❌ tenant_id is all zeros (invalid)', {
          tenantId,
          vehicleId
        })
        return null
      }
    }
    
    return tenantId || null
  }

  /**
   * Enqueue a notification for async processing
   * This is fast and non-blocking - just inserts into database
   */
  async enqueue(item: NotificationQueueItem): Promise<EnqueueResult> {
    try {
      // Validate tenant_id before insert
      if (!item.tenant_id || item.tenant_id === '00000000-0000-0000-0000-000000000000') {
        console.error('[NotificationQueue] ❌ Cannot enqueue: tenant_id is missing or invalid', {
          tenant_id: item.tenant_id,
          event_type: item.event_type,
          vehicleId: item.payload.vehicleId
        })
        return { success: false, error: 'Invalid tenant_id: cannot be null or all zeros' }
      }

      const insertData = {
        tenant_id: item.tenant_id,
        event_type: item.event_type,
        payload: item.payload,
        status: 'pending' as const
      }

      console.log('[NotificationQueue] Enqueueing notification:', {
        event_type: item.event_type,
        tenant_id: item.tenant_id,
        vehicleId: item.payload.vehicleId,
        insertData: {
          ...insertData,
          payload: { ...insertData.payload, vehicleData: '...' } // Truncate payload for logging
        }
      })

      const { data, error } = await this.supabase
        .from('notification_queue')
        .insert([insertData])
        .select('id, tenant_id') // Select both id and tenant_id to verify what was inserted
        .single()

      if (error) {
        console.error('[NotificationQueue] ❌ Error enqueueing notification:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          event_type: item.event_type,
          tenant_id: item.tenant_id
        })
        return { success: false, error: error.message }
      }

      // Verify tenant_id was inserted correctly
      if (data.tenant_id !== item.tenant_id) {
        console.error('[NotificationQueue] ⚠️ WARNING: tenant_id mismatch!', {
          expected: item.tenant_id,
          actual: data.tenant_id,
          queueId: data.id,
          event_type: item.event_type
        })
      }

      console.log('[NotificationQueue] ✅ Successfully enqueued notification:', {
        queueId: data.id,
        event_type: item.event_type,
        tenant_id_inserted: data.tenant_id,
        tenant_id_expected: item.tenant_id,
        match: data.tenant_id === item.tenant_id
      })

      return { success: true, queueId: data.id }
    } catch (error: any) {
      console.error('[NotificationQueue] ❌ Exception enqueueing notification:', {
        error: error.message,
        stack: error.stack,
        event_type: item.event_type,
        tenant_id: item.tenant_id
      })
      return { success: false, error: error.message || 'Unknown error' }
    }
  }

  /**
   * Enqueue vehicle created notification
   */
  async enqueueVehicleCreated(vehicleId: string, vehicleData: any): Promise<EnqueueResult> {
    const tenantId = await this.resolveTenantId(vehicleId, vehicleData)
    
    if (!tenantId) {
      console.error('[NotificationQueue] ❌ Cannot enqueue vehicle created: tenant_id is missing or invalid', {
        vehicleId,
        vehicleData
      })
      return { success: false, error: 'No valid tenant_id available in vehicle data or database' }
    }

    console.log('[NotificationQueue] Enqueueing vehicle created notification:', {
      vehicleId,
      tenantId,
      registrationNumber: vehicleData?.registration_number,
      customerName: vehicleData?.customer_name
    })

    return await this.enqueue({
      tenant_id: tenantId,
      event_type: 'vehicle_inward_created',
      payload: {
        vehicleId,
        vehicleData: {
          ...vehicleData,
          tenant_id: tenantId // Ensure tenant_id is in payload
        }
      }
    })
  }

  /**
   * Enqueue status updated notification
   */
  async enqueueStatusUpdated(vehicleId: string, vehicleData: any, newStatus: string, triggeredByRole?: string): Promise<EnqueueResult> {
    const tenantId = await this.resolveTenantId(vehicleId, vehicleData)
    
    if (!tenantId) {
      console.error('[NotificationQueue] ❌ Cannot enqueue status update: tenant_id is missing or invalid', {
        vehicleId,
        vehicleData
      })
      return { success: false, error: 'No valid tenant_id available in vehicle data or database' }
    }

    console.log('[NotificationQueue] Enqueueing status update notification:', {
      vehicleId,
      tenantId,
      status: newStatus,
      triggeredByRole
    })

    return await this.enqueue({
      tenant_id: tenantId,
      event_type: 'vehicle_status_updated',
      payload: {
        vehicleId,
        vehicleData: {
          ...vehicleData,
          tenant_id: tenantId // Ensure tenant_id is in payload
        },
        status: newStatus,
        triggeredByRole
      }
    })
  }

  /**
   * Enqueue installation complete notification
   */
  async enqueueInstallationComplete(vehicleId: string, vehicleData: any): Promise<EnqueueResult> {
    const tenantId = await this.resolveTenantId(vehicleId, vehicleData)
    
    if (!tenantId) {
      console.error('[NotificationQueue] ❌ Cannot enqueue installation complete: tenant_id is missing or invalid', {
        vehicleId,
        vehicleData
      })
      return { success: false, error: 'No valid tenant_id available in vehicle data or database' }
    }

    console.log('[NotificationQueue] Enqueueing installation complete notification:', {
      vehicleId,
      tenantId
    })

    return await this.enqueue({
      tenant_id: tenantId,
      event_type: 'installation_complete',
      payload: {
        vehicleId,
        vehicleData: {
          ...vehicleData,
          tenant_id: tenantId // Ensure tenant_id is in payload
        }
      }
    })
  }

  /**
   * Enqueue invoice added notification
   */
  async enqueueInvoiceAdded(vehicleId: string, vehicleData: any): Promise<EnqueueResult> {
    const tenantId = await this.resolveTenantId(vehicleId, vehicleData)
    
    if (!tenantId) {
      console.error('[NotificationQueue] ❌ Cannot enqueue invoice added: tenant_id is missing or invalid', {
        vehicleId,
        vehicleData
      })
      return { success: false, error: 'No valid tenant_id available in vehicle data or database' }
    }

    console.log('[NotificationQueue] Enqueueing invoice added notification:', {
      vehicleId,
      tenantId
    })

    return await this.enqueue({
      tenant_id: tenantId,
      event_type: 'invoice_number_added',
      payload: {
        vehicleId,
        vehicleData: {
          ...vehicleData,
          tenant_id: tenantId // Ensure tenant_id is in payload
        }
      }
    })
  }

  /**
   * Enqueue accountant complete notification
   */
  async enqueueAccountantComplete(vehicleId: string, vehicleData: any): Promise<EnqueueResult> {
    const tenantId = await this.resolveTenantId(vehicleId, vehicleData)
    
    if (!tenantId) {
      console.error('[NotificationQueue] ❌ Cannot enqueue accountant complete: tenant_id is missing or invalid', {
        vehicleId,
        vehicleData
      })
      return { success: false, error: 'No valid tenant_id available in vehicle data or database' }
    }

    console.log('[NotificationQueue] Enqueueing accountant complete notification:', {
      vehicleId,
      tenantId
    })

    return await this.enqueue({
      tenant_id: tenantId,
      event_type: 'accountant_completed',
      payload: {
        vehicleId,
        vehicleData: {
          ...vehicleData,
          tenant_id: tenantId // Ensure tenant_id is in payload
        }
      }
    })
  }

  /**
   * Enqueue vehicle delivered notification
   */
  async enqueueVehicleDelivered(vehicleId: string, vehicleData: any): Promise<EnqueueResult> {
    const tenantId = await this.resolveTenantId(vehicleId, vehicleData)
    
    if (!tenantId) {
      console.error('[NotificationQueue] ❌ Cannot enqueue vehicle delivered: tenant_id is missing or invalid', {
        vehicleId,
        vehicleData
      })
      return { success: false, error: 'No valid tenant_id available in vehicle data or database' }
    }

    console.log('[NotificationQueue] Enqueueing vehicle delivered notification:', {
      vehicleId,
      tenantId
    })

    return await this.enqueue({
      tenant_id: tenantId,
      event_type: 'vehicle_delivered',
      payload: {
        vehicleId,
        vehicleData: {
          ...vehicleData,
          tenant_id: tenantId // Ensure tenant_id is in payload
        }
      }
    })
  }

  /**
   * Get queue status for a vehicle and event type
   */
  async getQueueStatus(vehicleId: string, eventType: NotificationEventType): Promise<QueueStatus> {
    try {
      const { data, error } = await this.supabase
        .from('notification_queue')
        .select('id, status, retry_count, error_message, created_at, processed_at')
        .eq('payload->>vehicleId', vehicleId)
        .eq('event_type', eventType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return { exists: false }
        }
        console.error('[NotificationQueue] Error getting queue status:', error)
        return { exists: false }
      }

      return {
        exists: true,
        queueId: data.id,
        status: data.status as 'pending' | 'processing' | 'sent' | 'failed',
        retryCount: data.retry_count,
        errorMessage: data.error_message || undefined,
        createdAt: data.created_at,
        processedAt: data.processed_at || undefined
      }
    } catch (error: any) {
      console.error('[NotificationQueue] Exception getting queue status:', error)
      return { exists: false }
    }
  }

  /**
   * Verify if a notification was enqueued
   */
  async verifyEnqueued(vehicleId: string, eventType: NotificationEventType): Promise<boolean> {
    const status = await this.getQueueStatus(vehicleId, eventType)
    return status.exists
  }
}

export const notificationQueue = new NotificationQueueService()

