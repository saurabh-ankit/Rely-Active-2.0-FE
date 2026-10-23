import * as React from 'react'
import { format, isValid } from 'date-fns'
import { CalendarIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface DatePickerProps {
  value?: Date | string | null
  onChange?: (dateStr: string, date?: Date) => void
  onSelectDate?: (date: Date | undefined) => void
  placeholder?: string
  formatStr?: string
  disabled?: boolean
  clearable?: boolean
  minDate?: Date | string
  maxDate?: Date | string
  startMonth?: Date | string
  endMonth?: Date | string
  defaultMonth?: Date | string
  captionLayout?: 'label' | 'dropdown' | 'dropdown-months' | 'dropdown-years'
  reverseYears?: boolean
  className?: string
  align?: 'start' | 'center' | 'end'
  id?: string
  name?: string
  'aria-label'?: string
}

export function parseDateValue(value: Date | string | null | undefined): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const year = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1
      const day = parseInt(match[3], 10)
      const d = new Date(year, month, day)
      return isValid(d) ? d : undefined
    }
    const parsed = new Date(trimmed)
    return isValid(parsed) ? parsed : undefined
  }
  return undefined
}

export function formatDateToYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function DatePicker({
  value,
  onChange,
  onSelectDate,
  placeholder = 'DD-MM-YYYY',
  formatStr = 'dd-MM-yyyy',
  disabled = false,
  clearable = true,
  minDate,
  maxDate,
  startMonth,
  endMonth,
  defaultMonth,
  captionLayout = 'dropdown',
  reverseYears = false,
  className,
  align = 'start',
  id,
  name,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selectedDate = React.useMemo(() => parseDateValue(value), [value])
  const parsedMin = React.useMemo(() => parseDateValue(minDate), [minDate])
  const parsedMax = React.useMemo(() => parseDateValue(maxDate), [maxDate])

  const computedStartMonth = React.useMemo(() => {
    if (startMonth) return parseDateValue(startMonth)
    if (parsedMin) return parsedMin
    return new Date(1900, 0, 1)
  }, [startMonth, parsedMin])

  const computedEndMonth = React.useMemo(() => {
    if (endMonth) return parseDateValue(endMonth)
    if (parsedMax) return parsedMax
    return new Date(new Date().getFullYear() + 20, 11, 31)
  }, [endMonth, parsedMax])

  const computedDefaultMonth = React.useMemo(() => {
    if (defaultMonth) return parseDateValue(defaultMonth)
    if (selectedDate) return selectedDate
    const now = new Date()
    if (parsedMax && now > parsedMax) return parsedMax
    if (parsedMin && now < parsedMin) return parsedMin
    return now
  }, [defaultMonth, selectedDate, parsedMin, parsedMax])

  const disabledMatcher = React.useMemo(() => {
    if (!parsedMin && !parsedMax) return undefined

    return (date: Date) => {
      const dTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      if (parsedMin) {
        const minTime = new Date(parsedMin.getFullYear(), parsedMin.getMonth(), parsedMin.getDate()).getTime()
        if (dTime < minTime) return true
      }
      if (parsedMax) {
        const maxTime = new Date(parsedMax.getFullYear(), parsedMax.getMonth(), parsedMax.getDate()).getTime()
        if (dTime > maxTime) return true
      }
      return false
    }
  }, [parsedMin, parsedMax])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const ymd = formatDateToYmd(date)
      onChange?.(ymd, date)
      onSelectDate?.(date)
      setOpen(false)
    } else {
      onChange?.('', undefined)
      onSelectDate?.(undefined)
    }
  }

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    onChange?.('', undefined)
    onSelectDate?.(undefined)
    setOpen(false)
  }

  const handleSelectToday = () => {
    const today = new Date()
    handleSelect(today)
  }

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
            aria-label={ariaLabel}
            className={cn(
              'h-9 justify-start font-normal text-left px-3 text-xs bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 shadow-2xs rounded-xl gap-2',
              !selectedDate && 'text-muted-foreground dark:text-gray-400',
              className,
            )}
          />
        }
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-[#005390] dark:text-blue-400" />
        <span className="truncate flex-1">{selectedDate ? format(selectedDate, formatStr) : placeholder}</span>
        {clearable && selectedDate && !disabled && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleClear()
              }
            }}
            className="ml-auto -mr-1 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          key={open ? (selectedDate ? selectedDate.getTime() : 'empty') : 'closed'}
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={disabledMatcher}
          captionLayout={captionLayout}
          startMonth={computedStartMonth}
          endMonth={computedEndMonth}
          defaultMonth={computedDefaultMonth}
          reverseYears={reverseYears}
        />
        <div className="border-t border-gray-100 dark:border-gray-800 p-2 flex items-center justify-between gap-2 bg-gray-50/50 dark:bg-slate-900/50">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-xs text-[#005390] hover:text-[#005390]"
            onClick={handleSelectToday}
          >
            Today
          </Button>
          {selectedDate && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              onClick={() => handleClear()}
            >
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
