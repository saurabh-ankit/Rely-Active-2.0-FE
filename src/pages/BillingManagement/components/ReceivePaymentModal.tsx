import React, { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  Building2,
  Check,
  CreditCard,
  FileText,
  IndianRupee,
  Loader2,
  ReceiptIndianRupee,
  Smartphone,
  Wallet,
} from 'lucide-react'
import { useRecordPayment } from '@/hooks/react-query/billing'
import { formatDateDDMMYYYY } from '@/lib/utils/dateFormat'
import type { Invoice, PaymentMethod } from '@/lib/types/billing'

interface ReceivePaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit?: {
    id: string
    unitNumber: string
  } | null
  folio?: {
    id: string
    accountNumber: string
    accountName?: string
    creditBalance?: number
  } | null
  primaryPayer?: {
    partyName: string
    role?: string
  } | null
  primaryResident?: {
    name: string
  } | null
  invoice?: Invoice | null
  invoices: Invoice[]
  onSuccess?: () => void
}

const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string; icon: React.ReactNode }> = [
  { id: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)', icon: <Smartphone className="w-4 h-4 text-emerald-600" /> },
  {
    id: 'BANK_TRANSFER',
    label: 'Bank Transfer (NEFT / RTGS / IMPS)',
    icon: <Building2 className="w-4 h-4 text-blue-600" />,
  },
  { id: 'CHEQUE', label: 'Cheque', icon: <FileText className="w-4 h-4 text-amber-600" /> },
  { id: 'CASH', label: 'Cash', icon: <Wallet className="w-4 h-4 text-green-600" /> },
  { id: 'CARD', label: 'Debit / Credit Card', icon: <CreditCard className="w-4 h-4 text-purple-600" /> },
  { id: 'OTHER', label: 'Other', icon: <IndianRupee className="w-4 h-4 text-gray-600" /> },
]

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = (props) => {
  if (!props.open) return null

  return <ReceivePaymentForm key={props.invoice?.id ?? `folio-${props.folio?.id ?? 'account'}`} {...props} />
}

const ReceivePaymentForm: React.FC<ReceivePaymentModalProps> = ({
  open,
  onOpenChange,
  unit,
  folio,
  primaryPayer,
  primaryResident,
  invoice,
  invoices,
  onSuccess,
}) => {
  const recordPaymentMutation = useRecordPayment(unit?.id)

  const unpaidInvoices = useMemo(() => invoices.filter((inv) => Number(inv.amountDue) > 0), [invoices])

  const defaultInvoice = invoice ?? (unpaidInvoices.length > 0 ? unpaidInvoices[0] : null)
  const defaultInvoiceId = invoice?.id ?? (defaultInvoice ? defaultInvoice.id : 'ADVANCE')
  const defaultAmount = defaultInvoice
    ? String(Number(defaultInvoice.amountDue) > 0 ? defaultInvoice.amountDue : defaultInvoice.grandTotal)
    : ''

  // Selection state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(defaultInvoiceId)
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'PARTIAL'>('FULL')
  const [paymentAmount, setPaymentAmount] = useState<string>(defaultAmount)
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI')
  const [transactionReference, setTransactionReference] = useState<string>('')
  const [bankName, setBankName] = useState<string>('')
  const [chequeNumber, setChequeNumber] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Current active selected invoice
  const currentInvoice = useMemo(
    () => invoices.find((inv) => inv.id === selectedInvoiceId),
    [invoices, selectedInvoiceId],
  )

  // Handle changing selected invoice
  const handleInvoiceChange = (invId: string) => {
    setSelectedInvoiceId(invId)
    setError(null)

    if (invId === 'ADVANCE') {
      setPaymentMode('PARTIAL')
      setPaymentAmount('')
      return
    }

    const target = invoices.find((i) => i.id === invId)
    if (target) {
      const due = Number(target.amountDue)
      setPaymentMode('FULL')
      setPaymentAmount(String(due > 0 ? due : 0))
    }
  }

  // Handle toggling FULL vs PARTIAL
  const handleModeChange = (mode: 'FULL' | 'PARTIAL') => {
    setPaymentMode(mode)
    setError(null)

    if (mode === 'FULL' && currentInvoice) {
      setPaymentAmount(String(currentInvoice.amountDue))
    }
  }

  // Validation
  const amountNum = parseFloat(paymentAmount) || 0
  const currentDue = currentInvoice ? Number(currentInvoice.amountDue) : 0

  const isValidAmount =
    amountNum > 0 && (selectedInvoiceId === 'ADVANCE' || paymentMode === 'FULL' || amountNum <= currentDue)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!folio?.id) {
      setError('Billing Folio account is missing for this unit')
      return
    }

    if (amountNum <= 0) {
      setError('Please enter a valid payment amount greater than ₹0')
      return
    }

    if (selectedInvoiceId !== 'ADVANCE' && currentInvoice && amountNum > currentDue) {
      setError(`Payment amount (₹${amountNum}) cannot exceed balance due (₹${currentDue})`)
      return
    }

    try {
      const allocations =
        selectedInvoiceId && selectedInvoiceId !== 'ADVANCE'
          ? [
              {
                invoiceId: selectedInvoiceId,
                amount: Math.min(amountNum, currentDue),
              },
            ]
          : []

      await recordPaymentMutation.mutateAsync({
        billingAccountId: folio.id,
        amount: amountNum,
        paymentDate,
        paymentMethod,
        transactionReference: transactionReference.trim() || undefined,
        bankName: bankName.trim() || undefined,
        chequeNumber: chequeNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations,
      })

      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string }
      setError(apiErr?.response?.data?.message || apiErr?.message || 'Failed to record payment')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl rounded-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-xs border border-white/20">
                <ReceiptIndianRupee className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Receive Payment
                  {unit && (
                    <Badge className="bg-white/20 text-white border-white/30 text-xs font-mono">
                      Flat {unit.unitNumber}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-emerald-100 text-xs mt-0.5">
                  Record full or partial payment with automatic ledger credit reconciliation
                </DialogDescription>
              </div>
            </div>

            {folio && (
              <div className="text-right hidden sm:block">
                <div className="text-[10px] text-emerald-200 uppercase tracking-wider font-semibold">Folio No</div>
                <div className="text-xs font-mono font-bold text-white">{folio.accountNumber}</div>
              </div>
            )}
          </div>

          {/* Resident & Payer Badge Info */}
          <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-2 text-emerald-100">
              <span className="text-[11px] text-emerald-200">Resident:</span>
              <span className="font-semibold text-white">{primaryResident?.name || 'Assigned Resident'}</span>
            </div>
            {primaryPayer && (
              <div className="flex items-center gap-2 text-emerald-100">
                <span className="text-[11px] text-emerald-200">Bill-To:</span>
                <span className="font-semibold text-white">
                  {primaryPayer.partyName} {primaryPayer.role ? `(${primaryPayer.role})` : ''}
                </span>
              </div>
            )}
            {folio?.creditBalance !== undefined && Number(folio.creditBalance) > 0 && (
              <Badge className="bg-white text-emerald-800 hover:bg-emerald-50 text-[11px] font-mono font-bold">
                Advance Credit: ₹{Number(folio.creditBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Badge>
            )}
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to process payment</p>
                <p className="text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* 1. INVOICE ALLOCATION SELECTION */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              1. Select Invoice or Payment Target
            </Label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-800"
            >
              {unpaidInvoices.length > 0 && (
                <optgroup label="Pending / Outstanding Invoices">
                  {unpaidInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — Due: ₹
                      {Number(inv.amountDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Total: ₹
                      {Number(inv.grandTotal).toLocaleString('en-IN')})
                    </option>
                  ))}
                </optgroup>
              )}

              {invoices.filter((i) => Number(i.amountDue) <= 0).length > 0 && (
                <optgroup label="Fully Paid Invoices (Already Settled)">
                  {invoices
                    .filter((i) => Number(i.amountDue) <= 0)
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — Settled (₹{Number(inv.grandTotal).toLocaleString('en-IN')})
                      </option>
                    ))}
                </optgroup>
              )}

              <option value="ADVANCE">Direct Account Advance Credit (No Invoice)</option>
            </select>
          </div>

          {/* Selected Invoice Details Card */}
          {currentInvoice && selectedInvoiceId !== 'ADVANCE' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#005390]">{currentInvoice.invoiceNumber}</span>
                    <Badge variant="outline" className="text-[10px] bg-white">
                      {currentInvoice.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Period: {formatDateDDMMYYYY(currentInvoice.periodStart)} →{' '}
                    {formatDateDDMMYYYY(currentInvoice.periodEnd)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Balance Due</div>
                  <div className="font-mono font-bold text-lg text-rose-600">
                    ₹{Number(currentInvoice.amountDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-3 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <div className="text-[10px] text-gray-400">Total Billed</div>
                  <div className="font-mono font-semibold text-gray-800">
                    ₹{Number(currentInvoice.grandTotal).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <div className="text-[10px] text-gray-400">Already Paid</div>
                  <div className="font-mono font-semibold text-emerald-600">
                    ₹{Number(currentInvoice.amountPaid || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <div className="text-[10px] text-gray-400">Due Date</div>
                  <div className="font-medium text-gray-700">{formatDateDDMMYYYY(currentInvoice.dueDate)}</div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PAYMENT MODE & AMOUNT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                2. Payment Mode & Amount
              </Label>
              {currentInvoice && selectedInvoiceId !== 'ADVANCE' && (
                <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => handleModeChange('FULL')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      paymentMode === 'FULL'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Full Payment (₹{Number(currentInvoice.amountDue).toLocaleString('en-IN')})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('PARTIAL')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      paymentMode === 'PARTIAL'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Partial Payment
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedInvoiceId !== 'ADVANCE' && currentInvoice ? currentInvoice.amountDue : undefined}
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value)
                  setError(null)
                }}
                disabled={paymentMode === 'FULL' && selectedInvoiceId !== 'ADVANCE'}
                placeholder="Enter amount in ₹"
                className={`pl-7 h-11 text-base font-mono font-bold text-gray-900 ${
                  paymentMode === 'FULL' && selectedInvoiceId !== 'ADVANCE'
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                    : 'border-gray-300'
                }`}
              />
            </div>

            {/* Quick partial percentages if in partial mode */}
            {paymentMode === 'PARTIAL' && currentInvoice && currentDue > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-gray-400">Quick Select:</span>
                {[0.25, 0.5, 0.75].map((pct) => {
                  const val = Math.round(currentDue * pct)
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPaymentAmount(String(val))}
                      className="px-2 py-0.5 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-mono"
                    >
                      {pct * 100}% (₹{val.toLocaleString('en-IN')})
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 3. PAYMENT METHOD & DATE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Method</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-800"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-10 text-xs border-gray-300"
              />
            </div>
          </div>

          {/* Conditional Method Details */}
          {(paymentMethod === 'UPI' || paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'CARD') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  {paymentMethod === 'UPI' ? 'UPI UTR / Reference ID' : 'UTR / Transaction Ref No'}
                </Label>
                <Input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder={paymentMethod === 'UPI' ? 'e.g. 329847192847' : 'e.g. ICIC0001234'}
                  className="h-9 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Payer Bank Name (Optional)</Label>
                <Input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank, SBI, ICICI"
                  className="h-9 text-xs bg-white"
                />
              </div>
            </div>
          )}

          {paymentMethod === 'CHEQUE' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Cheque Number *</Label>
                <Input
                  type="text"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  placeholder="e.g. 000452"
                  className="h-9 text-xs bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Bank Name & Branch</Label>
                <Input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Axis Bank, Indiranagar"
                  className="h-9 text-xs bg-white"
                />
              </div>
            </div>
          )}

          {/* Notes / Remarks */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Notes / Receipt Remarks (Optional)
            </Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received via resident son's Google Pay for March maintenance..."
              className="text-xs resize-none border-gray-300"
            />
          </div>

          {/* Summary Preview Banner */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                Total Payment to Record
              </span>
              <span className="text-lg font-mono font-black text-emerald-900">
                ₹{amountNum > 0 ? amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-emerald-700 block">
                {selectedInvoiceId === 'ADVANCE'
                  ? 'Allocated to Advance Credit'
                  : currentInvoice && amountNum >= currentDue
                    ? 'Status will change to: PAID'
                    : 'Status will change to: PARTIALLY PAID'}
              </span>
              <Badge className="bg-emerald-600 text-white text-[10px] mt-0.5">
                Generates Sequential Receipt REC-YYYYMM-XXXX
              </Badge>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={recordPaymentMutation.isPending}
              className="text-xs h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValidAmount || recordPaymentMutation.isPending}
              className="text-xs h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
            >
              {recordPaymentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Recording Payment...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  Confirm & Receive Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
