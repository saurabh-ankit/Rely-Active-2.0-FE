import { useQuery } from '@tanstack/react-query'
import { residentService } from '@/lib/services/residentService'
import type { GetResidentsParams, ResidentItem } from '@/lib/types'

export const RESIDENT_KEYS = {
  all: ['residents'] as const,
  list: (params?: GetResidentsParams) => ['residents', 'list', params] as const,
  byId: (id?: string) => ['residents', 'detail', id] as const,
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
