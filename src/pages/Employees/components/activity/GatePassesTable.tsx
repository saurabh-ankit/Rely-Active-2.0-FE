import { Building2, Car, Phone, UserRound } from 'lucide-react'
import { cn, getFileUrl } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { GateActivityRecord, GatePersonAction } from '@/lib/types/employeeActivity'
import { StatusPill } from './shared'
import { formatDuration, formatWhen } from './utils'

const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  raised: { label: 'Raised', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  checked_in: { label: 'Checked in', cls: 'bg-[#005390]/5 text-[#005390] border-[#005390]/20' },
  checked_out: { label: 'Checked out', cls: 'bg-slate-50 text-slate-700 border-slate-200' },
}

const APPROVER_TONES: Record<string, string> = {
  RESIDENT: 'bg-violet-50 text-violet-700',
  FAMILY_MEMBER: 'bg-violet-50 text-violet-700',
  STAFF: 'bg-sky-50 text-sky-700',
}

/** What this employee did for the entry, as small tags. */
const MyRoles = ({ roles }: { roles: string[] }) =>
  roles.length ? (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {roles.map((r) => (
        <span key={r} className={cn('rounded-md border px-1.5 py-px text-[10px] font-semibold', ROLE_LABELS[r]?.cls)}>
          {ROLE_LABELS[r]?.label ?? r}
        </span>
      ))}
    </div>
  ) : null

const Visitor = ({ r }: { r: GateActivityRecord }) => (
  <div className="flex min-w-0 items-start gap-2.5">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-slate-600">
      {r.photo ? (
        <img src={getFileUrl(r.photo)} alt={r.visitorName} className="h-full w-full object-cover" />
      ) : (
        r.visitorName.trim().charAt(0).toUpperCase() || '?'
      )}
    </div>
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{r.visitorName}</p>
      <p className="text-[11px] text-gray-500">
        {r.visitorType} · {r.entrySource === 'Walkin' ? 'Walk-in' : 'Pre-approved'}
        {r.numberOfPeople && r.numberOfPeople > 1 ? ` · ${r.numberOfPeople} people` : ''}
      </p>
      {r.visitorPhone && (
        <p className="flex items-center gap-1 text-[11px] text-gray-500">
          <Phone className="h-3 w-3" />
          {r.visitorPhone}
        </p>
      )}
    </div>
  </div>
)

const Visit = ({ r }: { r: GateActivityRecord }) => (
  <div className="space-y-0.5 text-[11px] text-gray-500">
    <p className="text-sm text-gray-900 dark:text-white">{r.unitNumber ? `Unit ${r.unitNumber}` : '—'}</p>
    {r.personToMeet && (
      <p className="flex items-center gap-1">
        <UserRound className="h-3 w-3" />
        To meet {r.personToMeet}
      </p>
    )}
    {r.company && (
      <p className="flex items-center gap-1">
        <Building2 className="h-3 w-3" />
        {r.company}
      </p>
    )}
    {r.vehicleNumber && (
      <p className="flex items-center gap-1 font-mono">
        <Car className="h-3 w-3" />
        {r.vehicleNumber}
      </p>
    )}
  </div>
)

const RaisedBy = ({ r }: { r: GateActivityRecord }) => {
  const by = r.raisedBy
  if (!by) return <span className="text-xs text-gray-400">Not recorded</span>
  return (
    <div>
      <p className="text-sm text-gray-900 dark:text-white">
        {by.byMe ? 'Self' : by.name || 'Unknown'}
        <span className={cn('ml-1.5 rounded px-1.5 py-px text-[10px] font-semibold', APPROVER_TONES[by.type])}>
          {by.typeLabel}
        </span>
      </p>
      <p className="text-[11px] text-gray-500">
        {by.type === 'STAFF'
          ? 'Walk-in, sent for approval'
          : by.type === 'FAMILY_MEMBER' && by.residentName
            ? `Pre-approved · household of ${by.residentName}`
            : 'Pre-approved the visit'}
      </p>
    </div>
  )
}

const Approval = ({ r }: { r: GateActivityRecord }) => {
  // A pre-approved pass is approved by the resident who raised it; only a staff decision
  // at the gate (e.g. rejecting the pass) is worth showing separately.
  if (r.entrySource === 'Preapproved' && r.approval?.type !== 'STAFF') {
    return <span className="text-xs text-gray-400">— Pre-approved</span>
  }
  if (!r.approval) {
    return r.status === 'PendingApproval' ? (
      <span className="text-xs font-semibold text-amber-600">Awaiting approval</span>
    ) : (
      <span className="text-xs text-gray-400">Not recorded</span>
    )
  }
  const a = r.approval
  return (
    <div>
      <p className="text-sm text-gray-900 dark:text-white">
        {a.byMe ? 'Self' : a.name || 'Unknown'}
        <span className={cn('ml-1.5 rounded px-1.5 py-px text-[10px] font-semibold', APPROVER_TONES[a.type])}>
          {a.typeLabel}
        </span>
      </p>
      <p className="text-[11px] text-gray-500">
        {r.status === 'Rejected' ? 'Rejected' : 'Approved'} {formatWhen(a.at, 'dd MMM, h:mm a')}
      </p>
    </div>
  )
}

const GateTime = ({ action, empty }: { action: GatePersonAction | null; empty: string }) =>
  action ? (
    <div>
      <p className="text-sm text-gray-900 dark:text-white">{formatWhen(action.at, 'dd MMM, h:mm a')}</p>
      <p className="text-[11px] text-gray-500">
        {action.byMe ? 'by Self' : action.by ? `by ${action.by}` : 'By: not recorded'}
      </p>
    </div>
  ) : (
    <span className="text-xs text-gray-400">{empty}</span>
  )

const insideFor = (r: GateActivityRecord) =>
  r.minutesInside != null ? `Inside for ${formatDuration(r.minutesInside / 60)}` : null

/** Gate entries this employee approved, checked in or checked out, with every party named. */
export const GatePassesTable = ({ rows }: { rows: GateActivityRecord[] }) => (
  <>
    <div className="hidden overflow-hidden lg:block">
      <Table className="w-full text-left">
        <TableHeader>
          <TableRow className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:border-gray-800">
            <TableHead className="py-2.5 pr-4 font-bold">Visitor</TableHead>
            <TableHead className="py-2.5 pr-4 font-bold">Visit</TableHead>
            <TableHead className="py-2.5 pr-4 font-bold">Raised by</TableHead>
            <TableHead className="py-2.5 pr-4 font-bold">Approved by</TableHead>
            <TableHead className="py-2.5 pr-4 font-bold">Checked in</TableHead>
            <TableHead className="py-2.5 pr-4 font-bold">Checked out</TableHead>
            <TableHead className="py-2.5 font-bold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((r) => (
            <TableRow key={r.id} className="align-top">
              <TableCell className="max-w-[260px] py-3 pr-4">
                <Visitor r={r} />
                <MyRoles roles={r.myRoles} />
              </TableCell>
              <TableCell className="py-3 pr-4">
                <Visit r={r} />
              </TableCell>
              <TableCell className="py-3 pr-4">
                <RaisedBy r={r} />
              </TableCell>
              <TableCell className="py-3 pr-4">
                <Approval r={r} />
              </TableCell>
              <TableCell className="whitespace-nowrap py-3 pr-4">
                <GateTime action={r.checkIn} empty={r.status === 'Rejected' ? 'Not let in' : '—'} />
              </TableCell>
              <TableCell className="whitespace-nowrap py-3 pr-4">
                <GateTime action={r.checkOut} empty={r.status === 'Inside' ? 'Still inside' : '—'} />
                {insideFor(r) && <p className="text-[11px] text-gray-400">{insideFor(r)}</p>}
              </TableCell>
              <TableCell className="py-3">
                <StatusPill value={r.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    {/* Below desktop width: one card per entry */}
    <ul className="space-y-2.5 lg:hidden">
      {rows.map((r) => (
        <li key={r.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
          <div className="flex items-start justify-between gap-3">
            <Visitor r={r} />
            <StatusPill value={r.status} />
          </div>
          <MyRoles roles={r.myRoles} />
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
            <div>
              <p className="mb-0.5 text-[10px] font-bold uppercase text-gray-400">Visit</p>
              <Visit r={r} />
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-bold uppercase text-gray-400">Raised by</p>
              <RaisedBy r={r} />
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-bold uppercase text-gray-400">Approved by</p>
              <Approval r={r} />
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-bold uppercase text-gray-400">Checked in</p>
              <GateTime action={r.checkIn} empty="—" />
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-bold uppercase text-gray-400">Checked out</p>
              <GateTime action={r.checkOut} empty={r.status === 'Inside' ? 'Still inside' : '—'} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  </>
)
