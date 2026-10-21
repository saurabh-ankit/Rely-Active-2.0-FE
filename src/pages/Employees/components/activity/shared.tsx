import type React from 'react'
import { ChevronLeft, ChevronRight, Flag, Inbox, RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RANGE_PRESETS, humanize, statusLabel, type DateRange } from './utils'
import { Input } from '@/components/ui/input'

/** Shared pieces for the employee activity tabs. */

export const RangeFilter = ({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) => {
  const activePreset = RANGE_PRESETS.find((p) => {
    const r = p.range()
    return r.from === value.from && r.to === value.to
  })?.key

  const inputCls =
    'h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 outline-none focus:border-[#005390] dark:border-gray-700 dark:bg-slate-900 dark:text-gray-200'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl border border-gray-200 bg-slate-50 p-0.5 dark:border-gray-700 dark:bg-slate-800">
        {RANGE_PRESETS.map((p) => (
          <Button
            key={p.key}
            type="button"
            variant="ghost"
            onClick={() => onChange(p.range())}
            className={cn(
              'h-auto cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-transparent',
              activePreset === p.key
                ? 'bg-white text-[#005390] shadow-xs dark:bg-slate-900'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200',
            )}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          aria-label="From date"
          value={value.from}
          max={value.to}
          onChange={(e) => e.target.value && onChange({ ...value, from: e.target.value })}
          className={inputCls}
        />
        <span className="text-xs text-gray-400">to</span>
        <Input
          type="date"
          aria-label="To date"
          value={value.to}
          min={value.from}
          onChange={(e) => e.target.value && onChange({ ...value, to: e.target.value })}
          className={inputCls}
        />
      </div>
    </div>
  )
}

export const StatTile = ({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'blue',
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  hint?: string
  tone?: 'blue' | 'green' | 'amber' | 'rose' | 'slate'
}) => {
  const tones = {
    blue: 'bg-[#005390]/10 text-[#005390]',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-slate-900">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        {hint && <p className="truncate text-[11px] text-gray-400">{hint}</p>}
      </div>
    </div>
  )
}

const STATUS_TONES: Array<[RegExp, string, string]> = [
  [/^(closed|completed|delivered|attended)$/i, 'border-emerald-200 bg-emerald-50 text-emerald-700', 'bg-emerald-500'],
  [/^(resolved|inside|delivering|confirmed|approved|on_duty)$/i, 'border-sky-200 bg-sky-50 text-sky-700', 'bg-sky-500'],
  [
    /^(open|assigned|in_progress|pending|pendingapproval|on_hold)$/i,
    'border-amber-200 bg-amber-50 text-amber-700',
    'bg-amber-500',
  ],
  [/^(cancelled|failed|rejected|no_show)$/i, 'border-rose-200 bg-rose-50 text-rose-700', 'bg-rose-500'],
]

export const StatusPill = ({ value }: { value?: string | null }) => {
  const [, tone, dot] = STATUS_TONES.find(([re]) => value && re.test(value)) ?? [
    null,
    'border-gray-200 bg-gray-50 text-gray-600',
    'bg-gray-400',
  ]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        tone,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {statusLabel(value)}
    </span>
  )
}

const PRIORITY_TONES: Record<string, string> = {
  CRITICAL: 'text-rose-600',
  HIGH: 'text-orange-600',
  MEDIUM: 'text-amber-600',
  LOW: 'text-slate-500',
}

/** Priority reads as a flag next to the status, so the two don't look alike. */
export const PriorityTag = ({ value }: { value?: string | null }) =>
  value ? (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold',
        PRIORITY_TONES[value.toUpperCase()] ?? 'text-gray-500',
      )}
    >
      <Flag className="h-3 w-3" />
      {humanize(value)}
    </span>
  ) : null

/** Segmented filter with optional counts, e.g. All (3) · Assigned (0) · In progress (1). */
export const FilterChips = ({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string; count?: number }>
  value: string
  onChange: (value: string) => void
}) => (
  <div className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 pb-0.5" role="tablist">
    {options.map((o) => {
      const active = o.value === value
      return (
        <Button
          key={o.value || 'all'}
          type="button"
          variant="ghost"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-auto inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
            active
              ? 'border-[#005390] bg-[#005390] text-white hover:bg-[#005390] hover:text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-300',
          )}
        >
          {o.label}
          {o.count != null && (
            <span
              className={cn(
                'rounded-full px-1.5 text-[10px] font-bold',
                active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              {o.count}
            </span>
          )}
        </Button>
      )
    })}
  </div>
)

export const LoadingState = ({ label }: { label: string }) => (
  <div className="p-8 text-center text-xs text-gray-400">
    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#005390]" />
    {label}
  </div>
)

export const EmptyState = ({ label, hint }: { label: string; hint?: string }) => (
  <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
    <Inbox className="mx-auto mb-2 h-6 w-6 text-gray-300" />
    <p className="text-sm font-semibold text-gray-500">{label}</p>
    {hint && <p className="mx-auto mt-1 max-w-md text-xs text-gray-400">{hint}</p>}
  </div>
)

export const Pager = ({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number
  totalPages: number
  total: number
  onChange: (page: number) => void
}) => {
  if (totalPages <= 1) return null
  return (
    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800">
      <span>
        Page {page} of {totalPages} · {total} records
      </span>
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-gray-200 text-gray-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-gray-200 text-gray-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
