'use client'

import { useState } from 'react'
import { X, DollarSign, Calendar, FileText, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PaymentRecordingModalProps {
  invoiceId: string
  invoiceNumber: string
  balanceAmount: number
  onClose: () => void
  onSuccess: () => void
  payment?: any // Optional: if provided, modal is in edit mode
}

export default function PaymentRecordingModal({
  invoiceId,
  invoiceNumber,
  balanceAmount,
  onClose,
  onSuccess,
  payment
}: PaymentRecordingModalProps) {
  const isEditMode = !!payment
  const [amount, setAmount] = useState<string>(payment?.amount?.toString() || '')
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other'>(
    (payment?.payment_mode || payment?.payment_method || 'cash') as any
  )
  const [paymentDate, setPaymentDate] = useState<string>(
    payment?.payment_date ? new Date(payment.payment_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [referenceNumber, setReferenceNumber] = useState<string>(payment?.reference_number || '')
  const [paidBy, setPaidBy] = useState<string>(payment?.paid_by || '')
  const [notes, setNotes] = useState<string>(payment?.notes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const paymentAmount = parseFloat(amount)
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter a valid payment amount')
      return
    }

    if (!isEditMode && paymentAmount > balanceAmount) {
      setError(`Payment amount cannot exceed balance of ₹${balanceAmount.toLocaleString('en-IN')}`)
      return
    }

    setLoading(true)

    try {
      const url = isEditMode ? `/api/payments/${payment.id}` : '/api/payments'
      const method = isEditMode ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: isEditMode ? undefined : invoiceId, // Don't send invoiceId for updates
          amount: paymentAmount,
          payment_mode: paymentMode,
          payment_date: paymentDate,
          reference_number: referenceNumber || undefined,
          paid_by: paidBy || undefined,
          notes: notes || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle error - could be string or object
        let errorMessage = isEditMode ? 'Failed to update payment' : 'Failed to record payment'
        if (data.error) {
          if (typeof data.error === 'string') {
            errorMessage = data.error
          } else if (data.error.message) {
            errorMessage = data.error.message
          } else {
            errorMessage = JSON.stringify(data.error)
          }
        }
        throw new Error(errorMessage)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      // Extract error message properly
      let errorMessage = isEditMode ? 'Failed to update payment' : 'Failed to record payment'
      if (err.message) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err.error) {
        if (typeof err.error === 'string') {
          errorMessage = err.error
        } else if (err.error.message) {
          errorMessage = err.error.message
        }
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1100] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Record Payment</h2>
              <p className="text-sm text-muted-foreground">Invoice #{invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-900">Outstanding Balance:</span>
              <span className="text-lg font-bold text-blue-900">
                ₹{balanceAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={balanceAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMode">Payment Mode *</Label>
              <Select value={paymentMode} onValueChange={(value: any) => setPaymentMode(value)}>
                <SelectTrigger id="paymentMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Transaction ID, Cheque No., etc."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="paidBy">Paid By</Label>
              <Input
                id="paidBy"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                placeholder="Customer name or reference"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional payment notes..."
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (isEditMode ? 'Updating...' : 'Recording...') : (isEditMode ? 'Update Payment' : 'Record Payment')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
