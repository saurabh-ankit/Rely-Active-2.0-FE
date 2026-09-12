import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCenterData, getCenterList, getCenterOptions, mutateCenter } from '@/lib/services/centerInventoryService'
import type { CenterListParams, CenterLists } from '@/lib/types/centerInventory'
export function useCenterData<T>(locationId: string, path: string, params: CenterListParams = {}, enabled = true) {
  return useQuery({
    queryKey: ['center-inventory', locationId, path, params],
    queryFn: () => getCenterData<T>(locationId, path, params),
    enabled: !!locationId && enabled,
  })
}
export function useCenterList<K extends keyof CenterLists>(
  locationId: string,
  kind: K,
  params: CenterListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: ['center-inventory', locationId, kind, params],
    queryFn: () => getCenterList(locationId, kind, params),
    enabled: !!locationId && enabled,
  })
}
export function useCenterOptions<K extends 'items' | 'suppliers' | 'categories'>(
  locationId: string,
  kind: K,
  params: CenterListParams = {},
) {
  return useQuery({
    queryKey: ['center-inventory', locationId, kind, 'options', params],
    queryFn: () => getCenterOptions(locationId, kind, params),
    enabled: !!locationId,
  })
}
export function useCenterMutation<T = unknown>(locationId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      path,
      method = 'post',
      data,
    }: {
      path: string
      method?: 'post' | 'put' | 'delete'
      data?: unknown
    }) => mutateCenter<T>(locationId, path, method, data),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['center-inventory', locationId] }),
        client.invalidateQueries({ queryKey: ['inventory'] }),
      ])
    },
  })
}
