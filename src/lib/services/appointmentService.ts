import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  ApiResponse,
  AppointmentBookingsQueryParams,
  AppointmentCapacityResponse,
  AppointmentShiftDateContext,
  BookAppointmentRequest,
  DoctorAppointment,
  EnsureShiftDateRequest,
  UpdateAppointmentStatusRequest,
} from '@/lib/types/appointment'

const formatUrl = (template: string, locationId: string, replacements?: Record<string, string>) => {
  let url = template.replace(':locationId', locationId || 'all')
  if (replacements) {
    Object.entries(replacements).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value)
    })
  }
  return url
}

export const ensureAppointmentShiftDateAPI = async (locationId: string, data: EnsureShiftDateRequest) => {
  const url = formatUrl(API_ENDPOINTS.medical.appointments.ensureShiftDate, locationId)
  const response = await api.post(url, data)
  return response.data as ApiResponse<{ shiftEmployeeDateId: string; date: string; assignmentId: string }>
}

export const getAppointmentShiftDateAPI = async (locationId: string, shiftEmployeeDateId: string) => {
  const url = formatUrl(API_ENDPOINTS.medical.appointments.shiftDate, locationId, { shiftEmployeeDateId })
  const response = await api.get(url)
  return response.data as ApiResponse<AppointmentShiftDateContext>
}

export const getAppointmentCapacityAPI = async (locationId: string, shiftEmployeeDateId: string) => {
  const url = formatUrl(API_ENDPOINTS.medical.appointments.capacity, locationId, { shiftEmployeeDateId })
  const response = await api.get(url)
  return response.data as ApiResponse<AppointmentCapacityResponse>
}

export const getAppointmentBookingsAPI = async (
  locationId: string,
  shiftEmployeeDateId: string,
  params?: AppointmentBookingsQueryParams,
) => {
  const url = formatUrl(API_ENDPOINTS.medical.appointments.bookings, locationId, { shiftEmployeeDateId })
  const response = await api.get(url, { params })
  return response.data as ApiResponse<{
    bookings: DoctorAppointment[]
    pagination: {
      currentPage: number
      totalPages: number
      totalCount: number
      limit: number
    }
  }>
}

export const bookAppointmentAPI = async (
  locationId: string,
  shiftEmployeeDateId: string,
  data: BookAppointmentRequest,
) => {
  const url = formatUrl(API_ENDPOINTS.medical.appointments.book, locationId, { shiftEmployeeDateId })
  const response = await api.post(url, data)
  return response.data as ApiResponse<{ appointment: DoctorAppointment }>
}

export const updateAppointmentStatusAPI = async (
  locationId: string,
  appointmentId: string,
  data: UpdateAppointmentStatusRequest,
) => {
  const url = formatUrl(API_ENDPOINTS.medical.appointments.updateStatus, locationId, { appointmentId })
  const response = await api.put(url, data)
  return response.data as ApiResponse<{ appointment: DoctorAppointment }>
}
