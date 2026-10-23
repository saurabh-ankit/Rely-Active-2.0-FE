import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { monthLabel } from './billingFormat'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export type MonthState = 'billed' | 'partial' | 'unbilled'

interface MonthCalendarProps {
  /** Selected month, 'YYYY-MM'. */
  value: string
  /** First and last selectable months ('YYYY-MM'). */
  min: string
  max: string
  /** Billing state per 'YYYY-MM', shown as a dot under each month. */
  states?: Record<string, MonthState>
  disabled?: boolean
  onChange: (month: string) => void
}

const DOT: Record<MonthState, string> = {
  billed: 'bg-emerald-500',
  partial: 'bg-sky-500',
  unbilled: 'bg-amber-500',
}

/** A month field that opens a compact year grid; months outside [min, max] are disabled. */
export function MonthCalendar({ value, min, max, states = {}, disabled, onChange }: MonthCalendarProps) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(() => Number((value || max).slice(0, 4)))
  const minYear = Number(min.slice(0, 4))
  const maxYear = Number(max.slice(0, 4))

  const pick = (month: string) => {
    onChange(month)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setYear(Number((value || max).slice(0, 4)))
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-2xs transition-colors hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60',
          open && 'border-[#2b4f7e] ring-2 ring-[#2b4f7e]/15',
        )}
      >
        <span className="flex items-center gap-2">
          {value && states[value] && <span className={cn('h-2 w-2 rounded-full', DOT[states[value]])} />}
          {value ? monthLabel(value) : 'Select month'}
        </span>
        <CalendarDays className="h-4 w-4 text-gray-500" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-2 p-2.5">
        <div className="flex items-center justify-between rounded-md bg-gray-50 px-1 py-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Previous year"
            disabled={year <= minYear}
            onClick={() => setYear((y) => y - 1)}
            className="h-7 w-7 rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-gray-900">{year}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Next year"
            disabled={year >= maxYear}
            onClick={() => setYear((y) => y + 1)}
            className="h-7 w-7 rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {MONTHS.map((label, i) => {
            const month = `${year}-${String(i + 1).padStart(2, '0')}`
            const outOfRange = month < min || month > max
            const selected = month === value
            const state = states[month]
            return (
              <Button
                key={month}
                type="button"
                variant="ghost"
                disabled={outOfRange}
                onClick={() => pick(month)}
                className={cn(
                  'h-10 flex flex-col items-center justify-center rounded-md text-sm transition-colors p-0',
                  selected
                    ? 'bg-[#2b4f7e] font-semibold text-white hover:bg-[#2b4f7e] hover:text-white'
                    : outOfRange
                      ? 'cursor-not-allowed text-gray-300'
                      : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                {label}
                <span
                  className={cn(
                    'mt-0.5 h-1 w-1 rounded-full',
                    !outOfRange && state ? (selected ? 'bg-white' : DOT[state]) : 'bg-transparent',
                  )}
                />
              </Button>
            )
          })}
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-[10px] text-gray-500">
          <span className="flex gap-2">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Billed
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Part
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Not billed
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => pick(max)}
            className="h-auto p-0 text-xs font-medium text-[#2b6cb0] hover:bg-transparent hover:underline"
          >
            This month
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
