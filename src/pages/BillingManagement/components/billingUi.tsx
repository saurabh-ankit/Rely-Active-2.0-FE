import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import type { InvoiceStatus, MonthBillingStatus } from '@/lib/types/billing'
import { MONTH_STATUS_META } from './billingFormat'

const STATUS_STYLE: Record<InvoiceStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  PENDING: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  PARTIALLY_PAID: { label: 'Partially Paid', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  PAID: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  OVERDUE: { label: 'Overdue', className: 'bg-red-50 text-red-700 border-red-200' },
  CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500 border-gray-200' },
  OBSOLETE: { label: 'Obsolete (carried forward)', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  CARRY_FORWARDED: { label: 'Carried Forward', className: 'bg-purple-50 text-purple-700 border-purple-200' },
}

export const InvoiceStatusBadge = ({ status, className }: { status: InvoiceStatus; className?: string }) => {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING
  return (
    <Badge variant="outline" className={cn('rounded-full text-xs font-medium', style.className, className)}>
      {style.label}
    </Badge>
  )
}

export const MonthStatusBadge = ({ status }: { status: MonthBillingStatus }) => {
  const meta = MONTH_STATUS_META[status]
  return (
    <Badge
      variant="outline"
      title={meta.hint}
      className={cn('gap-1.5 rounded-full text-xs font-medium', meta.className)}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dotClassName)} />
      {meta.label}
    </Badge>
  )
}

/** "Resident · Shyamal Jha" or "Family member · Radha Jha (Spouse)": who used a charge. */
export const ConsumerTag = ({ type, name }: { type: 'RESIDENT' | 'FAMILY_MEMBER' | null; name: string | null }) => {
  if (!name) return null
  const family = type === 'FAMILY_MEMBER'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
        family ? 'border-purple-200 bg-purple-50 text-purple-800' : 'border-sky-200 bg-sky-50 text-sky-800',
      )}
    >
      <span className="font-semibold">{family ? 'Family member' : 'Resident'}</span>
      <span className="opacity-60">·</span>
      {name}
    </span>
  )
}

const PILL: Partial<Record<InvoiceStatus, string>> = {
  PENDING: 'border-amber-300 bg-amber-50 text-amber-700',
  PARTIALLY_PAID: 'border-blue-300 bg-blue-50 text-blue-700',
  PAID: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  OVERDUE: 'border-red-300 bg-red-50 text-red-700',
  CARRY_FORWARDED: 'border-purple-300 bg-purple-50 text-purple-700',
  OBSOLETE: 'border-gray-300 bg-gray-100 text-gray-600',
}

/** Uppercase status pill, as in Assist's invoice tables. */
/** Paid share of an invoice: green for paid, grey for what is left. */
export const PaidBar = ({ paid, total, className }: { paid: number; total: number; className?: string }) => {
  const pct = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-gray-200', className)}>
      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

export const StatusPill = ({ status }: { status: InvoiceStatus }) => (
  <span
    className={cn(
      'inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
      PILL[status] ?? 'border-gray-300 bg-gray-50 text-gray-600',
    )}
  >
    {status.replace('_', ' ')}
  </span>
)

/** "Page 1 of 3" with first / previous / next / last arrows. */
export const TablePager = ({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
}) => {
  return (
    <div className="flex items-center justify-between px-1 pt-4 text-sm text-gray-700">
      <span>
        Page <b>{page}</b> of <b>{Math.max(1, totalPages)}</b>
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="First page"
          className="h-7 w-7 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          disabled={page <= 1}
          onClick={() => onPage(1)}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Previous page"
          className="h-7 w-7 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Next page"
          className="h-7 w-7 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Last page"
          className="h-7 w-7 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          disabled={page >= totalPages}
          onClick={() => onPage(totalPages)}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
