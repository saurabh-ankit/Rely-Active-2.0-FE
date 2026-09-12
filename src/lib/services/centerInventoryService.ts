import api from '@/lib/api/axios'
import type { InventoryList } from '@/lib/types/inventory'
import type { CenterListParams, CenterLists } from '@/lib/types/centerInventory'
interface Envelope<T> {
  data: T
}
const base = (locationId: string) => `/center-inventory/${encodeURIComponent(locationId)}`
export async function getCenterData<T>(locationId: string, path: string, params?: CenterListParams): Promise<T> {
  return (await api.get<Envelope<T>>(`${base(locationId)}/${path}`, { params })).data.data
}
export function getCenterList<K extends keyof CenterLists>(locationId: string, kind: K, params: CenterListParams) {
  return getCenterData<InventoryList<CenterLists[K]>>(locationId, kind, params)
}
export async function getCenterOptions<K extends 'items' | 'suppliers' | 'categories'>(
  locationId: string,
  kind: K,
  params: CenterListParams = {},
) {
  const first = await getCenterList(locationId, kind, { ...params, page: 1, limit: 100 })
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.pagination.totalPages - 1) }, (_, i) =>
      getCenterList(locationId, kind, { ...params, page: i + 2, limit: 100 }),
    ),
  )
  return [...first.records, ...rest.flatMap((p) => p.records)]
}
export async function mutateCenter<T>(
  locationId: string,
  path: string,
  method: 'post' | 'put' | 'delete',
  data?: unknown,
): Promise<T> {
  return (await api.request<Envelope<T>>({ url: `${base(locationId)}/${path}`, method, data })).data.data
}
