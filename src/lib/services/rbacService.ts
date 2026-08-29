import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  DepartmentItem,
  ModuleItem,
  PermissionItem,
  ResourceItem,
  RoleItem,
  UserLocationPermissionItem,
} from '@/lib/types'

export const getRolesAPI = async (): Promise<RoleItem[]> => {
  const response = await api.get(API_ENDPOINTS.rbac.getRoles)
  return response.data?.data || response.data
}

export const createRoleAPI = async (payload: {
  name: string
  code: string
  description?: string
  permissionIds?: string[]
}): Promise<RoleItem> => {
  const response = await api.post(API_ENDPOINTS.rbac.createRole, payload)
  return response.data?.data || response.data
}

export const updateRolePermissionsAPI = async (roleId: string, permissionIds: string[]): Promise<RoleItem> => {
  const response = await api.put(API_ENDPOINTS.rbac.updateRolePermissions(roleId), { permissionIds })
  return response.data?.data || response.data
}

export const getResourcesAPI = async (): Promise<ResourceItem[]> => {
  const response = await api.get(API_ENDPOINTS.rbac.getResources)
  return response.data?.data || response.data
}

export const getUserLocationPermissionsAPI = async (
  userId: string,
  locationId: string,
): Promise<UserLocationPermissionItem[]> => {
  const response = await api.get(API_ENDPOINTS.rbac.getLocationPermissions(userId, locationId))
  return response.data?.data || response.data
}

export const saveUserLocationPermissionsAPI = async (
  userId: string,
  locationId: string,
  permissions: Array<{ resourceKey: string; permission: 'view' | 'create' | 'update' | 'delete' }>,
) => {
  const response = await api.post(API_ENDPOINTS.rbac.saveLocationPermissions(userId), { locationId, permissions })
  return response.data?.data || response.data
}

export const getDepartmentsAPI = async (): Promise<DepartmentItem[]> => {
  const response = await api.get(API_ENDPOINTS.rbac.getDepartments)
  return response.data?.data || response.data
}

export const getModulesAPI = async (): Promise<ModuleItem[]> => {
  const response = await api.get(API_ENDPOINTS.rbac.getModules)
  return response.data?.data || response.data
}

export const getPermissionsAndModulesAPI = async (): Promise<{
  permissions: PermissionItem[]
  modules: ModuleItem[]
}> => {
  const response = await api.get(API_ENDPOINTS.rbac.getPermissions)
  return response.data?.data || response.data
}
