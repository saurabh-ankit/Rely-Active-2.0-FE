import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  coverShiftDateAPI,
  createShiftEmployeeDateAPI,
  generateShiftEmployeeDatesAPI,
  listShiftEmployeeDatesAPI,
  markDayOffAPI,
  swapShiftDatesAPI,
  unmarkDayOffAPI,
  type CoverShiftDatePayload,
  type CreateShiftEmployeeDatePayload,
  type GenerateShiftEmployeeDatesPayload,
  type MarkDayOffPayload,
  type SwapShiftDatesPayload,
} from '@/lib/services/shiftEmployeeDateService'
import { useLocationStore } from '@/lib/stores/locationStore'
import { ROSTER_KEYS } from './rosterKeys'

type ApiError = { response?: { data?: { message?: string } }; message?: string }

const useLocationId = () => useLocationStore((s) => s.selectedLocationId)

export const useListShiftEmployeeDates = (
  params?: {
    assignmentId?: string
    date?: string
    status?: string
    includeDeleted?: string
  },
  enabled = true,
) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ROSTER_KEYS.shiftEmployeeDates(locationId, params),
    queryFn: () => listShiftEmployeeDatesAPI(locationId!, params),
    enabled: enabled && !!locationId,
  })
}

export const useCreateShiftEmployeeDate = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: CreateShiftEmployeeDatePayload) => createShiftEmployeeDateAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Shift date created')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to create date')
    },
  })
}

export const useGenerateShiftEmployeeDates = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: GenerateShiftEmployeeDatesPayload) => generateShiftEmployeeDatesAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Dates generated')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to generate dates')
    },
  })
}

export const useMarkDayOff = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ dateId, data }: { dateId: string; data: MarkDayOffPayload }) =>
      markDayOffAPI(locationId!, dateId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Day off marked')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to mark day off')
    },
  })
}

export const useUnmarkDayOff = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (dateId: string) => unmarkDayOffAPI(locationId!, dateId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Day off removed')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to unmark day off')
    },
  })
}

export const useCoverShiftDate = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ dateId, data }: { dateId: string; data: CoverShiftDatePayload }) =>
      coverShiftDateAPI(locationId!, dateId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Cover assigned')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to assign cover')
    },
  })
}

export const useSwapShiftDates = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ dateId, data }: { dateId: string; data: SwapShiftDatesPayload }) =>
      swapShiftDatesAPI(locationId!, dateId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Shifts swapped')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to swap shifts')
    },
  })
}
