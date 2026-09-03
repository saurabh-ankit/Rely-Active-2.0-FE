import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  bulkDeleteEventsAPI,
  createEventAPI,
  createVenueAPI,
  deleteEventAPI,
  deleteVenueAPI,
  getEventByIdAPI,
  getEventCapacityAPI,
  getEventRegistrationsAPI,
  getEventsCalendarAPI,
  getLocationGlobalServicesAPI,
  getVenueByIdAPI,
  listEventsAPI,
  listVenuesAPI,
  updateEventAPI,
  updateRegistrationStatusAPI,
  updateVenueAPI,
  type CalendarQueryParams,
  type CreateEventRequest,
  type CreateVenueRequest,
  type EventQueryParams,
  type EventRegistrationsQueryParams,
  type LocationGlobalService,
  type UpdateEventRequest,
  type UpdateRegistrationStatusRequest,
  type UpdateVenueRequest,
  type VenueQueryParams,
} from '@/lib/services/eventService'
import { useLocationStore } from '@/lib/stores/locationStore'

type ApiError = { response?: { data?: { message?: string } }; message?: string }

const useLocationId = () => useLocationStore((s) => s.selectedLocationId)

export const useListVenues = (params?: VenueQueryParams) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ['venues', locationId, params],
    queryFn: () => listVenuesAPI(locationId!, params),
    enabled: !!locationId,
  })
}

export const useGetVenueById = (venueId: string, enabled = true) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ['venue', locationId, venueId],
    queryFn: () => getVenueByIdAPI(locationId!, venueId),
    enabled: enabled && !!venueId && !!locationId,
  })
}

export const useCreateVenue = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()

  return useMutation({
    mutationFn: (data: CreateVenueRequest | FormData) => createVenueAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['venues'] })
      toast.success(data.message || 'Venue created successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to create venue')
    },
  })
}

export const useUpdateVenue = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()

  return useMutation({
    mutationFn: ({ venueId, data }: { venueId: string; data: UpdateVenueRequest | FormData }) =>
      updateVenueAPI(locationId!, venueId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['venues'] })
      queryClient.invalidateQueries({ queryKey: ['venue'] })
      toast.success(data.message || 'Venue updated successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to update venue')
    },
  })
}

export const useDeleteVenue = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()

  return useMutation({
    mutationFn: (venueId: string) => deleteVenueAPI(locationId!, venueId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['venues'] })
      toast.success(data.message || 'Venue deleted successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to delete venue')
    },
  })
}

export const useLocationGlobalServices = () => {
  const locationId = useLocationId()

  return useQuery({
    queryKey: ['location-global-services', locationId],
    queryFn: async () => {
      const res = await getLocationGlobalServicesAPI(locationId!)
      const data = res?.data
      const list = (Array.isArray(data) ? data : []) as LocationGlobalService[]
      return list.map((service) => ({
        ...service,
        locationQuantity: service.locationQuantity ?? 1,
        allocatedQuantity: service.allocatedQuantity ?? 0,
        availableQuantity:
          service.availableQuantity ?? Math.max(0, (service.locationQuantity ?? 1) - (service.allocatedQuantity ?? 0)),
      }))
    },
    enabled: !!locationId,
  })
}

export const useListEvents = (params?: EventQueryParams) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ['events', locationId, params],
    queryFn: () => listEventsAPI(locationId!, params),
    enabled: !!locationId,
  })
}

export const useGetEventById = (eventId: string, enabled = true) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ['event', locationId, eventId],
    queryFn: () => getEventByIdAPI(locationId!, eventId),
    enabled: enabled && !!eventId && !!locationId,
  })
}

export const useGetEventsCalendar = (params: CalendarQueryParams) => {
  const locationId = useLocationId()

  const isEnabled = () => {
    if (!locationId) return false
    if (params.view === 'week') return !!params.weekStart
    if (params.view === 'day') return !!params.date
    return !!params.year && !!params.month
  }

  return useQuery({
    queryKey: ['events-calendar', locationId, params],
    queryFn: () => getEventsCalendarAPI(locationId!, params),
    enabled: isEnabled(),
  })
}

export const useCreateEvent = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()

  return useMutation({
    mutationFn: (data: CreateEventRequest | FormData) => createEventAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events-calendar'] })
      toast.success(data.message || 'Event created successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to create event')
    },
  })
}

export const useUpdateEvent = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: UpdateEventRequest | FormData }) =>
      updateEventAPI(locationId!, eventId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event'] })
      queryClient.invalidateQueries({ queryKey: ['events-calendar'] })
      toast.success(data.message || 'Event updated successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to update event')
    },
  })
}

export const useDeleteEvent = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()

  return useMutation({
    mutationFn: (eventId: string) => deleteEventAPI(locationId!, eventId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events-calendar'] })
      toast.success(data.message || 'Event deleted successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to delete event')
    },
  })
}

export const useBulkDeleteEvents = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()

  return useMutation({
    mutationFn: (eventIds: string[]) => bulkDeleteEventsAPI(locationId!, eventIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events-calendar'] })
      toast.success(data.message || 'Events deleted successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to delete events')
    },
  })
}

export const useGetEventRegistrations = (eventId: string, params?: EventRegistrationsQueryParams) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ['event-registrations', locationId, eventId, params],
    queryFn: () => getEventRegistrationsAPI(locationId!, eventId, params),
    enabled: !!eventId && !!locationId,
  })
}

export const useGetEventCapacity = (eventId: string) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ['event-capacity', locationId, eventId],
    queryFn: () => getEventCapacityAPI(locationId!, eventId),
    enabled: !!eventId && !!locationId,
  })
}

export const useUpdateRegistrationStatus = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()

  return useMutation({
    mutationFn: ({
      eventId,
      registrationId,
      data,
    }: {
      eventId: string
      registrationId: string
      data: UpdateRegistrationStatusRequest
    }) => updateRegistrationStatusAPI(locationId!, eventId, registrationId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-registrations'] })
      queryClient.invalidateQueries({ queryKey: ['event-capacity'] })
      toast.success(data.message || 'Registration status updated successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to update registration status')
    },
  })
}
