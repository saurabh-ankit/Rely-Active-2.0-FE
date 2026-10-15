import { useState } from 'react'
import {
  Banknote,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  Paperclip,
  Smartphone,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiErrorMessage, useRecordPayment } from '@/hooks/react-query/billing'
import { useLocationContext } from '@/hooks/useLocation'
import { getBillingDocumentAPI, uploadBillingAttachmentAPI } from '@/lib/services/billingService'
import type { CarriedInInvoice, Invoice, PaymentMethod } from '@/lib/types/billing'
import { cn } from '@/lib/utils'
import { formatDmy, formatInr, PAYMENT_METHOD_LABEL } from './billingFormat'
import { StaffSearchSelect, type StaffOption } from './StaffSearchSelect'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Icon and reference field for each payment method. Only cash has no reference to record. */
const METHOD_META: Record<PaymentMethod, { icon: LucideIcon; reference: string; placeholder: string }> = {
  CASH: { icon: Banknote, reference: 'Reference', placeholder: 'Optional, e.g. cash book entry' },
  UPI: { icon: Smartphone, reference: 'UPI transaction ID', placeholder: 'e.g. 4231 8790 1234' },
  CHEQUE: { icon: FileText, reference: 'Cheque number', placeholder: 'e.g. 004512' },
  CARD: { icon: CreditCard, reference: 'Card transaction / approval no.', placeholder: 'From the card slip' },
  NET_BANKING: { icon: Landmark, reference: 'UTR / transaction ID', placeholder: 'e.g. HDFCN52026101512345' },
  OTHER: { icon: Wallet, reference: 'Reference', placeholder: 'How was it paid?' },
}

const METHODS = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]

/** Older invoices carried into this one are paid off first (oldest first), then this invoice's charges. */
function splitPayment(carriedIn: CarriedInInvoice[], amount: number) {
  const rows: { key: string; label: string; due: number; take: number; clears: boolean }[] = []
  let left = amount
  for (const c of carriedIn) {
    const due = Math.max(0, Math.round((c.carriedAmount - c.paidAmount) * 100) / 100)
    const take = Math.min(due, left)
    left = Math.round((left - take) * 100) / 100
    rows.push({
      key: c.invoiceId,
      label: c.invoiceNumber ?? 'Earlier invoice',
      due,
      take,
      clears: take > 0 && take >= due,
    })
  }
  return { rows, own: left }
}

interface RecordPaymentModalProps {
  invoice: Invoice | null
  onOpenChange: (open: boolean) => void
}

export function RecordPaymentModal({ invoice, onOpenChange }: RecordPaymentModalProps) {
  const { selectedLocationId } = useLocationContext()
  const recordPayment = useRecordPayment(invoice?.unitId ?? '')
  // Mounted per invoice (keyed by the caller), so the form starts fresh each time.
  const total = Number(invoice?.discountedAmount ?? 0)
  const paid = Number(invoice?.paidAmount ?? 0)
  const remaining = invoice ? Math.max(0, Number(invoice.remainingBalance)) : 0
  const [amount, setAmount] = useState(() => remaining.toFixed(2))
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [reference, setReference] = useState('')
  const [handedOverTo, setHandedOverTo] = useState<StaffOption | null>(null)
  const [notes, setNotes] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [touched, setTouched] = useState(false)

  const amountNum = Number(amount)
  const amountInvalid = !(amountNum > 0) || Math.round(amountNum * 100) > Math.round(remaining * 100)
  const referenceRequired = method !== 'CASH'
  const referenceMissing = referenceRequired && !reference.trim()
  const after = Math.max(0, Math.round((remaining - (amountInvalid ? 0 : amountNum)) * 100) / 100)
  const paidPct = total > 0 ? Math.min(100, ((paid + (amountInvalid ? 0 : amountNum)) / total) * 100) : 0
  const paidBeforePct = total > 0 ? Math.min(100, (paid / total) * 100) : 0
  const meta = METHOD_META[method]

  const split = splitPayment(invoice?.carriedIn ?? [], amountInvalid ? 0 : amountNum)

  const submit = async () => {
    setTouched(true)
    if (!invoice || amountInvalid || referenceMissing) return
    // Open the receipt tab now, on the click (a tab opened after the save would be blocked as a pop-up).
    const pdfTab = window.open('', '_blank')
    let imageUrl: string | undefined
    if (image) {
      setUploading(true)
      try {
        imageUrl = await uploadBillingAttachmentAPI(selectedLocationId, image)
      } catch (error) {
        toast.error(apiErrorMessage(error, 'Could not upload the image – recording without it'))
      } finally {
        setUploading(false)
      }
    }
    recordPayment.mutate(
      {
        invoiceId: invoice.id,
        payload: {
          paidAmount: amountNum,
          paymentMethod: method,
          ...(reference.trim() ? { paymentReference: reference.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          ...(handedOverTo ? { handedOverTo: handedOverTo.id } : {}),
          ...(imageUrl ? { imageUrl } : {}),
        },
      },
      {
        onSuccess: async (res) => {
          onOpenChange(false)
          const { receiptId, receiptNumber, receiptPdfUrl } = res.data
          toast.success(`Payment recorded · ${receiptNumber}`)
          try {
            const url = receiptPdfUrl || (await getBillingDocumentAPI(selectedLocationId, invoice.id, receiptId))
            if (pdfTab) pdfTab.location.href = url
            else window.open(url, '_blank')
          } catch (error) {
            pdfTab?.close()
            toast.error(apiErrorMessage(error, 'Payment recorded, but its receipt PDF could not be generated'))
          }
        },
        onError: () => pdfTab?.close(),
      },
    )
  }

  const busy = uploading || recordPayment.isPending

  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        {/* Header */}
        <DialogHeader className="border-b border-gray-100 bg-gradient-to-r from-[#2b4f7e]/[0.06] to-transparent px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2b4f7e] text-white">
              <Wallet className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg">Record Payment</DialogTitle>
              <DialogDescription className="truncate">
                {invoice?.invoiceNumber}
                {invoice && ` · ${formatDmy(invoice.startDate)} – ${formatDmy(invoice.endDate)}`}
                {invoice?.billTo?.name && ` · ${invoice.billTo.name}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto px-6 py-5">
          {/* Where the invoice stands */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">Invoice total</p>
                <p className="mt-0.5 font-semibold text-gray-900 tabular-nums">{formatInr(total)}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">Paid so far</p>
                <p className="mt-0.5 font-semibold text-emerald-700 tabular-nums">{formatInr(paid)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">Remaining</p>
                <p className="mt-0.5 font-semibold text-rose-600 tabular-nums">{formatInr(remaining)}</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="relative h-full">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-emerald-300 transition-all"
                  style={{ width: `${paidPct}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-emerald-600"
                  style={{ width: `${paidBeforePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="pay-amount">
                Amount received <span className="text-rose-600">*</span>
              </Label>
              {Number(amount) !== remaining && (
                <button
                  type="button"
                  onClick={() => setAmount(remaining.toFixed(2))}
                  className="text-xs font-medium text-[#2b6cb0] hover:underline"
                >
                  Pay full balance
                </button>
              )}
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-base font-semibold text-gray-500">
                ₹
              </span>
              <Input
                id="pay-amount"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn(
                  'h-12 pl-8 text-lg font-semibold tabular-nums',
                  amount !== '' && amountInvalid && 'border-rose-400 focus-visible:ring-rose-200',
                )}
              />
            </div>
            {amount !== '' && amountInvalid ? (
              <p className="mt-1.5 text-xs text-rose-600">Enter an amount between ₹0.01 and {formatInr(remaining)}.</p>
            ) : (
              <p className="mt-1.5 text-xs text-gray-500">
                {after > 0 ? (
                  <>
                    Partial payment · <b className="text-amber-700">{formatInr(after)}</b> will remain on this invoice
                  </>
                ) : (
                  <span className="font-medium text-emerald-700">This settles the invoice in full</span>
                )}
              </p>
            )}
          </div>

          {split.rows.length > 0 && !amountInvalid && (
            <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-sm">
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-purple-800 uppercase">
                This payment goes to
              </p>
              <ul className="space-y-1.5">
                {split.rows.map((r) => (
                  <li key={r.key} className="flex items-center justify-between gap-3">
                    <span className="text-gray-700">
                      {r.label} <span className="text-xs text-gray-500">(carried forward, {formatInr(r.due)} due)</span>
                      {r.clears && (
                        <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          becomes Paid
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-emerald-600 tabular-nums">{formatInr(r.take)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 border-t border-purple-100 pt-1.5">
                  <span className="text-gray-700">{invoice?.invoiceNumber} charges</span>
                  <span className="font-semibold text-emerald-600 tabular-nums">{formatInr(split.own)}</span>
                </li>
              </ul>
            </div>
          )}

          {/* Method */}
          <div>
            <Label className="mb-1.5 block">
              Payment method <span className="text-rose-600">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => {
                const Icon = METHOD_META[m].icon
                const active = m === method
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMethod(m)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                      active
                        ? 'border-[#2b4f7e] bg-[#2b4f7e]/[0.06] font-semibold text-[#2b4f7e] ring-1 ring-[#2b4f7e]'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{PAYMENT_METHOD_LABEL[m]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reference */}
          <div>
            <Label htmlFor="pay-ref" className="mb-1.5 block">
              {meta.reference}{' '}
              {referenceRequired ? (
                <span className="text-rose-600">*</span>
              ) : (
                <span className="font-normal text-gray-400">(optional for cash)</span>
              )}
            </Label>
            <Input
              id="pay-ref"
              placeholder={meta.placeholder}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              aria-invalid={touched && referenceMissing}
              className={cn(touched && referenceMissing && 'border-rose-400 focus-visible:ring-rose-200')}
            />
            {touched && referenceMissing && (
              <p className="mt-1.5 text-xs text-rose-600">
                {meta.reference} is required for {PAYMENT_METHOD_LABEL[method]} payments.
              </p>
            )}
          </div>

          {/* Staff + proof */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Handed over to</Label>
              <StaffSearchSelect value={handedOverTo} onChange={setHandedOverTo} />
            </div>
            <div>
              <Label className="mb-1.5 block">Payment proof</Label>
              {image ? (
                <div className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm">
                  <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="min-w-0 flex-1 truncate">{image.name}</span>
                  <button
                    type="button"
                    aria-label="Remove file"
                    onClick={() => setImage(null)}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 text-sm text-gray-600 hover:border-[#2b4f7e] hover:bg-[#2b4f7e]/[0.03]">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span className="truncate">Attach cheque / slip</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      if (file && file.size > MAX_IMAGE_BYTES) {
                        toast.error('File must be smaller than 5 MB')
                        return
                      }
                      setImage(file)
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="pay-notes" className="mb-1.5 block">
              Notes
            </Label>
            <Textarea
              id="pay-notes"
              rows={2}
              placeholder="Anything to remember about this payment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
          <p className="text-xs text-gray-500">
            Balance after: <b className={after > 0 ? 'text-amber-700' : 'text-emerald-700'}>{formatInr(after)}</b>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              className="bg-[#2a517c] text-white hover:bg-[#476587]"
              disabled={amountInvalid || busy || (touched && referenceMissing)}
              onClick={submit}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record {amountInvalid ? 'payment' : formatInr(amountNum)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
