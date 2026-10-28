import { useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { CalendarDays, FileText, IndianRupee, ReceiptIndianRupee } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDebounce } from '@/hooks/useDebounce'
import { useBillingUnits } from '@/hooks/react-query/billing'
import { useResourceAccess } from '@/hooks/useResourceAccess'
import { RESOURCE } from '@/lib/permissions/resourceKeys'
import type { BillingUnit, MonthBillingStatus } from '@/lib/types/billing'
import { cn } from '@/lib/utils'
import { MonthStatusBadge } from './components/billingUi'
import {
  MONTH_STATUS_META,
  formatDay,
  formatInr,
  monthLabel,
  monthRange,
  toDayString,
} from './components/billingFormat'

const PAGE_SIZE = 20

const OPEN_STATUSES = new Set(['PENDING', 'PARTIALLY_PAID', 'OVERDUE'])

/** Earliest due date among a month's invoices that still owe money. */
const openDueDate = (invoices: BillingUnit['month']['invoices']) =>
  invoices
    .filter((i) => i.dueDate && OPEN_STATUSES.has(i.status))
    .map((i) => i.dueDate as string)
    .sort()[0] ?? null

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
/** Months from the first move-in in this property up to the current month; grouped by year, newest first. */
const monthOptions = (earliestMonth: string | undefined) => {
  const now = currentMonth()
  const from = earliestMonth && earliestMonth < now ? earliestMonth : now
  const byYear = new Map<string, string[]>()
  for (const m of monthRange(from, now)) {
    const y = m.slice(0, 4)
    byYear.set(y, [...(byYear.get(y) ?? []), m])
  }
  return [...byYear.entries()]
}

/** Status filters, in the order staff work through them. */
const FILTERS: MonthBillingStatus[] = [
  'NOT_BILLED',
  'PENDING',
  'PARTIALLY_PAID',
  'OVERDUE',
  'PAID',
  'CARRIED_FORWARD',
  'NOT_MOVED_IN',
  'MOVED_OUT',
]

/** Billing home: for a chosen month, which flats are billed, paid, or still to do. */
export default function BillingFlatsPage() {
  const navigate = useNavigate()
  const access = useResourceAccess(RESOURCE.BILLING_INVOICES)
  const receipts = useResourceAccess(RESOURCE.BILLING_RECEIPTS)
  const [month, setMonth] = useState(currentMonth)
  const [status, setStatus] = useState<MonthBillingStatus | undefined>()
  const [search, setSearch] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading, error, refetch } = useBillingUnits({
    search: debouncedSearch,
    page: pageIndex + 1,
    limit: PAGE_SIZE,
    month,
    ...(status ? { status } : {}),
  })
  const counts = data?.summary.counts
  const total = counts ? Object.values(counts).reduce((s, n) => s + n, 0) : 0
  const monthGroups = useMemo(() => monthOptions(data?.earliestMonth), [data?.earliestMonth])

  const openFlat = (unit: BillingUnit, tab: 'generate' | 'invoices') =>
    navigate(`/admin/billing-management/invoice/${unit.id}?month=${month}&tab=${tab}`)

  const columns = useMemo<ColumnDef<BillingUnit>[]>(
    () => [
      {
        accessorKey: 'unitNumber',
        header: 'Flat',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-gray-900">{row.original.unitNumber}</p>
            <p className="text-xs text-gray-500">
              {[row.original.blockName, row.original.floorNumber !== null ? `Floor ${row.original.floorNumber}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        ),
      },
      {
        id: 'residents',
        header: 'Residents',
        cell: ({ row }) => {
          const tenantOccupied = row.original.residents.some((r) => r.residentType === 'TENANT' && r.isResiding)
          return (
            <div className="space-y-1.5">
              <span
                className={cn(
                  'inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                  tenantOccupied ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800',
                )}
              >
                {tenantOccupied ? 'Tenant-occupied' : 'Owner-occupied'}
              </span>
              {row.original.residents.map((r) => (
                <div
                  key={r.id}
                  className={cn('flex items-center gap-2 text-sm', !r.isResiding && 'text-gray-400 line-through')}
                  title={r.isResiding ? undefined : 'Moved out'}
                >
                  <span className="font-medium text-gray-900">{r.name}</span>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                      r.residentType === 'TENANT'
                        ? 'border-purple-200 bg-purple-50 text-purple-700'
                        : 'border-sky-200 bg-sky-50 text-sky-700',
                    )}
                  >
                    {r.residentType === 'TENANT' ? 'Tenant' : 'Owner'}
                  </span>
                </div>
              ))}
              {row.original.movedInDate && (
                <p className="text-[11px] text-gray-400">Moved in {formatDay(row.original.movedInDate)}</p>
              )}
            </div>
          )
        },
      },
      {
        id: 'status',
        header: `${monthLabel(month)} invoice`,
        cell: ({ row }) => {
          const m = row.original.month
          return (
            <div className="space-y-1">
              <MonthStatusBadge status={m.status} />
              {m.invoices.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-gray-500">
                  {m.invoices.map((i) => (
                    <span key={i.id} className="inline-flex flex-wrap items-center gap-1.5">
                      {i.invoiceNumber}
                      <span className="text-gray-400">
                        · {formatDay(i.startDate)} – {formatDay(i.endDate)}
                      </span>
                      {/* Raised on the flat this household moved out of; it is owed here now. */}
                      {i.fromUnitNumber && (
                        <span className="rounded-full border border-orange-200 bg-orange-50 px-1.5 py-px text-[10px] font-semibold text-orange-700">
                          From old flat {i.fromUnitNumber}
                        </span>
                      )}
                    </span>
                  ))}
                  {m.partlyBilled && <span className="text-amber-600">· part of month only</span>}
                </div>
              )}
              {m.status === 'NOT_MOVED_IN' && row.original.movedInDate && (
                <p className="text-[11px] text-gray-400">From {monthLabel(row.original.movedInDate.slice(0, 7))}</p>
              )}
            </div>
          )
        },
      },
      {
        id: 'amounts',
        header: () => <div className="text-right">Due</div>,
        cell: ({ row }) => {
          const m = row.original.month
          if (!m.invoices.length) return <div className="text-right text-gray-300">—</div>
          // The earliest due date among this month's still-unpaid invoices.
          const dueBy = m.balance > 0 ? openDueDate(m.invoices) : null
          const overdue = !!dueBy && dueBy < toDayString(new Date())
          return (
            <div className="text-right">
              <p
                className={cn('text-sm tabular-nums', m.balance > 0 ? 'font-semibold text-amber-700' : 'text-gray-400')}
              >
                {formatInr(m.balance)}
              </p>
              {dueBy ? (
                <p className={cn('text-[11px]', overdue ? 'font-semibold text-rose-600' : 'text-gray-400')}>
                  {overdue ? `Overdue since ${formatDay(dueBy)}` : `by ${formatDay(dueBy)}`}
                </p>
              ) : (
                m.balance <= 0 && <p className="text-[11px] text-emerald-600">Settled</p>
              )}
            </div>
          )
        },
      },
      {
        id: 'outstanding',
        header: () => <div className="text-right">Total outstanding</div>,
        cell: ({ row }) => {
          const { outstanding, month: m } = row.original
          if (outstanding <= 0) return <div className="text-right text-sm text-gray-300">—</div>
          // Older months still unpaid, on top of this month's due.
          const older = Math.round((outstanding - m.balance) * 100) / 100
          return (
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-rose-700">{formatInr(outstanding)}</p>
              <p className="text-[11px] text-gray-400">
                {older > 0 ? `incl. ${formatInr(older)} from earlier bills` : 'all months'}
              </p>
            </div>
          )
        },
      },
      {
        id: 'billedUntil',
        header: 'Billed until',
        cell: ({ row }) => {
          const until = row.original.lastBilledUntil
          return until ? (
            <div>
              <p className="text-sm whitespace-nowrap text-gray-800">{formatDay(until)}</p>
              <p className="text-[11px] text-gray-400">last invoiced day</p>
            </div>
          ) : (
            <p className="text-[11px] text-gray-400">Never billed</p>
          )
        },
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) => {
          const m = row.original.month
          // The row itself is clickable too; keep the button's click from also opening the row.
          const go = (e: MouseEvent, tab: 'generate' | 'invoices') => {
            e.stopPropagation()
            openFlat(row.original, tab)
          }
          if (m.status === 'NOT_BILLED' && access.canCreate) {
            return (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="bg-[#2a517c] text-white hover:bg-[#476587]"
                  onClick={(e) => go(e, 'generate')}
                >
                  <FileText className="mr-1 h-4 w-4" />
                  Generate invoice
                </Button>
              </div>
            )
          }
          if (m.balance > 0 && receipts.canCreate) {
            return (
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={(e) => go(e, 'invoices')}>
                  <IndianRupee className="mr-1 h-4 w-4" />
                  Record payment
                </Button>
              </div>
            )
          }
          if (m.invoices.length) {
            return (
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={(e) => go(e, 'invoices')}>
                  View
                </Button>
              </div>
            )
          }
          return null
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, access.canCreate, receipts.canCreate],
  )

  const summaryTiles = [
    { label: 'Billed this month', value: data?.summary.billed ?? 0, className: 'text-gray-900' },
    { label: 'Collected', value: data?.summary.collected ?? 0, className: 'text-emerald-700' },
    { label: 'Still due', value: data?.summary.outstanding ?? 0, className: 'text-amber-700' },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ReceiptIndianRupee}
        title="Billing"
        description="Pick a month to see which flats have been billed and paid. Click a flat to generate or manage its invoices."
        actions={
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gray-500" />
            <Select
              value={month}
              onValueChange={(v) => {
                setMonth(String(v))
                setPageIndex(0)
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue>{monthLabel(month)}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {monthGroups.map(([year, months]) => (
                  <SelectGroup key={year}>
                    {monthGroups.length > 1 && <SelectLabel>{year}</SelectLabel>}
                    {months.map((m) => (
                      <SelectItem key={m} value={m}>
                        {monthLabel(m)}
                        {m === currentMonth() ? ' (this month)' : ''}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Money for the month */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {summaryTiles.map((t) => (
          <Card key={t.label} className="gap-0 rounded-2xl border-gray-100 bg-white p-4 shadow-2xs">
            <CardHeader className="p-0">
              <CardDescription className="text-xs font-medium text-gray-500">{t.label}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <CardTitle className={cn('mt-1 text-2xl font-bold', t.className)}>{formatInr(t.value)}</CardTitle>
              <p className="text-[11px] text-gray-400">{monthLabel(month)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status filters with counts */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="All flats"
          count={total}
          active={!status}
          onClick={() => {
            setStatus(undefined)
            setPageIndex(0)
          }}
        />
        {FILTERS.filter((f) => (counts?.[f] ?? 0) > 0 || f === 'NOT_BILLED').map((f) => (
          <FilterChip
            key={f}
            label={MONTH_STATUS_META[f].label}
            hint={MONTH_STATUS_META[f].hint}
            dotClassName={MONTH_STATUS_META[f].dotClassName}
            count={counts?.[f] ?? 0}
            active={status === f}
            onClick={() => {
              setStatus(status === f ? undefined : f)
              setPageIndex(0)
            }}
          />
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data?.units ?? []}
        isLoading={isLoading}
        error={error ? 'Could not load flats' : undefined}
        onRetry={() => refetch()}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPageIndex(0)
        }}
        searchPlaceholder="Search flat or resident..."
        manualPagination
        pageSize={PAGE_SIZE}
        pageIndex={pageIndex}
        pageCount={data?.pagination.totalPages ?? 1}
        totalCount={data?.pagination.total ?? 0}
        onPageChange={setPageIndex}
        getRowId={(row) => row.id}
        onRowClick={(row) => openFlat(row, row.month.status === 'NOT_BILLED' ? 'generate' : 'invoices')}
      />
    </div>
  )
}

function FilterChip({
  label,
  hint,
  count,
  active,
  dotClassName,
  onClick,
}: {
  label: string
  hint?: string
  count: number
  active: boolean
  dotClassName?: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      title={hint}
      onClick={onClick}
      className={cn(
        'h-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
        active
          ? 'border-[#2a517c] bg-[#2a517c] text-white hover:bg-[#2a517c] hover:text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
      )}
    >
      {dotClassName && <span className={cn('h-2 w-2 rounded-full', dotClassName)} />}
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 text-xs font-semibold',
          active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600',
        )}
      >
        {count}
      </span>
    </Button>
  )
}
