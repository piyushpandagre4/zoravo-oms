import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertRole, hasApiRouteAccess, UserRole } from '@/lib/rbac'
import { exportRateLimiter } from '@/utils/rate-limiter'
import { generateCSV, formatPaymentsForCSV, formatExpensesForCSV, formatPnLForCSV } from '@/utils/csv'

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

// Helper function to check rate limit
function checkRateLimit(ip: string): boolean {
  return exportRateLimiter.isAllowed(ip)
}

// Helper function to get user role from request
async function getUserRole(): Promise<UserRole | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    return profile?.role as UserRole || null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const clientIP = getClientIP(request)
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Check user role
    const userRole = await getUserRole()
    if (!userRole || !hasApiRouteAccess(userRole, '/api/export/payments')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    // Fetch payments data
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(
          invoice_number,
          customer_name
        )
      `)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .order('payment_date', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch payments data' },
        { status: 500 }
      )
    }

    // Format data for CSV
    const csvData = formatPaymentsForCSV(payments || [])
    const csvContent = generateCSV({
      filename: 'payments',
      headers: [
        'Payment ID',
        'Invoice Number',
        'Customer Name',
        'Amount',
        'Payment Method',
        'Payment Date',
        'Reference Number',
        'Notes'
      ],
      data: csvData
    })

    // Return CSV as response
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payments_${startDate}_to_${endDate}.csv"`
      }
    })

  } catch (error) {
    console.error('Export payments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
