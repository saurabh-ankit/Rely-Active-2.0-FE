import React, { useMemo, useState, type ReactNode } from 'react'
import { Calendar, Clock, DropletOff, Droplets, Loader2, UserRound } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResidentFluidBalanceHistoryQuery } from '@/hooks/react-query/resident'
import {
  BOWEL_COMFORT_OPTIONS,
  FLUID_INTAKE_TYPE_OPTIONS,
  FLUID_OUTPUT_TYPE_OPTIONS,
  FLUID_UNIT_OPTIONS,
  FluidBalanceCategory,
  FluidIntakeType,
  FluidOutputType,
  IV_FLUID_TYPE_OPTIONS,
  STOOL_TYPE_OPTIONS,
  type FluidOption,
} from '@/lib/constants/fluidBalance'
import type { ResidentFluidBalanceItem } from '@/lib/types/resident'
import { cn } from '@/lib/utils'

const BOWEL_FILTER = 'bowel'

type FilterKey = FluidIntakeType | FluidOutputType | typeof BOWEL_FILTER

const INTAKE_FILTERS: FluidOption<FilterKey>[] = [
  { value: FluidIntakeType.ORAL_NG, label: 'Oral/NG' },
  { value: FluidIntakeType.IV_FLUIDS, label: 'IV Fluids' },
  { value: FluidIntakeType.NASAL_FEED, label: 'Nasal Feed' },
]

const OUTPUT_FILTERS: FluidOption<FilterKey>[] = [
  { value: FluidOutputType.URINE, label: 'Urine' },
  { value: FluidOutputType.VOMIT_DRAIN, label: 'Vomit/Drain' },
  { value: BOWEL_FILTER, label: 'Bowel Movement' },
]

const ALL_FILTERS = [...INTAKE_FILTERS, ...OUTPUT_FILTERS].map((f) => f.value)

function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function labelOf(options: FluidOption<string>[], value: string | null): string | null {
  if (!value) return null
  return options.find((o) => o.value === value)?.label ?? value
}

function formatQuantity(entry: ResidentFluidBalanceItem): string {
  if (entry.quantity === null) return ''
  return `${entry.quantity} ${labelOf(FLUID_UNIT_OPTIONS, entry.unit) ?? ''}`.trim()
}

function filterKeyOf(entry: ResidentFluidBalanceItem): FilterKey | null {
  if (entry.category === FluidBalanceCategory.BOWEL) return BOWEL_FILTER
  return (entry.fluidType as FilterKey | null) ?? null
}

function recordedBy(entry: ResidentFluidBalanceItem): string | null {
  return entry.recordedByName ?? entry.createdByName ?? null
}

function RecordMeta({ entry }: { entry: ResidentFluidBalanceItem }) {
  const by = recordedBy(entry)
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold text-muted-foreground">
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatTime(entry.recordedAt)}
      </span>
      {by && (
        <span className="flex min-w-0 items-center gap-1">
          <UserRound className="h-3 w-3 shrink-0" />
          <span className="truncate">{by}</span>
        </span>
      )}
    </div>
  )
}

function FluidRecord({ entry, tone }: { entry: ResidentFluidBalanceItem; tone: 'intake' | 'output' }) {
  const isIntake = tone === 'intake'
  const typeLabel = labelOf(isIntake ? FLUID_INTAKE_TYPE_OPTIONS : FLUID_OUTPUT_TYPE_OPTIONS, entry.fluidType)
  const detail = isIntake
    ? (labelOf(IV_FLUID_TYPE_OPTIONS, entry.ivFluidType) ?? entry.description)
    : entry.collectedBy && `Collected by ${entry.collectedBy}`

  return (
    <div className="space-y-1 rounded-xl border border-gray-200 bg-slate-50/80 p-2.5 dark:border-gray-800 dark:bg-slate-900/60">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold leading-tight text-foreground">{typeLabel}</p>
        <span
          className={cn(
            'shrink-0 text-xs font-black',
            isIntake ? 'text-[#005390] dark:text-blue-400' : 'text-orange-600 dark:text-orange-400',
          )}
        >
          {formatQuantity(entry)}
        </span>
      </div>
      {detail && <p className="break-words text-[11px] font-medium text-muted-foreground">{detail}</p>}
      <RecordMeta entry={entry} />
    </div>
  )
}

function BowelRecord({ entry }: { entry: ResidentFluidBalanceItem }) {
  return (
    <div className="space-y-1 rounded-xl border border-gray-200 bg-slate-50/80 p-2.5 dark:border-gray-800 dark:bg-slate-900/60">
      <p className="text-xs font-bold leading-tight text-foreground">Bowel Movement</p>
      <p className="text-[11px] font-medium text-muted-foreground">
        {[labelOf(STOOL_TYPE_OPTIONS, entry.stoolType), labelOf(BOWEL_COMFORT_OPTIONS, entry.comfortLevel)]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {entry.note && <p className="break-words text-[11px] text-muted-foreground">{entry.note}</p>}
      <RecordMeta entry={entry} />
    </div>
  )
}

function RecordsColumn({
  title,
  titleClassName,
  date,
  totalMl,
  emptyText,
  loading,
  children,
}: {
  title: string
  titleClassName: string
  date: string
  totalMl: number
  emptyText: string
  loading: boolean
  children: ReactNode[]
}) {
  return (
    <div className="min-w-0 space-y-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-slate-900">
      <div className="space-y-0.5">
        <h3 className={cn('text-xs font-black', titleClassName)}>{title}</h3>
        <div className="flex items-center justify-between gap-1">
          <p className="text-[10px] font-semibold text-muted-foreground">{formatDay(date)}</p>
          {totalMl > 0 && <p className="text-[10px] font-bold text-muted-foreground">{totalMl} ml</p>}
        </div>
      </div>
      {loading ? (
        <div className="space-y-2 py-6 text-center text-gray-400">
          <Loader2 className="mx-auto size-5 animate-spin text-[#005390]" />
        </div>
      ) : children.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <DropletOff className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-[11px] font-medium text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  )
}

interface FluidBalanceHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  initialDate: string
}

export const FluidBalanceHistoryModal: React.FC<FluidBalanceHistoryModalProps> = ({
  open,
  onOpenChange,
  residentId,
  initialDate,
}) => {
  const [date, setDate] = useState(initialDate || todayStr())
  const [filters, setFilters] = useState<Set<FilterKey>>(() => new Set(ALL_FILTERS))
  const [prevOpen, setPrevOpen] = useState(open)
  const [prevInitialDate, setPrevInitialDate] = useState(initialDate)

  // Reset the picker when the dialog opens or the caller's selected date changes.
  if (open !== prevOpen || (open && initialDate !== prevInitialDate)) {
    setPrevOpen(open)
    setPrevInitialDate(initialDate)
    if (open) setDate(initialDate || todayStr())
  }

  const historyQuery = useResidentFluidBalanceHistoryQuery(residentId, date, open)

  const { intakes, outputs, intakeMl, outputMl } = useMemo(() => {
    const visible = (historyQuery.data?.entries ?? []).filter((entry) => {
      const key = filterKeyOf(entry)
      return key !== null && filters.has(key)
    })
    const intakeRows = visible.filter((e) => e.category === FluidBalanceCategory.INTAKE)
    const outputRows = visible.filter((e) => e.category !== FluidBalanceCategory.INTAKE)
    const sumMl = (rows: ResidentFluidBalanceItem[]) =>
      Math.round(rows.reduce((total, e) => total + (e.quantityMl ?? 0), 0) * 100) / 100
    return { intakes: intakeRows, outputs: outputRows, intakeMl: sumMl(intakeRows), outputMl: sumMl(outputRows) }
  }, [historyQuery.data, filters])

  const toggleFilter = (key: FilterKey, checked: boolean) =>
    setFilters((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })

  const renderFilter = (filter: FluidOption<FilterKey>) => (
    <label
      key={filter.value}
      className="flex cursor-pointer select-none items-center gap-2 text-xs font-semibold text-foreground"
    >
      <Checkbox
        checked={filters.has(filter.value)}
        onCheckedChange={(checked) => toggleFilter(filter.value, checked === true)}
        className="data-checked:border-[#005390] data-checked:bg-[#005390]"
      />
      {filter.label}
    </label>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-sky-500" />
            Fluid History
          </DialogTitle>
          <DialogDescription>Intake and output records for the selected day, filtered by category.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-slate-50/60 p-4 dark:border-gray-800 dark:bg-slate-900/40">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-muted-foreground">Records Date</Label>
            <div className="relative max-w-xs">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="h-10 rounded-xl pl-9 text-xs font-semibold"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-muted-foreground">Filter by Category</Label>
            <div className="grid grid-cols-2 gap-x-3">
              <div className="space-y-2.5">{INTAKE_FILTERS.map(renderFilter)}</div>
              <div className="space-y-2.5">{OUTPUT_FILTERS.map(renderFilter)}</div>
            </div>
          </div>
        </div>

        {historyQuery.isError ? (
          <p className="text-center text-xs font-semibold text-destructive">Could not load fluid history</p>
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            <RecordsColumn
              title="INTAKE (INPUT) Records"
              titleClassName="text-[#005390] dark:text-blue-400"
              date={date}
              totalMl={intakeMl}
              emptyText="No intake records found"
              loading={historyQuery.isLoading}
            >
              {intakes.map((entry) => (
                <FluidRecord key={entry.id} entry={entry} tone="intake" />
              ))}
            </RecordsColumn>
            <RecordsColumn
              title="OUTPUT Records"
              titleClassName="text-orange-600 dark:text-orange-400"
              date={date}
              totalMl={outputMl}
              emptyText="No output records found"
              loading={historyQuery.isLoading}
            >
              {outputs.map((entry) =>
                entry.category === FluidBalanceCategory.BOWEL ? (
                  <BowelRecord key={entry.id} entry={entry} />
                ) : (
                  <FluidRecord key={entry.id} entry={entry} tone="output" />
                ),
              )}
            </RecordsColumn>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default FluidBalanceHistoryModal
