import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useLocationStore } from '@/lib/stores/locationStore'
import { getActivityCalendarAPI, type ActivityCalendarParams } from '@/lib/services/activityCalendarService'

/** Every activity at the selected property between `from` and `to` (read-only). */
export const useActivityCalendar = (params: ActivityCalendarParams, enabled = true) => {
  const locationId = useLocationStore((s) => s.selectedLocationId)
  return useQuery({
    queryKey: ['activity-calendar', locationId, params.from, params.to],
    queryFn: () => getActivityCalendarAPI(locationId!, params),
    enabled: enabled && !!locationId && !!params.from && !!params.to,
    // Keep the last range on screen while the next loads, but never another property's.
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[1] === locationId ? keepPreviousData(prev) : undefined),
    staleTime: 60_000,
  })
}
