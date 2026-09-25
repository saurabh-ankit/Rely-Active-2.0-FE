import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  bookAppointmentAPI,
  ensureAppointmentShiftDateAPI,
  getAppointmentBookingsAPI,
  getAppointmentCapacityAPI,
  getAppointmentShiftDateAPI,
  updateAppointmentStatusAPI,
} from '@/lib/services/appointmentService'
import type {
  AppointmentBookingsQueryParams,
  BookAppointmentRequest,
  EnsureShiftDateRequest,
  UpdateAppointmentStatusRequest,
} from '@/lib/types/appointment'
import { useLocationStore } from '@/lib/stores/locationStore'

type ApiError = { response?: { data?: { message?: string } }; message?: string }

const useLocationId = () => useLocationStore((s) => s.selectedLocationId)

export const APPOINTMENT_KEYS = {
  shiftDate: (locationId?: string | null, id?: string) => ['appointment-shift-date', locationId, id] as const,
  capacity: (locationId?: string | null, id?: string) => ['appointment-capacity', locationId, id] as const,
  bookings: (locationId?: string | null, id?: string, params?: AppointmentBookingsQueryParams) =>
    ['appointment-bookings', locationId, id, params] as const,
}

export const useAppointmentShiftDate = (shiftEmployeeDateId: string, enabled = true) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: APPOINTMENT_KEYS.shiftDate(locationId, shiftEmployeeDateId),
    queryFn: () => getAppointmentShiftDateAPI(locationId!, shiftEmployeeDateId),
    enabled: enabled && !!locationId && !!shiftEmployeeDateId,
  })
}

export const useAppointmentCapacity = (shiftEmployeeDateId: string, enabled = true) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: APPOINTMENT_KEYS.capacity(locationId, shiftEmployeeDateId),
    queryFn: () => getAppointmentCapacityAPI(locationId!, shiftEmployeeDateId),
    enabled: enabled && !!locationId && !!shiftEmployeeDateId,
  })
}

export const useAppointmentBookings = (
  shiftEmployeeDateId: string,
  params?: AppointmentBookingsQueryParams,
  enabled = true,
) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: APPOINTMENT_KEYS.bookings(locationId, shiftEmployeeDateId, params),
    queryFn: () => getAppointmentBookingsAPI(locationId!, shiftEmployeeDateId, params),
    enabled: enabled && !!locationId && !!shiftEmployeeDateId,
  })
}

export const useEnsureAppointmentShiftDate = () => {
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: EnsureShiftDateRequest) => ensureAppointmentShiftDateAPI(locationId!, data),
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to open appointment shift')
    },
  })
}

export const useBookAppointment = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()

  return useMutation({
    mutationFn: ({ shiftEmployeeDateId, data }: { shiftEmployeeDateId: string; data: BookAppointmentRequest }) =>
      bookAppointmentAPI(locationId!, shiftEmployeeDateId, data),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['appointment-bookings', locationId, vars.shiftEmployeeDateId] })
      queryClient.invalidateQueries({ queryKey: ['appointment-capacity', locationId, vars.shiftEmployeeDateId] })
      toast.success(data.message || 'Appointment booked successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to book appointment')
    },
  })
}

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()

  return useMutation({
    mutationFn: ({ appointmentId, data }: { appointmentId: string; data: UpdateAppointmentStatusRequest }) =>
      updateAppointmentStatusAPI(locationId!, appointmentId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointment-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-capacity'] })
      toast.success(data.message || 'Appointment status updated')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to update status')
    },
  })
}
