import {
  Ban,
  ChefHat,
  IndianRupee,
  Leaf,
  Package,
  ShoppingBag,
  Timer,
  TrendingUp,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { DashboardDiningAnalytics } from '@/lib/types/dashboard'
import { SERIES, STATUS, dayLabel, formatINR, formatINRCompact, formatNumber, monthLabel, humanize } from './chartUtils'
import { RankList, SeriesBars } from './analyticsShared'
import { Donut, Panel, StatTile } from './shared'

export function DiningTab({ data }: { data: DashboardDiningAnalytics }) {
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          icon={ShoppingBag}
          label="Orders this month"
          value={formatNumber(data.ordersThisMonth)}
          hint={`${data.cancelledThisMonth} cancelled`}
          onClick={() => navigate('/admin/fnb-history')}
        />
        <StatTile
          icon={IndianRupee}
          tone="green"
          label="F&B revenue"
          value={formatINRCompact(data.revenueThisMonth)}
          hint="Orders this month"
        />
        <StatTile
          icon={Utensils}
          tone="violet"
          label="Dined in"
          value={formatNumber(data.dineInThisMonth)}
          hint={`This month · ${data.lateMarksThisMonth} marked late`}
        />
        <StatTile
          icon={Timer}
          tone="amber"
          label="Avg prep time"
          value={data.avgPrepMinutes ? `${data.avgPrepMinutes} min` : '-'}
          hint="Accepted to ready, 30 days"
        />
        <StatTile
          icon={Package}
          tone="slate"
          label="Food packages"
          value={formatNumber(data.activePackages)}
          hint={`${formatINR(data.activePackagesValue)} active value`}
        />
        <StatTile
          icon={Ban}
          tone="red"
          label="Cancelled"
          value={formatNumber(data.cancelledThisMonth)}
          hint="Orders this month"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel
          icon={UtensilsCrossed}
          title="Orders per day"
          subtitle="Last 14 days, by service"
          className="xl:col-span-2"
        >
          <SeriesBars
            data={data.daily}
            xKey="day"
            xFormat={dayLabel}
            stacked
            series={[
              { key: 'dineIn', label: 'Dine-in', color: SERIES[0]! },
              { key: 'roomService', label: 'Room service', color: SERIES[1]! },
            ]}
            empty="No orders in the last 14 days"
          />
        </Panel>
        <Panel icon={ChefHat} title="Top dishes" subtitle="Quantity ordered, last 30 days">
          <RankList
            color={SERIES[2]}
            rows={data.topDishes.map((d) => ({
              label: d.name,
              value: d.quantity,
              display: `${formatNumber(d.quantity)} · ${formatINR(d.amount)}`,
            }))}
            empty="No dishes ordered yet"
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel icon={Utensils} title="Dining attendance by meal" subtitle="Last 30 days" className="xl:col-span-2">
          <SeriesBars
            data={data.mealSlots}
            xKey="name"
            stacked
            height="h-64"
            series={[
              { key: 'attended', label: 'Attended', color: STATUS.good },
              { key: 'absent', label: 'Absent', color: STATUS.critical },
              { key: 'optedOut', label: 'Opted out', color: STATUS.warning },
            ]}
            empty="No attendance marked in the last 30 days"
          />
        </Panel>
        <Panel icon={TrendingUp} title="F&B revenue" subtitle="Last 6 months">
          <SeriesBars
            data={data.monthlyRevenue}
            xKey="month"
            xFormat={monthLabel}
            yFormat={formatINRCompact}
            height="h-64"
            series={[{ key: 'revenue', label: 'Revenue', color: SERIES[0]! }]}
            empty="No orders in the last 6 months"
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel icon={ShoppingBag} title="Order types" subtitle="Last 30 days">
          <Donut
            centerLabel="orders"
            data={data.orderTypes.map((t, i) => ({
              key: t.key,
              label: humanize(t.key),
              value: t.count,
              color: SERIES[i % SERIES.length]!,
            }))}
          />
        </Panel>
        <Panel icon={Leaf} title="Dietary preference" subtitle="Residents on an active food package">
          <Donut
            centerLabel="packages"
            data={data.dietaryPreferences.map((t, i) => ({
              key: t.key,
              label: humanize(t.key),
              value: t.count,
              color: SERIES[(i + 2) % SERIES.length]!,
            }))}
          />
        </Panel>
      </div>
    </div>
  )
}
