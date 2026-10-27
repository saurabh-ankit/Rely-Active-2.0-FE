import * as React from 'react'
import { Clock, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface TimePickerProps {
  value?: string // "HH:mm" 24-hour string, e.g. "08:00" or "16:30"
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  name?: string
  'aria-label'?: string
  error?: boolean | string
  minuteStep?: number // 1 or 5 (default: 5)
}

interface ParsedTime {
  hour12: number // 1-12
  minute: number // 0-59
  period: 'AM' | 'PM'
}

function getCurrentTime(): ParsedTime {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return { hour12, minute: m, period }
}

function parseHHmm(val?: string | null): ParsedTime {
  if (!val || typeof val !== 'string' || !val.trim()) {
    return getCurrentTime()
  }
  const parts = val.trim().split(':')
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) {
    return getCurrentTime()
  }
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const minute = Math.min(Math.max(m, 0), 59)
  return { hour12, minute, period }
}

function toHHmm(time: ParsedTime): string {
  let h = time.hour12 % 12
  if (time.period === 'PM') h += 12
  return `${String(h).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`
}

function format12Hour(time: ParsedTime): string {
  return `${String(time.hour12).padStart(2, '0')}:${String(time.minute).padStart(2, '0')} ${time.period}`
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const ALL_MINUTES = Array.from({ length: 60 }, (_, i) => i)

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  disabled = false,
  className,
  id,
  name,
  'aria-label': ariaLabel,
  error,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)

  const isControlledAndSet = Boolean(value && value.trim())
  const initialParsed = React.useMemo(() => parseHHmm(value), [value])

  // Internal working state while popover is open, defaults to current time
  const [tempTime, setTempTime] = React.useState<ParsedTime>(initialParsed)

  const hourListRef = React.useRef<HTMLDivElement>(null)
  const minuteListRef = React.useRef<HTMLDivElement>(null)

  const scrollIntoCenter = React.useCallback(
    (container: HTMLElement | null, element: HTMLElement | null, smooth = true) => {
      if (!container || !element) return
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const relativeTop = elementRect.top - containerRect.top + container.scrollTop
      const targetScrollTop = relativeTop - (container.clientHeight - element.clientHeight) / 2
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: smooth ? 'smooth' : 'auto',
      })
    },
    [],
  )

  // When opening, if no value is set, default to current time and center lists
  React.useEffect(() => {
    if (open) {
      const initial = value && value.trim() ? parseHHmm(value) : getCurrentTime()
      setTempTime(initial)

      const timer = setTimeout(() => {
        const activeHourEl = hourListRef.current?.querySelector('[data-active="true"]') as HTMLElement | null
        const activeMinEl = minuteListRef.current?.querySelector('[data-active="true"]') as HTMLElement | null
        scrollIntoCenter(hourListRef.current, activeHourEl, false)
        scrollIntoCenter(minuteListRef.current, activeMinEl, false)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open, value, scrollIntoCenter])

  // Keep tempTime in sync if value changes externally while closed
  React.useEffect(() => {
    if (!open && value && value.trim()) {
      setTempTime(parseHHmm(value))
    }
  }, [open, value])

  const decrementHour = () => {
    const nextHour = tempTime.hour12 === 1 ? 12 : tempTime.hour12 - 1
    setTempTime((t) => ({ ...t, hour12: nextHour }))
    const el = hourListRef.current?.querySelector(`[data-hour="${nextHour}"]`) as HTMLElement | null
    scrollIntoCenter(hourListRef.current, el, true)
  }

  const incrementHour = () => {
    const nextHour = tempTime.hour12 === 12 ? 1 : tempTime.hour12 + 1
    setTempTime((t) => ({ ...t, hour12: nextHour }))
    const el = hourListRef.current?.querySelector(`[data-hour="${nextHour}"]`) as HTMLElement | null
    scrollIntoCenter(hourListRef.current, el, true)
  }

  const decrementMinute = () => {
    const nextMinute = tempTime.minute <= 0 ? 59 : tempTime.minute - 1
    setTempTime((t) => ({ ...t, minute: nextMinute }))
    const el = minuteListRef.current?.querySelector(`[data-minute="${nextMinute}"]`) as HTMLElement | null
    scrollIntoCenter(minuteListRef.current, el, true)
  }

  const incrementMinute = () => {
    const nextMinute = tempTime.minute >= 59 ? 0 : tempTime.minute + 1
    setTempTime((t) => ({ ...t, minute: nextMinute }))
    const el = minuteListRef.current?.querySelector(`[data-minute="${nextMinute}"]`) as HTMLElement | null
    scrollIntoCenter(minuteListRef.current, el, true)
  }

  const handleHourSelect = (h: number) => {
    setTempTime((t) => ({ ...t, hour12: h }))
  }

  const handleMinuteSelect = (m: number) => {
    setTempTime((t) => ({ ...t, minute: m }))
  }

  const handlePeriodSelect = (p: 'AM' | 'PM') => {
    setTempTime((t) => ({ ...t, period: p }))
  }

  const handleNow = () => {
    const cur = getCurrentTime()
    setTempTime(cur)
    setTimeout(() => {
      const activeHourEl = hourListRef.current?.querySelector(`[data-hour="${cur.hour12}"]`) as HTMLElement | null
      const activeMinEl = minuteListRef.current?.querySelector(`[data-minute="${cur.minute}"]`) as HTMLElement | null
      scrollIntoCenter(hourListRef.current, activeHourEl, true)
      scrollIntoCenter(minuteListRef.current, activeMinEl, true)
    }, 20)
  }

  const handleApply = () => {
    onChange?.(toHHmm(tempTime))
    setOpen(false)
  }

  const handleClear = () => {
    onChange?.('')
    setOpen(false)
  }

  const displayString = isControlledAndSet ? format12Hour(parseHHmm(value)) : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            name={name}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel || 'Select time'}
            className={cn(
              'h-9 w-full justify-between font-normal text-left px-3 text-xs bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 hover:border-gray-300 shadow-2xs rounded-xl transition-all cursor-pointer group',
              open && 'border-[#005390] ring-2 ring-[#005390]/15',
              !isControlledAndSet && 'text-muted-foreground dark:text-gray-400',
              error && 'border-red-500 focus-visible:ring-red-500/20',
              className,
            )}
          />
        }
      >
        <div className="flex items-center gap-2 truncate">
          <Clock className="h-4 w-4 shrink-0 text-[#005390]" />
          <span
            className={cn(
              'truncate font-medium text-gray-900 dark:text-gray-100',
              !isControlledAndSet && 'font-normal text-muted-foreground dark:text-gray-400',
            )}
          >
            {displayString}
          </span>
        </div>
        <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[230px] p-2.5 z-[100] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 overflow-hidden"
      >
        {/* Header Title */}
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 text-left">Select time</p>

        {/* Big Center Display */}
        <div className="text-lg font-bold text-gray-900 dark:text-white text-center tracking-tight my-1 font-sans">
          {format12Hour(tempTime)}
        </div>

        {/* 3 Columns: Hour Box, Minute Box, AM/PM Stack */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          {/* Hour Column */}
          <div>
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 text-center mb-0.5">Hour</p>
            <div className="rounded-lg border border-gray-200/70 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-800/40 p-0.5 flex flex-col items-center">
              <button
                type="button"
                onClick={decrementHour}
                className="w-full py-0.5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                title="Previous hour"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <div
                ref={hourListRef}
                className="h-32 w-full overflow-y-auto space-y-0.5 py-1 scroll-smooth overscroll-contain text-center scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {HOURS.map((h) => {
                  const isSelected = tempTime.hour12 === h
                  return (
                    <button
                      key={h}
                      type="button"
                      data-hour={h}
                      data-active={isSelected ? 'true' : 'false'}
                      onClick={() => handleHourSelect(h)}
                      className={cn(
                        'w-full py-1 text-[11px] font-medium rounded transition-colors cursor-pointer text-center select-none',
                        isSelected
                          ? 'bg-[#005390] text-white font-bold shadow-xs'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-slate-700',
                      )}
                    >
                      {String(h).padStart(2, '0')}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={incrementHour}
                className="w-full py-0.5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                title="Next hour"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Minute Column (Full 00-59 minutes) */}
          <div>
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 text-center mb-0.5">Minute</p>
            <div className="rounded-lg border border-gray-200/70 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-800/40 p-0.5 flex flex-col items-center">
              <button
                type="button"
                onClick={decrementMinute}
                className="w-full py-0.5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                title="Previous minute"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <div
                ref={minuteListRef}
                className="h-32 w-full overflow-y-auto space-y-0.5 py-1 scroll-smooth overscroll-contain text-center scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {ALL_MINUTES.map((m) => {
                  const isSelected = tempTime.minute === m
                  return (
                    <button
                      key={m}
                      type="button"
                      data-minute={m}
                      data-active={isSelected ? 'true' : 'false'}
                      onClick={() => handleMinuteSelect(m)}
                      className={cn(
                        'w-full py-1 text-[11px] font-medium rounded transition-colors cursor-pointer text-center select-none',
                        isSelected
                          ? 'bg-[#005390] text-white font-bold shadow-xs'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-slate-700',
                      )}
                    >
                      {String(m).padStart(2, '0')}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={incrementMinute}
                className="w-full py-0.5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                title="Next minute"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Period (AM/PM) Column */}
          <div className="flex flex-col gap-1.5 pt-3">
            {(['AM', 'PM'] as const).map((p) => {
              const isSelected = tempTime.period === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriodSelect(p)}
                  className={cn(
                    'w-9 py-1 text-[11px] font-bold rounded-md border transition-colors cursor-pointer text-center',
                    isSelected
                      ? 'bg-[#005390] text-white border-[#005390] shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700',
                  )}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer Actions: Clear, Now and Apply */}
        <div className="flex items-center justify-between gap-1.5 mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="h-7 px-2.5 text-[11px] font-medium text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-200 dark:border-gray-700 cursor-pointer"
          >
            Clear
          </Button>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNow}
              className="h-7 px-2.5 text-[11px] font-medium text-[#005390] hover:text-[#004274] hover:bg-[#005390]/10 border-gray-200 dark:border-gray-700 rounded-md cursor-pointer"
            >
              Now
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="h-7 px-3 text-[11px] font-bold bg-[#005390] hover:bg-[#004274] text-white rounded-md shadow-xs cursor-pointer"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default TimePicker
