import React, { useState } from 'react'
import { differenceInCalendarDays, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'
import {
  Ban,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  FlaskConical,
  HeartPulse,
  Info,
  LogIn,
  LogOut,
  Pill,
  ShieldCheck,
  Timer,
  Truck,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEmployeeActivityRecords } from '@/hooks/react-query/user'
import { Panel } from '@/components/common/DetailPanel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type {
  CareActivityStats,
  DoctorActivityStats,
  EmployeeActivityStats,
  FnbActivityRecord,
  FnbActivityStats,
  GateActivityRecord,
  GateActivityStats,
  MedicalActivityRecord,
  TicketActivityRecord,
  TicketActivityStats,
} from '@/lib/types/employeeActivity'
import { GatePassesTable } from './GatePassesTable'
import { EmptyState, FilterChips, LoadingState, Pager, PriorityTag, StatTile, StatusPill } from './shared'
import { ACTIVITY_META, formatDuration, formatWhen, humanize, type ActiveKind, type DateRange } from './utils'

const PAGE_SIZE = 10

// ── Summary tiles ───────────────────────────────────────────────────────────

const ActivityStats = ({ kind, stats }: { kind: ActiveKind; stats: EmployeeActivityStats }) => {
  let tiles: React.ReactNode
  switch (kind) {
    case 'tickets': {
      const s = stats as TicketActivityStats
      tiles = (
        <>
          <StatTile
            icon={Clock}
            label="In progress"
            value={s.inProgress}
            hint={s.notStarted > 0 ? `${s.notStarted} not started yet` : 'Assigned, started or on hold'}
            tone="amber"
          />
          <StatTile icon={ClipboardList} label="Completed" value={s.completed} hint="Awaiting admin verification" />
          <StatTile
            icon={CheckCircle2}
            label="Verified & closed"
            value={s.closed}
            hint="Closed in the selected dates"
            tone="green"
          />
          <StatTile
            icon={Timer}
            label="Avg. time to resolve"
            value={formatDuration(s.avgResolutionHours)}
            hint="From start of work to completion"
            tone="slate"
          />
        </>
      )
      break
    }
    case 'gate': {
      const s = stats as GateActivityStats
      const topType = Object.entries(s.byVisitorType).sort((a, b) => b[1] - a[1])[0]
      tiles = (
        <>
          <StatTile icon={LogIn} label="Visitors checked in" value={s.checkIns} hint="Let in at the gate" />
          <StatTile icon={LogOut} label="Visitors checked out" value={s.checkOuts} tone="green" />
          <StatTile
            icon={ShieldCheck}
            label="Passes raised"
            value={s.raised}
            hint={`${s.approved} approved · ${s.rejected} rejected by Self`}
            tone="amber"
          />
          <StatTile
            icon={Users}
            label="Most common visitor"
            value={topType ? topType[0] : '—'}
            hint={topType ? `${topType[1]} check-ins` : undefined}
            tone="slate"
          />
        </>
      )
      break
    }
    case 'fnb': {
      const s = stats as FnbActivityStats
      tiles = (
        <>
          <StatTile icon={Truck} label="Deliveries assigned" value={s.total} />
          <StatTile icon={CheckCircle2} label="Delivered" value={s.delivered} tone="green" />
          <StatTile icon={Clock} label="Pending" value={s.pending} tone="amber" />
          <StatTile icon={XCircle} label="Failed" value={s.failed} tone="rose" />
        </>
      )
      break
    }
    case 'medical-care': {
      const s = stats as CareActivityStats
      tiles = (
        <>
          <StatTile icon={CheckCircle2} label="Tasks completed" value={s.completed} tone="green" />
          <StatTile icon={Users} label="Residents served" value={s.residentsServed} />
          <StatTile icon={HeartPulse} label="Active assignments" value={s.activeAssignments} tone="slate" />
          <StatTile icon={Ban} label="Cancelled" value={s.cancelled} tone="rose" />
        </>
      )
      break
    }
    case 'medical-doctor': {
      const s = stats as DoctorActivityStats
      tiles = (
        <>
          <StatTile
            icon={CalendarCheck}
            label="Consultations attended"
            value={s.attended}
            hint={`${s.appointments} booked · ${s.upcoming} upcoming`}
            tone="green"
          />
          <StatTile icon={XCircle} label="Cancelled / no-show" value={s.missed} tone="rose" />
          <StatTile icon={FlaskConical} label="Lab reports" value={s.labReports} />
          <StatTile icon={Pill} label="Medications prescribed" value={s.medications} tone="slate" />
        </>
      )
      break
    }
  }
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{tiles}</div>
}

/** Counts shown on the filter chips, keyed by filter value ('' = All). */
const filterCounts = (kind: ActiveKind, stats: EmployeeActivityStats | null): Record<string, number> => {
  if (!stats) return {}
  switch (kind) {
    case 'tickets': {
      const s = stats as TicketActivityStats
      return {
        '': s.total,
        in_progress: s.inProgress,
        completed: s.completed,
        closed: s.closed + s.cancelled,
      }
    }
    case 'fnb': {
      const s = stats as FnbActivityStats
      return { '': s.total, delivered: s.delivered, failed: s.failed }
    }
    case 'medical-care': {
      const s = stats as CareActivityStats
      return { '': s.completed + s.cancelled, COMPLETED: s.completed, CANCELLED: s.cancelled }
    }
    case 'medical-doctor': {
      const s = stats as DoctorActivityStats
      return { '': s.appointments, ATTENDED: s.attended }
    }
    default:
      return {}
  }
}

// ── Tickets table ───────────────────────────────────────────────────────────

const parse = (value?: string | null) => {
  if (!value) return null
  const date = parseISO(value)
  return isValid(date) ? date : null
}

/** "Took 36 min" for finished work, "Open for 27 days" (amber once it's been a few days) for current work. */
const TicketTiming = ({ r }: { r: TicketActivityRecord }) => {
  if (r.status === 'CANCELLED') {
    return (
      <div>
        <p className="text-sm text-gray-400">—</p>
        <p className="text-[11px] text-gray-500">Cancelled {formatWhen(r.cancelledAt, 'dd MMM')}</p>
      </div>
    )
  }
  if (r.status === 'COMPLETED' || r.status === 'CLOSED') {
    return (
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {r.resolutionHours != null ? formatDuration(r.resolutionHours) : '—'}
        </p>
        <p className="text-[11px] text-gray-500">
          {r.status === 'CLOSED'
            ? `Verified ${formatWhen(r.verifiedAt ?? r.completedAt, 'dd MMM')}`
            : `Completed ${formatWhen(r.completedAt, 'dd MMM')}`}
        </p>
      </div>
    )
  }
  const since = parse(r.workStartedAt) ?? parse(r.createdAt)
  const days = since ? differenceInCalendarDays(new Date(), since) : 0
  return (
    <div>
      <p className={cn('text-sm font-semibold', days >= 3 ? 'text-amber-600' : 'text-gray-900 dark:text-white')}>
        {since ? `Open ${formatDistanceToNowStrict(since)}` : '—'}
      </p>
      <p className="text-[11px] text-gray-500">
        {r.notStarted
          ? 'Not started yet'
          : r.workStartedAt
            ? `Started ${formatWhen(r.workStartedAt, 'dd MMM')}`
            : 'Work in progress'}
      </p>
    </div>
  )
}

const TicketsTable = ({ rows }: { rows: TicketActivityRecord[] }) => {
  const raised = (r: TicketActivityRecord) => {
    const date = parse(r.createdAt)
    return (
      <div>
        <p className="text-sm text-gray-900 dark:text-white">{formatWhen(r.createdAt, 'dd MMM yyyy')}</p>
        <p className="text-[11px] text-gray-500">{date ? `${formatDistanceToNowStrict(date)} ago` : ''}</p>
      </div>
    )
  }
  const resident = (r: TicketActivityRecord) =>
    r.residentName || r.unitNumber ? (
      <div>
        <p className="text-sm text-gray-900 dark:text-white">{r.residentName ?? '—'}</p>
        {r.unitNumber && <p className="text-[11px] text-gray-500">Unit {r.unitNumber}</p>}
      </div>
    ) : (
      <span className="text-xs text-gray-400">Common area</span>
    )
  // Opens the ticket on the Tickets page, on whichever tab it currently sits.
  const ticket = (r: TicketActivityRecord) => (
    <Link to={`/admin/tickets?ticketId=${r.id}`} title="Open ticket" className="group block min-w-0">
      <p className="inline-flex items-center gap-1 font-mono text-[11px] text-[#005390]">
        {r.ticketNumber}
        <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </p>
      <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-[#005390] group-hover:underline dark:text-white">
        {r.title}
      </p>
      {r.category && <p className="truncate text-[11px] text-gray-500">{humanize(r.category)}</p>}
    </Link>
  )

  return (
    <>
      {/* Desktop: a table that scans like the employee directory */}
      <div className="hidden overflow-hidden md:block">
        <Table className="w-full text-left">
          <TableHeader>
            <TableRow className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:border-gray-800">
              <TableHead className="py-2.5 pr-4 font-bold">Ticket</TableHead>
              <TableHead className="py-2.5 pr-4 font-bold">Resident</TableHead>
              <TableHead className="py-2.5 pr-4 font-bold">Raised</TableHead>
              <TableHead className="py-2.5 pr-4 font-bold">Time taken</TableHead>
              <TableHead className="py-2.5 pr-4 font-bold">Priority</TableHead>
              <TableHead className="py-2.5 font-bold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <TableRow key={r.id} className="align-top">
                <TableCell className="max-w-[320px] py-3 pr-4">{ticket(r)}</TableCell>
                <TableCell className="py-3 pr-4">{resident(r)}</TableCell>
                <TableCell className="whitespace-nowrap py-3 pr-4">{raised(r)}</TableCell>
                <TableCell className="whitespace-nowrap py-3 pr-4">
                  <TicketTiming r={r} />
                </TableCell>
                <TableCell className="py-3 pr-4">
                  <PriorityTag value={r.priority} />
                </TableCell>
                <TableCell className="py-3">
                  <StatusPill value={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: one card per ticket */}
      <ul className="space-y-2.5 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
            <div className="flex items-start justify-between gap-3">
              {ticket(r)}
              <StatusPill value={r.status} />
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-2.5 dark:border-gray-800">
              {resident(r)}
              <TicketTiming r={r} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
              <span>Raised {formatWhen(r.createdAt, 'dd MMM yyyy')}</span>
              <PriorityTag value={r.priority} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

// ── Other departments: compact rows ─────────────────────────────────────────

const Meta = ({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1">
    <Icon className="h-3 w-3" />
    {children}
  </span>
)

const residentMeta = (name: string | null, unit: string | null) =>
  name || unit ? <Meta icon={UserRound}>{[name, unit ? `Unit ${unit}` : null].filter(Boolean).join(' · ')}</Meta> : null

const Row = ({ title, meta, aside }: { title: React.ReactNode; meta: React.ReactNode; aside: React.ReactNode }) => (
  <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">{meta}</div>
    </div>
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">{aside}</div>
  </li>
)

const FnbRow = ({ r }: { r: FnbActivityRecord }) => (
  <Row
    title={
      <>
        {r.mealSlot || humanize(r.orderType) || 'Food order'}
        {r.quantity ? <span className="ml-2 text-xs font-medium text-gray-500">× {r.quantity}</span> : null}
      </>
    }
    meta={
      <>
        {residentMeta(r.residentName, r.unitNumber)}
        {r.deliveryDate && <Meta icon={CalendarCheck}>For {formatWhen(r.deliveryDate, 'dd MMM yyyy')}</Meta>}
        {r.deliveredAt && <Meta icon={CheckCircle2}>Delivered {formatWhen(r.deliveredAt)}</Meta>}
      </>
    }
    aside={<StatusPill value={r.deliveryStatus} />}
  />
)

const MedicalRow = ({ r }: { r: MedicalActivityRecord }) => (
  <Row
    title={r.title}
    meta={
      <>
        {residentMeta(r.residentName, r.unitNumber)}
        {r.type === 'appointment' ? (
          <Meta icon={CalendarCheck}>
            {formatWhen(r.appointmentDate, 'dd MMM yyyy')}
            {r.slotTimeRange ? ` · ${r.slotTimeRange}` : ''}
          </Meta>
        ) : (
          <Meta icon={Clock}>{formatWhen(r.at)}</Meta>
        )}
        {r.notes && <span className="max-w-xs truncate italic">“{r.notes}”</span>}
      </>
    }
    aside={<StatusPill value={r.status} />}
  />
)

const renderRow = (kind: ActiveKind, row: unknown) => {
  switch (kind) {
    case 'fnb':
      return <FnbRow r={row as FnbActivityRecord} />
    default:
      return <MedicalRow r={row as MedicalActivityRecord} />
  }
}

// ── Tab ─────────────────────────────────────────────────────────────────────

export const DepartmentActivity = ({
  employeeId,
  kind,
  stats,
  statsLoading,
  range,
  locId,
}: {
  employeeId: string
  kind: ActiveKind
  stats: EmployeeActivityStats | null
  statsLoading: boolean
  range: DateRange
  locId: string | null
}) => {
  const meta = ACTIVITY_META[kind]
  const [status, setStatus] = useState('')
  // A new range or filter starts from the first page again.
  const filterKey = `${range.from}|${range.to}|${status}|${locId ?? ''}`
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 })
  const page = pageState.key === filterKey ? pageState.page : 1
  const setPage = (next: number) => setPageState({ key: filterKey, page: next })

  const { data, isLoading, isFetching } = useEmployeeActivityRecords(employeeId, {
    ...range,
    locId,
    status: status || undefined,
    page,
    limit: PAGE_SIZE,
  })
  const rows = data?.kind === kind ? data.rows : []
  const counts = filterCounts(kind, stats)
  const chips = [['', 'All'] as [string, string], ...meta.statuses].map(([value, label]) => ({
    value,
    label,
    count: counts[value],
  }))
  const activeLabel = chips.find((c) => c.value === status)?.label.toLowerCase()

  return (
    <div className="space-y-5">
      {statsLoading && !stats ? (
        <LoadingState label="Loading summary…" />
      ) : stats ? (
        <ActivityStats kind={kind} stats={stats} />
      ) : null}

      <Panel icon={meta.icon} title={meta.label}>
        <div className="mb-3 space-y-2">
          <FilterChips options={chips} value={status} onChange={setStatus} />
          {kind === 'tickets' && (
            <p className="flex items-start gap-1.5 text-[11px] text-gray-500">
              <Info className="mt-px h-3.5 w-3.5 shrink-0 text-gray-400" />
              Same stages as the Tickets page. In-progress and completed (awaiting verification) tickets are always
              listed; closed tickets are those verified or cancelled within the selected dates.
            </p>
          )}
        </div>

        {isLoading ? (
          <LoadingState label={`Loading ${meta.noun}…`} />
        ) : rows.length === 0 ? (
          <EmptyState
            label={status ? `No ${activeLabel} ${meta.noun}` : `No ${meta.noun} yet`}
            hint={
              kind === 'tickets'
                ? 'Tickets appear here once they are assigned to this employee.'
                : 'Try a wider date range.'
            }
          />
        ) : (
          <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
            {kind === 'tickets' ? (
              <TicketsTable rows={rows as TicketActivityRecord[]} />
            ) : kind === 'gate' ? (
              <GatePassesTable rows={rows as GateActivityRecord[]} />
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((row) => (
                  <React.Fragment key={row.id}>{renderRow(kind, row)}</React.Fragment>
                ))}
              </ul>
            )}
            <Pager
              page={data?.pagination.page ?? page}
              totalPages={data?.pagination.totalPages ?? 1}
              total={data?.pagination.total ?? 0}
              onChange={setPage}
            />
          </div>
        )}
      </Panel>
    </div>
  )
}
