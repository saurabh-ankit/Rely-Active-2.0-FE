import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { residentService } from '@/lib/services/residentService'
import { getCareTeamAPI, assignCareTeamMemberAPI, removeCareTeamMemberAPI } from '@/lib/services/residentService'
import type { GetResidentsParams, ResidentItem } from '@/lib/types'
import type { AssignCareTeamPayload } from '@/lib/services/residentService'

export const RESIDENT_KEYS = {
  all: ['residents'] as const,
  list: (params?: GetResidentsParams) => ['residents', 'list', params] as const,
  byId: (id?: string) => ['residents', 'detail', id] as const,
  careTeam: (residentId?: string) => ['residents', 'care-team', residentId] as const,
}

export const useResidentsQuery = (params?: GetResidentsParams, enabled = true) => {
  return useQuery<ResidentItem[]>({
    queryKey: RESIDENT_KEYS.list(params),
    queryFn: () => residentService.getResidents(params),
    enabled,
  })
}

export const useResidentByIdQuery = (id?: string, enabled = true) => {
  return useQuery<ResidentItem>({
    queryKey: RESIDENT_KEYS.byId(id),
    queryFn: () => residentService.getResidentById(id!),
    enabled: enabled && !!id,
  })
}

export const useCareTeamQuery = (residentId?: string, enabled = true) => {
  return useQuery({
    queryKey: RESIDENT_KEYS.careTeam(residentId),
    queryFn: () => getCareTeamAPI(residentId!),
    enabled: enabled && !!residentId,
  })
}

export const useAssignCareTeamMutation = (residentId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AssignCareTeamPayload) => assignCareTeamMemberAPI(residentId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RESIDENT_KEYS.careTeam(residentId) })
    },
  })
}

export const useRemoveCareTeamMemberMutation = (residentId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => removeCareTeamMemberAPI(residentId, memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RESIDENT_KEYS.careTeam(residentId) })
    },
  })
}
