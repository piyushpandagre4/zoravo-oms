/**
 * Payment API Route
 * PUT: Update a payment
 * DELETE: Delete a payment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientForRouteHandler } from '@/lib/supabase/server'
import { checkIsSuperAdmin, getTenantIdForUser } from '@/lib/tenant-context'

export async function PUT(
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

    const paymentId = params.id
    const body = await request.json()
    const {
      amount,
      payment_mode,
      payment_date,
      reference_number,
      paid_by,
      notes
    } = body

    // Verify payment exists and user has access
    let paymentQuery = supabase
      .from('payments')
      .select('*, invoices(id, tenant_id)')
      .eq('id', paymentId)
      .single()

    if (!isSuper && tenantId) {
      paymentQuery = paymentQuery.eq('tenant_id', tenantId)
    }

    const { data: payment, error: paymentError } = await paymentQuery

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify invoice is not cancelled
    if (payment.invoices?.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot update payment for cancelled invoice' }, { status: 400 })
    }

    // Update payment record
    const updateData: any = {}
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (payment_mode !== undefined) {
      updateData.payment_method = payment_mode
      updateData.payment_mode = payment_mode
    }
    if (payment_date !== undefined) updateData.payment_date = payment_date
    if (reference_number !== undefined) updateData.reference_number = reference_number
    if (paid_by !== undefined) updateData.paid_by = paid_by
    if (notes !== undefined) updateData.notes = notes

    let updateQuery = supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)
      .select()

    if (!isSuper && tenantId) {
      updateQuery = updateQuery.eq('tenant_id', tenantId)
    }

    const { data: updatedPayment, error: updateError } = await updateQuery

    if (updateError || !updatedPayment || updatedPayment.length === 0) {
      return NextResponse.json({ error: updateError?.message || 'Failed to update payment' }, { status: 400 })
    }

    // The trigger will automatically update invoice totals, but let's refresh to get updated invoice
    const invoiceId = payment.invoice_id
    if (invoiceId) {
      // Refresh invoice to trigger status update
      await invoiceService.recordPayment(invoiceId, {
        amount: 0, // Dummy call to trigger recalculation
        payment_mode: payment_mode || payment.payment_mode,
        payment_date: payment_date || payment.payment_date
      })
    }

    const finalResponse = NextResponse.json({ payment: updatedPayment[0] })
    response.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value)
    })
    return finalResponse
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
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

    const paymentId = params.id

    // Verify payment exists and get invoice_id before deletion
    let paymentQuery = supabase
      .from('payments')
      .select('*, invoices(id, tenant_id, status)')
      .eq('id', paymentId)

    if (!isSuper && tenantId) {
      paymentQuery = paymentQuery.eq('tenant_id', tenantId)
    }

    const { data: paymentData, error: paymentError } = await paymentQuery

    if (paymentError || !paymentData || paymentData.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const payment = paymentData[0]

    // Verify invoice is not cancelled
    if (payment.invoices?.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot delete payment for cancelled invoice' }, { status: 400 })
    }

    const invoiceId = payment.invoice_id

    // Delete payment
    let deleteQuery = supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)

    if (!isSuper && tenantId) {
      deleteQuery = deleteQuery.eq('tenant_id', tenantId)
    }

    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message || 'Failed to delete payment' }, { status: 400 })
    }

    // The trigger will automatically update invoice totals when payment is deleted
    // No need to manually refresh - the database trigger handles it

    const finalResponse = NextResponse.json({ success: true })
    response.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value)
    })
    return finalResponse
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
