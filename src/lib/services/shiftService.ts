import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateShiftPayload, RosterApiResponse, ShiftV2, UpdateShiftPayload } from '@/lib/types/roster'

export type { CreateShiftPayload, ShiftV2, UpdateShiftPayload } from '@/lib/types/roster'

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

export const listShiftsAPI = async (locationId: string) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.listShifts, locationId)
  const response = await api.get(url)
  return response.data as ApiResponse<{ shifts: ShiftV2[] }>
}

export const createShiftAPI = async (locationId: string, data: CreateShiftPayload) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.createShift, locationId)
  const response = await api.post(url, data)
  return response.data as ApiResponse<ShiftV2>
}

export const updateShiftAPI = async (locationId: string, id: string, data: UpdateShiftPayload) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.updateShift, locationId, { id })
  const response = await api.put(url, data)
  return response.data as ApiResponse<ShiftV2>
}

export const deleteShiftAPI = async (locationId: string, id: string) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.deleteShift, locationId, { id })
  const response = await api.delete(url)
  return response.data as ApiResponse
}
