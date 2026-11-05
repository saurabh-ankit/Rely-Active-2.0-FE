import { XIcon } from 'lucide-react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  useComboboxAnchor,
} from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { ReportExtraFilterInfo, ReportFilterInfo, ReportFlat } from '@/lib/types/report'
import { cn } from '@/lib/utils'
import { DATE_PRESETS, matchingPreset, presetRange } from '../dateRange'

/** Grid columns at 2xl: the presets, then one 2xl column per control. */
const WIDE_COLUMNS: Record<number, string> = {
  3: '2xl:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,12rem))]',
  4: '2xl:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,11rem))]',
  5: '2xl:grid-cols-[minmax(0,1fr)_repeat(5,minmax(0,10rem))]',
  6: '2xl:grid-cols-[minmax(0,1fr)_repeat(6,minmax(0,9rem))]',
  7: '2xl:grid-cols-[minmax(0,1fr)_repeat(7,minmax(0,8.5rem))]',
}

const LABEL = 'block text-xs font-semibold text-gray-700 dark:text-slate-300'
const SELECT =
  'w-full [&_select]:h-9 [&_select]:rounded-xl [&_select]:bg-white [&_select]:text-xs dark:[&_select]:bg-slate-900'

/** `B-23`, `A-12, B-23` or `4 flats`. */
const flatSummary = (chosen: ReportFlat[]) =>
  chosen.length === 0
    ? 'All flats'
    : chosen.length <= 2
      ? chosen.map((f) => f.label).join(', ')
      : `${chosen.length} flats`

/** A flat as typed in the search box: its number, block and who lives there, so a name finds it too. */
const flatMatches = (flat: ReportFlat, query: string) =>
  [flat.label, flat.block, flat.people].join(' ').toLowerCase().includes(query.trim().toLowerCase())

function FilterSelect({
  id,
  filter,
  value,
  onChange,
}: {
  id: string
  filter: ReportFilterInfo
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={LABEL}>
        {filter.label}
      </label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)} className={SELECT}>
        <NativeSelectOption value="">All</NativeSelectOption>
        {filter.options.map((o) => (
          <NativeSelectOption key={o.value} value={o.value}>
            {o.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}

/**
 * Quick-pick ranges, From / To pickers, the tab's own filters and (with `showFlat`, for a report about residents)
 * the Flat filter. Every change applies straight away. With `rangeDisabled` (a current list, such as a catalogue)
 * the date controls are greyed out, and with `flatDisabled` (a tab not about residents) the Flat filter is.
 */
export function ReportFilters({
  from,
  to,
  status,
  filter,
  filters,
  filterValues,
  flat,
  flats,
  showFlat,
  rangeDisabled = false,
  flatDisabled = false,
  onRangeChange,
  onStatusChange,
  onFilterChange,
  onFlatChange,
}: {
  from: string
  to: string
  status: string
  filter: ReportFilterInfo | null
  /** The tab's further filters (e.g. Role, Department in Employees) and the value chosen for each, by key. */
  filters: ReportExtraFilterInfo[]
  filterValues: Record<string, string>
  /** The chosen flats' ids; empty for every flat. */
  flat: string[]
  flats: ReportFlat[]
  showFlat: boolean
  rangeDisabled?: boolean
  flatDisabled?: boolean
  onRangeChange: (from: string, to: string) => void
  onStatusChange: (status: string) => void
  onFilterChange: (key: string, value: string) => void
  onFlatChange: (flat: string[]) => void
}) {
  const preset = rangeDisabled ? undefined : matchingPreset(from, to)
  const controls = 2 + (filter ? 1 : 0) + filters.length + (showFlat ? 1 : 0)
  const selectedFlats = flatDisabled ? [] : flats.filter((f) => flat.includes(f.id))
  const flatAnchor = useComboboxAnchor()

  return (
    <div className={cn('grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-3', WIDE_COLUMNS[controls])}>
      <div className="min-w-0 space-y-1.5 sm:col-span-2 lg:col-span-3 2xl:col-span-1">
        <p className={LABEL}>
          Date range
          {rangeDisabled && (
            <span className="ml-1.5 font-normal text-gray-400">
              Doesn&apos;t apply: this tab shows the current list
            </span>
          )}
        </p>
        <div className={cn('flex flex-wrap gap-1.5', rangeDisabled && 'pointer-events-none opacity-50')}>
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              disabled={rangeDisabled}
              onClick={() => onRangeChange(...presetRange(p.value))}
              className={cn(
                'h-9 rounded-full border px-3.5 text-xs font-semibold transition-colors',
                preset === p.value
                  ? 'border-[#005390] bg-[#005390] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#005390]/40 hover:text-[#005390] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
              )}
            >
              {p.label}
            </button>
          ))}
          <span
            className={cn(
              'flex h-9 items-center rounded-full border px-3.5 text-xs font-semibold',
              preset === null
                ? 'border-[#005390] bg-[#005390] text-white'
                : 'border-dashed border-gray-200 text-gray-400 dark:border-slate-700',
            )}
          >
            Custom
          </span>
        </div>
      </div>

      <div className={cn('space-y-1.5', rangeDisabled && 'pointer-events-none opacity-50')}>
        <label htmlFor="report-from" className={LABEL}>
          From
        </label>
        <DatePicker
          id="report-from"
          disabled={rangeDisabled}
          className="h-9 w-full"
          value={from}
          onChange={(value) => value && onRangeChange(value, to)}
          clearable={false}
          maxDate={to || undefined}
        />
      </div>
      <div className={cn('space-y-1.5', rangeDisabled && 'pointer-events-none opacity-50')}>
        <label htmlFor="report-to" className={LABEL}>
          To
        </label>
        <DatePicker
          id="report-to"
          disabled={rangeDisabled}
          className="h-9 w-full"
          value={to}
          onChange={(value) => value && onRangeChange(from, value)}
          clearable={false}
          minDate={from || undefined}
        />
      </div>
      {filter && <FilterSelect id="report-filter" filter={filter} value={status} onChange={onStatusChange} />}
      {filters.map((f) => (
        <FilterSelect
          key={f.key}
          id={`report-filter-${f.key}`}
          filter={f}
          value={filterValues[f.key] ?? ''}
          onChange={(value) => onFilterChange(f.key, value)}
        />
      ))}
      {showFlat && (
        <div
          className={cn('min-w-0 space-y-1.5', flatDisabled && 'opacity-50')}
          title={flatDisabled ? 'This tab is not about residents, so it has no flat filter' : undefined}
        >
          <p className={LABEL}>
            Flat
            {flatDisabled && <span className="ml-1.5 font-normal text-gray-400">Doesn&apos;t apply</span>}
          </p>
          {/* Its own box, so the column's spacing doesn't reach the combobox's hidden form input. */}
          <div>
            <Combobox
              multiple
              items={flats}
              value={selectedFlats}
              onValueChange={(value: ReportFlat[]) => onFlatChange(value.map((f) => f.id))}
              itemToStringLabel={(f: ReportFlat) => f.label}
              isItemEqualToValue={(a: ReportFlat, b: ReportFlat) => a.id === b.id}
              filter={flatMatches}
              disabled={flatDisabled}
            >
              <div
                ref={flatAnchor}
                className="flex h-9 w-full items-center rounded-xl border border-input bg-white text-xs dark:bg-slate-900"
              >
                <ComboboxTrigger
                  id="report-flat"
                  disabled={flatDisabled}
                  title={selectedFlats.map((f) => f.label).join(', ') || undefined}
                  className="flex h-full min-w-0 flex-1 items-center gap-2 pr-2.5 pl-2.5 text-left outline-none disabled:cursor-not-allowed"
                >
                  <span className={cn('min-w-0 flex-1 truncate', selectedFlats.length === 0 && 'text-gray-500')}>
                    {flatSummary(selectedFlats)}
                  </span>
                </ComboboxTrigger>
                {selectedFlats.length > 0 && (
                  <button
                    type="button"
                    aria-label="Clear flats"
                    onClick={() => onFlatChange([])}
                    className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <ComboboxContent anchor={flatAnchor} className="w-72 max-w-[calc(100vw-2rem)]">
                <ComboboxInput placeholder="Search flat or resident" showTrigger={false} className="w-full" />
                <ComboboxEmpty>No flat matches that.</ComboboxEmpty>
                <ComboboxList>
                  {(f: ReportFlat) => (
                    <ComboboxItem key={f.id} value={f}>
                      <span className="shrink-0 font-semibold">{f.label}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-gray-500">{f.people}</span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        </div>
      )}
    </div>
  )
}
