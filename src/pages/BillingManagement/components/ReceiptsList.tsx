import { useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  ReceiptIndianRupee,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { apiErrorMessage, useUnitReceipts } from '@/hooks/react-query/billing'
import { useLocationContext } from '@/hooks/useLocation'
import { getBillingDocumentAPI } from '@/lib/services/billingService'
import type { ReceiptListItem } from '@/lib/types/billing'
import { cn } from '@/lib/utils'
import { PaidBar, StatusPill, TablePager } from './billingUi'
import { formatDmy, formatInr, monthLabel, openPdf, PAYMENT_METHOD_LABEL } from './billingFormat'

/** A flat rarely has more payments than this; they are all loaded and grouped by invoice. */
const RECEIPT_LIMIT = 200
const GROUPS_PER_PAGE = 10

interface GroupEntry {
  receipt: ReceiptListItem
  /** What this receipt paid towards the group's invoice. */
  amount: number
  /** Set when the money came through a newer invoice this one was carried into. */
  via: string | null
}

interface InvoiceGroup {
  invoiceId: string
  invoiceNumber: string | null
  startDate: string | null
  endDate: string | null
  status: ReceiptListItem['status']
  /** Null for a carried invoice (its balance is billed on the newer invoice). */
  total: number | null
  paid: number
  remaining: number
  carriedInto: string | null
  entries: GroupEntry[]
}

/** Receipts grouped under their invoice: one accordion row per invoice, opening to its payments. */
export function ReceiptsList({ unitId }: { unitId: string }) {
  const { selectedLocationId } = useLocationContext()
  const { data, isLoading } = useUnitReceipts(unitId, 1, RECEIPT_LIMIT)
  const [page, setPage] = useState(1)
  // null = default (the latest invoice open); otherwise the ids the user has open.
  const [openIds, setOpenIds] = useState<Set<string> | null>(null)
  const [opening, setOpening] = useState<string | null>(null)

  const groups = useMemo(() => {
    const byInvoice = new Map<string, InvoiceGroup>()
    // Receipts arrive newest first, so the first one seen per invoice holds its latest balance.
    for (const r of data?.receipts ?? []) {
      let g = byInvoice.get(r.invoiceId)
      if (!g) {
        g = {
          invoiceId: r.invoiceId,
          invoiceNumber: r.invoiceNumber,
          startDate: r.startDate,
          endDate: r.endDate,
          status: r.status,
          total: Number(r.invoiceTotal ?? r.discountedAmount ?? 0),
          paid: Number(r.invoicePaidAmount ?? 0),
          remaining: Number(r.invoiceRemainingBalance ?? 0),
          carriedInto: null,
          entries: [],
        }
        byInvoice.set(r.invoiceId, g)
      }
      g.entries.push({ receipt: r, amount: r.paidAmount, via: null })

      // The part of this payment that settled older invoices carried into this one.
      for (const a of r.appliedTo.filter((x) => x.carried)) {
        let c = byInvoice.get(a.invoiceId)
        if (!c) {
          c = {
            invoiceId: a.invoiceId,
            invoiceNumber: a.invoiceNumber,
            startDate: a.startDate,
            endDate: a.endDate,
            status: a.status,
            total: null,
            paid: 0,
            remaining: 0,
            carriedInto: r.invoiceNumber,
            entries: [],
          }
          byInvoice.set(a.invoiceId, c)
        }
        c.paid += a.amount
        c.entries.push({ receipt: r, amount: a.amount, via: r.invoiceNumber })
      }
    }
    return [...byInvoice.values()].sort((x, y) => String(y.startDate ?? '').localeCompare(String(x.startDate ?? '')))
  }, [data])

  const receiptCount = data?.receipts.length ?? 0
  const totalPages = Math.max(1, Math.ceil(groups.length / GROUPS_PER_PAGE))
  const visible = groups.slice((page - 1) * GROUPS_PER_PAGE, page * GROUPS_PER_PAGE)
  const isOpen = (id: string) => (openIds ? openIds.has(id) : id === groups[0]?.invoiceId)
  const toggle = (id: string) => {
    const next = new Set(openIds ?? (groups[0] ? [groups[0].invoiceId] : []))
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpenIds(next)
  }

  const showPdf = (receiptId: string, invoiceId: string) => {
    setOpening(receiptId)
    openPdf(() => getBillingDocumentAPI(selectedLocationId, invoiceId, receiptId))
      .catch((e) => toast.error(apiErrorMessage(e, 'Could not open the receipt')))
      .finally(() => setOpening(null))
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xl font-bold text-gray-900">All Receipts</h3>
        <p className="text-sm text-gray-500">
          {receiptCount} receipt{receiptCount === 1 ? '' : 's'} across {groups.length} invoice
          {groups.length === 1 ? '' : 's'}
        </p>
      </div>

      {isLoading ? (
        <Card className="gap-0 rounded-xl border-gray-200 bg-white py-12">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#2b4f7e]" />
        </Card>
      ) : groups.length === 0 ? (
        <Card className="gap-0 rounded-xl border-gray-200 bg-white py-14 text-center text-gray-500">
          <ReceiptIndianRupee className="mx-auto mb-2 h-10 w-10 text-gray-300" />
          No payments recorded yet
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((g) => {
            const open = isOpen(g.invoiceId)
            return (
              <Card
                key={g.invoiceId}
                className={cn(
                  'gap-0 overflow-hidden rounded-xl border bg-white shadow-2xs transition-colors',
                  open ? 'border-[#2b4f7e]/30' : 'border-gray-200',
                )}
              >
                {/* Invoice header */}
                <Button
                  type="button"
                  variant="ghost"
                  aria-expanded={open}
                  onClick={() => toggle(g.invoiceId)}
                  className={cn(
                    'h-auto rounded-none grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-gray-50/70 md:grid-cols-[auto_1.4fr_1fr_1.3fr_auto] whitespace-normal font-normal',
                    open && 'bg-[#2b4f7e]/[0.03] hover:bg-[#2b4f7e]/[0.03]',
                  )}
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2b4f7e]/10 text-[#2b4f7e]">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{g.invoiceNumber ?? 'Invoice'}</p>
                      <p className="flex items-center gap-1 text-xs whitespace-nowrap text-gray-500">
                        <CalendarDays className="h-3 w-3" />
                        {g.startDate ? monthLabel(String(g.startDate).slice(0, 7)) : ''} · {formatDmy(g.startDate)} –{' '}
                        {formatDmy(g.endDate)}
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:block">{g.status && <StatusPill status={g.status} />}</div>
                  <div className="hidden md:block">
                    {g.total === null ? (
                      <span className="text-xs text-gray-500">
                        Paid <b className="text-sm text-emerald-600 tabular-nums">{formatInr(g.paid)}</b> through{' '}
                        <span className="font-medium text-purple-700">{g.carriedInto}</span>
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-gray-500">
                          Paid <b className="text-sm text-emerald-600 tabular-nums">{formatInr(g.paid)}</b> of{' '}
                          <span className="tabular-nums">{formatInr(g.total)}</span>
                        </span>
                        <PaidBar paid={g.paid} total={g.total} className="mt-1.5" />
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] tracking-wide text-gray-500 uppercase">Balance</p>
                    {g.total === null && g.status !== 'PAID' ? (
                      <p className="text-xs font-semibold text-purple-700">On {g.carriedInto}</p>
                    ) : g.remaining > 0 ? (
                      <p className="font-bold text-rose-600 tabular-nums">{formatInr(g.remaining)}</p>
                    ) : (
                      <p className="font-bold text-emerald-600">Settled</p>
                    )}
                  </div>
                </Button>

                {/* Payments on this invoice */}
                {open && (
                  <div className="border-t border-gray-100">
                    <div className="overflow-hidden">
                      <Table className="w-full min-w-[820px] text-sm">
                        <TableHeader>
                          <TableRow className="bg-gray-50/70 text-[11px] tracking-wide text-gray-500 uppercase">
                            <TableHead className="px-4 py-2 text-left font-medium">Receipt</TableHead>
                            <TableHead className="px-4 py-2 text-left font-medium">Method</TableHead>
                            <TableHead className="px-4 py-2 text-left font-medium">Received By</TableHead>
                            <TableHead className="px-4 py-2 text-right font-medium">Paid Earlier</TableHead>
                            <TableHead className="px-4 py-2 text-right font-medium">Amount Paid</TableHead>
                            <TableHead className="px-4 py-2 text-right font-medium">Balance After</TableHead>
                            <TableHead className="px-4 py-2 text-right font-medium">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {g.entries.map(({ receipt: r, amount, via }) => {
                            const after = Number(r.invoiceRemainingBalance ?? 0)
                            const split = !via && r.appliedTo.some((a) => a.carried)
                            return (
                              <TableRow key={r.id} className="border-t border-gray-100 align-middle">
                                <TableCell className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                      <ReceiptIndianRupee className="h-4 w-4" />
                                    </span>
                                    <div>
                                      <p className="font-semibold whitespace-nowrap text-gray-900">{r.receiptNumber}</p>
                                      <p className="text-xs text-gray-500">
                                        {formatDmy(r.receiptCreatedAt)}
                                        {via && <span className="text-purple-700"> · paid on {via}</span>}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-3 text-gray-700">
                                  {PAYMENT_METHOD_LABEL[r.paymentMethod]}
                                  {r.paymentReference && (
                                    <p className="max-w-[180px] truncate text-xs text-gray-500">
                                      Ref {r.paymentReference}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className="px-4 py-3 text-gray-700">
                                  {r.handedOverTo ? (
                                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                                      <UserRound className="h-3.5 w-3.5 text-gray-400" />
                                      {`${r.handedOverTo.firstName} ${r.handedOverTo.lastName}`.trim()}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="px-4 py-3 text-right text-gray-600 tabular-nums">
                                  {via ? '—' : formatInr(r.paidBefore ?? 0)}
                                </TableCell>
                                <TableCell className="px-4 py-3 text-right tabular-nums">
                                  <p className="font-bold text-emerald-600">{formatInr(amount)}</p>
                                  {via && <p className="text-[11px] text-gray-500">of {formatInr(r.paidAmount)}</p>}
                                  {split && (
                                    <p className="text-[11px] whitespace-nowrap text-purple-700">
                                      {r.appliedTo
                                        .filter((a) => a.carried)
                                        .map((a) => `${formatInr(a.amount)} to ${a.invoiceNumber}`)
                                        .join(' · ')}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    'px-4 py-3 text-right font-semibold tabular-nums',
                                    via ? 'text-gray-400' : after > 0 ? 'text-rose-600' : 'text-emerald-600',
                                  )}
                                >
                                  {via ? '—' : formatInr(after)}
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-1">
                                    {r.imageUrl && (
                                      <a
                                        href={r.imageUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label="Payment proof"
                                        title="Payment proof"
                                        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
                                      >
                                        <ImageIcon className="h-4 w-4" />
                                      </a>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Receipt PDF"
                                      aria-label="Receipt PDF"
                                      className="h-8 w-8"
                                      disabled={opening === r.id}
                                      onClick={() => showPdf(r.id, r.invoiceId)}
                                    >
                                      {opening === r.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Download className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {g.entries.some((e) => e.receipt.notes) && (
                      <div className="space-y-0.5 border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
                        {g.entries
                          .map((e) => e.receipt)
                          .filter((r) => r.notes)
                          .map((r) => (
                            <p key={r.id}>
                              <b className="text-gray-600">{r.receiptNumber}:</b> {r.notes}
                            </p>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {totalPages > 1 && <TablePager page={page} totalPages={totalPages} onPage={setPage} />}
    </div>
  )
}
