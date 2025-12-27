/**
 * Issue Invoice API Route
 * POST: Issue invoice (move from draft to issued)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientForRouteHandler } from '@/lib/supabase/server'
import { invoiceService } from '@/lib/invoice-service'
import { checkIsSuperAdmin, getTenantIdForUser } from '@/lib/tenant-context'
import { NotificationWorkflowService } from '@/lib/notification-workflow'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get current invoice
    let invoiceQuery = supabase
      .from('invoices')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!isSuper && tenantId) {
      invoiceQuery = invoiceQuery.eq('tenant_id', tenantId)
    }

    const { data: invoice, error: fetchError } = await invoiceQuery

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft invoices can be issued' }, { status: 400 })
    }

    // Generate invoice number if not set
    let invoiceNumber = invoice.invoice_number
    if (!invoiceNumber) {
      // Get tenant code
      let tenantCode = ''
      if (tenantId) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('tenant_code')
          .eq('id', tenantId)
          .single()
        tenantCode = tenant?.tenant_code || ''
      }
      const prefix = tenantCode ? `${tenantCode}-` : 'INV-'
      
      // Get next number
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1)
        .single()

      let nextNum = 1
      if (lastInvoice?.invoice_number) {
        const match = lastInvoice.invoice_number.match(/\d+$/)
        if (match) {
          nextNum = parseInt(match[0]) + 1
        }
      }
      invoiceNumber = `${prefix}${String(nextNum).padStart(6, '0')}`
    }

    // Update invoice
    const updateData: any = {
      status: 'issued',
      invoice_number: invoiceNumber,
      issued_at: new Date().toISOString(),
      invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0]
    }

    let updateQuery = supabase
      .from('invoices')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (!isSuper && tenantId) {
      updateQuery = updateQuery.eq('tenant_id', tenantId)
    }

    const { data: updatedInvoice, error: updateError } = await updateQuery

    if (updateError || !updatedInvoice) {
      return NextResponse.json({ error: updateError?.message || 'Failed to issue invoice' }, { status: 400 })
    }

    const result = { invoice: updatedInvoice, error: null }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Trigger notification
    try {
      // Get invoice with vehicle data for notification
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
        .eq('id', params.id)
        .single()

      if (!isSuper && tenantId) {
        notifQuery = notifQuery.eq('tenant_id', tenantId)
      }

      const { data: invoiceResult } = await notifQuery

      if (invoiceResult && invoiceResult.vehicle_inward) {
        const vehicleInward = invoiceResult.invoice.vehicle_inward
        const vehicle = vehicleInward.vehicles

        if (vehicle) {
          const notificationWorkflow = new NotificationWorkflowService(supabase)
          await notificationWorkflow.notifyInvoiceIssued(
            vehicle.id,
            {
              ...vehicle,
              tenant_id: tenantId,
              customer_name: vehicle.customers?.name,
              registration_number: vehicle.registration_number
            },
            {
              invoiceNumber: result.invoice.invoice_number,
              amount: result.invoice.total_amount,
              dueDate: result.invoice.due_date
            }
          )
        }
      }
    } catch (notifError) {
      // Log but don't fail the request
      console.error('Error sending invoice issued notification:', notifError)
    }

    const finalResponse = NextResponse.json({ invoice: result.invoice })
    response.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value)
    })
    return finalResponse
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
