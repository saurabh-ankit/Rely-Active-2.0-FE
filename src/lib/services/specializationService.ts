import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

export interface Specialization {
  id: string
  name: string
  code: string
  description: string | null
  isActive: boolean
  /** Active doctors holding it; present when `includeDoctorCount` is requested. */
  doctorCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface SpecializationPayload {
  name: string
  code?: string
  description?: string
  isActive?: boolean
}

export interface SpecializationDoctor {
  id: string
  name: string
  username: string
  email: string | null
  phone: string | null
  photoUrl: string | null
  role: string | null
  jobCategory: string | null
  specializations: Array<{ id: string; name: string; code: string; isPrimary: boolean }>
}

export const getSpecializationsAPI = async (params?: {
  search?: string
  isActive?: boolean
  includeDoctorCount?: boolean
}): Promise<Specialization[]> => {
  const response = await api.get(API_ENDPOINTS.specializations.list, {
    params: {
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.isActive === undefined ? {} : { isActive: params.isActive }),
      ...(params?.includeDoctorCount ? { includeDoctorCount: true } : {}),
    },
  })
  const data = response.data?.data || response.data
  return Array.isArray(data) ? data : []
}

export const createSpecializationAPI = async (payload: SpecializationPayload): Promise<Specialization> => {
  const response = await api.post(API_ENDPOINTS.specializations.create, payload)
  return response.data?.data || response.data
}

export const updateSpecializationAPI = async (
  id: string,
  payload: Partial<SpecializationPayload>,
): Promise<Specialization> => {
  const response = await api.put(API_ENDPOINTS.specializations.update(id), payload)
  return response.data?.data || response.data
}

export const updateSpecializationStatusAPI = async (id: string, isActive: boolean): Promise<Specialization> => {
  const response = await api.patch(API_ENDPOINTS.specializations.updateStatus(id), { isActive })
  return response.data?.data || response.data
}

export const deleteSpecializationAPI = async (id: string): Promise<void> => {
  await api.delete(API_ENDPOINTS.specializations.delete(id))
}

/** Doctors eligible for resident assignment or slot booking. */
export const getDoctorsBySpecializationAPI = async (id: string, locId?: string): Promise<SpecializationDoctor[]> => {
  const response = await api.get(API_ENDPOINTS.specializations.doctors(id), {
    params: locId ? { locId } : undefined,
  })
  const data = response.data?.data || response.data
  return Array.isArray(data) ? data : []
}

export const getDoctorSpecializationsAPI = async (userId: string): Promise<Specialization[]> => {
  const response = await api.get(API_ENDPOINTS.specializations.doctorSpecializations(userId))
  const data = response.data?.data || response.data
  return Array.isArray(data) ? data : []
}

export const setDoctorSpecializationsAPI = async (
  userId: string,
  specializationIds: string[],
  primarySpecializationId?: string,
): Promise<Specialization[]> => {
  const response = await api.put(API_ENDPOINTS.specializations.doctorSpecializations(userId), {
    specializationIds,
    ...(primarySpecializationId ? { primarySpecializationId } : {}),
  })
  const data = response.data?.data || response.data
  return Array.isArray(data) ? data : []
}
