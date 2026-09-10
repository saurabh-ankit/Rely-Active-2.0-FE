import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  BulkCreateEmployeeShiftPayload,
  CoverShiftDatePayload,
  CreateAreaPayload,
  CreateEmployeeShiftPayload,
  CreateResidentPoolPayload,
  CreateShiftEmployeeDatePayload,
  CreateShiftPayload,
  EmployeeShiftAssignment,
  GenerateShiftEmployeeDatesPayload,
  MarkDayOffPayload,
  RosterApiResponse,
  RosterListParams,
  ShiftEmployeeDate,
  ShiftResidentPoolEntry,
  ShiftV2,
  SwapShiftDatesPayload,
  UpdateShiftPayload,
} from '@/lib/types/roster'

export type {
  BulkCreateEmployeeShiftPayload,
  CoverShiftDatePayload,
  CreateAreaPayload,
  CreateEmployeeShiftPayload,
  CreateResidentPoolPayload,
  CreateShiftEmployeeDatePayload,
  CreateShiftPayload,
  EmployeeShiftAssignment,
  GenerateShiftEmployeeDatesPayload,
  LeaveType,
  MarkDayOffPayload,
  RosterArea,
  RosterAreaType,
  RosterStatus,
  ShiftEmployeeDate,
  ShiftEmployeeDateStatus,
  ShiftResidentPoolEntry,
  ShiftV2,
  SwapShiftDatesPayload,
  UpdateShiftPayload,
  WeekDay,
} from '@/lib/types/roster'

export type ListParams = RosterListParams

export type ApiResponse<T = unknown> = RosterApiResponse<T>

const formatUrl = (template: string, locationId: string, replacements?: Record<string, string>) => {
  let url = template.replace(':locationId', locationId || 'all')
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value)
    })
  }
  return url
}

// ── Shifts ────────────────────────────────────────────────────────────────────

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

// ── Employee shifts ───────────────────────────────────────────────────────────

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

// ── Shift employee dates ──────────────────────────────────────────────────────

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

// ── Shift resident pool ───────────────────────────────────────────────────────

export const listResidentPoolsAPI = async (
  locationId: string,
  params?: { shiftEmployeeDateId?: string; unitId?: string; date?: string },
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

// ── Areas ─────────────────────────────────────────────────────────────────────

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
