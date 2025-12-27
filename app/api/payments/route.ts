/**
 * Payments API Route
 * POST: Record payment for an invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientForRouteHandler } from '@/lib/supabase/server'
import { invoiceService } from '@/lib/invoice-service'
import { checkIsSuperAdmin, getTenantIdForUser } from '@/lib/tenant-context'
import { NotificationWorkflowService } from '@/lib/notification-workflow'

export async function POST(request: NextRequest) {
  const response = NextResponse.next()
  try {
    const supabase = createClientForRouteHandler(request, response)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getTenantIdForUser(user.id, supabase)
    const isSuper = await checkIsSuperAdmin(user.id, supabase)

    if (!tenantId && !isSuper) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const body = await request.json()
    const {
      invoiceId,
      amount,
      payment_mode,
      payment_date,
      reference_number,
      paid_by,
      notes
    } = body

    if (!invoiceId || !amount || !payment_mode || !payment_date) {
      return NextResponse.json(
        { error: 'invoiceId, amount, payment_mode, and payment_date are required' },
        { status: 400 }
      )
    }

    // Verify invoice exists
    let invoiceQuery = supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (!isSuper && tenantId) {
      invoiceQuery = invoiceQuery.eq('tenant_id', tenantId)
    }

    const { data: invoice, error: invoiceError } = await invoiceQuery

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot record payment for cancelled invoice' }, { status: 400 })
    }

    // Use invoiceService to record payment (it handles both payment creation and invoice updates)
    const result = await invoiceService.recordPayment(invoiceId, {
      amount: parseFloat(amount),
      payment_mode,
      payment_date,
      reference_number,
      paid_by,
      notes
    })

    if (result.error) {
      console.error('[Payments API] Error recording payment:', result.error)
      // Handle error object properly
      const errorMessage = typeof result.error === 'string' 
        ? result.error 
        : result.error?.message || 'Failed to record payment'
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const payment = result.payment

    // Trigger notification
    try {
      let notifQuery = supabase
        .from('invoices')
        .select(`
          *,
          vehicle_inward (
            id,
            vehicles (
              id,
              registration_number,
              make,
              model,
              customers (
                id,
                name,
                phone,
                email
              )
            )
          )
        `)
        .eq('id', invoiceId)
        .single()

      if (!isSuper && tenantId) {
        notifQuery = notifQuery.eq('tenant_id', tenantId)
      }

      const { data: invoiceResult } = await notifQuery

      if (invoiceResult && invoiceResult.vehicle_inward) {
        const vehicleInward = invoiceResult.vehicle_inward
        const vehicle = vehicleInward.vehicles

        if (vehicle) {
          const notificationWorkflow = new NotificationWorkflowService(supabase)
          await notificationWorkflow.notifyPaymentReceived(
            vehicle.id,
            {
              ...vehicle,
              tenant_id: tenantId,
              customer_name: vehicle.customers?.name,
              registration_number: vehicle.registration_number
            },
            {
              amount: parseFloat(amount),
              paymentMode: payment_mode,
              invoiceNumber: invoiceResult.invoice.invoice_number
            }
          )
        }
      }
    } catch (notifError) {
      // Log but don't fail the request
      console.error('Error sending payment received notification:', notifError)
    }

    const finalResponse = NextResponse.json({ payment: result.payment }, { status: 201 })
    response.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value)
    })
    return finalResponse
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
