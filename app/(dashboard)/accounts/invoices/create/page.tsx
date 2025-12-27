'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/tenant-context'

interface VehicleInward {
  id: string
  short_id?: string
  registration_number: string
  customer_name: string
  customer_phone: string
  accessories_requested: string
  status: string
}

interface LineItem {
  product_name: string
  brand?: string
  department?: string
  quantity: number
  unit_price: number
  line_total: number
}

export default function CreateInvoicePage() {
  const router = useRouter()
  const supabase = createClient()
  const [vehicleInwardId, setVehicleInwardId] = useState<string>('')
  const [availableJobs, setAvailableJobs] = useState<VehicleInward[]>([])
  const [selectedJob, setSelectedJob] = useState<VehicleInward | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() + 30)
    return date.toISOString().split('T')[0]
  })
  const [discountAmount, setDiscountAmount] = useState<string>('')
  const [discountReason, setDiscountReason] = useState<string>('')
  const [taxAmount, setTaxAmount] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [issueImmediately, setIssueImmediately] = useState(false)

  useEffect(() => {
    fetchAvailableJobs()
  }, [])

  useEffect(() => {
    if (vehicleInwardId && availableJobs.length > 0) {
      const job = availableJobs.find(j => j.id === vehicleInwardId)
      if (job) {
        setSelectedJob(job)
        loadProductsFromJob(job)
      }
    }
  }, [vehicleInwardId, availableJobs])

  const fetchAvailableJobs = async () => {
    try {
      setLoadingJobs(true)
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()

      // Fetch completed jobs that don't have invoices yet
      let query = supabase
        .from('vehicle_inward')
        .select(`
          id,
          short_id,
          registration_number,
          customer_name,
          customer_phone,
          accessories_requested,
          status
        `)
        .in('status', ['completed', 'installation_complete', 'complete_and_delivered'])
        .order('updated_at', { ascending: false })

      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      // Get jobs without invoices
      const { data: allJobs } = await query

      if (allJobs) {
        // Filter out jobs that already have invoices (with tenant filtering)
        let existingInvoicesQuery = supabase
          .from('invoices')
          .select('vehicle_inward_id')
        
        if (!isSuper && tenantId) {
          existingInvoicesQuery = existingInvoicesQuery.eq('tenant_id', tenantId)
        }
        
        const { data: existingInvoices } = await existingInvoicesQuery

        const invoiceJobIds = new Set(existingInvoices?.map(i => i.vehicle_inward_id) || [])
        const available = allJobs.filter(job => !invoiceJobIds.has(job.id))
        setAvailableJobs(available)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoadingJobs(false)
    }
  }

  const loadProductsFromJob = (job: VehicleInward) => {
    try {
      if (job.accessories_requested) {
        const products = JSON.parse(job.accessories_requested)
        if (Array.isArray(products)) {
          const items: LineItem[] = products.map((p: any) => ({
            product_name: p.product || '',
            brand: p.brand,
            department: p.department,
            quantity: 1,
            unit_price: parseFloat(p.price || 0),
            line_total: parseFloat(p.price || 0)
          }))
          setLineItems(items)
        }
      }
    } catch (error) {
      console.error('Error parsing products:', error)
      setLineItems([])
    }
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    
    // Recalculate line_total if quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].line_total = updated[index].quantity * updated[index].unit_price
    }
    
    setLineItems(updated)
  }

  const addLineItem = () => {
    setLineItems([...lineItems, {
      product_name: '',
      quantity: 1,
      unit_price: 0,
      line_total: 0
    }])
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0)
    const discount = parseFloat(discountAmount || '0')
    const tax = parseFloat(taxAmount || '0')
    const total = subtotal - discount + tax
    return { subtotal, discount, tax, total }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!vehicleInwardId || lineItems.length === 0) {
      alert('Please select a job and add at least one line item')
      return
    }

    setLoading(true)

    try {
      const { total } = calculateTotals()
      
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleInwardId,
          invoiceDate,
          dueDate,
          discountAmount: parseFloat(discountAmount || '0'),
          discountReason: discountReason || undefined,
          taxAmount: parseFloat(taxAmount || '0'),
          notes: notes || undefined,
          lineItems,
          issueImmediately
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invoice')
      }

      alert(`Invoice ${issueImmediately ? 'created and issued' : 'created as draft'} successfully!`)
      router.push('/accounts')
    } catch (error: any) {
      alert(error.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, discount, tax, total } = calculateTotals()

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Button
          variant="outline"
          onClick={() => router.back()}
          style={{ marginBottom: '1rem' }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Create Invoice</h1>
        <p className="text-muted-foreground">Create a new invoice from a completed job</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Job Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Job</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingJobs ? (
                <div>Loading available jobs...</div>
              ) : (
                <select
                  value={vehicleInwardId}
                  onChange={(e) => setVehicleInwardId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Select a completed job...</option>
                  {availableJobs.map(job => (
                    <option key={job.id} value={job.id}>
                      {job.short_id || job.id.substring(0, 8)} - {job.registration_number} - {job.customer_name}
                    </option>
                  ))}
                </select>
              )}
              {selectedJob && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <p><strong>Customer:</strong> {selectedJob.customer_name}</p>
                  <p><strong>Phone:</strong> {selectedJob.customer_phone}</p>
                  <p><strong>Vehicle:</strong> {selectedJob.registration_number}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Line Items</CardTitle>
                <Button type="button" onClick={addLineItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-4 border rounded-md">
                    <div className="col-span-4">
                      <Label>Product Name</Label>
                      <Input
                        value={item.product_name}
                        onChange={(e) => updateLineItem(index, 'product_name', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Brand</Label>
                      <Input
                        value={item.brand || ''}
                        onChange={(e) => updateLineItem(index, 'brand', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-span-1">
                      <Label>Total</Label>
                      <div className="p-2 bg-gray-50 rounded-md text-sm font-semibold">
                        ₹{item.line_total.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {lineItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No line items. Click &quot;Add Item&quot; to add products.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceDate">Invoice Date *</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="discountAmount">Discount Amount</Label>
                <Input
                  id="discountAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="discountReason">Discount Reason</Label>
                <Input
                  id="discountReason"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="Why was discount given?"
                />
              </div>
              <div>
                <Label htmlFor="taxAmount">Tax Amount</Label>
                <Input
                  id="taxAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span>-₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>₹{tax.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={issueImmediately}
                onChange={(e) => setIssueImmediately(e.target.checked)}
              />
              <span>Issue invoice immediately</span>
            </label>
            <Button type="submit" disabled={loading || lineItems.length === 0}>
              {loading ? (
                'Creating...'
              ) : issueImmediately ? (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Create & Issue
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
