import { Fragment, useState } from 'react'
import {
  ArrowRightLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Loader2,
  Pencil,
  ReceiptIndianRupee,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { apiErrorMessage, useUnitInvoices } from '@/hooks/react-query/billing'
import { useResourceAccess } from '@/hooks/useResourceAccess'
import { useLocationContext } from '@/hooks/useLocation'
import { RESOURCE } from '@/lib/permissions/resourceKeys'
import { getBillingDocumentAPI } from '@/lib/services/billingService'
import type { Invoice } from '@/lib/types/billing'
import { cn } from '@/lib/utils'
import { RecordPaymentModal } from './RecordPaymentModal'
import { ConsumerTag, PaidBar, StatusPill, TablePager } from './billingUi'
import { formatDmy, formatInr, isPayable, monthLabel, openPdf, PAYMENT_METHOD_LABEL } from './billingFormat'

/** Unpaid invoices that nothing was carried out of can still be edited. */
const isEditable = (inv: Invoice) =>
  Number(inv.paidAmount) === 0 && inv.receipts.length === 0 && ['DRAFT', 'PENDING', 'OVERDUE'].includes(inv.status)

const COLUMNS = ['', 'Invoice', 'Billing Period', 'Status', 'Invoice Amount', 'Paid', 'Balance', 'Actions']

interface InvoicesListProps {
  unitId: string
  onEditInvoice: (invoice: Invoice) => void
}

/** All invoices of a flat; a row opens to its charges, totals and payments. */
export function InvoicesList({ unitId, onEditInvoice }: InvoicesListProps) {
  const { selectedLocationId } = useLocationContext()
  const invoicesAccess = useResourceAccess(RESOURCE.BILLING_INVOICES)
  const receiptsAccess = useResourceAccess(RESOURCE.BILLING_RECEIPTS)
  const [page, setPage] = useState(1)
  const { data, isLoading } = useUnitInvoices(unitId, page)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [paying, setPaying] = useState<Invoice | null>(null)
  const [opening, setOpening] = useState<string | null>(null)

  /** Opens a PDF in a new tab (the tab is opened on the click, so pop-up blockers allow it). */
  const showPdf = (key: string, getUrl: () => Promise<string>) => {
    setOpening(key)
    openPdf(getUrl)
      .catch((e) => toast.error(apiErrorMessage(e, 'Could not open the PDF')))
      .finally(() => setOpening(null))
  }

  const invoices = data?.invoices ?? []
  const total = data?.pagination.total ?? 0

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xl font-bold text-gray-900">All Invoices</h3>
        <p className="text-sm text-gray-500">
          {total} invoice{total === 1 ? '' : 's'} · click a row to see its charges and payments
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-2xs">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              {COLUMNS.map((c, i) => (
                <th
                  key={c || 'expand'}
                  className={cn(
                    'px-3 py-3 text-left text-[11px] font-semibold tracking-wide whitespace-nowrap text-gray-600 uppercase',
                    !c && 'w-10',
                    i >= 4 && i <= 6 && 'text-right',
                    c === 'Actions' && 'text-right',
                  )}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={COLUMNS.length} className="py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#2b4f7e]" />
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="py-14 text-center text-gray-500">
                  <FileText className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                  No invoices yet for this flat
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const isOpen = expanded === inv.id
                const payable = isPayable(inv.status)
                const balance = payable ? inv.remainingBalance : 0
                const toggle = () => setExpanded(isOpen ? null : inv.id)
                return (
                  <Fragment key={inv.id}>
                    <tr
                      onClick={toggle}
                      className={cn(
                        'cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50/70',
                        isOpen && 'bg-[#2b4f7e]/[0.03] hover:bg-[#2b4f7e]/[0.03]',
                      )}
                    >
                      <td className="px-3 py-3.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={isOpen ? 'Collapse' : 'Expand'}
                          aria-expanded={isOpen}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggle()
                          }}
                          className="h-7 w-7 rounded-md p-1 text-gray-500 hover:bg-gray-200/70"
                        >
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2b4f7e]/10 text-[#2b4f7e]">
                            <FileText className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-semibold whitespace-nowrap text-gray-900">{inv.invoiceNumber}</p>
                            <p className="text-xs text-gray-500">Created {formatDmy(inv.createdAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="font-medium whitespace-nowrap text-gray-800">
                          {monthLabel(String(inv.startDate).slice(0, 7))}
                        </p>
                        <p className="flex items-center gap-1 text-xs whitespace-nowrap text-gray-500">
                          <CalendarDays className="h-3 w-3" />
                          {formatDmy(inv.startDate)} – {formatDmy(inv.endDate)}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusPill status={inv.status} />
                        {inv.dueDate && payable && (
                          <p className="mt-1 text-[11px] text-gray-500">Due {formatDmy(inv.dueDate)}</p>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <p className="font-bold text-gray-900 tabular-nums">{formatInr(inv.discountedAmount)}</p>
                        <p className="text-[11px] whitespace-nowrap text-gray-500">
                          {formatInr(inv.subtotal)}
                          {inv.discount ? ` − ${formatInr(inv.discount)}` : ''}
                          {inv.tax ? ` + GST ${formatInr(inv.tax)}` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        {inv.carriedForwardTo ? (
                          <>
                            <p className="font-semibold text-emerald-600 tabular-nums">
                              {formatInr(inv.carriedForwardTo.paidAmount)}
                            </p>
                            <p className="text-[11px] whitespace-nowrap text-gray-500">
                              via {inv.carriedForwardTo.invoiceNumber}
                            </p>
                            <PaidBar
                              paid={inv.carriedForwardTo.paidAmount}
                              total={inv.carriedForwardTo.amount}
                              className="mt-1 ml-auto w-24"
                            />
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-emerald-600 tabular-nums">{formatInr(inv.paidAmount)}</p>
                            <PaidBar
                              paid={inv.paidAmount}
                              total={inv.discountedAmount}
                              className="mt-1.5 ml-auto w-24"
                            />
                          </>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        {inv.carriedForwardTo ? (
                          inv.status === 'PAID' ? (
                            <span className="text-xs font-semibold whitespace-nowrap text-emerald-600">
                              Paid via {inv.carriedForwardTo.invoiceNumber}
                            </span>
                          ) : (
                            <span className="inline-flex flex-col items-end text-xs font-medium whitespace-nowrap text-purple-700">
                              <span className="inline-flex items-center gap-1">
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                Moved to {inv.carriedForwardTo.invoiceNumber}
                              </span>
                              <span className="text-[11px] font-normal text-gray-500">
                                {formatInr(inv.carriedForwardTo.amount - inv.carriedForwardTo.paidAmount)} due there
                              </span>
                            </span>
                          )
                        ) : balance > 0 ? (
                          <p className="font-bold text-rose-600 tabular-nums">{formatInr(balance)}</p>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600">Settled</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {balance > 0 && receiptsAccess.canCreate && (
                            <Button
                              size="sm"
                              className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => setPaying(inv)}
                            >
                              <CreditCard className="mr-1 h-3.5 w-3.5" />
                              Pay
                            </Button>
                          )}
                          {isEditable(inv) && invoicesAccess.canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit invoice"
                              aria-label="Edit invoice"
                              className="h-8 w-8 text-[#2b6cb0]"
                              onClick={() => onEditInvoice(inv)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Invoice PDF"
                            aria-label="Invoice PDF"
                            className="h-8 w-8"
                            disabled={opening === inv.id}
                            onClick={() =>
                              showPdf(
                                inv.id,
                                async () => inv.pdfUrl || getBillingDocumentAPI(selectedLocationId, inv.id),
                              )
                            }
                          >
                            {opening === inv.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="border-b border-gray-200 bg-[#2b4f7e]/[0.03]">
                        <td colSpan={COLUMNS.length} className="px-5 pt-1 pb-5">
                          <InvoiceDetail
                            invoice={inv}
                            opening={opening}
                            onReceiptPdf={(receiptId) =>
                              showPdf(receiptId, async () =>
                                getBillingDocumentAPI(selectedLocationId, inv.id, receiptId),
                              )
                            }
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePager page={page} totalPages={data?.pagination.totalPages ?? 1} onPage={setPage} />

      {paying && <RecordPaymentModal key={paying.id} invoice={paying} onOpenChange={(o) => !o && setPaying(null)} />}
    </div>
  )
}

/** Expanded row: the invoice's charges, its totals and the payments made on it. */
function InvoiceDetail({
  invoice: inv,
  opening,
  onReceiptPdf,
}: {
  invoice: Invoice
  opening: string | null
  onReceiptPdf: (receiptId: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {/* Charges */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <p className="border-b border-gray-100 px-4 py-2.5 text-xs font-semibold tracking-wide text-gray-600 uppercase">
            Charges ({inv.services.length})
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70 text-xs text-gray-500">
                <th className="px-4 py-2 text-left font-medium">Service</th>
                <th className="px-4 py-2 text-left font-medium">Description</th>
                <th className="px-4 py-2 text-center font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Price</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {inv.services.map((s) => (
                <tr key={s.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    {s.consumerName && (
                      <div className="mt-1">
                        <ConsumerTag type={s.consumerType} name={s.consumerName} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{s.description}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums">
                    {Number(s.quantity) === 0 ? 'N/A' : Number(s.quantity)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatInr(s.price)}</td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-medium tabular-nums',
                      s.total < 0 ? 'text-emerald-700' : 'text-gray-900',
                    )}
                  >
                    {formatInr(s.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payments */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <p className="border-b border-gray-100 px-4 py-2.5 text-xs font-semibold tracking-wide text-gray-600 uppercase">
            Payments ({inv.receipts.length})
          </p>
          {inv.receipts.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-gray-500">
              {inv.carriedForwardTo
                ? `Paid through ${inv.carriedForwardTo.invoiceNumber}: ${formatInr(inv.carriedForwardTo.paidAmount)} of ${formatInr(inv.carriedForwardTo.amount)}`
                : 'No payments recorded yet'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {inv.receipts.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <ReceiptIndianRupee className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{r.receiptNumber}</p>
                    <p className="text-xs text-gray-500">
                      {formatDmy(r.createdAt)} · {PAYMENT_METHOD_LABEL[r.paymentMethod]}
                      {r.paymentReference ? ` · Ref ${r.paymentReference}` : ''}
                    </p>
                    {r.appliedTo.some((a) => a.carried) && (
                      <p className="mt-0.5 text-[11px] text-purple-700">
                        {r.appliedTo
                          .map((a) => `${formatInr(a.amount)} to ${a.carried ? a.invoiceNumber : 'this invoice'}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600 tabular-nums">{formatInr(r.paidAmount)}</p>
                    {r.invoiceRemainingBalance !== null && (
                      <p className="text-[11px] text-gray-500">
                        Balance after{' '}
                        <span className={r.invoiceRemainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                          {formatInr(r.invoiceRemainingBalance)}
                        </span>
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Receipt PDF"
                    aria-label="Receipt PDF"
                    className="h-8 w-8"
                    disabled={opening === r.id}
                    onClick={() => onReceiptPdf(r.id)}
                  >
                    {opening === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {inv.notes && <p className="text-xs text-gray-500">Notes: {inv.notes}</p>}
      </div>

      {/* Totals */}
      <div className="h-fit space-y-1.5 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <p className="mb-2 text-xs font-semibold tracking-wide text-gray-600 uppercase">Summary</p>
        <Row label="Subtotal" value={formatInr(inv.subtotal)} />
        {inv.discount !== 0 && (
          <Row
            label={`Discount${inv.discountReason ? ` (${inv.discountReason})` : ''}`}
            value={`− ${formatInr(inv.discount)}`}
            className="text-emerald-700"
          />
        )}
        {inv.gst && (
          <>
            <Row label={`CGST @ ${inv.gst.cgstRate}%`} value={formatInr(inv.gst.cgst)} className="text-gray-600" />
            <Row label={`SGST @ ${inv.gst.sgstRate}%`} value={formatInr(inv.gst.sgst)} className="text-gray-600" />
          </>
        )}
        {inv.carriedForwardAmount !== 0 && (
          <Row
            label="Previous balance carried forward"
            value={formatInr(inv.carriedForwardAmount)}
            className="text-purple-700"
          />
        )}
        <Row
          label="Total"
          value={formatInr(inv.discountedAmount)}
          className="border-t border-gray-100 pt-2 text-base font-bold text-gray-900"
        />
        {inv.carriedForwardTo ? (
          <>
            <Row
              label={`Paid via ${inv.carriedForwardTo.invoiceNumber}`}
              value={formatInr(inv.carriedForwardTo.paidAmount)}
              className="font-semibold text-emerald-600"
            />
            <PaidBar paid={inv.carriedForwardTo.paidAmount} total={inv.carriedForwardTo.amount} className="my-1" />
          </>
        ) : (
          <>
            <Row label="Paid" value={formatInr(inv.paidAmount)} className="font-semibold text-emerald-600" />
            <PaidBar paid={inv.paidAmount} total={inv.discountedAmount} className="my-1" />
          </>
        )}
        {inv.carriedForwardTo ? (
          <p
            className={cn(
              'rounded-md px-2.5 py-2 text-xs',
              inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-800' : 'bg-purple-50 text-purple-800',
            )}
          >
            {formatInr(inv.carriedForwardTo.amount)} was moved to {inv.carriedForwardTo.invoiceNumber}.{' '}
            {inv.status === 'PAID'
              ? 'It has been paid in full there.'
              : `${formatInr(inv.carriedForwardTo.paidAmount)} paid there so far.`}
          </p>
        ) : (
          <Row
            label="Balance"
            value={inv.remainingBalance > 0 ? formatInr(inv.remainingBalance) : 'Settled'}
            className={cn('font-bold', inv.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600')}
          />
        )}
      </div>
    </div>
  )
}

const Row = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div className={cn('flex justify-between gap-3', className)}>
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
)
