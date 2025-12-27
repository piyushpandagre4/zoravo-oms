/**
 * Invoice Summary API Route
 * GET: Get financial summary (total invoiced, received, outstanding, overdue)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientForRouteHandler } from '@/lib/supabase/server'
import { checkIsSuperAdmin, getTenantIdForUser } from '@/lib/tenant-context'

export async function GET(request: NextRequest) {
  const response = NextResponse.next()
  try {
    const supabase = createClientForRouteHandler(request, response)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getTenantIdForUser(user.id, supabase)
    const isSuper = await checkIsSuperAdmin(user.id, supabase)

    // Get summary - try view first, fallback to direct calculation
    let summaryData: any[] = []
    
    // Try to use the view first
    let viewQuery = supabase
      .from('v_invoice_summary')
      .select('*')

    if (!isSuper && tenantId) {
      viewQuery = viewQuery.eq('tenant_id', tenantId)
    }

    const { data: viewData, error: viewError } = await viewQuery

    if (!viewError && viewData) {
      summaryData = viewData
    } else {
      // Fallback: Calculate from invoices table directly
      let invoicesQuery = supabase
        .from('invoices')
        .select('tenant_id, status, total_amount, paid_amount, balance_amount')

      if (!isSuper && tenantId) {
        invoicesQuery = invoicesQuery.eq('tenant_id', tenantId)
      }

      const { data: invoicesData, error: invoicesError } = await invoicesQuery

      if (invoicesError) {
        // If invoices table doesn't exist, return empty summary
        if (invoicesError.message?.includes('relation') || 
            invoicesError.message?.includes('does not exist') ||
            invoicesError.code === 'PGRST116') {
          console.warn('[Invoice Summary API] Invoices table may not exist yet. Run database migrations.')
        }
        const finalResponse = NextResponse.json({
          summary: {
            totalInvoiced: 0,
            totalReceived: 0,
            totalOutstanding: 0,
            totalOverdue: 0,
            byStatus: []
          }
        })
        response.cookies.getAll().forEach(cookie => {
          finalResponse.cookies.set(cookie.name, cookie.value)
        })
        return finalResponse
      }

      // Group by status
      const summaryByStatus: Record<string, any> = {}
      
      invoicesData?.forEach((inv: any) => {
        const status = inv.status || 'draft'
        if (!summaryByStatus[status]) {
          summaryByStatus[status] = {
            tenant_id: inv.tenant_id,
            status,
            count: 0,
            total_invoiced: 0,
            total_received: 0,
            total_outstanding: 0
          }
        }
        summaryByStatus[status].count++
        if (status === 'issued' || status === 'partial' || status === 'paid') {
          summaryByStatus[status].total_invoiced += parseFloat(inv.total_amount || 0)
        }
        summaryByStatus[status].total_received += parseFloat(inv.paid_amount || 0)
        const balance = inv.balance_amount !== null && inv.balance_amount !== undefined 
          ? parseFloat(inv.balance_amount) 
          : parseFloat(inv.total_amount || 0) - parseFloat(inv.paid_amount || 0)
        if (status === 'issued' || status === 'partial' || status === 'overdue') {
          summaryByStatus[status].total_outstanding += balance
        }
      })

      summaryData = Object.values(summaryByStatus)
    }

    // Calculate totals
    const totalInvoiced = summaryData.reduce((sum: number, s: any) => 
      sum + (s.status === 'issued' || s.status === 'partial' || s.status === 'paid' ? parseFloat(s.total_invoiced || 0) : 0), 0)

    const totalReceived = summaryData.reduce((sum: number, s: any) => 
      sum + parseFloat(s.total_received || 0), 0)

    const totalOutstanding = summaryData.reduce((sum: number, s: any) => 
      sum + (s.status === 'issued' || s.status === 'partial' || s.status === 'overdue' ? parseFloat(s.total_outstanding || 0) : 0), 0)

    const overdueData = summaryData.find((s: any) => s.status === 'overdue')
    const totalOverdue = overdueData ? parseFloat(overdueData.total_outstanding || 0) : 0

    const finalResponse = NextResponse.json({
      summary: {
        totalInvoiced,
        totalReceived,
        totalOutstanding,
        totalOverdue,
        byStatus: summaryData || []
      }
    })
    response.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value)
    })
    return finalResponse
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
