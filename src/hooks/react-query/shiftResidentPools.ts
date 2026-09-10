import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createResidentPoolAPI,
  deleteResidentPoolAPI,
  listResidentPoolsAPI,
  type CreateResidentPoolPayload,
} from '@/lib/services/shiftResidentPoolService'
import { useLocationStore } from '@/lib/stores/locationStore'
import { ROSTER_KEYS } from './rosterKeys'

type ApiError = { response?: { data?: { message?: string } }; message?: string }

const useLocationId = () => useLocationStore((s) => s.selectedLocationId)

export const useListResidentPools = (
  params?: { shiftEmployeeDateId?: string; residentId?: string; date?: string },
  enabled = true,
) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ROSTER_KEYS.residentPools(locationId, params),
    queryFn: () => listResidentPoolsAPI(locationId!, params),
    enabled: enabled && !!locationId,
  })
}

export const useCreateResidentPool = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: CreateResidentPoolPayload) => createResidentPoolAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-resident-pools'] })
      toast.success(data.message || 'Resident assigned')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to assign resident')
    },
  })
}

export const useDeleteResidentPool = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (poolId: string) => deleteResidentPoolAPI(locationId!, poolId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-resident-pools'] })
      toast.success(data.message || 'Resident removed from pool')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to remove resident')
    },
  })
}
