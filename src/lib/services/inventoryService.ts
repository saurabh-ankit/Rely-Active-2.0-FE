import api from '@/lib/api/axios'
import { INVENTORY_ENDPOINTS as endpoints } from '@/lib/api/endpoints'
import type {
  InventoryKind,
  InventoryRecords,
  InventoryList,
  InventoryListParams,
  InventoryPackageOptions,
  InventoryPayloads,
  InventoryFieldDefinition,
  InventoryVendorAssignment,
} from '@/lib/types/inventory'
interface Envelope<T> {
  success: boolean
  message: string
  data: T
}
export async function getInventoryList<K extends InventoryKind>(kind: K, params: InventoryListParams) {
  return (await api.get<Envelope<InventoryList<InventoryRecords[K]>>>(endpoints.list(kind), { params })).data.data
}
export async function getInventoryDetail<K extends InventoryKind>(kind: K, id: string) {
  return (await api.get<Envelope<InventoryRecords[K]>>(endpoints.detail(kind, id))).data.data
}
export async function saveInventory<K extends InventoryKind>(kind: K, data: InventoryPayloads[K], id?: string) {
  return (
    await (id
      ? api.put<Envelope<InventoryRecords[K]>>(endpoints.detail(kind, id), data)
      : api.post<Envelope<InventoryRecords[K]>>(endpoints.list(kind), data))
  ).data.data
}
export async function assignInventoryLocations(kind: InventoryKind, id: string, locationIds: string[]) {
  return (await api.put(endpoints.locations(kind, id), { locationIds })).data.data
}
export async function assignInventoryVendors(id: string, assignments: InventoryVendorAssignment[]) {
  return (await api.put(endpoints.itemVendors(id), { assignments })).data.data
}
export async function getInventoryPackageOptions() {
  return (await api.get<Envelope<InventoryPackageOptions>>(endpoints.packageOptions)).data.data
}
export async function saveInventoryField(
  categoryId: string,
  data: Omit<InventoryFieldDefinition, 'id' | 'categoryId'>,
  id?: string,
) {
  return (await (id ? api.put(endpoints.field(categoryId, id), data) : api.post(endpoints.fields(categoryId), data)))
    .data.data
}
export async function deleteInventoryField(categoryId: string, id: string) {
  await api.delete(endpoints.field(categoryId, id))
}
// Fetch every page for assignment pickers, rather than silently truncating at the list page size.
export async function getInventoryVendorOptions() {
  const first = await getInventoryList('vendors', { limit: 100 })
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.pagination.totalPages - 1) }, (_, i) =>
      getInventoryList('vendors', { page: i + 2, limit: 100 }),
    ),
  )
  return [...first.records, ...rest.flatMap((p) => p.records)]
}

export async function uploadInventoryImage(file: File) {
  const body = new FormData()
  body.append('image', file)
  return (await api.post<Envelope<{ image: string }>>(endpoints.categoryImage, body)).data.data
}
