/**
 * Background Worker: Process Notification Queue
 * 
 * This cron job processes pending notifications from notification_queue table
 * and sends WhatsApp messages asynchronously.
 * 
 * Configure in vercel.json with schedule: every 5 minutes
 * See vercel.json for the exact cron configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NotificationWorkflowService } from '@/lib/notification-workflow'

// Maximum number of notifications to process per run
const MAX_BATCH_SIZE = 50
const MAX_RETRIES = 3

export async function GET(request: NextRequest) {
  // Check for immediate processing flag (for manual testing)
  const searchParams = request.nextUrl.searchParams
  const immediate = searchParams.get('immediate') === 'true'
  const notificationId = searchParams.get('id') // Process specific notification by ID
  
  // Verify cron secret (optional but recommended)
  // Allow immediate processing without auth for local testing (remove in production)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !immediate) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client for background processing (bypasses RLS)
  const supabase = createAdminClient()
  
  // Create notification workflow instance with admin client
  const notificationWorkflow = new NotificationWorkflowService(supabase)

  try {
    console.log('[NotificationWorker] 🔍 Starting notification processing...', {
      immediate,
      notificationId: notificationId || null,
      maxBatchSize: MAX_BATCH_SIZE,
      maxRetries: MAX_RETRIES
    })

    // First, check total pending count for debugging
    const { count: totalPendingCount, error: countError } = await supabase
      .from('notification_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    
    console.log('[NotificationWorker] 📊 Total pending notifications in queue:', {
      count: totalPendingCount,
      countError: countError?.message
    })

    let query = supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', MAX_RETRIES)
      .order('created_at', { ascending: true })

    // If processing specific notification by ID
    if (notificationId) {
      query = query.eq('id', notificationId)
      console.log('[NotificationWorker] 🎯 Processing specific notification:', notificationId)
    } else {
      query = query.limit(MAX_BATCH_SIZE)
    }

    // Fetch pending notifications, ordered by creation time (oldest first)
    console.log('[NotificationWorker] 🔎 Executing query for pending notifications...')
    const { data: pendingNotifications, error: fetchError } = await query

    if (fetchError) {
      console.error('[NotificationWorker] ❌ Error fetching pending notifications:', {
        error: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint
      })
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    console.log('[NotificationWorker] 📋 Query results:', {
      found: pendingNotifications?.length || 0,
      notifications: pendingNotifications?.map(n => ({
        id: n.id,
        tenant_id: n.tenant_id,
        event_type: n.event_type,
        status: n.status,
        retry_count: n.retry_count,
        created_at: n.created_at
      })) || []
    })

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('[NotificationWorker] ℹ️ No pending notifications to process', {
        totalPendingInDB: totalPendingCount,
        maxRetries: MAX_RETRIES,
        immediate
      })
      return NextResponse.json({ 
        message: 'No pending notifications to process',
        processed: 0,
        immediate,
        notificationId: notificationId || null,
        totalPendingInDB: totalPendingCount || 0
      })
    }

    console.log(`[NotificationWorker] Processing ${pendingNotifications.length} notification(s)${immediate ? ' (immediate)' : ''}${notificationId ? ` (ID: ${notificationId})` : ''}`)

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each notification
    for (const notification of pendingNotifications) {
      try {
        // Mark as processing
        await supabase
          .from('notification_queue')
          .update({ 
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        const { event_type, payload, tenant_id } = notification

        // Process based on event type
        let success = false

        switch (event_type) {
          case 'vehicle_inward_created':
            success = await processVehicleCreated(payload, tenant_id, notificationWorkflow)
            break
          case 'vehicle_status_updated':
            success = await processStatusUpdated(payload, tenant_id, notificationWorkflow)
            break
          case 'installation_complete':
            success = await processInstallationComplete(payload, tenant_id, notificationWorkflow)
            break
          case 'invoice_number_added':
            console.log(`[NotificationWorker] 📋 Processing invoice_number_added notification:`, {
              notificationId: notification.id,
              tenantId: tenant_id,
              vehicleId: payload.vehicleId,
              vehicleNumber: payload.vehicleData?.registration_number
            })
            success = await processInvoiceAdded(payload, tenant_id, notificationWorkflow)
            console.log(`[NotificationWorker] ${success ? '✅' : '❌'} Invoice added notification ${success ? 'sent' : 'failed'}`)
            break
          case 'accountant_completed':
            console.log(`[NotificationWorker] 📋 Processing accountant_completed notification:`, {
              notificationId: notification.id,
              tenantId: tenant_id,
              vehicleId: payload.vehicleId,
              vehicleNumber: payload.vehicleData?.registration_number
            })
            success = await processAccountantComplete(payload, tenant_id, notificationWorkflow)
            console.log(`[NotificationWorker] ${success ? '✅' : '❌'} Accountant completed notification ${success ? 'sent' : 'failed'}`)
            break
          case 'vehicle_delivered':
            success = await processVehicleDelivered(payload, tenant_id, notificationWorkflow)
            break
          case 'invoice_issued':
            console.log(`[NotificationWorker] 📋 Processing invoice_issued notification:`, {
              notificationId: notification.id,
              tenantId: tenant_id,
              vehicleId: payload.vehicleId
            })
            success = await processInvoiceIssued(payload, tenant_id, notificationWorkflow)
            break
          case 'payment_received':
            console.log(`[NotificationWorker] 💰 Processing payment_received notification:`, {
              notificationId: notification.id,
              tenantId: tenant_id,
              vehicleId: payload.vehicleId
            })
            success = await processPaymentReceived(payload, tenant_id, notificationWorkflow)
            break
          case 'invoice_overdue':
            console.log(`[NotificationWorker] ⚠️ Processing invoice_overdue notification:`, {
              notificationId: notification.id,
              tenantId: tenant_id,
              vehicleId: payload.vehicleId
            })
            success = await processInvoiceOverdue(payload, tenant_id, notificationWorkflow)
            break
          case 'invoice_reminder':
            console.log(`[NotificationWorker] 📋 Processing invoice_reminder notification:`, {
              notificationId: notification.id,
              tenantId: tenant_id,
              vehicleId: payload.vehicleId
            })
            success = await processInvoiceReminder(payload, tenant_id, notificationWorkflow)
            break
          default:
            console.warn(`[NotificationWorker] Unknown event type: ${event_type}`)
            success = false
        }

        // Update notification status
        if (success) {
          await supabase
            .from('notification_queue')
            .update({ 
              status: 'sent',
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', notification.id)
          
          results.sent++
        } else {
          // Increment retry count
          const newRetryCount = notification.retry_count + 1
          const newStatus = newRetryCount >= MAX_RETRIES ? 'failed' : 'pending'
          
          await supabase
            .from('notification_queue')
            .update({ 
              status: newStatus,
              retry_count: newRetryCount,
              error_message: 'Failed to send notification',
              updated_at: new Date().toISOString()
            })
            .eq('id', notification.id)
          
          results.failed++
        }

        results.processed++

      } catch (error: any) {
        console.error(`[NotificationWorker] Error processing notification ${notification.id}:`, error)
        
        // Mark as failed
        await supabase
          .from('notification_queue')
          .update({ 
            status: 'failed',
            error_message: error.message || 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id)
        
        results.failed++
        results.errors.push(`Notification ${notification.id}: ${error.message}`)
      }
    }


    return NextResponse.json({
      message: 'Notification processing completed',
      immediate,
      notificationId: notificationId || null,
      ...results
    })

  } catch (error: any) {
    console.error('[NotificationWorker] Fatal error:', error)
    return NextResponse.json({ 
      error: error.message || 'Unknown error',
      processed: 0,
      immediate,
      notificationId: notificationId || null
    }, { status: 500 })
  }
}

// Helper functions to process each event type
// These are defined outside the GET function but need notificationWorkflow
// So we'll pass it as a parameter
async function processVehicleCreated(
  payload: any, 
  tenantId: string, 
  notificationWorkflow: NotificationWorkflowService
): Promise<boolean> {
  try {
    console.log('[NotificationWorker] 🚀 Processing vehicle_created notification:', {
      vehicleId: payload.vehicleId,
      tenantId,
      tenantIdFromPayload: payload.vehicleData?.tenant_id,
      hasVehicleData: !!payload.vehicleData
    })
    
    await notificationWorkflow.notifyVehicleCreated(payload.vehicleId, payload.vehicleData)
    
    console.log('[NotificationWorker] ✅ Successfully processed vehicle_created notification:', {
      vehicleId: payload.vehicleId,
      tenantId
    })
    
    return true
  } catch (error: any) {
    console.error('[NotificationWorker] ❌ Error processing vehicle_created:', {
      error: error.message,
      stack: error.stack,
      vehicleId: payload.vehicleId,
      tenantId
    })
    return false
  }
}

async function processStatusUpdated(
  payload: any, 
  tenantId: string, 
  notificationWorkflow: NotificationWorkflowService
): Promise<boolean> {
  try {
    await notificationWorkflow.notifyStatusUpdated(
      payload.vehicleId,
      payload.vehicleData,
      payload.status,
      payload.triggeredByRole
    )
    return true
  } catch (error) {
    console.error('[NotificationWorker] Error processing status_updated:', error)
    return false
  }
}

async function processInstallationComplete(
  payload: any, 
  tenantId: string, 
  notificationWorkflow: NotificationWorkflowService
): Promise<boolean> {
  try {
    await notificationWorkflow.notifyInstallationComplete(payload.vehicleId, payload.vehicleData)
    return true
  } catch (error) {
    console.error('[NotificationWorker] Error processing installation_complete:', error)
    return false
  }
}

async function processInvoiceAdded(
  payload: any, 
  tenantId: string, 
  notificationWorkflow: NotificationWorkflowService
): Promise<boolean> {
  try {
    console.log(`[NotificationWorker] 🔔 Calling notifyInvoiceAdded for vehicle: ${payload.vehicleId}, tenant: ${tenantId}`)
    await notificationWorkflow.notifyInvoiceAdded(payload.vehicleId, payload.vehicleData)
    console.log(`[NotificationWorker] ✅ notifyInvoiceAdded completed successfully`)
    return true
  } catch (error) {
    console.error('[NotificationWorker] ❌ Error processing invoice_added:', error)
    return false
  }
}

async function processAccountantComplete(
  payload: any, 
  tenantId: string, 
  notificationWorkflow: NotificationWorkflowService
): Promise<boolean> {
  try {
    console.log(`[NotificationWorker] 🔔 Calling notifyAccountantComplete for vehicle: ${payload.vehicleId}, tenant: ${tenantId}`)
    await notificationWorkflow.notifyAccountantComplete(payload.vehicleId, payload.vehicleData)
    console.log(`[NotificationWorker] ✅ notifyAccountantComplete completed successfully`)
    return true
  } catch (error) {
    console.error('[NotificationWorker] ❌ Error processing accountant_completed:', error)
    return false
  }
}

async function processVehicleDelivered(
  payload: any, 
  tenantId: string, 
  notificationWorkflow: NotificationWorkflowService
): Promise<boolean> {
  try {
    await notificationWorkflow.notifyVehicleDelivered(payload.vehicleId, payload.vehicleData)
    return true
  } catch (error) {
    console.error('[NotificationWorker] Error processing vehicle_delivered:', error)
    return false
  }
}

async function processInvoiceIssued(
  payload: any, 
  tenantId: string, 
  notificationWorkflow: NotificationWorkflowService
): Promise<boolean> {
  try {
    await notificationWorkflow.notifyInvoiceIssued(
      payload.vehicleId,
      payload.vehicleData,
      payload.invoiceData || {}
    )
    return true
  } catch (error) {
    console.error('[NotificationWorker] Error processing invoice_issued:', error)
    return false
  }
}

async function processPaymentReceived(
  payload: any, 
  tenantId: string, 
  notificationWorkflow: NotificationWorkflowService
): Promise<boolean> {
  try {
    await notificationWorkflow.notifyPaymentReceived(
      payload.vehicleId,
      payload.vehicleData,
      payload.paymentData || {}
    )
    return true
  } catch (error) {
    console.error('[NotificationWorker] Error processing payment_received:', error)
    return false
  }
}

async function processInvoiceOverdue(
  payload: any, 
  tenantId: string, 
  notificationWorkflow: NotificationWorkflowService
): Promise<boolean> {
  try {
    await notificationWorkflow.notifyInvoiceOverdue(
      payload.vehicleId,
      payload.vehicleData,
      payload.invoiceData || {}
    )
    return true
  } catch (error) {
    console.error('[NotificationWorker] Error processing invoice_overdue:', error)
    return false
  }
}

async function processInvoiceReminder(
  payload: any, 
  tenantId: string, 
  notificationWorkflow: NotificationWorkflowService
): Promise<boolean> {
  try {
    await notificationWorkflow.sendInvoiceReminder(
      payload.vehicleId,
      payload.vehicleData,
      payload.invoiceData || {}
    )
    return true
  } catch (error) {
    console.error('[NotificationWorker] Error processing invoice_reminder:', error)
    return false
  }
}

