import { AlertTriangle, Boxes, ClipboardList, PackageCheck, PackageX, Shapes, Truck, Warehouse } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { DashboardInventory } from '@/lib/types/dashboard'
import { AXIS_TICK, GRID, SERIES, STATUS, formatNumber, monthLabel } from './chartUtils'
import { Donut, EmptyChart, Meter, Panel, StatTile } from './shared'

const movementConfig = {
  received: { label: 'Received', color: SERIES[0] },
  issued: { label: 'Issued', color: SERIES[1] },
} satisfies ChartConfig

const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export function InventoryTab({ data }: { data: DashboardInventory }) {
  const navigate = useNavigate()
  const hasMovement = data.monthly.some((m) => m.issued || m.received)
  const maxCategory = Math.max(1, ...data.byCategory.map((c) => c.quantity))
  const healthy = Math.max(0, data.inStock - Math.max(0, data.lowStock - data.outOfStock))
  const lowButIn = Math.max(0, data.lowStock - data.outOfStock)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          icon={Boxes}
          label="Items tracked"
          value={formatNumber(data.itemsTracked)}
          hint={`${data.categories} categories`}
          onClick={() => navigate('/admin/inventory')}
        />
        <StatTile icon={Warehouse} tone="blue" label="Units in stock" value={formatNumber(data.totalUnits)} />
        <StatTile
          icon={PackageCheck}
          tone="green"
          label="In stock"
          value={formatNumber(data.inStock)}
          hint="Items with stock"
        />
        <StatTile
          icon={AlertTriangle}
          tone="amber"
          label="Low stock"
          value={formatNumber(data.lowStock)}
          hint="At or below reorder level"
        />
        <StatTile icon={PackageX} tone="red" label="Out of stock" value={formatNumber(data.outOfStock)} />
        <StatTile
          icon={Truck}
          tone="violet"
          label="Suppliers"
          value={formatNumber(data.suppliers)}
          hint={`${data.purchaseOrders.total} purchase orders`}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel
          icon={Warehouse}
          title="Stock movement"
          subtitle="Units received and issued over the last 6 months"
          className="xl:col-span-2"
        >
          {hasMovement ? (
            <ChartContainer config={movementConfig} className="aspect-auto h-64 w-full">
              <BarChart data={data.monthly} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} tick={AXIS_TICK} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={48} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => monthLabel(String(v))} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="received" fill="var(--color-received)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="issued" fill="var(--color-issued)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChart message="No stock received or issued in the last 6 months" />
          )}
        </Panel>

        <Panel icon={PackageCheck} title="Stock health" subtitle="Tracked items by stock level">
          <Donut
            centerLabel="items"
            data={[
              { key: 'healthy', label: 'Healthy', value: healthy, color: STATUS.good },
              { key: 'low', label: 'Low stock', value: lowButIn, color: STATUS.warning },
              { key: 'out', label: 'Out of stock', value: data.outOfStock, color: STATUS.critical },
            ]}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel icon={Shapes} title="Stock by category" subtitle="Units in stock in each category">
          {data.byCategory.length ? (
            <div className="space-y-3">
              {data.byCategory.map((c) => (
                <Meter
                  key={c.category}
                  label={`${c.category} · ${c.items} item${c.items === 1 ? '' : 's'}`}
                  value={c.quantity}
                  max={maxCategory}
                />
              ))}
            </div>
          ) : (
            <EmptyChart message="No items tracked" />
          )}
        </Panel>

        <Panel icon={AlertTriangle} title="Reorder soon" subtitle="Items at or below their reorder level">
          {data.lowStockItems.length ? (
            <ul className="divide-y divide-gray-100">
              {data.lowStockItems.map((i) => (
                <li key={i.name} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[#1f2937]">{i.name}</span>
                    {i.category && <span className="block text-[11px] text-gray-500">{i.category}</span>}
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        i.quantity <= 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {i.quantity <= 0 ? <PackageX className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {i.quantity <= 0 ? 'Out of stock' : `${formatNumber(i.quantity)} left`}
                    </span>
                    <span className="block text-[10px] text-gray-400">Reorder at {formatNumber(i.threshold)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyChart message="All items are above their reorder level" />
          )}
        </Panel>

        <Panel icon={ClipboardList} title="Purchase orders" subtitle={`${data.purchaseOrders.total} in all`}>
          {data.purchaseOrders.byStatus.length ? (
            <div className="space-y-3">
              {data.purchaseOrders.byStatus.map((p) => (
                <Meter
                  key={p.status}
                  label={label(p.status)}
                  value={p.count}
                  max={Math.max(1, ...data.purchaseOrders.byStatus.map((x) => x.count))}
                />
              ))}
            </div>
          ) : (
            <EmptyChart message="No purchase orders yet" />
          )}
        </Panel>
      </div>
    </div>
  )
}
