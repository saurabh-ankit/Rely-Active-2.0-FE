import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EventsPermission } from '@/pages/Events/components/EventsPermission'
import { useLocation } from '@/hooks/useLocation'
import { useGetEventsCalendar, useListEvents } from '@/hooks/react-query/events'
import type { Event } from '@/lib/services/eventService'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, IndianRupee, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import CreateEventModal from './CreateEventModal'

interface EventsCalendarProps {
  enabled?: boolean
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const VIEW_MODES = ['month', 'week', 'day', 'agenda'] as const

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

/** Colour-coded chip for an event inside a calendar cell. */
const EventChip = ({
  event,
  day,
  clickable,
  onOpen,
}: {
  event: Event
  day: Date
  clickable: boolean
  onOpen: () => void
}) => {
  const special = event.eventType !== 'regular'
  // Multi-day events only show the start time on their first day
  const startsToday = isSameDay(new Date(event.startDate), day)
  return (
    <button
      type="button"
      title={event.title}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className={cn(
        'flex w-full items-center gap-1.5 truncate rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] font-semibold leading-tight transition-colors',
        special
          ? 'border-l-purple-500 bg-purple-50 text-purple-800 hover:bg-purple-100'
          : 'border-l-[#005390] bg-[#005390]/8 text-[#005390] hover:bg-[#005390]/15',
        clickable ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      {startsToday && <span className="shrink-0 font-medium opacity-70">{formatTime(event.startDate)}</span>}
      <span className="truncate">{event.title}</span>
    </button>
  )
}

const EventsCalendar = ({ enabled = true }: EventsCalendarProps) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasResourcePermission } = useLocation()
  const canUpdate = hasResourcePermission('EVENTS', 'update')

  // Initialize currentDate from URL params if available, otherwise use current date
  const getInitialDate = () => {
    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month')
    if (yearParam && monthParam) {
      const year = parseInt(yearParam, 10)
      const month = parseInt(monthParam, 10) - 1 // month is 0-indexed in Date
      if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
        return new Date(year, month, 1)
      }
    }
    return new Date()
  }

  const [currentDate, setCurrentDate] = useState(getInitialDate)
  const [editEventId, setEditEventId] = useState<string | null>(null)

  const syncMonthToUrl = (date: Date) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('year', String(date.getFullYear()))
        next.set('month', String(date.getMonth() + 1))
        return next
      },
      { replace: true },
    )
  }

  // Keep URL in sync so Events page "This Month" card matches the viewed calendar month
  useEffect(() => {
    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month')
    const urlYear = yearParam ? parseInt(yearParam, 10) : NaN
    const urlMonth = monthParam ? parseInt(monthParam, 10) : NaN
    if (urlYear === currentDate.getFullYear() && urlMonth === currentDate.getMonth() + 1) {
      return
    }
    syncMonthToUrl(currentDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when viewed month changes
  }, [currentDate.getFullYear(), currentDate.getMonth()])

  const openEditEvent = (eventId: string) => {
    if (canUpdate) {
      setEditEventId(eventId)
    }
  }

  // Sync calendar month when URL params change (e.g., after navigation from delete)
  useEffect(() => {
    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month')
    if (yearParam && monthParam) {
      const year = parseInt(yearParam, 10)
      const month = parseInt(monthParam, 10) - 1
      if (!isNaN(year) && !isNaN(month) && month >= 0 && month <= 11) {
        const newDate = new Date(year, month, 1)
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync month from route query params
        setCurrentDate((prevDate) => {
          if (newDate.getFullYear() !== prevDate.getFullYear() || newDate.getMonth() !== prevDate.getMonth()) {
            return newDate
          }
          return prevDate
        })
      }
    }
  }, [searchParams])
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [eventsPopupDate, setEventsPopupDate] = useState<Date | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  // Calculate week start (Sunday) for week view
  const getWeekStart = (date: Date) => {
    // Get local date components
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()
    const dayOfWeek = date.getDay()

    // Calculate days to subtract to get to Sunday (start of week)
    const daysToSubtract = dayOfWeek

    // Calculate Sunday's date (handles month boundaries)
    const sundayDate = new Date(year, month, day - daysToSubtract)

    // Get the local date components for Sunday
    const sundayYear = sundayDate.getFullYear()
    const sundayMonth = sundayDate.getMonth()
    const sundayDay = sundayDate.getDate()

    // Create UTC date for Sunday at midnight (using local date components)
    // This ensures the date stays the same regardless of timezone
    const sunday = new Date(Date.UTC(sundayYear, sundayMonth, sundayDay, 0, 0, 0, 0))
    return sunday.toISOString()
  }

  // Calendar API params based on view mode
  const calendarParams =
    viewMode === 'week'
      ? { view: 'week' as const, weekStart: getWeekStart(currentDate) }
      : viewMode === 'day'
        ? {
            view: 'day' as const,
            date: (() => {
              // Use selectedDate if available, otherwise use currentDate
              const dateToUse = selectedDate || currentDate
              // Create date in UTC to avoid timezone shifts
              const year = dateToUse.getFullYear()
              const month = dateToUse.getMonth()
              const day = dateToUse.getDate()
              // Create UTC date at midnight
              const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
              return utcDate.toISOString()
            })(),
          }
        : { view: 'month' as const, year, month }

  const { data: calendarData } = useGetEventsCalendar(calendarParams)

  // Calculate date range for events list API based on view mode
  // Use local midnight bounds and pad ±1 day so UTC-shifted events near midnight are included
  const getEventsListDateRange = () => {
    if (viewMode === 'week') {
      const weekStart = new Date(currentDate)
      const dayOfWeek = weekStart.getDay()
      weekStart.setDate(weekStart.getDate() - dayOfWeek - 1)
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 8)
      weekEnd.setHours(23, 59, 59, 999)
      return {
        dateFrom: weekStart.toISOString(),
        dateTo: weekEnd.toISOString(),
      }
    } else if (viewMode === 'day') {
      const dateToUse = selectedDate || currentDate
      const dayStart = new Date(dateToUse)
      dayStart.setDate(dayStart.getDate() - 1)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dateToUse)
      dayEnd.setDate(dayEnd.getDate() + 1)
      dayEnd.setHours(23, 59, 59, 999)
      return {
        dateFrom: dayStart.toISOString(),
        dateTo: dayEnd.toISOString(),
      }
    } else {
      const monthIndex = currentDate.getMonth()
      const dateFrom = new Date(year, monthIndex, 1, 0, 0, 0, 0)
      dateFrom.setDate(dateFrom.getDate() - 1)
      const dateTo = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
      dateTo.setDate(dateTo.getDate() + 1)

      return {
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      }
    }
  }

  const dateRange = getEventsListDateRange()
  // For calendar views, fetch all events without pagination limit
  const { data: eventsData } = useListEvents({
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    limit: 'all', // Get all events for calendar view
    page: 1,
  })

  // Get events from calendar API response (supports different view structures)
  const getEventsFromCalendar = (): Event[] => {
    const apiData = calendarData?.data || calendarData
    if (!apiData) return []

    // Prefer flat events array when present (timezone-safe for client-side placement)
    if (Array.isArray(apiData.events) && apiData.events.length > 0) {
      return apiData.events
    }

    // For day view
    if (apiData.dayEvents && Array.isArray(apiData.dayEvents)) {
      return apiData.dayEvents
    }

    // For week view - combine all week days
    if (apiData.weekDays) {
      const allEvents: Event[] = []
      Object.values(apiData.weekDays).forEach((dayEvents: unknown) => {
        if (Array.isArray(dayEvents) && dayEvents.length > 0) {
          allEvents.push(...dayEvents)
        }
      })
      return allEvents
    }

    // For month view - combine all dates
    if (apiData.eventsByDate) {
      const allEvents: Event[] = []
      Object.values(apiData.eventsByDate).forEach((dateEvents: unknown) => {
        if (Array.isArray(dateEvents) && dateEvents.length > 0) {
          allEvents.push(...dateEvents)
        }
      })
      return allEvents
    }

    return []
  }

  // Merge calendar + list API events, then dedupe
  const calendarEvents = getEventsFromCalendar()
  const listEvents = Array.isArray(eventsData?.data?.events)
    ? eventsData.data.events
    : Array.isArray(eventsData?.data?.records)
      ? eventsData.data.records
      : []
  const rawEvents = useMemo(
    () => [...calendarEvents, ...listEvents],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on source payloads
    [calendarData, eventsData],
  )

  // Deduplicate daily recurring events that are part of the same series
  // Group events by title + venueId + frequencyType + createdAt (same series)
  // For daily events, only show the event on the date that matches its startDate
  const events = useMemo(() => {
    const eventMap = new Map<string, Event>()

    rawEvents.forEach((event: Event) => {
      if (!event?.id) return
      if (event.frequencyType === 'daily') {
        const seriesKey = `${event.title}-${event.venueId}-${event.createdAt}`
        const eventStartDate = new Date(event.startDate)
        const eventLocalDateKey = `${eventStartDate.getFullYear()}-${eventStartDate.getMonth()}-${eventStartDate.getDate()}`
        const occurrenceKey = `${seriesKey}-${eventLocalDateKey}`

        if (!eventMap.has(occurrenceKey)) {
          eventMap.set(occurrenceKey, event)
        }
      } else {
        eventMap.set(event.id, event)
      }
    })

    return Array.from(eventMap.values())
  }, [rawEvents])

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const navigateMonth = (direction: 'prev' | 'next' | 'current') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() - 7)
      } else if (viewMode === 'day') {
        newDate.setDate(newDate.getDate() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() - 1)
      }
    } else if (direction === 'next') {
      if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() + 7)
      } else if (viewMode === 'day') {
        newDate.setDate(newDate.getDate() + 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
    } else {
      newDate.setTime(Date.now())
    }
    setCurrentDate(newDate)
  }

  const getEventsForDate = (date: Date) => {
    // Place events using the browser's local calendar date only.
    // UTC day bucketing caused IST events (e.g. Sep 1 01:00) to appear on the previous day.
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()

    const calendarDateOnly = new Date(year, month, day)
    calendarDateOnly.setHours(0, 0, 0, 0)
    const calendarTime = calendarDateOnly.getTime()

    return events.filter((event: Event) => {
      const eventStartDate = new Date(event.startDate)
      const eventEndDate = new Date(event.endDate || event.startDate)

      const eventStartDateOnly = new Date(
        eventStartDate.getFullYear(),
        eventStartDate.getMonth(),
        eventStartDate.getDate(),
      )
      eventStartDateOnly.setHours(0, 0, 0, 0)

      const eventEndDateOnly = new Date(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate())
      eventEndDateOnly.setHours(0, 0, 0, 0)

      return calendarTime >= eventStartDateOnly.getTime() && calendarTime <= eventEndDateOnly.getTime()
    })
  }

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    // Day offsets relative to the 1st let Date roll over month boundaries correctly
    // (counting back from the wrong month showed e.g. "Sep 31" as a second Oct 1).
    // Only as many weeks as the month needs, so there is no trailing all-grey row.
    const cellCount = Math.ceil((firstDay + daysInMonth) / 7) * 7
    return Array.from(
      { length: cellCount },
      (_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1 - firstDay + i),
    )
  }

  const isToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isCurrentMonth = (date: Date | null) => {
    if (!date) return false
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()
  }

  const calendarTitle =
    viewMode === 'day'
      ? currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : viewMode === 'week'
        ? (() => {
            const weekStart = new Date(currentDate)
            weekStart.setDate(weekStart.getDate() - weekStart.getDay())
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekEnd.getDate() + 6)
            return `${weekStart.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })} - ${weekEnd.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}`
          })()
        : currentDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })

  const days = renderCalendarGrid()

  if (!enabled) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              aria-label="Previous"
              title="Previous"
              onClick={() => navigateMonth('prev')}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-white hover:text-[#005390] hover:shadow-xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigateMonth('current')}
              className="h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-white hover:text-[#005390] hover:shadow-xs"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next"
              title="Next"
              onClick={() => navigateMonth('next')}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-white hover:text-[#005390] hover:shadow-xs"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">{calendarTitle}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden items-center gap-3 text-xs font-medium text-gray-500 lg:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#005390]" />
              Regular
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              Special
            </span>
          </div>
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-0.5">
            {VIEW_MODES.map((mode) => (
              <button
                type="button"
                key={mode}
                aria-pressed={viewMode === mode}
                onClick={() => {
                  setViewMode(mode)
                  if ((mode === 'day' || mode === 'week') && selectedDate) {
                    setCurrentDate(selectedDate)
                  }
                }}
                className={cn(
                  'h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold capitalize transition-colors',
                  viewMode === mode
                    ? 'bg-[#005390] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900',
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-2xs">
          <div className="grid min-w-[700px] grid-cols-7 gap-px bg-gray-200">
            {(() => {
              // Week starts on the Sunday of currentDate's week
              const weekStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
              weekStart.setDate(weekStart.getDate() - weekStart.getDay())
              const weekDays = Array.from(
                { length: 7 },
                (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i),
              )

              return weekDays.map((day) => {
                const isTodayDate = isToday(day)
                const safeDayEvents = getEventsForDate(day)

                return (
                  <div
                    key={day.toDateString()}
                    className={cn('flex min-h-[420px] flex-col', isTodayDate ? 'bg-[#005390]/[0.04]' : 'bg-white')}
                  >
                    <div className="flex flex-col items-center gap-1 border-b border-gray-100 py-3">
                      <span
                        className={cn(
                          'text-[11px] font-bold uppercase tracking-wider',
                          isTodayDate ? 'text-[#005390]' : 'text-gray-500',
                        )}
                      >
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold',
                          isTodayDate ? 'bg-[#005390] text-white shadow-sm' : 'text-gray-900',
                        )}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 space-y-1.5 p-2">
                      {safeDayEvents.slice(0, 4).map((event: Event) => (
                        <EventChip
                          key={event.id}
                          event={event}
                          day={day}
                          clickable={canUpdate}
                          onOpen={() => openEditEvent(event.id)}
                        />
                      ))}
                      {safeDayEvents.length > 4 && (
                        <button
                          type="button"
                          className="cursor-pointer rounded-md px-1.5 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-[#005390]"
                          onClick={() => setEventsPopupDate(day)}
                        >
                          +{safeDayEvents.length - 4} more
                        </button>
                      )}
                      {safeDayEvents.length === 0 && (
                        <p className="pt-6 text-center text-[11px] text-gray-300">No events</p>
                      )}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <Card className="rounded-[24px] border border-white/80 bg-white/70 shadow-lg backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-base font-bold text-[#2d3748] pb-3 border-b border-gray-100">
                {(selectedDate || currentDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              {(() => {
                const dateToUse = selectedDate || currentDate
                const dayEvents = getEventsForDate(dateToUse)
                const safeDayEvents = Array.isArray(dayEvents) ? dayEvents : []

                return safeDayEvents.length > 0 ? (
                  <div className="space-y-4">
                    {safeDayEvents.map((event: Event) => {
                      const eventStartDate = new Date(event.startDate)
                      const numericFee =
                        event.entryFee !== undefined && event.entryFee !== null
                          ? typeof event.entryFee === 'string'
                            ? parseFloat(event.entryFee)
                            : Number(event.entryFee)
                          : null

                      return (
                        <div
                          key={event.id}
                          className="group rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs transition-all hover:border-[#005390]/40 hover:shadow-md"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                              {event.poster ? (
                                <div className="size-20 rounded-xl overflow-hidden shrink-0 border border-gray-100 shadow-xs">
                                  <img
                                    src={event.poster}
                                    alt={event.title}
                                    className="size-full object-cover"
                                    onError={(e) => {
                                      ;(e.target as HTMLImageElement).src =
                                        'https://via.placeholder.com/150?text=No+Image'
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="size-20 rounded-xl bg-gradient-to-br from-[#005390]/10 to-blue-50 border border-[#005390]/20 flex flex-col items-center justify-center text-center shrink-0 p-2">
                                  <span className="text-[11px] font-bold text-[#005390] uppercase tracking-wider">
                                    {eventStartDate.toLocaleDateString('en-US', { month: 'short' })}
                                  </span>
                                  <span className="text-2xl font-black text-[#005390]">{eventStartDate.getDate()}</span>
                                  <span className="text-[10px] font-medium text-gray-500">
                                    {eventStartDate.toLocaleDateString('en-US', { weekday: 'short' })}
                                  </span>
                                </div>
                              )}

                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500">
                                    <Clock className="h-3.5 w-3.5 text-[#005390]" />
                                    {eventStartDate.toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                      event.eventType === 'regular'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-purple-50 text-purple-700 border border-purple-200'
                                    }`}
                                  >
                                    {event.eventType === 'regular' ? 'Regular' : 'Special'}
                                  </span>
                                </div>

                                <h3 className="text-base font-bold text-[#2d3748] truncate group-hover:text-[#005390]">
                                  {event.title}
                                </h3>

                                {event.description && (
                                  <p className="text-xs text-gray-600 line-clamp-2">{event.description}</p>
                                )}

                                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-500">
                                  {event.venue && (
                                    <span className="flex items-center gap-1 font-medium bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                                      <MapPin className="h-3.5 w-3.5 text-rose-500" />
                                      Venue: <strong className="text-gray-800">{event.venue.name}</strong>
                                    </span>
                                  )}
                                  {numericFee !== null && !isNaN(numericFee) && (
                                    <span className="flex items-center gap-1 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-800">
                                      <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                                      Fee: <strong className="text-emerald-900">₹{numericFee.toFixed(2)}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 shrink-0">
                              <EventsPermission action="update">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEditEvent(event.id)
                                  }}
                                  className="h-9 px-4 rounded-xl text-xs font-semibold text-gray-700 border-gray-200 hover:bg-[#005390] hover:text-white hover:border-[#005390] transition-colors"
                                >
                                  Edit Event
                                </Button>
                              </EventsPermission>

                              {event.allowReservation && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(`/admin/events/${event.id}/registrations`)
                                  }}
                                  className="h-9 px-4 rounded-xl text-xs font-semibold bg-[#005390] text-white hover:bg-[#004273] shadow-xs transition-colors"
                                >
                                  View Registrations
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">No events scheduled for this day</div>
                )
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agenda View - List all upcoming events */}
      {viewMode === 'agenda' && (
        <Card className="rounded-[24px] border border-white/80 bg-white/70 shadow-lg backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="space-y-4">
              {events.length > 0 ? (
                events
                  .sort((a: Event, b: Event) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((event: Event) => {
                    const eventStartDate = new Date(event.startDate)
                    const numericFee =
                      event.entryFee !== undefined && event.entryFee !== null
                        ? typeof event.entryFee === 'string'
                          ? parseFloat(event.entryFee)
                          : Number(event.entryFee)
                        : null

                    return (
                      <div
                        key={event.id}
                        className="group rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs transition-all hover:border-[#005390]/40 hover:shadow-md"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                            {event.poster ? (
                              <div className="size-20 rounded-xl overflow-hidden shrink-0 border border-gray-100 shadow-xs">
                                <img
                                  src={event.poster}
                                  alt={event.title}
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).src =
                                      'https://via.placeholder.com/150?text=No+Image'
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="size-20 rounded-xl bg-gradient-to-br from-[#005390]/10 to-blue-50 border border-[#005390]/20 flex flex-col items-center justify-center text-center shrink-0 p-2">
                                <span className="text-[11px] font-bold text-[#005390] uppercase tracking-wider">
                                  {eventStartDate.toLocaleDateString('en-US', { month: 'short' })}
                                </span>
                                <span className="text-2xl font-black text-[#005390]">{eventStartDate.getDate()}</span>
                                <span className="text-[10px] font-medium text-gray-500">
                                  {eventStartDate.toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                              </div>
                            )}

                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500">
                                  <Clock className="h-3.5 w-3.5 text-[#005390]" />
                                  {eventStartDate.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    event.eventType === 'regular'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                                  }`}
                                >
                                  {event.eventType === 'regular' ? 'Regular' : 'Special'}
                                </span>
                              </div>

                              <h3 className="text-base font-bold text-[#2d3748] truncate group-hover:text-[#005390]">
                                {event.title}
                              </h3>

                              {event.description && (
                                <p className="text-xs text-gray-600 line-clamp-2">{event.description}</p>
                              )}

                              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-500">
                                {event.venue && (
                                  <span className="flex items-center gap-1 font-medium bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                                    Venue: <strong className="text-gray-800">{event.venue.name}</strong>
                                  </span>
                                )}
                                {numericFee !== null && !isNaN(numericFee) && (
                                  <span className="flex items-center gap-1 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-800">
                                    <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                                    Fee: <strong className="text-emerald-900">₹{numericFee.toFixed(2)}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 shrink-0">
                            <EventsPermission action="update">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditEvent(event.id)
                                }}
                                className="h-9 px-4 rounded-xl text-xs font-semibold text-gray-700 border-gray-200 hover:bg-[#005390] hover:text-white hover:border-[#005390] transition-colors"
                              >
                                Edit Event
                              </Button>
                            </EventsPermission>

                            {event.allowReservation && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/admin/events/${event.id}/registrations`)
                                }}
                                className="h-9 px-4 rounded-xl text-xs font-semibold bg-[#005390] text-white hover:bg-[#004273] shadow-xs transition-colors"
                              >
                                View Registrations
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
              ) : (
                <div className="text-center py-12 text-gray-500">No events found</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Grid - Month View */}
      {viewMode === 'month' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80">
            {WEEKDAYS.map((day, i) => (
              <div
                key={day}
                className={cn(
                  'py-2.5 text-center text-[11px] font-bold uppercase tracking-wider',
                  i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-500',
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* gap-px over a grey background draws the grid lines */}
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {days.map((date) => {
              const dateEvents = getEventsForDate(date)
              const isCurrentMonthDay = isCurrentMonth(date)
              const isTodayDate = isToday(date)
              const isSelected = !!selectedDate && isSameDay(date, selectedDate)
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              const selectDay = () => {
                setSelectedDate(date)
                setCurrentDate(date)
              }

              return (
                <div
                  key={date.toDateString()}
                  role="button"
                  tabIndex={0}
                  aria-label={date.toDateString()}
                  onClick={selectDay}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectDay()
                    }
                  }}
                  className={cn(
                    'group relative flex min-h-[112px] cursor-pointer flex-col gap-1 p-1.5 transition-colors sm:p-2',
                    !isCurrentMonthDay ? 'bg-gray-50/90' : isWeekend ? 'bg-slate-50/60' : 'bg-white',
                    isTodayDate && 'bg-[#005390]/[0.04]',
                    'hover:bg-blue-50/50',
                    isSelected && 'ring-2 ring-inset ring-[#005390]/60',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm',
                        isTodayDate
                          ? 'bg-[#005390] font-bold text-white shadow-sm'
                          : isCurrentMonthDay
                            ? 'font-semibold text-gray-800'
                            : 'font-medium text-gray-400',
                      )}
                    >
                      {date.getDate() === 1 && !isTodayDate
                        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : date.getDate()}
                    </span>
                    {dateEvents.length > 0 && (
                      <span className="text-[10px] font-semibold text-gray-400 sm:hidden">{dateEvents.length}</span>
                    )}
                  </div>
                  <div className={cn('hidden space-y-1 sm:block', !isCurrentMonthDay && 'opacity-60')}>
                    {dateEvents.slice(0, 2).map((event: Event) => (
                      <EventChip
                        key={event.id}
                        event={event}
                        day={date}
                        clickable={canUpdate}
                        onOpen={() => openEditEvent(event.id)}
                      />
                    ))}
                    {dateEvents.length > 2 && (
                      <button
                        type="button"
                        className="cursor-pointer rounded-md px-1.5 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-[#005390]"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEventsPopupDate(date)
                        }}
                      >
                        +{dateEvents.length - 2} more
                      </button>
                    )}
                  </div>
                  {/* Phones: dots instead of chips */}
                  {dateEvents.length > 0 && (
                    <div className="mt-auto flex gap-0.5 sm:hidden">
                      {dateEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            event.eventType === 'regular' ? 'bg-[#005390]' : 'bg-purple-500',
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Events Popup Dialog */}
      <Dialog open={!!eventsPopupDate} onOpenChange={(open) => !open && setEventsPopupDate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {eventsPopupDate
                ? eventsPopupDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Events'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {eventsPopupDate &&
              getEventsForDate(eventsPopupDate).map((event: Event) => (
                <div
                  key={event.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {event.poster && (
                      <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                        <img
                          src={event.poster}
                          alt={event.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image'
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                          {event.eventType === 'regular' ? 'Regular' : 'Special'}
                        </span>
                        {event.frequencyType && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium capitalize">
                            {event.frequencyType}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{event.title}</h3>
                      {event.description && <p className="text-sm text-gray-600 mb-2">{event.description}</p>}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                        <div>
                          <span className="font-medium">Start:</span>{' '}
                          {new Date(event.startDate).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div>
                          <span className="font-medium">End:</span>{' '}
                          {new Date(event.endDate).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {event.venue && (
                          <div>
                            <span className="font-medium">Venue:</span> {event.venue.name}
                          </div>
                        )}
                        {event.entryFee !== undefined &&
                          event.entryFee !== null &&
                          (() => {
                            const numericFee =
                              typeof event.entryFee === 'string' ? parseFloat(event.entryFee) : Number(event.entryFee)
                            if (isNaN(numericFee)) return null
                            return (
                              <div>
                                <span className="font-medium">Entry Fee:</span> ₹{numericFee.toFixed(2)}
                              </div>
                            )
                          })()}
                      </div>
                      <div className="flex gap-2">
                        <EventsPermission action="update">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditEvent(event.id)
                              setEventsPopupDate(null)
                            }}
                          >
                            Edit Event
                          </Button>
                        </EventsPermission>
                        {event.allowReservation && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/admin/events/${event.id}/registrations`)
                              setEventsPopupDate(null)
                            }}
                          >
                            View Registrations
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            {eventsPopupDate && getEventsForDate(eventsPopupDate).length === 0 && (
              <div className="text-center text-gray-500 py-8">No events scheduled for this day</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateEventModal
        open={!!editEventId}
        eventId={editEventId || undefined}
        onOpenChange={(open) => {
          if (!open) setEditEventId(null)
        }}
      />
    </div>
  )
}

export default EventsCalendar
