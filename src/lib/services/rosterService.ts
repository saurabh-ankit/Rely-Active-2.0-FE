import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateAreaPayload, RosterApiResponse, RosterListParams } from '@/lib/types/roster'

export type { CreateAreaPayload, RosterArea, RosterAreaType, RosterStatus } from '@/lib/types/roster'

export type ListParams = RosterListParams

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

export const listAreasAPI = async (locationId: string, params?: ListParams) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.listAreas, locationId)
  const response = await api.get(url, { params })
  return response.data as ApiResponse
}

export const createAreaAPI = async (locationId: string, data: CreateAreaPayload) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.createArea, locationId)
  const response = await api.post(url, data)
  return response.data as ApiResponse
}

export const updateAreaAPI = async (locationId: string, areaId: string, data: Partial<CreateAreaPayload>) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.updateArea, locationId, { areaId })
  const response = await api.put(url, data)
  return response.data as ApiResponse
}

export const deleteAreaAPI = async (locationId: string, areaId: string) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.deleteArea, locationId, { areaId })
  const response = await api.delete(url)
  return response.data as ApiResponse
}
