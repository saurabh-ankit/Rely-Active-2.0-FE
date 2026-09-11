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
// Package Subscriptions Service API
// ============================================================================

export const getPackageSubscriptionsAPI = async (
  locationId?: string | null,
  params?: { status?: string; residentId?: string; search?: string },
): Promise<{ success: boolean; data: import('@/lib/types/medical').PackageSubscriptionResponse[]; total?: number }> => {
  const queryParams: Record<string, unknown> = { ...(params || {}) }
  if (locationId && locationId !== 'all') {
    queryParams.locId = locationId
  }
  const res = await api.get(API_ENDPOINTS.medical.packageSubscriptions.list, { params: queryParams })
  return res.data
}

export const getPackageSubscriptionByIdAPI = async (
  id: string,
): Promise<{ success: boolean; data: import('@/lib/types/medical').PackageSubscriptionResponse }> => {
  const res = await api.get(API_ENDPOINTS.medical.packageSubscriptions.getById(id))
  return res.data
}

export const changePackageAPI = async (
  subscriptionId: string,
  payload: import('@/lib/types/medical').ChangePackageRequest,
): Promise<{ success: boolean; message?: string; data?: unknown }> => {
  const res = await api.post(API_ENDPOINTS.medical.packageSubscriptions.changePackage(subscriptionId), payload)
  return res.data
}

export const updateSubscriptionStatusAPI = async (
  subscriptionId: string,
  payload: import('@/lib/types/medical').UpdateSubscriptionStatusRequest,
): Promise<{ success: boolean; message?: string; data?: unknown }> => {
  const res = await api.put(API_ENDPOINTS.medical.packageSubscriptions.updateStatus(subscriptionId), payload)
  return res.data
}

export const renewPackageSubscriptionAPI = async (
  subscriptionId: string,
  payload?: { startDate?: string },
): Promise<{ success: boolean; message?: string; data?: unknown }> => {
  const res = await api.post(API_ENDPOINTS.medical.packageSubscriptions.renew(subscriptionId), payload || {})
  return res.data
}

// ============================================================================
// Care Task Assignments API
// ============================================================================

export const getCareTaskAssignmentsAPI = async (
  params?: Record<string, unknown>,
): Promise<import('@/lib/types/medical').CareTaskAssignmentsListResponse> => {
  const res = await api.get(API_ENDPOINTS.medical.assignments.list, { params })
  return res.data
}

export const getCareTaskAssignmentByIdAPI = async (
  id: string,
): Promise<import('@/lib/types/medical').CareTaskAssignment> => {
  const res = await api.get(API_ENDPOINTS.medical.assignments.getById(id))
  return res.data?.data || res.data
}

export const createCareTaskAssignmentAPI = async (
  payload: import('@/lib/types/medical').CreateCareTaskAssignmentPayload,
): Promise<import('@/lib/types/medical').CareTaskAssignment> => {
  const res = await api.post(API_ENDPOINTS.medical.assignments.create, payload)
  return res.data?.data || res.data
}

export const updateCareTaskAssignmentAPI = async (
  id: string,
  payload: Partial<import('@/lib/types/medical').CreateCareTaskAssignmentPayload>,
): Promise<import('@/lib/types/medical').CareTaskAssignment> => {
  const res = await api.put(API_ENDPOINTS.medical.assignments.update(id), payload)
  return res.data?.data || res.data
}

export const completeCareTaskAPI = async (
  id: string,
  payload?: import('@/lib/types/medical').CompleteCareTaskPayload,
): Promise<{ success: boolean; message: string; data: unknown }> => {
  const res = await api.post(API_ENDPOINTS.medical.assignments.complete(id), payload || {})
  return res.data
}

export const stopCareTaskAssignmentAPI = async (
  id: string,
): Promise<{ success: boolean; message: string; data?: unknown }> => {
  const res = await api.put(API_ENDPOINTS.medical.assignments.stop(id))
  return res.data
}

export const cancelCareTaskAssignmentAPI = async (
  id: string,
): Promise<{ success: boolean; message: string; data?: unknown }> => {
  const res = await api.put(API_ENDPOINTS.medical.assignments.cancel(id))
  return res.data
}

export const deleteCareTaskAssignmentAPI = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(API_ENDPOINTS.medical.assignments.delete(id))
  return res.data
}

export const getCareTaskCompletionsAPI = async (
  params?: Record<string, unknown>,
): Promise<import('@/lib/types/medical').CareTaskCompletionsListResponse> => {
  const res = await api.get(API_ENDPOINTS.medical.assignments.completions, { params })
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
  subscriptions: {
    getAll: getPackageSubscriptionsAPI,
    getById: getPackageSubscriptionByIdAPI,
    changePackage: changePackageAPI,
    updateStatus: updateSubscriptionStatusAPI,
    renew: renewPackageSubscriptionAPI,
  },
  assignments: {
    getAll: getCareTaskAssignmentsAPI,
    getById: getCareTaskAssignmentByIdAPI,
    create: createCareTaskAssignmentAPI,
    update: updateCareTaskAssignmentAPI,
    complete: completeCareTaskAPI,
    stop: stopCareTaskAssignmentAPI,
    cancel: cancelCareTaskAssignmentAPI,
    delete: deleteCareTaskAssignmentAPI,
    getCompletions: getCareTaskCompletionsAPI,
  },
}

export default medicalService
