import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EventsPermission } from '@/pages/Events/components/EventsPermission'
import { useLocation } from '@/hooks/useLocation'
import { useGetEventsCalendar, useListEvents } from '@/hooks/react-query/events'
import type { Event } from '@/lib/services/eventService'
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CreateEventModal from './CreateEventModal'

interface EventsCalendarProps {
  enabled?: boolean
}

const EventsCalendar = ({ enabled = true }: EventsCalendarProps) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  const rawEvents = [...calendarEvents, ...listEvents]

  // Deduplicate daily recurring events that are part of the same series
  // Group events by title + venueId + frequencyType + createdAt (same series)
  // For daily events, only show the event on the date that matches its startDate
  const events = (() => {
    const eventMap = new Map<string, Event>()

    rawEvents.forEach((event: Event) => {
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
  })()

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
    const days: (Date | null)[] = []

    // Previous month days
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 0)
    const prevMonthDays = prevMonth.getDate()
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i))
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))
    }

    // Next month days to fill the grid
    const remainingCells = 42 - days.length
    for (let i = 1; i <= remainingCells; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i))
    }

    return days
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
      <div className="relative flex items-center justify-between gap-2 py-4">
        <div className="flex gap-2 shrink-0 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="cursor-pointer hover:bg-[#2a517c] hover:text-white"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('current')}
            className="bg-gray-100 cursor-pointer hover:bg-[#2a517c] hover:text-white"
          >
            Current
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="cursor-pointer hover:bg-[#2a517c] hover:text-white"
          >
            Next
          </Button>
        </div>

        <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold text-gray-800 text-center whitespace-nowrap pointer-events-none">
          {calendarTitle}
        </h2>

        <div className="flex gap-2 shrink-0 z-10 ml-auto">
          {(['month', 'week', 'day', 'agenda'] as const).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setViewMode(mode)
                if ((mode === 'day' || mode === 'week') && selectedDate) {
                  setCurrentDate(selectedDate)
                }
              }}
              className={viewMode === mode ? 'bg-gray-800' : ''}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'week' && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-2">
              {(() => {
                // Calculate week start (Sunday) from currentDate
                const weekStart = new Date(currentDate)
                const dayOfWeek = weekStart.getDay()
                weekStart.setDate(weekStart.getDate() - dayOfWeek)
                weekStart.setHours(0, 0, 0, 0)

                const weekDays = []
                for (let i = 0; i < 7; i++) {
                  const day = new Date(weekStart)
                  day.setDate(day.getDate() + i)
                  weekDays.push(day)
                }
                return weekDays.map((day, index) => {
                  const isTodayDate = isToday(day)
                  const safeDayEvents = getEventsForDate(day)

                  return (
                    <div
                      key={index}
                      className={`min-h-[400px] p-3 border border-gray-200 ${
                        isTodayDate ? 'bg-blue-50 border-blue-300' : 'bg-white'
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-700 mb-2">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-lg font-bold text-gray-900 mb-3">{day.getDate()}</div>
                      <div className="space-y-2">
                        {safeDayEvents.slice(0, 3).map((event: Event) => {
                          return (
                            <button
                              type="button"
                              key={event.id}
                              onClick={() => {
                                openEditEvent(event.id)
                              }}
                              className={`text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded truncate w-full text-left ${
                                canUpdate ? 'cursor-pointer hover:bg-blue-200' : 'cursor-default'
                              }`}
                              title={event.title}
                            >
                              {new Date(event.startDate).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              - {event.title}
                            </button>
                          )
                        })}
                        {safeDayEvents.length > 3 && (
                          <button
                            type="button"
                            className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium px-2 py-1"
                            onClick={() => setEventsPopupDate(day)}
                          >
                            +{safeDayEvents.length - 3} more
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-lg font-semibold text-gray-800 mb-4">
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

                // Ensure dayEvents is an array
                const safeDayEvents = Array.isArray(dayEvents) ? dayEvents : []

                return safeDayEvents.length > 0 ? (
                  <div className="space-y-3">
                    {safeDayEvents.map((event: Event) => (
                      <div
                        key={event.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          {event.poster && (
                            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
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
                              <span className="text-sm font-medium text-gray-500">
                                {new Date(event.startDate).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                -{' '}
                                {new Date(event.endDate).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                                {event.eventType === 'regular' ? 'Regular' : 'Special'}
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{event.title}</h3>
                            {event.description && <p className="text-sm text-gray-600 mb-2">{event.description}</p>}
                            {event.venue && <div className="text-sm text-gray-500 mb-2">Venue: {event.venue.name}</div>}
                            {event.entryFee !== undefined &&
                              event.entryFee !== null &&
                              (() => {
                                const numericFee =
                                  typeof event.entryFee === 'string'
                                    ? parseFloat(event.entryFee)
                                    : Number(event.entryFee)
                                if (isNaN(numericFee)) return null
                                return (
                                  <div className="text-sm font-medium text-gray-900 mb-2">
                                    Entry Fee: ₹{numericFee.toFixed(2)}
                                  </div>
                                )
                              })()}
                            <div className="flex gap-2 mt-3">
                              <EventsPermission action="update">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEditEvent(event.id)
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
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {events.length > 0 ? (
                events
                  .sort((a: Event, b: Event) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((event: Event) => (
                    <div
                      key={event.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {event.poster && (
                          <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
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
                            <span className="text-sm font-medium text-gray-500">
                              {new Date(event.startDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}{' '}
                              {new Date(event.startDate).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                              {event.eventType === 'regular' ? 'Regular' : 'Special'}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{event.title}</h3>
                          {event.description && <p className="text-sm text-gray-600 mb-2">{event.description}</p>}
                          {event.venue && <div className="text-sm text-gray-500 mb-2">Venue: {event.venue.name}</div>}
                          {event.entryFee !== undefined &&
                            event.entryFee !== null &&
                            (() => {
                              const numericFee =
                                typeof event.entryFee === 'string' ? parseFloat(event.entryFee) : Number(event.entryFee)
                              if (isNaN(numericFee)) return null
                              return (
                                <div className="text-sm font-medium text-gray-900 mb-2">
                                  Entry Fee: ₹{numericFee.toFixed(2)}
                                </div>
                              )
                            })()}
                          <div className="flex gap-2 mt-3">
                            <EventsPermission action="update">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditEvent(event.id)
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
                                }}
                              >
                                View Registrations
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-12 text-gray-500">No events found</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Grid - Month View */}
      {viewMode === 'month' && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-1">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600">
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {days.map((date, index) => {
                if (!date) return null
                const dateEvents = getEventsForDate(date)
                const isCurrentMonthDay = isCurrentMonth(date)
                const isTodayDate = isToday(date)
                const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()

                return (
                  <div
                    key={index}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedDate(date)
                      setCurrentDate(date)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedDate(date)
                        setCurrentDate(date)
                      }
                    }}
                    className={`
                      min-h-[100px] p-2 border border-gray-200 cursor-pointer
                      ${!isCurrentMonthDay ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                      ${isTodayDate ? 'bg-blue-50 border-blue-300' : ''}
                      ${isSelected ? 'ring-2 ring-blue-500' : ''}
                      hover:bg-gray-50 transition-colors
                    `}
                  >
                    <div className="text-sm font-medium mb-1">{date.getDate()}</div>
                    <div className="space-y-1">
                      {dateEvents.slice(0, 2).map((event: Event) => {
                        return (
                          <button
                            type="button"
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditEvent(event.id)
                            }}
                            className={`text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded truncate w-full text-left ${
                              canUpdate ? 'cursor-pointer hover:bg-blue-200' : 'cursor-default'
                            }`}
                            title={event.title}
                          >
                            {event.title}
                          </button>
                        )
                      })}
                      {dateEvents.length > 2 && (
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEventsPopupDate(date)
                          }}
                        >
                          +{dateEvents.length - 2} more
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
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
