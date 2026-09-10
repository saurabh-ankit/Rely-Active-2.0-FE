import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  BulkCreateEmployeeShiftPayload,
  CreateEmployeeShiftPayload,
  EmployeeShiftAssignment,
  RosterApiResponse,
} from '@/lib/types/roster'

export type {
  BulkCreateEmployeeShiftPayload,
  CreateEmployeeShiftPayload,
  EmployeeShiftAssignment,
  WeekDay,
} from '@/lib/types/roster'

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

export const listEmployeeShiftsAPI = async (locationId: string, employeeId?: string) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.listEmployeeShifts, locationId)
  const response = await api.get(url, { params: employeeId ? { employeeId } : undefined })
  return response.data as ApiResponse<EmployeeShiftAssignment[]>
}

export const exportEmployeeShiftsAPI = async (locationId: string, params?: Record<string, string>) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.exportEmployeeShifts, locationId)
  const response = await api.get(url, { params, responseType: 'blob' })
  return response.data as Blob
}

export const createEmployeeShiftAPI = async (locationId: string, data: CreateEmployeeShiftPayload) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.createEmployeeShift, locationId)
  const response = await api.post(url, data)
  return response.data as ApiResponse<EmployeeShiftAssignment>
}

export const bulkCreateEmployeeShiftsAPI = async (locationId: string, data: BulkCreateEmployeeShiftPayload) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.bulkCreateEmployeeShifts, locationId)
  const response = await api.post(url, data)
  return response.data as ApiResponse<EmployeeShiftAssignment[]>
}

export const deleteEmployeeShiftAPI = async (locationId: string, employeeShiftId: string) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.deleteEmployeeShift, locationId, {
    employeeShiftId,
  })
  const response = await api.delete(url)
  return response.data as ApiResponse
}
