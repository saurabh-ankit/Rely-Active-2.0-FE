import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  HeartPulse,
  IndianRupee,
  MessageSquareHeart,
  Receipt,
  Stethoscope,
  Ticket,
  UserCheck,
  UserPlus,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { DashboardOverview } from '@/lib/types/dashboard'
import { AXIS_TICK, GRID, SERIES, STATUS, dayLabel, formatNumber, timeAgo } from './chartUtils'
import { Donut, EmptyChart, LegendRow, Meter, Panel, StatTile } from './shared'

const ticketTrendConfig = {
  created: { label: 'Raised', color: SERIES[0] },
  resolved: { label: 'Resolved', color: SERIES[1] },
} satisfies ChartConfig

const visitorConfig = { count: { label: 'Visitors', color: SERIES[0] } } satisfies ChartConfig
const apptConfig = { count: { label: 'Appointments', color: SERIES[0] } } satisfies ChartConfig

const ACTIVITY_ICON: Record<string, typeof Ticket> = {
  ticket: Ticket,
  ticket_resolved: UserCheck,
  visitor: DoorOpen,
  payment: IndianRupee,
  invoice: Receipt,
  resident: UserPlus,
}

export function OverviewTab({
  data,
  criticalPage,
  onCriticalPage,
}: {
  data: DashboardOverview
  criticalPage: number
  onCriticalPage: (page: number) => void
}) {
  const navigate = useNavigate()
  const { residents, tickets, visitors, medical, events, dining, staff, feedback, criticalResidents } = data
  const hasTicketTrend = tickets.trend.some((d) => d.created || d.resolved)
  const hasVisitorTrend = visitors.trend.some((d) => d.count)
  const hasApptTrend = medical.trend.some((d) => d.count)
  const statusRows = [
    { label: 'Open', value: tickets.byStatus.open },
    { label: 'In progress', value: tickets.byStatus.inProgress },
    { label: 'On hold', value: tickets.byStatus.onHold },
    { label: 'Resolved', value: tickets.byStatus.resolved },
    { label: 'Closed', value: tickets.byStatus.closed },
    { label: 'Cancelled', value: tickets.byStatus.cancelled },
  ]
  const maxStatus = Math.max(1, ...statusRows.map((r) => r.value))
  const maxDept = Math.max(1, ...staff.byDepartment.map((d) => d.count))
  const visitorTotal30 = visitors.last30Days.reduce((a, v) => a + v.count, 0)

  return (
    <div className="space-y-5">
      {/* Headline numbers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          icon={Users}
          label="Residing residents"
          value={formatNumber(residents.residing)}
          hint={`+ ${formatNumber(residents.residingFamilyMembers)} family · ${formatNumber(residents.total)} total`}
          onClick={() => navigate('/admin/residents')}
        />
        <StatTile
          icon={Ticket}
          tone={tickets.urgentOpen ? 'red' : 'amber'}
          label="Open tickets"
          value={formatNumber(tickets.openNow)}
          hint={tickets.urgentOpen ? `${tickets.urgentOpen} urgent / critical` : 'None urgent'}
          onClick={() => navigate('/admin/tickets')}
        />
        <StatTile
          icon={DoorOpen}
          tone="violet"
          label="Visitors today"
          value={formatNumber(visitors.today)}
          hint={`${visitors.insideNow} inside · ${visitors.awaitingApproval} awaiting`}
          onClick={() => navigate('/admin/visitor-history')}
        />
        <StatTile
          icon={Stethoscope}
          tone="green"
          label="Appointments today"
          value={formatNumber(medical.appointmentsToday.total)}
          hint={`${medical.appointmentsToday.completed} done · ${medical.appointmentsToday.upcoming} upcoming`}
          onClick={() => navigate('/admin/medical')}
        />
        <StatTile
          icon={CalendarDays}
          tone="blue"
          label="Events today"
          value={formatNumber(events.today)}
          hint={`${events.upcoming} upcoming`}
          onClick={() => navigate('/admin/events')}
        />
        <StatTile
          icon={UtensilsCrossed}
          tone="slate"
          label="Food orders today"
          value={formatNumber(dining.ordersToday)}
          hint={`${dining.completed} completed · ${dining.dineInAttendanceToday} dined in`}
          onClick={() => navigate('/admin/fnb-history')}
        />
      </div>

      {/* Tickets */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel
          icon={Activity}
          title="Tickets: last 14 days"
          subtitle="Raised vs resolved each day"
          className="xl:col-span-2"
          action={
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              {tickets.resolutionRate}% resolved overall
            </span>
          }
        >
          {hasTicketTrend ? (
            <ChartContainer config={ticketTrendConfig} className="aspect-auto h-64 w-full">
              <LineChart data={tickets.trend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="day"
                  tickFormatter={dayLabel}
                  tickLine={false}
                  axisLine={false}
                  tick={AXIS_TICK}
                  minTickGap={16}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={40} />
                <ChartTooltip
                  content={<ChartTooltipContent indicator="line" labelFormatter={(v) => dayLabel(String(v))} />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  dataKey="created"
                  type="linear"
                  stroke="var(--color-created)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  dataKey="resolved"
                  type="linear"
                  stroke="var(--color-resolved)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <EmptyChart message="No tickets raised or resolved in the last 14 days" />
          )}
        </Panel>

        <Panel icon={Ticket} title="Tickets by status" subtitle={`${formatNumber(tickets.total)} tickets in all`}>
          {tickets.total ? (
            <div className="space-y-3">
              {statusRows.map((r) => (
                <Meter key={r.label} label={r.label} value={r.value} max={maxStatus} />
              ))}
              <div className="mt-2 border-t border-gray-100 pt-3">
                <p className="mb-2 text-[11px] font-semibold text-gray-500 uppercase">Open by priority</p>
                <div className="flex flex-wrap gap-1.5">
                  {tickets.byPriority.map((p) => (
                    <span
                      key={p.priority}
                      className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600"
                    >
                      {p.priority.charAt(0) + p.priority.slice(1).toLowerCase()}{' '}
                      <strong className="text-[#1f2937]">{p.count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyChart message="No tickets yet" />
          )}
        </Panel>
      </div>

      {/* Residents, visitors, staff */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel icon={HeartPulse} title="Resident acuity" subtitle="Care level of residing residents">
          <Donut
            centerLabel="residing"
            data={[
              { key: 'stable', label: 'Stable', value: residents.acuity.stable, color: STATUS.good },
              { key: 'moderate', label: 'Moderate', value: residents.acuity.moderate, color: STATUS.warning },
              { key: 'critical', label: 'Critical', value: residents.acuity.critical, color: STATUS.critical },
            ]}
          />
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center text-[11px] text-gray-500">
            <div>
              <div className="text-base font-black text-[#1f2937]">{residents.pending}</div>Onboarding
            </div>
            <div>
              <div className="text-base font-black text-[#1f2937]">{residents.away}</div>Away
            </div>
            <div>
              <div className="text-base font-black text-[#1f2937]">{residents.movedOut}</div>Moved out
            </div>
          </div>
        </Panel>

        <Panel
          icon={DoorOpen}
          title="Visitors: last 14 days"
          subtitle={`${formatNumber(visitorTotal30)} people in the last 30 days`}
        >
          {hasVisitorTrend ? (
            <ChartContainer config={visitorConfig} className="aspect-auto h-44 w-full">
              <BarChart data={visitors.trend} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="day"
                  tickFormatter={dayLabel}
                  tickLine={false}
                  axisLine={false}
                  tick={AXIS_TICK}
                  minTickGap={16}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={40} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => dayLabel(String(v))} />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChart message="No visitors in the last 14 days" />
          )}
          <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
            {visitors.last30Days
              .filter((v) => v.count > 0)
              .map((v, i) => (
                <LegendRow key={v.type} color={SERIES[i]!} label={v.type} value={formatNumber(v.count)} />
              ))}
          </div>
        </Panel>

        <Panel
          icon={Building2}
          title="Staff by department"
          subtitle={`${formatNumber(staff.total)} staff assigned to this property`}
        >
          {staff.byDepartment.length ? (
            <div className="space-y-3">
              {staff.byDepartment.map((d) => (
                <Meter key={d.code} label={d.name} value={d.count} max={maxDept} />
              ))}
            </div>
          ) : (
            <EmptyChart message="No staff assigned" />
          )}
        </Panel>
      </div>

      {/* Medical, feedback, events & dining */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel
          icon={Stethoscope}
          title="Medical"
          subtitle={`${medical.doctors} doctor${medical.doctors === 1 ? '' : 's'} · ${medical.nurses} nurse${medical.nurses === 1 ? '' : 's'} & caretakers`}
          action={
            <button
              type="button"
              onClick={() => navigate('/admin/medical')}
              className="text-[11px] font-bold text-[#005390] hover:underline"
            >
              View
            </button>
          }
        >
          {hasApptTrend ? (
            <ChartContainer config={apptConfig} className="aspect-auto h-36 w-full">
              <BarChart data={medical.trend} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="day"
                  tickFormatter={dayLabel}
                  tickLine={false}
                  axisLine={false}
                  tick={AXIS_TICK}
                  minTickGap={16}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={40} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => dayLabel(String(v))} />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChart className="min-h-36" message="No appointments in the last 14 days" />
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-[11px] text-gray-500">
            <div className="rounded-xl bg-sky-50/60 p-2.5">
              <div className="text-lg font-black text-[#1f2937]">{medical.careTasks.active}</div>Active care tasks
            </div>
            <div className="rounded-xl bg-emerald-50/60 p-2.5">
              <div className="text-lg font-black text-[#1f2937]">{medical.careTasks.completedToday}</div>Care tasks done
              today
            </div>
          </div>
        </Panel>

        <Panel
          icon={MessageSquareHeart}
          title="Service feedback"
          subtitle="Residents' ratings on resolved tickets"
          action={
            feedback.total ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                {feedback.score} / 5
              </span>
            ) : undefined
          }
        >
          <Donut
            centerLabel="ratings"
            data={[
              { key: 'good', label: 'Good', value: feedback.good, color: STATUS.good },
              { key: 'average', label: 'Average', value: feedback.average, color: STATUS.warning },
              { key: 'poor', label: 'Poor', value: feedback.poor, color: STATUS.critical },
            ]}
          />
        </Panel>

        <Panel icon={CalendarDays} title="Events & dining" subtitle="This month and today">
          <div className="grid grid-cols-2 gap-2.5 text-[11px] text-gray-500">
            {[
              ['Events this month', events.thisMonth],
              ['Upcoming events', events.upcoming],
              ['Seats booked this month', events.seatsBookedThisMonth],
              ['Attended this month', events.attendedThisMonth],
              ['Dine-in orders today', dining.dineIn],
              ['Room-service orders today', dining.roomService],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-gray-100 bg-white/70 p-3">
                <div className="text-xl font-black text-[#1f2937]">{formatNumber(Number(value))}</div>
                {label}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Critical residents & recent activity */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel
          icon={AlertTriangle}
          title="Critical residents"
          subtitle={`${criticalResidents.total} residents need close attention`}
          action={
            criticalResidents.totalPages > 1 ? (
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={criticalPage <= 1}
                  onClick={() => onCriticalPage(criticalPage - 1)}
                  className="rounded-lg p-1 hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {criticalPage} / {criticalResidents.totalPages}
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={criticalPage >= criticalResidents.totalPages}
                  onClick={() => onCriticalPage(criticalPage + 1)}
                  className="rounded-lg p-1 hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : undefined
          }
        >
          {criticalResidents.items.length ? (
            <ul className="divide-y divide-gray-100">
              {criticalResidents.items.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/residents/details/${r.id}`)}
                    className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-gray-50/70"
                  >
                    {r.photoUrl ? (
                      <img src={r.photoUrl} alt="" className="size-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-rose-700">
                        {r.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#1f2937]">{r.name}</span>
                      <span className="block text-[11px] text-gray-500">
                        {r.unit ? `Flat ${r.unit}` : 'No flat assigned'}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      <AlertTriangle className="h-3 w-3" /> Critical
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyChart message="No residents in critical condition" />
          )}
        </Panel>

        <Panel
          icon={ClipboardList}
          title="Recent activity"
          subtitle="Latest across tickets, gate, billing and residents"
        >
          {data.recentActivity.length ? (
            <ul className="divide-y divide-gray-100">
              {data.recentActivity.map((a, i) => {
                const Icon = ACTIVITY_ICON[a.type] ?? Activity
                return (
                  <li key={`${a.type}-${i}`} className="flex items-start gap-3 py-2.5">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#1f2937]">{a.title}</span>
                      {a.detail && <span className="block truncate text-[11px] text-gray-500">{a.detail}</span>}
                    </span>
                    <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(a.at)}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyChart message="No activity yet" />
          )}
        </Panel>
      </div>
    </div>
  )
}
