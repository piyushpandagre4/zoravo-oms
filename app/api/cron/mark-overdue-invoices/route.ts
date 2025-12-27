/**
 * Cron Job: Mark Overdue Invoices
 * Runs daily to automatically mark invoices as overdue when past due date
 * 
 * Configure in vercel.json with schedule: every day at midnight
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client for background processing (bypasses RLS)
  const supabase = createAdminClient()

  try {
    console.log('[OverdueInvoices] 🔍 Starting overdue invoice detection...')

    // Call the database function to mark overdue invoices
    const { data: updatedCount, error } = await supabase.rpc('mark_overdue_invoices')

    if (error) {
      console.error('[OverdueInvoices] ❌ Error marking overdue invoices:', error)
      return NextResponse.json({ 
        error: error.message,
        updated: 0
      }, { status: 500 })
    }

    console.log(`[OverdueInvoices] ✅ Marked ${updatedCount || 0} invoices as overdue`)

    // Optionally trigger notifications for newly overdue invoices
    if (updatedCount > 0) {
      // Get newly overdue invoices (without nested relationship to avoid schema cache issues)
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          balance_amount,
          due_date,
          vehicle_inward_id,
          tenant_id
        `)
        .eq('status', 'overdue')
        .gte('updated_at', new Date(Date.now() - 60000).toISOString()) // Updated in last minute

      if (overdueInvoices && overdueInvoices.length > 0) {
        console.log(`[OverdueInvoices] 📧 Found ${overdueInvoices.length} newly overdue invoices for notification`)
        
        // Queue notifications for each overdue invoice
        for (const invoice of overdueInvoices) {
          if (invoice.vehicle_inward_id) {
            // Fetch vehicle data separately to avoid relationship issues
            try {
              const { data: vehicleInward } = await supabase
                .from('vehicle_inward')
                .select(`
                  id,
                  vehicles (
                    id,
                    registration_number,
                    customers (
                      id,
                      name,
                      phone,
                      email
                    )
                  )
                `)
                .eq('id', invoice.vehicle_inward_id)
                .single()

              const vehicle = vehicleInward?.vehicles
              if (vehicle) {
                // Queue notification
                await supabase
                  .from('notification_queue')
                  .insert({
                    event_type: 'invoice_overdue',
                    tenant_id: invoice.tenant_id,
                    payload: {
                      vehicleId: vehicle.id,
                      vehicleData: {
                        ...vehicle,
                        customer_name: vehicle.customers?.name,
                        registration_number: vehicle.registration_number
                      },
                      invoiceData: {
                        invoiceNumber: invoice.invoice_number,
                        balanceAmount: invoice.balance_amount,
                        dueDate: invoice.due_date
                      }
                    },
                    status: 'pending',
                    retry_count: 0
                  })
              }
            } catch (vehicleError) {
              console.warn(`[OverdueInvoices] Could not fetch vehicle data for invoice ${invoice.id}:`, vehicleError)
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount || 0,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[OverdueInvoices] ❌ Unexpected error:', error)
    return NextResponse.json({
      error: error.message,
      updated: 0
    }, { status: 500 })
  }
}
