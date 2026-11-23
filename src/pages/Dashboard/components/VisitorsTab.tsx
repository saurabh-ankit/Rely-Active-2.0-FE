import { Building2, Clock, DoorOpen, Hourglass, Package, QrCode, ShieldCheck, Timer, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { DashboardVisitorsAnalytics } from '@/lib/types/dashboard'
import { SERIES, dayLabel, formatNumber, humanize } from './chartUtils'
import { FigureGrid, RankList, SeriesBars } from './analyticsShared'
import { Donut, Panel, StatTile } from './shared'

const hourLabel = (h: string) => {
  const n = Number(h)
  return `${n % 12 || 12}${n < 12 ? 'am' : 'pm'}`
}

const STATUS_LABEL: Record<string, string> = {
  PendingApproval: 'Awaiting approval',
  Approved: 'Approved',
  Inside: 'Inside',
  Completed: 'Left',
  Rejected: 'Rejected',
}

export function VisitorsTab({ data }: { data: DashboardVisitorsAnalytics }) {
  const navigate = useNavigate()
  const busiest = data.byHour.reduce((a, b) => (b.count > a.count ? b : a), data.byHour[0]!)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          icon={Users}
          label="Visitors, 30 days"
          value={formatNumber(data.last30Days.people)}
          hint={`${formatNumber(data.last30Days.entries)} gate entries`}
          onClick={() => navigate('/admin/visitor-history')}
        />
        <StatTile
          icon={DoorOpen}
          tone="green"
          label="Today"
          value={formatNumber(data.today)}
          hint="People at the gate"
        />
        <StatTile
          icon={ShieldCheck}
          tone="violet"
          label="Inside now"
          value={formatNumber(data.insideNow)}
          hint={`${data.awaitingApproval} awaiting approval`}
        />
        <StatTile
          icon={QrCode}
          tone="amber"
          label="Pre-approved"
          value={`${data.preapprovedRate}%`}
          hint="Of entries, last 30 days"
        />
        <StatTile
          icon={Timer}
          tone="slate"
          label="Avg visit"
          value={data.avgVisitMinutes ? `${data.avgVisitMinutes} min` : '-'}
          hint="Check-in to check-out"
        />
        <StatTile
          icon={Clock}
          tone="red"
          label="Busiest hour"
          value={busiest && busiest.count ? hourLabel(String(busiest.hour)) : '-'}
          hint="Last 30 days"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel icon={Users} title="Visitors per day" subtitle="Last 30 days" className="xl:col-span-2">
          <SeriesBars
            data={data.trend}
            xKey="day"
            xFormat={dayLabel}
            series={[{ key: 'count', label: 'Visitors', color: SERIES[0]! }]}
            empty="No visitors in the last 30 days"
          />
        </Panel>
        <Panel icon={Users} title="By visitor type" subtitle="Last 30 days">
          <Donut
            centerLabel="visitors"
            data={data.byType.map((t, i) => ({
              key: t.key,
              label: t.key,
              value: t.count,
              color: SERIES[i % SERIES.length]!,
            }))}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel
          icon={Clock}
          title="Arrivals by hour"
          subtitle="When visitors come in, last 30 days"
          className="xl:col-span-2"
        >
          <SeriesBars
            data={data.byHour}
            xKey="hour"
            xFormat={hourLabel}
            height="h-56"
            series={[{ key: 'count', label: 'Visitors', color: SERIES[1]! }]}
            empty="No visitors in the last 30 days"
          />
        </Panel>
        <Panel icon={Building2} title="Most visited flats" subtitle="Last 30 days">
          <RankList
            color={SERIES[2]}
            rows={data.topUnits.map((u) => ({ label: `Flat ${u.unit}`, value: u.count }))}
            empty="No visits to flats yet"
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel icon={DoorOpen} title="Walk-in vs pre-approved" subtitle="Last 30 days">
          <Donut
            centerLabel="entries"
            data={[
              { key: 'walkIn', label: 'Walk-in', value: data.bySource.walkIn, color: SERIES[0]! },
              { key: 'preapproved', label: 'Pre-approved', value: data.bySource.preapproved, color: SERIES[2]! },
            ]}
          />
        </Panel>
        <Panel icon={ShieldCheck} title="Entry status" subtitle="Last 30 days">
          <RankList
            color={SERIES[6]}
            rows={data.byStatus.map((s) => ({ label: STATUS_LABEL[s.key] ?? humanize(s.key), value: s.count }))}
            empty="No entries yet"
          />
        </Panel>
        <Panel icon={QrCode} title="Pre-approval passes" subtitle="All passes issued by residents">
          <FigureGrid
            items={[
              { label: 'Active', value: formatNumber(data.passes.active), icon: Hourglass },
              { label: 'Scanned at gate', value: formatNumber(data.passes.scanned), icon: QrCode },
              { label: 'Expired', value: formatNumber(data.passes.expired) },
              { label: 'Cancelled / rejected', value: formatNumber(data.passes.cancelled) },
            ]}
          />
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-sky-50/70 p-3 text-[11px] text-sky-800">
            <Package className="h-4 w-4 shrink-0" />
            {formatNumber(data.itemsLogged)} items logged at the gate in the last 30 days.
          </div>
        </Panel>
      </div>
    </div>
  )
}
