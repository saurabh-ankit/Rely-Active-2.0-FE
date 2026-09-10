import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createAreaAPI,
  deleteAreaAPI,
  listAreasAPI,
  updateAreaAPI,
  type CreateAreaPayload,
  type ListParams,
} from '@/lib/services/rosterService'
import { useLocationStore } from '@/lib/stores/locationStore'
import { ROSTER_KEYS } from './rosterKeys'

type ApiError = { response?: { data?: { message?: string } }; message?: string }

const useLocationId = () => useLocationStore((s) => s.selectedLocationId)

export const useListAreas = (params?: ListParams, enabled = true) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ROSTER_KEYS.areas(locationId, params),
    queryFn: () => listAreasAPI(locationId!, params),
    enabled: enabled && !!locationId,
  })
}

export const useCreateArea = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: CreateAreaPayload) => createAreaAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roster-areas'] })
      toast.success(data.message || 'Area created')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to create area')
    },
  })
}

export const useUpdateArea = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAreaPayload> }) =>
      updateAreaAPI(locationId!, id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roster-areas'] })
      toast.success(data.message || 'Area updated')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to update area')
    },
  })
}

export const useDeleteArea = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (id: string) => deleteAreaAPI(locationId!, id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roster-areas'] })
      toast.success(data.message || 'Area deleted')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to delete area')
    },
  })
}
