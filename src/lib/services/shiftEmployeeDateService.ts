import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  CoverShiftDatePayload,
  CreateShiftEmployeeDatePayload,
  GenerateShiftEmployeeDatesPayload,
  MarkDayOffPayload,
  RosterApiResponse,
  ShiftEmployeeDate,
  SwapShiftDatesPayload,
} from '@/lib/types/roster'

export type {
  CoverShiftDatePayload,
  CreateShiftEmployeeDatePayload,
  GenerateShiftEmployeeDatesPayload,
  LeaveType,
  MarkDayOffPayload,
  ShiftEmployeeDate,
  ShiftEmployeeDateStatus,
  SwapShiftDatesPayload,
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

export const listShiftEmployeeDatesAPI = async (
  locationId: string,
  params?: {
    assignmentId?: string
    date?: string
    status?: string
    includeDeleted?: string
  },
) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.listShiftEmployeeDates, locationId)
  const response = await api.get(url, { params })
  return response.data as ApiResponse<ShiftEmployeeDate[]>
}

export const createShiftEmployeeDateAPI = async (locationId: string, data: CreateShiftEmployeeDatePayload) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.createShiftEmployeeDate, locationId)
  const response = await api.post(url, data)
  return response.data as ApiResponse<ShiftEmployeeDate>
}

export const generateShiftEmployeeDatesAPI = async (locationId: string, data: GenerateShiftEmployeeDatesPayload) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.generateShiftEmployeeDates, locationId)
  const response = await api.post(url, data)
  return response.data as ApiResponse
}

export const markDayOffAPI = async (locationId: string, dateId: string, data: MarkDayOffPayload) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.markDayOff, locationId, { dateId })
  const response = await api.put(url, data)
  return response.data as ApiResponse<ShiftEmployeeDate>
}

export const unmarkDayOffAPI = async (locationId: string, dateId: string) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.unmarkDayOff, locationId, { dateId })
  const response = await api.delete(url)
  return response.data as ApiResponse<ShiftEmployeeDate>
}

export const coverShiftDateAPI = async (locationId: string, dateId: string, data: CoverShiftDatePayload) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.coverShiftDate, locationId, { dateId })
  const response = await api.put(url, data)
  return response.data as ApiResponse<ShiftEmployeeDate>
}

export const swapShiftDatesAPI = async (locationId: string, dateId: string, data: SwapShiftDatesPayload) => {
  const url = formatUrl(API_ENDPOINTS.shiftRoster.swapShiftDates, locationId, { dateId })
  const response = await api.put(url, data)
  return response.data as ApiResponse
}
