import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  CreateVitalSettingRequest,
  UpdateVitalSettingRequest,
  VitalSetting,
  VitalSettingsListResult,
} from '@/lib/types/vitalSetting'

export type {
  CreateVitalSettingRequest,
  UpdateVitalSettingRequest,
  VitalSetting,
  VitalSettingsListResult,
} from '@/lib/types/vitalSetting'

export const getVitalSettingsAPI = async (params?: {
  search?: string
  page?: number
  limit?: number
  isActive?: boolean
}): Promise<VitalSettingsListResult> => {
  const response = await api.get(API_ENDPOINTS.vitalSettings.list, {
    params: {
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.page ? { page: params.page } : {}),
      ...(params?.limit ? { limit: params.limit } : {}),
      ...(params?.isActive === undefined ? {} : { isActive: params.isActive }),
    },
  })
  const payload = response.data?.data || response.data
  if (Array.isArray(payload)) {
    return {
      data: payload,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: payload.length,
        itemsPerPage: payload.length,
        hasNextPage: false,
        hasPrevPage: false,
      },
    }
  }
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    pagination: payload?.pagination || {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 50,
      hasNextPage: false,
      hasPrevPage: false,
    },
  }
}

export const getVitalSettingByIdAPI = async (id: string): Promise<VitalSetting> => {
  const response = await api.get(API_ENDPOINTS.vitalSettings.getById(id))
  return response.data?.data || response.data
}

export const createVitalSettingAPI = async (payload: CreateVitalSettingRequest | FormData): Promise<VitalSetting> => {
  const response = await api.post(API_ENDPOINTS.vitalSettings.create, payload)
  return response.data?.data || response.data
}

export const updateVitalSettingAPI = async (
  id: string,
  payload: UpdateVitalSettingRequest | FormData,
): Promise<VitalSetting> => {
  const response = await api.put(API_ENDPOINTS.vitalSettings.update(id), payload)
  return response.data?.data || response.data
}

export const deleteVitalSettingAPI = async (id: string): Promise<void> => {
  await api.delete(API_ENDPOINTS.vitalSettings.delete(id))
}
