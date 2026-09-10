import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateResidentPoolPayload, RosterApiResponse, ShiftResidentPoolEntry } from '@/lib/types/roster'

export type { CreateResidentPoolPayload, ShiftResidentPoolEntry } from '@/lib/types/roster'

const formatUrl = (template: string, locationId: string, replacements?: Record<string, string>) => {
  let url = template.replace(':locationId', locationId || 'all')
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value)
    })
  }
  return url
}

export type ApiResponse<T = unknown> = RosterApiResponse<T>

export const listResidentPoolsAPI = async (
  locationId: string,
  params?: { shiftEmployeeDateId?: string; residentId?: string; date?: string },
) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.listResidentPools, locationId)
  const response = await api.get(url, { params })
  return response.data as ApiResponse<ShiftResidentPoolEntry[]>
}

export const createResidentPoolAPI = async (locationId: string, data: CreateResidentPoolPayload) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.createResidentPool, locationId)
  const response = await api.post(url, data)
  return response.data as ApiResponse<ShiftResidentPoolEntry>
}

export const deleteResidentPoolAPI = async (locationId: string, poolId: string) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.deleteResidentPool, locationId, { poolId })
  const response = await api.delete(url)
  return response.data as ApiResponse
}
