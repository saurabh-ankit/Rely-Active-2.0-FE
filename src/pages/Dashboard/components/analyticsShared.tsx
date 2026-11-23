import type { LucideIcon } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { AXIS_TICK, GRID, SERIES, formatNumber } from './chartUtils'
import { EmptyChart, Meter } from './shared'

export type Series = { key: string; label: string; color: string }

/** Grouped (or stacked) bars over a day / month / category axis, with a legend when there is more than one series. */
export function SeriesBars<T extends object>({
  data,
  xKey,
  series,
  xFormat,
  yFormat = formatNumber,
  stacked = false,
  empty = 'No data yet',
  height = 'h-72',
}: {
  data: T[]
  xKey: keyof T & string
  series: Series[]
  xFormat?: (v: string) => string
  yFormat?: (v: number) => string
  stacked?: boolean
  empty?: string
  height?: string
}) {
  const hasData = data.some((row) => series.some((s) => Number((row as Record<string, unknown>)[s.key]) > 0))
  if (!hasData) return <EmptyChart message={empty} />
  const config = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }])) as ChartConfig
  return (
    <ChartContainer config={config} className={`aspect-auto ${height} w-full`}>
      <BarChart data={data as Record<string, unknown>[]} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey={xKey as string}
          tickFormatter={xFormat ? (v) => xFormat(String(v)) : undefined}
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          minTickGap={12}
        />
        <YAxis
          tickFormatter={yFormat}
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
          width={48}
          allowDecimals={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(v) => (xFormat ? xFormat(String(v)) : String(v))}
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{config[String(name)]?.label ?? name}</span>
                  <span className="font-mono font-medium text-foreground tabular-nums">{yFormat(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            fill={`var(--color-${s.key})`}
            stackId={stacked ? 'a' : undefined}
            radius={stacked ? (i === series.length - 1 ? [4, 4, 0, 0] : 0) : [4, 4, 0, 0]}
            maxBarSize={stacked ? 28 : 22}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

/** Ranked meters for a key → count list. */
export function RankList({
  rows,
  empty = 'No data yet',
  color = SERIES[0],
  format = formatNumber,
}: {
  rows: { label: string; value: number; display?: ReactNode }[]
  empty?: string
  color?: string
  format?: (v: number) => string
}) {
  if (!rows.length || rows.every((r) => r.value === 0)) return <EmptyChart message={empty} />
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Meter
          key={r.label}
          label={r.label}
          value={r.value}
          max={max}
          color={color}
          display={r.display ?? format(r.value)}
        />
      ))}
    </div>
  )
}

/** Small figure boxes, two or three to a row. */
export function FigureGrid({ items }: { items: { label: string; value: ReactNode; icon?: LucideIcon }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 text-[11px] text-gray-500">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-xl border border-gray-100 bg-white/70 p-3">
          <div className="flex items-center gap-1.5 text-xl font-black text-[#1f2937]">
            {Icon && <Icon className="h-4 w-4 text-gray-400" />}
            {value}
          </div>
          {label}
        </div>
      ))}
    </div>
  )
}

export function AnalyticsLoading() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-[20px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Skeleton className="h-80 rounded-[24px] xl:col-span-2" />
        <Skeleton className="h-80 rounded-[24px]" />
      </div>
    </div>
  )
}

export function AnalyticsError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
      <span className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        Failed to load {label.toLowerCase()} analytics.
      </span>
      <Button
        type="button"
        variant="ghost"
        onClick={onRetry}
        className="h-auto p-0 ml-2 font-bold underline hover:bg-transparent hover:text-rose-900 text-rose-700"
      >
        Retry
      </Button>
    </div>
  )
}
