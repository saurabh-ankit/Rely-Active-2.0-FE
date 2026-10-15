import { useMemo, useState } from 'react'
import { MonthCalendar, type MonthState } from './MonthCalendar'
import { ConsumerTag } from './billingUi'
import { AlertTriangle, FileText, Info, Loader2, Plus, Trash2, Undo2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiErrorMessage, useInvoicePreview, useSaveInvoice, useUnitInvoices } from '@/hooks/react-query/billing'
import { useLocationContext } from '@/hooks/useLocation'
import { getBillingDocumentAPI } from '@/lib/services/billingService'
import type { BillingMode, Invoice, PreviewService } from '@/lib/types/billing'
import { cn } from '@/lib/utils'
import { formatDay, formatInr, monthLabel, monthRange, RECURRING_TYPES } from './billingFormat'

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface MiscRow {
  key: string
  name: string
  description: string
  quantity: string
  price: string
}

type DiscountType = 'none' | 'percentage' | 'amount'

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const newMiscRow = (): MiscRow => ({ key: crypto.randomUUID(), name: '', description: '', quantity: '1', price: '' })

interface GenerateInvoiceProps {
  unitId: string
  editingInvoice: Invoice | null
  onCancelEdit: () => void
  onSaved: () => void
}

export function GenerateInvoice({ unitId, editingInvoice, onCancelEdit, onSaved }: GenerateInvoiceProps) {
  const { selectedLocationId } = useLocationContext()
  // The parent remounts this per edited invoice, so editing state is just the initial state.
  const edit = editingInvoice
  // Billing is monthly; an older custom-range invoice keeps its own dates when edited.
  const billingMode: BillingMode = edit?.billingMode ?? 'MONTHLY'
  const [monthlyStart, setMonthlyStart] = useState<string | undefined>(
    // A new bill opens on the flat's first unbilled month (chosen by the server).
    edit ? edit.startDate : undefined,
  )
  const [misc, setMisc] = useState<MiscRow[]>(() =>
    (edit?.miscellaneousItems ?? []).map((m) => ({
      key: m.id,
      name: m.name,
      description: (m.description ?? '').replace(/\s*\(on \d{4}-\d{2}-\d{2}\)$/, ''),
      quantity: String(m.quantity),
      price: String(m.price),
    })),
  )
  const [discountType, setDiscountType] = useState<DiscountType>(
    edit?.discountPercentage ? 'percentage' : edit?.discount ? 'amount' : 'none',
  )
  const [discountValue, setDiscountValue] = useState(
    edit?.discountPercentage ? String(edit.discountPercentage) : edit?.discount ? String(edit.discount) : '',
  )
  const [discountReason, setDiscountReason] = useState(edit?.discountReason ?? '')
  const [dueDate, setDueDate] = useState(edit?.dueDate ?? '')
  const [notes, setNotes] = useState(edit?.notes ?? '')

  const {
    data: preview,
    isFetching,
    error,
  } = useInvoicePreview(unitId, {
    billingMode,
    startDate: monthlyStart,
    ...(edit?.billingMode === 'CUSTOM' ? { endDate: edit.endDate } : {}),
    editingInvoiceId: editingInvoice?.id,
  })
  const save = useSaveInvoice(unitId)

  const resetForm = () => {
    setMisc([])
    setDiscountType('none')
    setDiscountValue('')
    setDiscountReason('')
    setDueDate('')
    setNotes('')
  }

  const services = useMemo(() => preview?.services ?? [], [preview])
  const lineTotal = (s: PreviewService) => s.total
  // Every charge goes on the bill.
  const selectedServices = services
  // Earlier invoices still Pending (nothing paid) are carried in automatically; ones already carried
  // into an edited invoice stay on it. Partly paid / overdue invoices stay payable on their own.
  const keptCarried = (edit?.services ?? [])
    .filter((s) => s.serviceType === 'CARRY_FORWARD' && s.sourceId)
    .map((s) => ({
      id: s.sourceId!,
      invoiceNumber: s.name.match(/INV-[\w-]+/)?.[0] ?? s.name,
      startDate: s.serviceStartDate ?? '',
      endDate: s.serviceEndDate ?? '',
      balance: s.total,
    }))
  const carriedInvoices = [...keptCarried, ...(preview?.pendingInvoices ?? []).filter((p) => p.carryForward)]

  // Assist layout: rent & packages billed in advance for this month, then what was used before it.
  const sections = useMemo(() => {
    const current = services.filter((s) => RECURRING_TYPES.includes(s.serviceType) && !s.isAdjustment)
    const previous = services.filter((s) => !current.includes(s))
    return [
      { key: 'current', label: 'Current month charges', tone: 'current' as const, rows: current },
      { key: 'previous', label: 'Previous month charges', tone: 'previous' as const, rows: previous },
    ].filter((sec) => sec.rows.length > 0)
  }, [services])

  const miscTotal = misc.reduce((sum, m) => sum + (Number(m.quantity) || 0) * (Number(m.price) || 0), 0)
  // Carried balances already include their own discount and GST, so they are added after both.
  const carriedTotal = round(carriedInvoices.reduce((sum, p) => sum + p.balance, 0))
  const subtotal = round(selectedServices.reduce((sum, s) => sum + lineTotal(s), 0) + miscTotal)
  const discountNum = Number(discountValue) || 0
  const discount =
    discountType === 'percentage'
      ? round((Math.abs(subtotal) * Math.min(100, Math.max(0, discountNum))) / 100)
      : discountType === 'amount'
        ? round(subtotal >= 0 ? Math.min(discountNum, subtotal) : discountNum)
        : 0
  const taxable = Math.max(0, round(subtotal - discount))
  const gst = preview?.tax.gstEnabled ? preview.tax : null
  const cgst = gst ? round((taxable * gst.cgstRate) / 100) : 0
  const sgst = gst ? round((taxable * gst.sgstRate) / 100) : 0
  const total = round(subtotal - discount + cgst + sgst + carriedTotal)
  // Split for the summary: charges vs credits (refund adjustments).
  const lineAmounts = [
    ...selectedServices.map(lineTotal),
    ...misc.map((m) => (Number(m.quantity) || 0) * (Number(m.price) || 0)),
  ]
  const charges = round(lineAmounts.filter((a) => a > 0).reduce((s, a) => s + a, 0))
  const chargeCount = lineAmounts.filter((a) => a > 0).length
  const credits = round(lineAmounts.filter((a) => a < 0).reduce((s, a) => s + a, 0))

  const overlap = !editingInvoice ? preview?.overlappingInvoice : null
  const miscInvalid = misc.some((m) => !m.name.trim() || !(Number(m.quantity) > 0) || m.price === '')
  const nothingToBill = selectedServices.length === 0 && misc.length === 0 && carriedInvoices.length === 0
  const discountReasonMissing = discountType !== 'none' && discountNum > 0 && !discountReason.trim()
  // Everything up to this month is billed: next month opens for review, but its bill is made in that month.
  const previewMonth = preview?.startDate.slice(0, 7) ?? ''
  const notYetBillable = billingMode === 'MONTHLY' && !edit && previewMonth > currentMonth()
  const canSave =
    !!preview &&
    !overlap &&
    !notYetBillable &&
    !miscInvalid &&
    !discountReasonMissing &&
    !nothingToBill &&
    !save.isPending &&
    !isFetching

  const handleSave = () => {
    if (!preview) return
    // Open the PDF tab now, on the click (a tab opened after the save would be blocked as a pop-up).
    const pdfTab = window.open('', '_blank')
    save.mutate(
      {
        invoiceId: editingInvoice?.id,
        payload: {
          billingMode,
          startDate: preview.startDate,
          endDate: billingMode === 'CUSTOM' ? preview.endDate : undefined,
          selectedServices: selectedServices.map((s) => s.id),
          miscellaneousServices: misc.map((m) => ({
            name: m.name.trim(),
            description: m.description.trim() || null,
            quantity: Number(m.quantity),
            price: Number(m.price),
          })),
          discountType: discountType === 'none' ? null : discountType,
          discountValue: discountType === 'none' ? null : discountNum,
          discountReason: discountType === 'none' ? null : discountReason.trim() || null,
          dueDate: dueDate || null,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: async (res) => {
          toast.success(`Invoice ${res.data.invoiceNumber} ${editingInvoice ? 'updated' : 'generated'}`)
          if (!editingInvoice) {
            setMonthlyStart(undefined)
            resetForm()
          }
          // Show the invoice PDF in the new tab (generated with the invoice; retried here if that failed).
          try {
            const pdfUrl = res.data.pdfUrl || (await getBillingDocumentAPI(selectedLocationId, res.data.id))
            if (pdfTab) pdfTab.location.href = pdfUrl
            else window.open(pdfUrl, '_blank')
          } catch (error) {
            pdfTab?.close()
            toast.error(apiErrorMessage(error, 'Invoice saved, but its PDF could not be generated'))
          }
          onSaved()
        },
        onError: () => pdfTab?.close(),
      },
    )
  }

  // The server starts the bill at the first unbilled day of the month (the move-in date for a first bill).
  const onMonthChange = (month: string) => {
    setMonthlyStart(`${month}-01`)
    resetForm()
  }
  const selectedMonth = (preview?.startDate ?? monthlyStart ?? '').slice(0, 7)
  const movedInDate = preview?.movedInDate ?? null
  const minMonth = (preview?.movedInDate ?? preview?.startDate ?? currentMonth()).slice(0, 7)
  // Up to this month, plus next month once this one is billed (to preview it).
  const nextUnbilledMonth = preview?.nextBillableStartDate.slice(0, 7) ?? ''
  const maxMonth = nextUnbilledMonth > currentMonth() ? nextUnbilledMonth : currentMonth()
  const { data: invoiceList } = useUnitInvoices(unitId, 1)
  // Billed / part billed / not billed for each selectable month, from the flat's invoices.
  const monthStates = useMemo(() => {
    const states: Record<string, MonthState> = {}
    const invoices = (invoiceList?.invoices ?? []).filter((i) => i.status !== 'CANCELLED')
    for (const month of monthRange(minMonth, maxMonth)) {
      const from = movedInDate && movedInDate.slice(0, 7) === month ? movedInDate : `${month}-01`
      const to = `${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, '0')}`
      const covering = invoices.filter((i) => i.startDate <= to && i.endDate >= from)
      states[month] = !covering.length
        ? 'unbilled'
        : covering.some((i) => i.startDate <= from && i.endDate >= to)
          ? 'billed'
          : 'partial'
    }
    return states
  }, [invoiceList, minMonth, maxMonth, movedInDate])
  // An earlier month still has unbilled days.
  const gapMonth =
    !edit && preview && preview.nextBillableStartDate < preview.startDate && !preview.overlappingInvoice
      ? preview.nextBillableStartDate.slice(0, 7)
      : null
  const isFirstBill = !!preview?.movedInDate && preview.startDate === preview.movedInDate

  return (
    <div className="flex flex-col gap-4">
      {editingInvoice && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            Editing <b>{editingInvoice.invoiceNumber}</b>. Saving rebuilds it from the latest charges.
          </span>
          <Button variant="outline" size="sm" onClick={onCancelEdit}>
            <Undo2 className="mr-1 h-4 w-4" />
            Cancel edit
          </Button>
        </div>
      )}

      {/* Billing month */}
      <Card className="bg-white/60">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="w-full shrink-0 md:w-64">
              <Label className="mb-1.5 block text-sm font-semibold text-gray-800">Billing month</Label>
              {billingMode === 'MONTHLY' ? (
                <MonthCalendar
                  value={selectedMonth}
                  min={minMonth}
                  max={maxMonth}
                  states={monthStates}
                  disabled={!!edit}
                  onChange={onMonthChange}
                />
              ) : (
                <p className="text-sm text-gray-700">Custom range invoice</p>
              )}
            </div>
            {preview && (
              <div className="flex-1 rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm">
                <p className="text-gray-700">
                  Bill period <b className="text-gray-900">{formatDay(preview.startDate)}</b> to{' '}
                  <b className="text-gray-900">{formatDay(preview.endDate)}</b>
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {isFirstBill
                    ? 'First bill – rent and packages in advance from the move-in date. This month’s services are billed next month; every bill after this covers a full month.'
                    : 'Rent and packages are billed in advance for this month; services used last month and last month’s package changes are billed with it.'}
                </p>
              </div>
            )}
          </div>

          {gapMonth && (
            <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {monthLabel(gapMonth)} has not been billed yet (from {formatDay(preview?.nextBillableStartDate)}).
              </span>
              <Button variant="outline" size="sm" onClick={() => onMonthChange(gapMonth)}>
                Bill {monthLabel(gapMonth)} first
              </Button>
            </div>
          )}

          {overlap && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {overlap.invoiceNumber} already covers {formatDay(overlap.startDate)} to {formatDay(overlap.endDate)}.
                Pick a period after {formatDay(preview?.nextBillableStartDate)} or delete that invoice first.
              </span>
            </div>
          )}

          {carriedInvoices.length > 0 && (
            <div className="rounded-md border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900">
              <p className="font-medium">
                {formatInr(carriedTotal)} from {carriedInvoices.map((p) => p.invoiceNumber).join(', ')} is carried into
                this invoice
              </p>
              <p className="mt-0.5 text-xs text-purple-700">
                {carriedInvoices.length > 1 ? 'They were' : 'It was'} not paid, so{' '}
                {carriedInvoices.length > 1 ? 'they become' : 'it becomes'} obsolete and the balance is paid on this
                invoice.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services */}
      {
        <Card className="flex-1 bg-white/40 backdrop-blur-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Services ({selectedServices.length})
              </CardTitle>
              {preview?.billTo && (
                <p className="mt-1 text-xs text-gray-500">
                  Bill to <b>{preview.billTo.name}</b>
                  {preview.billTo.phone ? ` · ${preview.billTo.phone}` : ''}
                </p>
              )}
            </div>
            {preview && (
              <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-[11px]">
                <span className="font-semibold uppercase text-gray-600">Rent &amp; packages:</span>
                <span className="text-gray-700">
                  {formatDay(preview.recurringPeriod.from)} to {formatDay(preview.recurringPeriod.to)}
                </span>
                <span className="font-semibold uppercase text-gray-600">Services &amp; meds:</span>
                <span className="text-gray-700">
                  {preview.servicesPeriod
                    ? `${formatDay(preview.servicesPeriod.from)} to ${formatDay(preview.servicesPeriod.to)}`
                    : 'None – first month (billed next month)'}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isFetching && !preview ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#2b4f7e]" />
                <p className="font-medium text-gray-600">Loading charges...</p>
              </div>
            ) : error ? (
              <p className="py-8 text-center text-sm text-red-600">
                {apiErrorMessage(error, 'Could not load charges')}
              </p>
            ) : services.length === 0 && carriedInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="mb-4 h-12 w-12 text-gray-400" />
                <p className="font-medium text-gray-600">No charges found for this period</p>
                <p className="mt-2 text-sm text-gray-500">You can still add miscellaneous items below.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[26%]" />
                    <col />
                    <col className="w-20" />
                    <col className="w-32" />
                    <col className="w-32" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-200 text-sm text-gray-700">
                      <th className="py-3 px-3 text-left font-semibold">Service</th>
                      <th className="py-3 px-3 text-left font-semibold">Description</th>
                      <th className="py-3 px-3 text-center font-semibold">Qty</th>
                      <th className="py-3 px-3 text-right font-semibold">Price</th>
                      <th className="py-3 px-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((sec) => (
                      <GroupRows key={sec.key} label={sec.label} tone={sec.tone} rows={sec.rows} />
                    ))}
                    {carriedInvoices.length > 0 && (
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="py-2 px-3 text-xs font-bold uppercase tracking-wide text-purple-700">
                          Previous pending invoices
                        </td>
                      </tr>
                    )}
                    {carriedInvoices.map((p) => (
                      <tr key={p.id} className="border-b border-purple-100 bg-purple-50/40 text-sm">
                        <td className="py-2 px-3 font-medium text-gray-900">
                          Previous balance carried forward ({p.invoiceNumber})
                        </td>
                        <td className="py-2 px-3 text-gray-500">
                          {formatDay(p.startDate)} – {formatDay(p.endDate)}
                        </td>
                        <td className="py-2 px-3 text-center">1</td>
                        <td className="py-2 px-3 text-right tabular-nums">{formatInr(p.balance)}</td>
                        <td className="py-2 px-3 text-right font-semibold tabular-nums text-rose-600">
                          {formatInr(p.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Miscellaneous items added at billing */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800">Miscellaneous items</h4>
                <Button variant="outline" size="sm" onClick={() => setMisc((m) => [...m, newMiscRow()])}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add item
                </Button>
              </div>
              {misc.map((m, i) => (
                <div key={m.key} className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-12 sm:col-span-3">
                    {i === 0 && <Label className="mb-1 block text-xs text-gray-500">Name</Label>}
                    <Input
                      value={m.name}
                      placeholder="Item name"
                      onChange={(e) =>
                        setMisc((rows) => rows.map((r) => (r.key === m.key ? { ...r, name: e.target.value } : r)))
                      }
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    {i === 0 && <Label className="mb-1 block text-xs text-gray-500">Description</Label>}
                    <Input
                      value={m.description}
                      placeholder="Optional"
                      onChange={(e) =>
                        setMisc((rows) =>
                          rows.map((r) => (r.key === m.key ? { ...r, description: e.target.value } : r)),
                        )
                      }
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    {i === 0 && <Label className="mb-1 block text-xs text-gray-500">Qty</Label>}
                    <Input
                      type="number"
                      min={0}
                      value={m.quantity}
                      onChange={(e) =>
                        setMisc((rows) => rows.map((r) => (r.key === m.key ? { ...r, quantity: e.target.value } : r)))
                      }
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    {i === 0 && <Label className="mb-1 block text-xs text-gray-500">Price (₹)</Label>}
                    <Input
                      type="number"
                      value={m.price}
                      onChange={(e) =>
                        setMisc((rows) => rows.map((r) => (r.key === m.key ? { ...r, price: e.target.value } : r)))
                      }
                    />
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-2 sm:col-span-2">
                    <span className="text-sm font-medium">
                      {formatInr((Number(m.quantity) || 0) * (Number(m.price) || 0))}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove item"
                      onClick={() => setMisc((rows) => rows.filter((r) => r.key !== m.key))}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      }

      {/* Discount, due date and total */}
      {preview && (
        <Card className="bg-white/40 backdrop-blur-sm">
          <CardContent className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-gray-800">Discount</Label>
                <div className="flex items-center gap-2">
                  {(['percentage', 'amount'] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDiscountType(type)}
                      className={cn(
                        'h-9 px-3',
                        discountType === type &&
                          'border-[#4a6a8f] bg-[#4a6a8f] text-white hover:bg-[#3e5a7b] hover:text-white',
                      )}
                    >
                      {type === 'percentage' ? 'Percentage' : 'Amount'}
                    </Button>
                  ))}
                  {discountType !== 'none' && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove discount"
                        onClick={() => {
                          setDiscountType('none')
                          setDiscountValue('')
                          setDiscountReason('')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        max={discountType === 'percentage' ? 100 : undefined}
                        placeholder={discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="h-9 flex-1"
                      />
                    </>
                  )}
                </div>
              </div>
              {discountType !== 'none' && (
                <div>
                  <Label className="mb-1 block text-xs text-gray-700">
                    Discount Reason <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Enter mandatory reason for discount"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    aria-invalid={discountReasonMissing}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1 block text-xs text-gray-600">Due date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  <p className="mt-1 text-[11px] text-gray-400">Defaults to 15 days from today</p>
                </div>
              </div>
              <div>
                <Label className="mb-1 block text-xs text-gray-600">Notes</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Service charges ({chargeCount} items)</span>
                <span className="font-semibold text-rose-600">{formatInr(charges)}</span>
              </div>
              {credits !== 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="flex items-center gap-2">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-bold">
                      CREDIT
                    </span>
                    Less: Refunds / Adjustments
                  </span>
                  <span>- {formatInr(Math.abs(credits))}</span>
                </div>
              )}
              {discount !== 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount{discountReason.trim() ? ` (${discountReason.trim()})` : ''}</span>
                  <span>- {formatInr(discount)}</span>
                </div>
              )}
              {gst && (
                <>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-gray-600">Taxable amount</span>
                    <span>{formatInr(taxable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CGST @ {gst.cgstRate}%</span>
                    <span>{formatInr(cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SGST @ {gst.sgstRate}%</span>
                    <span>{formatInr(sgst)}</span>
                  </div>
                </>
              )}
              {carriedTotal !== 0 && (
                <div className="flex justify-between border-t border-gray-200 pt-2 text-purple-800">
                  <span>Previous balance carried forward</span>
                  <span>{formatInr(carriedTotal)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-gray-200 pt-3">
                <span className="text-base font-bold text-gray-900">Total Amount:</span>
                <span className="text-2xl font-bold text-rose-600">{formatInr(total)}</span>
              </div>
              <Button
                className="mt-4 w-full bg-[#2a517c] text-white hover:bg-[#476587]"
                disabled={!canSave}
                onClick={handleSave}
              >
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingInvoice
                  ? `Update ${editingInvoice.invoiceNumber}`
                  : notYetBillable
                    ? `Available from ${formatDay(`${previewMonth}-01`)}`
                    : 'Generate Invoice'}
              </Button>
              {notYetBillable && (
                <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {monthLabel(previewMonth)} is shown for review. Its invoice can be generated only in{' '}
                    {monthLabel(previewMonth)}, from <b>{formatDay(`${previewMonth}-01`)}</b>.
                  </span>
                </div>
              )}
              {discountReasonMissing && <p className="text-xs text-red-600">Enter a reason for the discount.</p>}
              {miscInvalid && (
                <p className="text-xs text-red-600">Fill in each miscellaneous item’s name, quantity and price.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function GroupRows({ label, tone, rows }: { label: string; tone: 'current' | 'previous'; rows: PreviewService[] }) {
  return (
    <>
      <tr className="bg-gray-50">
        <td
          colSpan={5}
          className={cn(
            'py-2 px-3 text-xs font-bold uppercase tracking-wide',
            tone === 'current' ? 'text-emerald-600' : 'text-[#2b6cb0]',
          )}
        >
          {label}
        </td>
      </tr>
      {rows.map((s) => {
        const total = s.total
        return (
          <tr
            key={s.id}
            className={cn(
              'border-b border-gray-100 align-top text-sm',
              s.isAdjustment && (total < 0 ? 'bg-emerald-50/40' : 'bg-amber-50/40'),
            )}
          >
            <td className="py-2.5 px-3 text-gray-900">
              <p className="font-medium">{s.name}</p>
              {s.consumerName && (
                <div className="mt-1">
                  <ConsumerTag type={s.consumerType} name={s.consumerName} />
                </div>
              )}
              {s.isAdjustment && (
                <span
                  className={cn(
                    'mt-0.5 inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase',
                    total < 0
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                      : 'border-amber-200 bg-amber-100 text-amber-700',
                  )}
                >
                  {total < 0 ? 'Refund' : s.description.includes('[Previous month]') ? 'Previous month' : 'Adjustment'}
                </span>
              )}
            </td>
            <td className="py-2.5 px-3 break-words text-gray-500">{s.description}</td>
            <td className="py-2.5 px-3 text-center tabular-nums">{s.quantity === 0 ? 'N/A' : s.quantity}</td>
            <td className="py-2.5 px-3 text-right tabular-nums">{formatInr(s.price)}</td>
            <td
              className={cn(
                'py-2.5 px-3 text-right font-semibold tabular-nums',
                total < 0 ? 'text-emerald-700' : 'text-rose-600',
              )}
            >
              {formatInr(total)}
            </td>
          </tr>
        )
      })}
    </>
  )
}
