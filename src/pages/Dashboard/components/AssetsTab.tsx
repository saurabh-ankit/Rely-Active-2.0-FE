import { BadgeAlert, Boxes, CalendarClock, FileWarning, IndianRupee, ShieldCheck, Wrench, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { DashboardAssetsAnalytics } from '@/lib/types/dashboard'
import { cn } from '@/lib/utils'
import { SERIES, STATUS, formatINR, formatINRCompact, formatNumber, monthLabel, humanize } from './chartUtils'
import { RankList, SeriesBars } from './analyticsShared'
import { Donut, EmptyChart, Panel, StatTile } from './shared'

const KIND_LABEL = {
  service: 'Service',
  inspection: 'Inspection',
  certificate: 'Certificate expiry',
  warranty: 'Warranty ends',
}
const CONDITION_COLOR: Record<string, string> = {
  excellent: STATUS.good,
  good: SERIES[2]!,
  fair: STATUS.warning,
  poor: STATUS.critical,
}

const dueLabel = (iso: string) => {
  const days = Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
  if (days < 0) return `${-days} d overdue`
  if (days === 0) return 'Today'
  return `in ${days} d`
}

export function AssetsTab({ data }: { data: DashboardAssetsAnalytics }) {
  const navigate = useNavigate()
  const w = data.warranty

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          icon={Boxes}
          label="Assets"
          value={formatNumber(data.total)}
          hint={`${data.inMaintenance} in maintenance`}
          onClick={() => navigate('/admin/asset-management')}
        />
        <StatTile
          icon={IndianRupee}
          tone="green"
          label="Current value"
          value={formatINRCompact(data.currentValue)}
          hint={`Bought for ${formatINR(data.purchaseValue)}`}
        />
        <StatTile
          icon={Wrench}
          tone="red"
          label="Services overdue"
          value={formatNumber(data.servicesOverdue)}
          hint={`${data.servicesDueSoon} due in 30 days`}
        />
        <StatTile
          icon={ShieldCheck}
          tone="amber"
          label="Warranties ending"
          value={formatNumber(w.within30 + w.within60 + w.within90)}
          hint="In the next 90 days"
        />
        <StatTile
          icon={FileWarning}
          tone="violet"
          label="Certificates"
          value={formatNumber(data.certificatesExpiring)}
          hint={`Expiring in 60 days · ${data.certificatesExpired} expired`}
        />
        <StatTile
          icon={XCircle}
          tone="slate"
          label="Failed inspections"
          value={formatNumber(data.inspectionsFailed)}
          hint="Last 12 months"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel
          icon={Wrench}
          title="Maintenance cost"
          subtitle="Service log cost, last 6 months"
          className="xl:col-span-2"
        >
          <SeriesBars
            data={data.maintenanceCost}
            xKey="month"
            xFormat={monthLabel}
            yFormat={formatINRCompact}
            series={[{ key: 'cost', label: 'Cost', color: SERIES[1]! }]}
            empty="No service costs logged in the last 6 months"
          />
          {data.serviceTypes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.serviceTypes.map((s) => (
                <span
                  key={s.key}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600"
                >
                  {humanize(s.key)} <b className="text-[#1f2937]">{s.count}</b>
                </span>
              ))}
            </div>
          )}
        </Panel>
        <Panel icon={CalendarClock} title="Coming up" subtitle="Overdue and due in the next 60 days">
          {data.upcoming.length ? (
            <ul className="space-y-2">
              {data.upcoming.map((u, i) => {
                const overdue = new Date(u.at) < new Date(new Date().toDateString())
                return (
                  <li
                    key={`${u.kind}-${u.asset}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white/70 px-3 py-2 text-xs"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[#1f2937]">{u.asset}</span>
                      <span className="text-[11px] text-gray-500">{KIND_LABEL[u.kind] ?? humanize(u.kind)}</span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        overdue ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700',
                      )}
                    >
                      {dueLabel(u.at)}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyChart message="Nothing due in the next 60 days" />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel icon={Boxes} title="By category" subtitle="Assets and current value">
          <RankList
            rows={data.byCategory.map((c) => ({
              label: c.name,
              value: c.count,
              display: `${c.count} · ${formatINRCompact(c.value)}`,
            }))}
            empty="No assets yet"
          />
        </Panel>
        <Panel icon={BadgeAlert} title="Condition" subtitle="Assets in use">
          <Donut
            centerLabel="assets"
            data={data.condition.map((c, i) => ({
              key: c.key,
              label: humanize(c.key),
              value: c.count,
              color: CONDITION_COLOR[c.key] ?? SERIES[(i + 4) % SERIES.length]!,
            }))}
          />
        </Panel>
        <Panel icon={ShieldCheck} title="Warranty cover" subtitle="When each asset's warranty ends">
          <RankList
            color={SERIES[6]}
            rows={[
              { label: 'Already expired', value: w.expired },
              { label: 'Within 30 days', value: w.within30 },
              { label: '31 to 60 days', value: w.within60 },
              { label: '61 to 90 days', value: w.within90 },
              { label: 'Later', value: w.later },
              { label: 'No warranty recorded', value: w.none },
            ]}
            empty="No assets yet"
          />
        </Panel>
      </div>
    </div>
  )
}
