import type { LucideIcon } from 'lucide-react'
import { BarChart3 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { SERIES, formatNumber } from './chartUtils'

export function Panel({
  title,
  icon: Icon,
  subtitle,
  action,
  children,
  className,
}: {
  title: string
  icon?: LucideIcon
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-lg backdrop-blur-xl',
        className,
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#005390]/10 text-[#005390]">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-[#1f2937]">{title}</h3>
            {subtitle && <p className="truncate text-[11px] text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  )
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'blue',
  onClick,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'slate'
  onClick?: () => void
}) {
  const tones = {
    blue: 'bg-sky-50 text-sky-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-rose-50 text-rose-700',
    violet: 'bg-violet-50 text-violet-700',
    slate: 'bg-slate-100 text-slate-700',
  }
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex min-w-0 items-start gap-3 rounded-[20px] border border-white/80 bg-white/80 p-4 text-left shadow-md backdrop-blur-xl',
        onClick && 'cursor-pointer transition-shadow hover:shadow-lg',
      )}
    >
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold tracking-wide text-gray-500 uppercase">{label}</span>
        <span className="block truncate text-2xl leading-tight font-black text-[#1f2937]">{value}</span>
        {hint && <span className="block truncate text-[11px] text-gray-500">{hint}</span>}
      </span>
    </Tag>
  )
}

export function EmptyChart({ message = 'No data yet', className }: { message?: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400',
        className,
      )}
    >
      <BarChart3 className="h-6 w-6" />
      {message}
    </div>
  )
}

/** A legend row with its value: identity never relies on colour alone. */
export function LegendRow({
  color,
  label,
  value,
  sub,
}: {
  color: string
  label: string
  value: ReactNode
  sub?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="flex min-w-0 items-center gap-2 text-gray-600">
        <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-bold text-[#1f2937] tabular-nums">
        {value}
        {sub && <span className="ml-1 font-medium text-gray-400">{sub}</span>}
      </span>
    </div>
  )
}

/** Donut with the total in the middle and a legend (with values) beside it. */
export function Donut({
  data,
  centerLabel,
  centerValue,
  format = formatNumber,
}: {
  data: { key: string; label: string; value: number; color: string }[]
  centerLabel: string
  centerValue?: ReactNode
  format?: (v: number) => string
}) {
  const total = data.reduce((a, d) => a + d.value, 0)
  if (total === 0) return <EmptyChart />
  const config = Object.fromEntries(data.map((d) => [d.key, { label: d.label, color: d.color }])) as ChartConfig
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative size-40 shrink-0">
        <ChartContainer config={config} className="aspect-square size-40">
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="key" hideLabel formatter={undefined} />}
              wrapperStyle={{ zIndex: 20 }}
            />
            <Pie
              data={data.filter((d) => d.value > 0)}
              dataKey="value"
              nameKey="key"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={data.filter((d) => d.value > 0).length > 1 ? 2 : 0}
              // The 2px surface gap separates slices; a single full ring has no seam.
              stroke={data.filter((d) => d.value > 0).length > 1 ? '#ffffff' : 'none'}
              strokeWidth={2}
            >
              {data
                .filter((d) => d.value > 0)
                .map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-[#1f2937]">{centerValue ?? format(total)}</span>
          <span className="text-[10px] font-semibold text-gray-500 uppercase">{centerLabel}</span>
        </div>
      </div>
      <div className="w-full min-w-0 flex-1 space-y-2">
        {data.map((d) => (
          <LegendRow
            key={d.key}
            color={d.color}
            label={d.label}
            value={format(d.value)}
            sub={`${Math.round((d.value / total) * 100)}%`}
          />
        ))}
      </div>
    </div>
  )
}

/** A labelled meter (value / max), for ranked lists that don't need a full chart. */
export function Meter({
  label,
  value,
  max,
  color = SERIES[0]!,
  display,
}: {
  label: string
  value: number
  max: number
  color?: string
  display?: ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-gray-600">{label}</span>
        <span className="shrink-0 font-bold text-[#1f2937] tabular-nums">{display ?? formatNumber(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
