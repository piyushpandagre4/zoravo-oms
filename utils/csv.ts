import Papa from 'papaparse'

export interface CSVExportOptions {
  filename: string
  headers: string[]
  data: any[]
  delimiter?: string
}

export function generateCSV(options: CSVExportOptions): string {
  const { headers, data, delimiter = ',' } = options
  
  // Create CSV content
  const csvContent = Papa.unparse({
    fields: headers,
    data: data
  }, {
    delimiter,
    header: true,
    skipEmptyLines: true
  })
  
  return csvContent
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Payment export helpers
export function formatPaymentsForCSV(payments: any[]): any[] {
  return payments.map(payment => ({
    'Payment ID': payment.id,
    'Invoice Number': payment.invoice?.invoice_number || '',
    'Customer Name': payment.invoice?.customer_name || '',
    'Amount': formatCurrency(payment.amount),
    'Payment Method': payment.payment_method,
    'Payment Date': formatDate(payment.payment_date),
    'Reference Number': payment.reference_number || '',
    'Notes': payment.notes || '',
  }))
}

// Expense export helpers
export function formatExpensesForCSV(expenses: any[]): any[] {
  return expenses.map(expense => ({
    'Expense ID': expense.id,
    'Category': expense.category,
    'Description': expense.description,
    'Amount': formatCurrency(expense.amount),
    'Date': formatDate(expense.date),
    'Vendor': expense.vendor || '',
    'Payment Method': expense.payment_method || '',
    'Reference': expense.reference_number || '',
    'Notes': expense.notes || '',
  }))
}

// P&L export helpers
export function formatPnLForCSV(pnlData: any[]): any[] {
  return pnlData.map(item => ({
    'Month': item.month,
    'Revenue': formatCurrency(item.revenue || 0),
    'Expenses': formatCurrency(item.expenses || 0),
    'Net Profit': formatCurrency((item.revenue || 0) - (item.expenses || 0)),
    'Profit Margin': `${(((item.revenue || 0) - (item.expenses || 0)) / (item.revenue || 1) * 100).toFixed(2)}%`,
  }))
}

// Vehicle export helpers
export function formatVehiclesForCSV(vehicles: any[]): any[] {
  return vehicles.map(vehicle => ({
    'Registration': vehicle.registration_number,
    'Make': vehicle.make,
    'Model': vehicle.model,
    'Year': vehicle.year,
    'Color': vehicle.color,
    'Customer': vehicle.customer?.name || '',
    'Phone': vehicle.customer?.phone || '',
    'Status': vehicle.inward?.status || '',
    'Estimated Cost': formatCurrency(vehicle.inward?.estimated_cost || 0),
    'Assigned To': vehicle.inward?.assigned_to || '',
    'Intake Date': formatDate(vehicle.inward?.created_at || ''),
  }))
}

// Work order export helpers
export function formatWorkOrdersForCSV(workOrders: any[]): any[] {
  return workOrders.map(wo => ({
    'Work Order': wo.work_order_number,
    'Vehicle': wo.vehicle?.registration_number || '',
    'Customer': wo.vehicle?.customer?.name || '',
    'Description': wo.description,
    'Status': wo.status,
    'Priority': wo.priority,
    'Assigned To': wo.assigned_to,
    'Estimated Cost': formatCurrency(wo.estimated_cost),
    'Actual Cost': wo.actual_cost ? formatCurrency(wo.actual_cost) : '',
    'Start Date': wo.start_date ? formatDate(wo.start_date) : '',
    'Completion Date': wo.completion_date ? formatDate(wo.completion_date) : '',
    'Notes': wo.notes || '',
  }))
}
