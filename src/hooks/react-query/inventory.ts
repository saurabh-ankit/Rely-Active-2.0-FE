import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from '@/lib/services/inventoryService'
import { getPropertiesAPI } from '@/lib/services/propertyService'
import type {
  InventoryKind,
  InventoryListParams,
  InventoryPayloads,
  InventoryFieldDefinition,
  InventoryVendorAssignment,
} from '@/lib/types/inventory'
export const inventoryKeys = {
  all: ['inventory', 'global'] as const,
  list: (kind: InventoryKind, params: InventoryListParams) => ['inventory', 'global', kind, 'list', params] as const,
  detail: (kind: InventoryKind, id: string) => ['inventory', 'global', kind, 'detail', id] as const,
}
export const useInventoryList = <K extends InventoryKind>(kind: K, params: InventoryListParams, enabled = true) =>
  useQuery({
    queryKey: inventoryKeys.list(kind, params),
    queryFn: () => service.getInventoryList(kind, params),
    enabled,
  })
export const useInventoryDetail = <K extends InventoryKind>(kind: K, id: string) =>
  useQuery({
    queryKey: inventoryKeys.detail(kind, id),
    queryFn: () => service.getInventoryDetail(kind, id),
    enabled: !!id,
  })
export const useInventoryPackageOptions = () =>
  useQuery({
    queryKey: [...inventoryKeys.all, 'package-options'],
    queryFn: service.getInventoryPackageOptions,
    staleTime: 3600000,
  })
export const useInventoryProperties = () =>
  useQuery({ queryKey: [...inventoryKeys.all, 'properties'], queryFn: () => getPropertiesAPI() })
export const useInventoryVendorOptions = () =>
  useQuery({ queryKey: [...inventoryKeys.all, 'vendor-options'], queryFn: service.getInventoryVendorOptions })
function useInventoryMutation<T>(mutationFn: (data: T) => Promise<unknown>) {
  const client = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => client.invalidateQueries({ queryKey: inventoryKeys.all }) })
}
export const useSaveInventory = <K extends InventoryKind>(kind: K) =>
  useInventoryMutation(({ data, id }: { data: InventoryPayloads[K]; id?: string }) =>
    service.saveInventory(kind, data, id),
  )
export const useAssignInventoryLocations = (kind: InventoryKind, id: string) =>
  useInventoryMutation((locationIds: string[]) => service.assignInventoryLocations(kind, id, locationIds))
export const useAssignInventoryVendors = (id: string) =>
  useInventoryMutation((assignments: InventoryVendorAssignment[]) => service.assignInventoryVendors(id, assignments))
export const useSaveInventoryField = (categoryId: string) =>
  useInventoryMutation(({ data, id }: { data: Omit<InventoryFieldDefinition, 'id' | 'categoryId'>; id?: string }) =>
    service.saveInventoryField(categoryId, data, id),
  )
export const useDeleteInventoryField = (categoryId: string) =>
  useInventoryMutation((id: string) => service.deleteInventoryField(categoryId, id))

export const useUploadInventoryImage = () => useMutation({ mutationFn: service.uploadInventoryImage })
