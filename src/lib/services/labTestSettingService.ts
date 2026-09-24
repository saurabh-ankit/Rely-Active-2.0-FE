import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  CreateLabTestSettingRequest,
  UpdateLabTestSettingRequest,
  LabTestSetting,
  LabTestSettingsListResult,
} from '@/lib/types/labTestSetting'

export type {
  CreateLabTestSettingRequest,
  UpdateLabTestSettingRequest,
  LabTestSetting,
  LabTestSettingsListResult,
} from '@/lib/types/labTestSetting'

export const getLabTestSettingsAPI = async (params?: {
  search?: string
  page?: number
  limit?: number
  isActive?: boolean
}): Promise<LabTestSettingsListResult> => {
  const response = await api.get(API_ENDPOINTS.labTestSettings.list, {
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

export const getLabTestSettingByIdAPI = async (id: string): Promise<LabTestSetting> => {
  const response = await api.get(API_ENDPOINTS.labTestSettings.getById(id))
  return response.data?.data || response.data
}

export const createLabTestSettingAPI = async (
  payload: CreateLabTestSettingRequest | FormData,
): Promise<LabTestSetting> => {
  const response = await api.post(API_ENDPOINTS.labTestSettings.create, payload)
  return response.data?.data || response.data
}

export const updateLabTestSettingAPI = async (
  id: string,
  payload: UpdateLabTestSettingRequest | FormData,
): Promise<LabTestSetting> => {
  const response = await api.put(API_ENDPOINTS.labTestSettings.update(id), payload)
  return response.data?.data || response.data
}

export const deleteLabTestSettingAPI = async (id: string): Promise<void> => {
  await api.delete(API_ENDPOINTS.labTestSettings.delete(id))
}
