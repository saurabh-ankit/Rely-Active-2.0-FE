import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  Clock,
  Layers,
  Smile,
  Ticket,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { DashboardTicketsAnalytics } from '@/lib/types/dashboard'
import { SERIES, STATUS, formatNumber, monthLabel } from './chartUtils'
import { RankList, SeriesBars } from './analyticsShared'
import { Donut, Panel, StatTile } from './shared'

const hours = (h: number) => (h >= 48 ? `${Math.round(h / 24)} d` : `${h} h`)

export function TicketsTab({ data }: { data: DashboardTicketsAnalytics }) {
  const navigate = useNavigate()
  const fbTotal = data.feedback.good + data.feedback.average + data.feedback.poor

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          icon={Ticket}
          label="Open tickets"
          value={formatNumber(data.open)}
          hint={`${formatNumber(data.total)} raised in all`}
          onClick={() => navigate('/admin/tickets')}
        />
        <StatTile
          icon={AlarmClock}
          tone="red"
          label="Overdue"
          value={formatNumber(data.overdue)}
          hint={`${data.escalated} escalated`}
        />
        <StatTile
          icon={TrendingUp}
          tone="violet"
          label="Raised this month"
          value={formatNumber(data.raisedThisMonth)}
          hint={`${data.resolvedThisMonth} resolved this month`}
        />
        <StatTile
          icon={Clock}
          tone="amber"
          label="Avg resolution"
          value={data.avgResolutionHours ? hours(data.avgResolutionHours) : '-'}
          hint="Raised to resolved, last 6 months"
        />
        <StatTile
          icon={CheckCircle2}
          tone="green"
          label="Resolved on time"
          value={`${data.onTimeRate}%`}
          hint="Within the deadline (TAT)"
        />
        <StatTile
          icon={CalendarClock}
          tone="slate"
          label="Deadlines extended"
          value={formatNumber(data.deadlinesExtended)}
          hint="TAT changes, last 6 months"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel icon={TrendingUp} title="Raised vs resolved" subtitle="Last 6 months" className="xl:col-span-2">
          <SeriesBars
            data={data.monthly}
            xKey="month"
            xFormat={monthLabel}
            series={[
              { key: 'created', label: 'Raised', color: SERIES[0]! },
              { key: 'resolved', label: 'Resolved', color: SERIES[2]! },
            ]}
            empty="No tickets in the last 6 months"
          />
        </Panel>
        <Panel icon={Layers} title="By category" subtitle="All tickets, open shown alongside">
          <RankList
            rows={data.byCategory.map((c) => ({
              label: c.name,
              value: c.total,
              display: `${c.total} · ${c.open} open`,
            }))}
            empty="No tickets yet"
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel icon={Users} title="By department" subtitle="Tickets and average resolution time">
          <RankList
            color={SERIES[1]}
            rows={data.byDepartment.map((d) => ({
              label: d.name,
              value: d.total,
              display: `${d.total} · ${d.open} open${d.avgResolutionHours ? ` · ${hours(d.avgResolutionHours)}` : ''}`,
            }))}
            empty="No tickets yet"
          />
        </Panel>
        <Panel icon={UserCheck} title="Staff workload" subtitle="Assigned staff with the most open tickets">
          <RankList
            color={SERIES[6]}
            rows={data.topAssignees.map((a) => ({
              label: a.name,
              value: a.open,
              display: `${a.open} open · ${a.resolved} resolved`,
            }))}
            empty="No tickets assigned yet"
          />
        </Panel>
        <Panel icon={Smile} title="Resident feedback" subtitle={`${formatNumber(fbTotal)} ratings on closed tickets`}>
          <Donut
            centerLabel="ratings"
            data={[
              { key: 'good', label: 'Good', value: data.feedback.good, color: STATUS.good },
              { key: 'average', label: 'Average', value: data.feedback.average, color: STATUS.warning },
              { key: 'poor', label: 'Poor', value: data.feedback.poor, color: STATUS.critical },
            ]}
          />
        </Panel>
      </div>
    </div>
  )
}
