import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  CareTask,
  CareTaskQueryParams,
  CareTasksListResponse,
  CarePackage,
  CarePackageQueryParams,
  CarePackagesListResponse,
  CreateCarePackagePayload,
  UpdateCarePackagePayload,
} from '@/lib/types/medical'

// ============================================================================
// Care Tasks Service API
// ============================================================================

export const getCareTasksAPI = async (params?: CareTaskQueryParams): Promise<CareTasksListResponse> => {
  const res = await api.get(API_ENDPOINTS.medical.careTasks.list, { params })
  return res.data
}

export const getCareTaskByIdAPI = async (id: string): Promise<CareTask> => {
  const res = await api.get(API_ENDPOINTS.medical.careTasks.getById(id))
  return res.data?.data || res.data
}

export const createCareTaskAPI = async (formData: FormData): Promise<CareTask> => {
  const res = await api.post(API_ENDPOINTS.medical.careTasks.create, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data?.data || res.data
}

export const updateCareTaskAPI = async (id: string, formData: FormData): Promise<CareTask> => {
  const res = await api.put(API_ENDPOINTS.medical.careTasks.update(id), formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data?.data || res.data
}

export const deleteCareTaskAPI = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const res = await api.delete(API_ENDPOINTS.medical.careTasks.delete(id))
  return res.data
}

// ============================================================================
// Care Packages Service API
// ============================================================================

export const getCarePackagesAPI = async (params?: CarePackageQueryParams): Promise<CarePackagesListResponse> => {
  const res = await api.get(API_ENDPOINTS.medical.carePackages.list, { params })
  return res.data
}

export const getCarePackageByIdAPI = async (id: string): Promise<CarePackage> => {
  const res = await api.get(API_ENDPOINTS.medical.carePackages.getById(id))
  return res.data?.data || res.data
}

export const createCarePackageAPI = async (payload: CreateCarePackagePayload): Promise<CarePackage> => {
  const res = await api.post(API_ENDPOINTS.medical.carePackages.create, payload)
  return res.data?.data || res.data
}

export const updateCarePackageAPI = async (id: string, payload: UpdateCarePackagePayload): Promise<CarePackage> => {
  const res = await api.put(API_ENDPOINTS.medical.carePackages.update(id), payload)
  return res.data?.data || res.data
}

export const deleteCarePackageAPI = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const res = await api.delete(API_ENDPOINTS.medical.carePackages.delete(id))
  return res.data
}

// ============================================================================
// Grouped Service Export
// ============================================================================

export const medicalService = {
  careTasks: {
    getAll: getCareTasksAPI,
    getById: getCareTaskByIdAPI,
    create: createCareTaskAPI,
    update: updateCareTaskAPI,
    delete: deleteCareTaskAPI,
  },
  carePackages: {
    getAll: getCarePackagesAPI,
    getById: getCarePackageByIdAPI,
    create: createCarePackageAPI,
    update: updateCarePackageAPI,
    delete: deleteCarePackageAPI,
  },
}

export default medicalService
