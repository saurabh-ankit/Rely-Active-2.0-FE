import { lazy, Suspense, useMemo, useState } from 'react'
import { Calendar, CalendarDays, List, MapPin, Plus, Ticket } from 'lucide-react'
import { ResponsiveTabs } from '@/components/common/ResponsiveTabs'
import PageLoader from '@/components/shared/PageLoader'
import { Button } from '@/components/ui/button'
import StatCard from '@/pages/AssetManagement/components/StatCard'
import StatsGrid from '@/pages/AssetManagement/components/StatsGrid'
import { EventsPermission } from '@/pages/Events/components/EventsPermission'
import { useListEvents, useListVenues } from '@/hooks/react-query/events'
import type { Event } from '@/lib/services/eventService'
import CreateEventModal from './components/CreateEventModal'
import { useSearchParams } from 'react-router-dom'
import { eventOverlapsLocalMonth, eventStartsOnOrAfterLocalDay } from '@/utils/event.utils'

const EventsCalendar = lazy(() => import('./components/EventsCalendar'))
const EventsListPage = lazy(() => import('./components/EventsList'))
const VenuesListPage = lazy(() => import('./components/VenuesList'))

const TAB_VALUES = ['calendar', 'list', 'venues'] as const
type EventsTab = (typeof TAB_VALUES)[number]

const isValidTab = (tab: string | null): tab is EventsTab => !!tab && TAB_VALUES.includes(tab as EventsTab)

const extractEvents = (payload: unknown): Event[] => {
  const data = (payload as { data?: { events?: Event[]; records?: Event[] } })?.data
  if (Array.isArray(data?.events)) return data.events
  if (Array.isArray(data?.records)) return data.records
  if (Array.isArray((payload as { data?: Event[] })?.data)) return (payload as { data: Event[] }).data
  return []
}

const EventsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: EventsTab = isValidTab(tabParam) ? tabParam : 'calendar'

  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)

  const now = useMemo(() => new Date(), [])
  const viewedYear = Number.parseInt(searchParams.get('year') || '', 10)
  const viewedMonth = Number.parseInt(searchParams.get('month') || '', 10)
  const statsYear = !Number.isNaN(viewedYear) ? viewedYear : now.getFullYear()
  const statsMonthIndex =
    !Number.isNaN(viewedMonth) && viewedMonth >= 1 && viewedMonth <= 12 ? viewedMonth - 1 : now.getMonth()

  // Single source of truth for event counts (same records calendar/list use)
  const { data: allEventsData, isLoading: eventsLoading } = useListEvents({
    page: 1,
    limit: 'all',
  })
  const { data: venuesData, isLoading: venuesLoading } = useListVenues({
    page: 1,
    limit: 1,
  })

  const allEvents = useMemo(() => extractEvents(allEventsData), [allEventsData])

  const totalEvents = allEvents.length
  const thisMonthEvents = useMemo(
    () => allEvents.filter((event) => eventOverlapsLocalMonth(event, statsYear, statsMonthIndex)).length,
    [allEvents, statsYear, statsMonthIndex],
  )
  const upcomingEvents = useMemo(
    () => allEvents.filter((event) => eventStartsOnOrAfterLocalDay(event, now)).length,
    [allEvents, now],
  )
  const totalVenues = venuesData?.data?.pagination?.total ?? 0

  const statsLoading = eventsLoading || venuesLoading

  const setActiveTab = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (tab === 'calendar') {
        next.delete('tab')
      } else {
        next.set('tab', tab)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Plan events, manage venues, and track registrations</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EventsPermission action="create">
            <Button
              onClick={() => setIsCreateEventOpen(true)}
              size="sm"
              className="bg-[#2a517c] hover:bg-[#476587] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </EventsPermission>
        </div>
      </div>

      <StatsGrid>
        <StatCard
          title="Total Events"
          value={statsLoading ? '...' : totalEvents.toString()}
          description="All scheduled events"
          icon={Calendar}
          color="blue"
          isLoading={statsLoading}
        />
        <StatCard
          title="This Month"
          value={statsLoading ? '...' : thisMonthEvents.toString()}
          description={`Events in ${new Date(statsYear, statsMonthIndex, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}`}
          icon={CalendarDays}
          color="purple"
          isLoading={statsLoading}
        />
        <StatCard
          title="Upcoming"
          value={statsLoading ? '...' : upcomingEvents.toString()}
          description="Events starting today or later"
          icon={Ticket}
          color="green"
          isLoading={statsLoading}
        />
        <StatCard
          title="Venues"
          value={statsLoading ? '...' : totalVenues.toString()}
          description="Available event venues"
          icon={MapPin}
          color="orange"
          isLoading={statsLoading}
        />
      </StatsGrid>

      <EventsPermission action="view">
        <ResponsiveTabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
          tabs={[
            {
              value: 'calendar',
              label: 'Calendar',
              shortLabel: 'Calendar',
              icon: Calendar,
              content: (
                <Suspense fallback={<PageLoader />}>
                  <EventsCalendar enabled={activeTab === 'calendar'} />
                </Suspense>
              ),
            },
            {
              value: 'list',
              label: 'Events',
              shortLabel: 'Events',
              icon: List,
              content: (
                <Suspense fallback={<PageLoader />}>
                  <EventsListPage embedded enabled={activeTab === 'list'} />
                </Suspense>
              ),
            },
            {
              value: 'venues',
              label: 'Venues',
              shortLabel: 'Venues',
              icon: MapPin,
              content: (
                <Suspense fallback={<PageLoader />}>
                  <VenuesListPage embedded enabled={activeTab === 'venues'} />
                </Suspense>
              ),
            },
          ]}
        />
      </EventsPermission>

      <CreateEventModal open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen} />
    </div>
  )
}

export default EventsPage
