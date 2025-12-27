'use client'

import { useState, useEffect } from 'react'
import { X, FileText, DollarSign, Calendar, User, Car, Download, Send, Edit, CheckCircle, Clock, AlertCircle, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import PaymentRecordingModal from './PaymentRecordingModal'

interface InvoiceDetailModalProps {
  invoiceId: string
  onClose: () => void
  onUpdate: () => void
}

export default function InvoiceDetailModal({
  invoiceId,
  onClose,
  onUpdate
}: InvoiceDetailModalProps) {
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    fetchInvoice()
  }, [invoiceId])

  const fetchInvoice = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/invoices/${invoiceId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch invoice')
      }

      setInvoice(data.invoice)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleIssue = async () => {
    if (!confirm('Are you sure you want to issue this invoice? This will send notifications to the customer.')) {
      return
    }

    try {
      setIssuing(true)
      const response = await fetch(`/api/invoices/${invoiceId}/issue`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to issue invoice')
      }

      await fetchInvoice()
      onUpdate()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIssuing(false)
    }
  }

  const handleCancel = async () => {
    const reason = prompt('Please provide a reason for cancelling this invoice:')
    if (!reason) return

    try {
      setCancelling(true)
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel invoice')
      }

      await fetchInvoice()
      onUpdate()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setCancelling(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: string; icon: any }> = {
      draft: { label: 'Draft', variant: 'secondary', icon: Edit },
      issued: { label: 'Issued', variant: 'default', icon: FileText },
      partial: { label: 'Partial', variant: 'default', icon: Clock },
      paid: { label: 'Paid', variant: 'default', icon: CheckCircle },
      overdue: { label: 'Overdue', variant: 'destructive', icon: AlertCircle },
      cancelled: { label: 'Cancelled', variant: 'secondary', icon: Ban }
    }

    const config = statusConfig[status] || statusConfig.draft
    const Icon = config.icon

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">Loading invoice...</div>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-red-600 mb-4">{error || 'Invoice not found'}</div>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    )
  }

  // Get vehicle and customer data with fallbacks
  const vehicleInward = invoice.vehicle_inward
  const vehicle = vehicleInward?.vehicles || null
  const customer = vehicle?.customers || vehicleInward?.customers || null
  
  // Fallback to vehicle_inward customer data if available
  const customerName = customer?.name || vehicleInward?.customer_name || invoice.customer_name || 'N/A'
  const customerPhone = customer?.phone || vehicleInward?.customer_phone || 'N/A'
  const customerEmail = customer?.email || vehicleInward?.customer_email || 'N/A'
  
  // Fallback to vehicle_inward registration if vehicle not available
  const registrationNumber = vehicle?.registration_number || vehicleInward?.registration_number || 'N/A'
  const vehicleMake = vehicle?.make || ''
  const vehicleModel = vehicle?.model || ''
  
  const lineItems = invoice.invoice_line_items || []
  const payments = invoice.payments || []

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Invoice Details</h2>
                <p className="text-sm text-muted-foreground">
                  {invoice.invoice_number || 'Draft Invoice'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(invoice.status)}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Customer & Vehicle Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div><strong>Name:</strong> {customer?.name || 'N/A'}</div>
                  <div><strong>Phone:</strong> {customer?.phone || 'N/A'}</div>
                  <div><strong>Email:</strong> {customer?.email || 'N/A'}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div><strong>Registration:</strong> {registrationNumber}</div>
                  <div><strong>Make/Model:</strong> {vehicleMake} {vehicleModel || 'N/A'}</div>
                </CardContent>
              </Card>
            </div>

            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><strong>Invoice Date:</strong> {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN') : 'N/A'}</div>
                  <div><strong>Due Date:</strong> {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : 'N/A'}</div>
                  {invoice.issued_at && (
                    <div><strong>Issued At:</strong> {new Date(invoice.issued_at).toLocaleString('en-IN')}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.brand || '-'}</TableCell>
                        <TableCell>{item.department_name || item.department || '-'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right">₹{parseFloat(item.line_total).toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>₹{parseFloat(invoice.total_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Discount:</span>
                    <span>-₹{parseFloat(invoice.discount_amount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax:</span>
                    <span>₹{parseFloat(invoice.tax_amount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-semibold text-green-600">
                  <span>Paid Amount:</span>
                  <span>₹{parseFloat(invoice.paid_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-semibold text-red-600">
                  <span>Balance:</span>
                  <span>₹{parseFloat(invoice.balance_amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            {payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell>{new Date(payment.payment_date).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell>₹{parseFloat(payment.amount).toLocaleString('en-IN')}</TableCell>
                          <TableCell>{payment.payment_mode}</TableCell>
                          <TableCell>{payment.reference_number || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              {invoice.status === 'draft' && (
                <Button onClick={handleIssue} disabled={issuing}>
                  {issuing ? 'Issuing...' : 'Issue Invoice'}
                </Button>
              )}
              {(invoice.status === 'issued' || invoice.status === 'partial' || invoice.status === 'overdue') && (
                <Button onClick={() => setShowPaymentModal(true)}>
                  Record Payment
                </Button>
              )}
              {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? 'Cancelling...' : 'Cancel Invoice'}
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentRecordingModal
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number || 'Draft'}
          balanceAmount={parseFloat(invoice.balance_amount || 0)}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            fetchInvoice()
            onUpdate()
            setShowPaymentModal(false)
          }}
        />
      )}
    </>
  )
}
