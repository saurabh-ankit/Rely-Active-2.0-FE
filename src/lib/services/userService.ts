import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { CreateUserPayload, UpdateUserPayload, UserItem } from '@/lib/types'

export const getUsersAPI = async (locationId?: string | null, search?: string): Promise<UserItem[]> => {
  const params: Record<string, string> = {}
  const headers: Record<string, string> = {}

  if (locationId) {
    params.locationId = locationId
  } else if (locationId === null) {
    params.allLocations = 'true'
    headers['x-location-id'] = ''
    headers['x-property-id'] = ''
  }

  if (search && search.trim()) params.search = search.trim()

  const response = await api.get(API_ENDPOINTS.user.getUsers, {
    params: Object.keys(params).length > 0 ? params : undefined,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  })
  return response.data?.data || response.data
}

export const getUserByIdAPI = async (id: string): Promise<UserItem> => {
  const response = await api.get(API_ENDPOINTS.user.getUserById(id))
  return response.data?.data || response.data
}

export const createUserAPI = async (payload: CreateUserPayload): Promise<UserItem> => {
  const response = await api.post(API_ENDPOINTS.user.createUser, payload)
  return response.data?.data || response.data
}

export const updateUserAPI = async (id: string, payload: UpdateUserPayload): Promise<UserItem> => {
  console.log('[FE updateUserAPI] Target User ID:', id)
  console.log('[FE updateUserAPI] Sending payload:', payload)
  const response = await api.put(API_ENDPOINTS.user.updateUser(id), payload)
  console.log('[FE updateUserAPI] Received response:', response.data)
  return response.data?.data || response.data
}

export const getUserAccessiblePropertiesAPI = async (): Promise<Array<{ id: string; property_name: string }>> => {
  const response = await api.get(API_ENDPOINTS.user.getAccessibleProperties)
  return response.data?.data || response.data
}

export const updateUserPropertiesAPI = async (userId: string, propertyIds: string[]) => {
  const response = await api.put(API_ENDPOINTS.user.updateProperties(userId), { propertyIds })
  return response.data?.data || response.data
}

export const assignUserRoleAPI = async (
  userId: string,
  payload: { roleCode: string; companyId?: string; locationId?: string; departmentId?: string },
) => {
  const response = await api.post(API_ENDPOINTS.user.assignRole(userId), payload)
  return response.data?.data || response.data
}

export const updateUserPermissionsAPI = async (userId: string, permissionIds: string[]) => {
  const response = await api.put(API_ENDPOINTS.user.updatePermissions(userId), { permissionIds })
  return response.data?.data || response.data
}
