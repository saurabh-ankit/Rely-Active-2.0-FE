import { BedDouble, Building2, DoorClosed, Home, Layers, TrendingUp, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { DashboardOccupancy } from '@/lib/types/dashboard'
import { AXIS_TICK, GRID, SERIES, formatNumber, monthLabel } from './chartUtils'
import { Donut, EmptyChart, Panel, StatTile } from './shared'

const occupiedConfig = {
  occupied: { label: 'Occupied', color: SERIES[0] },
  vacant: { label: 'Vacant', color: SERIES[1] },
} satisfies ChartConfig

const movementConfig = {
  moveIns: { label: 'Moved in', color: SERIES[0] },
  moveOuts: { label: 'Moved out', color: SERIES[1] },
} satisfies ChartConfig

/** Occupied vs vacant as a stacked bar per row (block or unit type), with a 2px gap between segments. */
function OccupiedBars({
  data,
  labelKey,
}: {
  data: { label: string; occupied: number; vacant: number }[]
  labelKey: string
}) {
  if (!data.length) return <EmptyChart message={`No ${labelKey} set up`} />
  return (
    <ChartContainer
      config={occupiedConfig}
      className="aspect-auto w-full"
      style={{ height: Math.max(160, data.length * 44 + 60) }}
    >
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }} barCategoryGap={10}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} width={84} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="occupied"
          stackId="u"
          fill="var(--color-occupied)"
          maxBarSize={24}
          stroke="#ffffff"
          strokeWidth={2}
        />
        <Bar
          dataKey="vacant"
          stackId="u"
          fill="var(--color-vacant)"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
          stroke="#ffffff"
          strokeWidth={2}
        />
      </BarChart>
    </ChartContainer>
  )
}

export function OccupancyTab({ data }: { data: DashboardOccupancy }) {
  const hasMovement = data.movement.some((m) => m.moveIns || m.moveOuts)
  const vacantFree = Math.max(0, data.vacant - data.booked)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          icon={Building2}
          label="Total units"
          value={formatNumber(data.totalUnits)}
          hint={`${data.blocks} blocks · ${data.floors} floors`}
        />
        <StatTile
          icon={Home}
          tone="green"
          label="Occupied"
          value={formatNumber(data.occupied)}
          hint={`${data.occupancyRate}% occupancy`}
        />
        <StatTile
          icon={DoorClosed}
          tone="amber"
          label="Vacant"
          value={formatNumber(data.vacant)}
          hint={`${data.booked} booked / on hold`}
        />
        <StatTile
          icon={Users}
          tone="violet"
          label="Residing residents"
          value={formatNumber(data.residingResidents)}
          hint={`+ ${formatNumber(data.residingFamilyMembers)} family members`}
        />
        <StatTile icon={BedDouble} tone="blue" label="Owner occupied" value={formatNumber(data.ownerOccupied)} />
        <StatTile icon={BedDouble} tone="slate" label="Tenant occupied" value={formatNumber(data.tenantOccupied)} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel icon={Home} title="Unit status" subtitle={`${data.occupancyRate}% of units are occupied`}>
          <Donut
            centerLabel="units"
            data={[
              { key: 'owner', label: 'Owner occupied', value: data.ownerOccupied, color: SERIES[0]! },
              { key: 'tenant', label: 'Tenant occupied', value: data.tenantOccupied, color: SERIES[1]! },
              { key: 'booked', label: 'Booked / on hold', value: data.booked, color: SERIES[2]! },
              { key: 'vacant', label: 'Vacant', value: vacantFree, color: SERIES[3]! },
            ]}
          />
        </Panel>

        <Panel
          icon={Layers}
          title="Occupancy by block"
          subtitle="Occupied and vacant units in each block"
          className="xl:col-span-2"
        >
          <OccupiedBars
            labelKey="blocks"
            data={data.byBlock.map((b) => ({ label: b.name, occupied: b.occupied, vacant: b.total - b.occupied }))}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel icon={BedDouble} title="Occupancy by unit type" subtitle="Occupied and vacant units of each type">
          <OccupiedBars
            labelKey="unit types"
            data={data.unitTypes.map((u) => ({ label: u.type, occupied: u.occupied, vacant: u.total - u.occupied }))}
          />
        </Panel>

        <Panel
          icon={TrendingUp}
          title="Move-ins and move-outs"
          subtitle="Residents moving in and out over the last 6 months"
        >
          {hasMovement ? (
            <ChartContainer config={movementConfig} className="aspect-auto h-64 w-full">
              <BarChart data={data.movement} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} tick={AXIS_TICK} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={40} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => monthLabel(String(v))} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="moveIns" fill="var(--color-moveIns)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="moveOuts" fill="var(--color-moveOuts)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChart message="No move-ins or move-outs in the last 6 months" />
          )}
        </Panel>
      </div>
    </div>
  )
}
