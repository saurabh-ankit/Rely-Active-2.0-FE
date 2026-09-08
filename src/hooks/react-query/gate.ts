import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getGateStats,
  getGateEntries,
  getGatePreapproveds,
  updateGateEntryStatus,
  addGateEntryItems,
} from '@/lib/services/gateService'
import type { GateQueryParams, GateItemInput } from '@/lib/types/gate'

export const GATE_KEYS = {
  all: ['gate'] as const,
  stats: (locId: string) => ['gate', 'stats', locId] as const,
  entries: (locId: string, params?: GateQueryParams) => ['gate', 'entries', locId, params] as const,
  preapproved: (locId: string, params?: GateQueryParams) => ['gate', 'preapproved', locId, params] as const,
}

// ==================== Queries ====================
export const useGateStatsQuery = (locationId: string) => {
  return useQuery({
    queryKey: GATE_KEYS.stats(locationId),
    queryFn: () => getGateStats(locationId),
    enabled: Boolean(locationId),
  })
}

export const useGateEntriesQuery = (locationId: string, params?: GateQueryParams) => {
  return useQuery({
    queryKey: GATE_KEYS.entries(locationId, params),
    queryFn: () => getGateEntries(locationId, params),
    enabled: Boolean(locationId),
  })
}

export const useGatePreapprovedsQuery = (locationId: string, params?: GateQueryParams) => {
  return useQuery({
    queryKey: GATE_KEYS.preapproved(locationId, params),
    queryFn: () => getGatePreapproveds(locationId, params),
    enabled: Boolean(locationId),
  })
}

// ==================== Mutations ====================
export const useUpdateGateEntryStatusMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      locationId,
      entryId,
      status,
      checkedItems,
    }: {
      locationId: string
      entryId: string
      status: string
      checkedItems?: string[]
    }) => updateGateEntryStatus(locationId, entryId, status, checkedItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GATE_KEYS.all })
    },
  })
}

export const useAddGateEntryItemsMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ locationId, entryId, items }: { locationId: string; entryId: string; items: GateItemInput[] }) =>
      addGateEntryItems(locationId, entryId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GATE_KEYS.all })
    },
  })
}
