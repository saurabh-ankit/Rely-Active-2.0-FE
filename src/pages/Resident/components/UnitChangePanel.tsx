import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  DoorOpen,
  Loader2,
  Package,
  ReceiptText,
  ShieldAlert,
  Ticket,
  Users,
  Utensils,
  Wrench,
} from 'lucide-react'
import { residentService } from '@/lib/services/residentService'
import type { UnitChangeChoices, UnitChangeImpact } from '@/lib/types'
import { cn } from '@/lib/utils'

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const dmy = (value: string | null | undefined) => {
  const day = value ? String(value).slice(0, 10) : ''
  return day ? `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}` : ''
}

const time = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

const status = (s: string) => s.toLowerCase().replace(/_/g, ' ')

/** How each kind of charge is named in the panel (billing service types). */
const CHARGE_LABEL: Record<string, string> = {
  RENT: 'Rent',
  CARE_PACKAGE: 'Care package',
  FOOD_PACKAGE: 'Food package',
  FOOD_ORDER: 'Food orders',
  ADDITIONAL_TASK: 'Care tasks',
  DOCTOR_CONSULTATION: 'Doctor consultations',
  LAB_TEST: 'Lab tests',
  INVENTORY_ITEM: 'Medicines & items',
  EVENT_FEE: 'Events',
  VENUE_BOOKING: 'Venue bookings',
  AMENITY_BOOKING: 'Amenity bookings',
  MAINTENANCE: 'Maintenance tickets',
  MISCELLANEOUS_AS_SERVICE: 'Miscellaneous',
}

function Section({
  icon: Icon,
  title,
  note,
  blocking = false,
  children,
}: {
  icon: React.ElementType
  title: string
  note?: string
  /** Has to be finished before the flat can change. */
  blocking?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 dark:bg-slate-900',
        blocking ? 'border-red-200 dark:border-red-900/60' : 'border-gray-100 dark:border-gray-800',
      )}
    >
      <div className="mb-2.5 flex items-start gap-2">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', blocking ? 'text-red-600' : 'text-[#005390]')} />
        <div>
          <h4 className="text-xs font-bold text-gray-900 dark:text-white">{title}</h4>
          {note && <p className="text-[11px] text-gray-500">{note}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

const Row = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <li
    className={cn(
      'flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 py-2 text-xs first:border-t-0 dark:border-gray-800',
      className,
    )}
  >
    {children}
  </li>
)

/** Two-way choice for one row, e.g. "Deliver to B-23" / "Keep B-21". */
function Choice({
  value,
  onChange,
  yes,
  no,
}: {
  value: boolean
  onChange: (value: boolean) => void
  yes: string
  no: string
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 text-[11px] font-semibold">
      {[
        { on: true, label: yes },
        { on: false, label: no },
      ].map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={() => onChange(opt.on)}
          className={cn(
            'px-2.5 py-1 transition',
            value === opt.on ? 'bg-[#005390] text-white' : 'bg-white text-gray-600 hover:bg-gray-50',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

const toggle = (ids: string[], id: string, on: boolean) =>
  on ? [...new Set([...ids, id])] : ids.filter((x) => x !== id)

interface UnitChangePanelProps {
  residentId: string
  toUnitId: string
  value: UnitChangeChoices
  onChange: (value: UnitChangeChoices) => void
  /** Reports the loaded impact (or null while loading), so the form can block saving. */
  onImpact?: (impact: UnitChangeImpact | null) => void
}

/**
 * Shown in Edit Resident when the flat is changed: what the resident takes to the new flat
 * (unbilled charges, orders, events) and what to do with the old flat's tickets, assets and
 * gate passes.
 */
export function UnitChangePanel({ residentId, toUnitId, value, onChange, onImpact }: UnitChangePanelProps) {
  const {
    data: impact,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['resident-unit-change', residentId, toUnitId],
    queryFn: () => residentService.getUnitChangeImpact(residentId, toUnitId),
    staleTime: 0,
  })

  useEffect(() => {
    onImpact?.(impact ?? null)
    // Defaults: in-progress orders and gate passes follow the resident; the flat's assets stay.
    if (impact) {
      onChange({
        preapprovalIds: impact.gatePasses.map((p) => p.id),
        assetAssignmentIds: [],
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impact])

  if (isLoading) {
    return (
      <div className="mt-5 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking what moves with the resident…
      </div>
    )
  }
  if (error || !impact) {
    return (
      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        Couldn’t check the flat change. Try picking the flat again.
      </div>
    )
  }

  const from = impact.fromUnit?.unitNumber ?? 'old flat'
  const to = impact.toUnit?.unitNumber ?? 'new flat'
  const assetIds = value.assetAssignmentIds ?? []
  const passIds = value.preapprovalIds ?? []

  // Unbilled lines grouped by kind of charge, in the order billing lists them.
  const groups = new Map<string, typeof impact.unbilled.lines>()
  for (const line of impact.unbilled.lines) {
    groups.set(line.serviceType, [...(groups.get(line.serviceType) ?? []), line])
  }

  const hasEvents = impact.eventRegistrations.length + impact.eventRequests.length + impact.amenityBookings.length > 0
  const hasAssets = impact.assets.flat.length + impact.assets.resident.length > 0

  return (
    <div className="mt-5 space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
        <DoorOpen className="h-4 w-4 text-amber-600" />
        Moving from {from}
        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
        {to}
        <span className="text-xs font-medium text-gray-500">· from today ({dmy(impact.moveDate)})</span>
      </div>

      {impact.blockers.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>The flat can’t be changed to {to} yet.</strong>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {impact.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {impact.tickets.raisedByResident.length > 0 && (
        <Section
          icon={Wrench}
          blocking
          title="Tickets to finish first"
          note="Raised by the resident or their family. Complete or close them, then change the flat."
        >
          <ul>
            {impact.tickets.raisedByResident.map((t) => (
              <Row key={t.id}>
                <span className="text-gray-700 dark:text-gray-300">
                  #{t.ticketNumber} {t.title}
                </span>
                <span className="text-[11px] font-semibold text-red-600">{status(t.status)}</span>
              </Row>
            ))}
          </ul>
        </Section>
      )}

      {impact.foodOrders.length > 0 && (
        <Section
          icon={Utensils}
          blocking
          title="Food orders to finish first"
          note="Each order must be delivered or cancelled before the flat can change."
        >
          <ul>
            {impact.foodOrders.map((o) => (
              <Row key={o.id}>
                <span className="min-w-0 flex-1 text-gray-700 dark:text-gray-300">
                  {o.items || 'Order'}
                  <span className="text-gray-400">
                    {' '}
                    · {dmy(o.date)} · {o.consumerName}
                  </span>
                </span>
                <span className="text-[11px] font-semibold text-red-600">{status(o.status)}</span>
              </Row>
            ))}
          </ul>
        </Section>
      )}

      <Section
        icon={ReceiptText}
        title={`Unbilled charges moving to ${to} · ${inr(impact.unbilled.total)}`}
        note={
          impact.unbilled.lines.length
            ? `Not billed on ${from} yet. They appear on ${to}'s next bill under “From old flat ${from}”.`
            : undefined
        }
      >
        {impact.unbilled.lines.length === 0 ? (
          <p className="text-xs text-gray-500">Nothing unbilled — {from} has billed everything up to today.</p>
        ) : (
          <div className="space-y-2.5">
            {[...groups].map(([type, lines]) => (
              <div key={type}>
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  <span>{CHARGE_LABEL[type] ?? type}</span>
                  <span>{inr(lines.reduce((s, l) => s + l.total, 0))}</span>
                </div>
                <ul>
                  {lines.map((l) => (
                    <Row key={l.id}>
                      <span className="min-w-0 flex-1 text-gray-700 dark:text-gray-300">
                        {l.name}
                        <span className="text-gray-400"> · {l.description}</span>
                        {l.consumerName && <span className="text-gray-400"> · {l.consumerName}</span>}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">{inr(l.total)}</span>
                    </Row>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      {impact.openInvoices.length > 0 && (
        <Section
          icon={ReceiptText}
          title={`Unpaid bills moving to ${to} · ${inr(impact.openInvoices.reduce((s, i) => s + i.balance, 0))}`}
          note={`They can be paid from ${to}'s billing page, and what's left is carried into ${to}'s next invoice.`}
        >
          <ul>
            {impact.openInvoices.map((inv) => (
              <Row key={inv.id}>
                <span className="text-gray-700 dark:text-gray-300">
                  {inv.invoiceNumber}
                  <span className="text-gray-400">
                    {' '}
                    · {dmy(inv.startDate)} – {dmy(inv.endDate)} · {status(inv.status)}
                  </span>
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">{inr(inv.balance)} due</span>
              </Row>
            ))}
          </ul>
        </Section>
      )}

      {hasEvents && (
        <Section
          icon={CalendarDays}
          title="Events & bookings"
          note={`These move with the resident; any fee is billed to ${to}.`}
        >
          <ul>
            {impact.eventRegistrations.map((r) => (
              <Row key={r.id}>
                <span className="text-gray-700 dark:text-gray-300">
                  {r.title}
                  <span className="text-gray-400">
                    {' '}
                    · {dmy(r.startDate)} · {r.consumerName} · {r.seatCount} seat(s)
                  </span>
                </span>
                {r.entryFee > 0 && <span className="text-gray-500">{inr(r.entryFee * r.seatCount)}</span>}
              </Row>
            ))}
            {impact.eventRequests.map((r) => (
              <Row key={r.id}>
                <span className="text-gray-700 dark:text-gray-300">
                  Venue request {r.requestNumber ? `#${r.requestNumber}` : ''} – {r.title}
                  <span className="text-gray-400">
                    {' '}
                    · {dmy(r.startDate)} · {status(r.status)}
                  </span>
                </span>
              </Row>
            ))}
            {impact.amenityBookings.map((b) => (
              <Row key={b.id}>
                <span className="text-gray-700 dark:text-gray-300">
                  {b.amenity}
                  <span className="text-gray-400">
                    {' '}
                    · {dmy(b.date)} at {time(b.startMinutes)}
                  </span>
                </span>
              </Row>
            ))}
          </ul>
        </Section>
      )}

      {impact.tickets.flatOnly.length > 0 && (
        <Section
          icon={Wrench}
          title={`Other open tickets on ${from}`}
          note={`Not raised by this household, so they don't hold up the move. They stay with ${from}.`}
        >
          <ul>
            {impact.tickets.flatOnly.map((t) => (
              <Row key={t.id}>
                <span className="text-gray-700 dark:text-gray-300">
                  #{t.ticketNumber} {t.title}
                  <span className="text-gray-400"> · {status(t.status)}</span>
                </span>
                <span className="text-[11px] font-semibold text-amber-700">Stays with {from}</span>
              </Row>
            ))}
          </ul>
        </Section>
      )}

      {hasAssets && (
        <Section icon={Package} title="Assets">
          <ul>
            {impact.assets.flat.map((a) => (
              <Row key={a.assignmentId}>
                <span className="text-gray-700 dark:text-gray-300">
                  {a.name}
                  {a.assetTag && <span className="text-gray-400"> · {a.assetTag}</span>}
                  <span className="text-gray-400"> · assigned to {from}</span>
                </span>
                <Choice
                  value={assetIds.includes(a.assignmentId)}
                  onChange={(on) => onChange({ ...value, assetAssignmentIds: toggle(assetIds, a.assignmentId, on) })}
                  yes={`Move to ${to}`}
                  no={`Keep with ${from}`}
                />
              </Row>
            ))}
            {impact.assets.resident.map((a) => (
              <Row key={a.assignmentId}>
                <span className="text-gray-700 dark:text-gray-300">
                  {a.name}
                  {a.assetTag && <span className="text-gray-400"> · {a.assetTag}</span>}
                </span>
                <span className="text-[11px] font-semibold text-gray-500">Assigned to the resident · moves along</span>
              </Row>
            ))}
          </ul>
        </Section>
      )}

      {impact.gatePasses.length > 0 && (
        <Section icon={Ticket} title="Gate passes" note="Where should these visitors be sent?">
          <ul>
            {impact.gatePasses.map((p) => (
              <Row key={p.id}>
                <span className="text-gray-700 dark:text-gray-300">
                  {p.visitorName}
                  <span className="text-gray-400">
                    {' '}
                    · {p.visitorType}
                    {p.scheduleType === 'FREQUENT' ? ' · frequent' : p.startDate ? ` · ${dmy(p.startDate)}` : ''}
                  </span>
                </span>
                <Choice
                  value={passIds.includes(p.id)}
                  onChange={(on) => onChange({ ...value, preapprovalIds: toggle(passIds, p.id, on) })}
                  yes={`Point to ${to}`}
                  no={`Keep ${from}`}
                />
              </Row>
            ))}
          </ul>
        </Section>
      )}

      <p className="flex items-start gap-2 text-[11px] text-gray-500">
        <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {impact.coResidents.length
          ? `Still living in ${from}: ${impact.coResidents.map((r) => r.name).join(', ')}. Charges logged against ${from} without a resident stay there.`
          : `${from} will be empty after the move. Charges logged against ${from} without a resident stay there.`}
      </p>
    </div>
  )
}
