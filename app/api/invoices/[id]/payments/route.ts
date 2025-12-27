/**
 * Payment History API Route
 * GET: Fetch payment history for a specific invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientForRouteHandler } from '@/lib/supabase/server'
import { checkIsSuperAdmin, getTenantIdForUser } from '@/lib/tenant-context'

export async function GET(
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

    const invoiceId = params.id

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    // Get tenant context
    const tenantId = await getTenantIdForUser(user.id, supabase)
    const isSuper = await checkIsSuperAdmin(user.id, supabase)

    // Verify invoice exists and user has access
    let invoiceQuery = supabase
      .from('invoices')
      .select('id, tenant_id')
      .eq('id', invoiceId)
      .single()

    if (!isSuper && tenantId) {
      invoiceQuery = invoiceQuery.eq('tenant_id', tenantId)
    }

    const { data: invoice, error: invoiceError } = await invoiceQuery

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Fetch payments for this invoice
    let paymentsQuery = supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false })

    if (!isSuper && tenantId) {
      paymentsQuery = paymentsQuery.eq('tenant_id', tenantId)
    }

    const { data: payments, error: paymentsError } = await paymentsQuery

    if (paymentsError) {
      console.error('[Payments API] Error fetching payments:', paymentsError)
      return NextResponse.json({ error: paymentsError.message }, { status: 500 })
    }

    const finalResponse = NextResponse.json({ payments: payments || [] })
    response.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value)
    })
    return finalResponse
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
