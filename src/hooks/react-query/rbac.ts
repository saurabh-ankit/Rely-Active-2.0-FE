import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRoleAPI,
  getDepartmentsAPI,
  getModulesAPI,
  getPermissionsAndModulesAPI,
  getResourcesAPI,
  getRolesAPI,
  getUserLocationPermissionsAPI,
  saveUserLocationPermissionsAPI,
  updateRolePermissionsAPI,
} from '@/lib/services/rbacService'

export const RBAC_KEYS = {
  roles: ['rbac', 'roles'] as const,
  resources: ['rbac', 'resources'] as const,
  departments: ['rbac', 'departments'] as const,
  modules: ['rbac', 'modules'] as const,
  permissions: ['rbac', 'permissions'] as const,
  locationPermissions: (userId?: string, locationId?: string) =>
    ['rbac', 'location-permissions', userId, locationId] as const,
}

export const useRolesQuery = () => {
  return useQuery({
    queryKey: RBAC_KEYS.roles,
    queryFn: getRolesAPI,
  })
}

export const useCreateRoleMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRoleAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RBAC_KEYS.roles })
    },
  })
}

export const useUpdateRolePermissionsMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      updateRolePermissionsAPI(roleId, permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RBAC_KEYS.roles })
    },
  })
}

export const useResourcesQuery = () => {
  return useQuery({
    queryKey: RBAC_KEYS.resources,
    queryFn: getResourcesAPI,
  })
}

export const useUserLocationPermissionsQuery = (userId?: string, locationId?: string) => {
  return useQuery({
    queryKey: RBAC_KEYS.locationPermissions(userId, locationId),
    queryFn: () => getUserLocationPermissionsAPI(userId!, locationId!),
    enabled: !!userId && !!locationId,
  })
}

export const useSaveUserLocationPermissionsMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      locationId,
      permissions,
    }: {
      userId: string
      locationId: string
      permissions: Array<{ resourceKey: string; permission: 'view' | 'create' | 'update' | 'delete' }>
    }) => saveUserLocationPermissionsAPI(userId, locationId, permissions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: RBAC_KEYS.locationPermissions(variables.userId, variables.locationId),
      })
    },
  })
}

export const useDepartmentsQuery = () => {
  return useQuery({
    queryKey: RBAC_KEYS.departments,
    queryFn: getDepartmentsAPI,
  })
}

export const useModulesQuery = () => {
  return useQuery({
    queryKey: RBAC_KEYS.modules,
    queryFn: getModulesAPI,
  })
}

export const usePermissionsAndModulesQuery = () => {
  return useQuery({
    queryKey: RBAC_KEYS.permissions,
    queryFn: getPermissionsAndModulesAPI,
  })
}
