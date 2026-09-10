import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createShiftAPI,
  deleteShiftAPI,
  listShiftsAPI,
  updateShiftAPI,
  type CreateShiftPayload,
  type UpdateShiftPayload,
} from '@/lib/services/shiftService'
import { useLocationStore } from '@/lib/stores/locationStore'
import { ROSTER_KEYS } from './rosterKeys'

type ApiError = { response?: { data?: { message?: string } }; message?: string }

const useLocationId = () => useLocationStore((s) => s.selectedLocationId)

export const useListShifts = (enabled = true) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ROSTER_KEYS.shifts(locationId),
    queryFn: () => listShiftsAPI(locationId!),
    enabled: enabled && !!locationId,
  })
}

export const useCreateShift = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: CreateShiftPayload) => createShiftAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success(data.message || 'Shift created successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to create shift')
    },
  })
}

export const useUpdateShift = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShiftPayload }) => updateShiftAPI(locationId!, id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success(data.message || 'Shift updated successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to update shift')
    },
  })
}

export const useDeleteShift = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (id: string) => deleteShiftAPI(locationId!, id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success(data.message || 'Shift deleted successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to delete shift')
    },
  })
}
