import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createUserAPI,
  getEmployeeActivityRecordsAPI,
  getEmployeeActivitySummaryAPI,
  getEmployeeWorkLogAPI,
  getUserAccessiblePropertiesAPI,
  getUserByIdAPI,
  getUsersAPI,
  getUsersByRoleAPI,
  updateUserAPI,
  updateUserPropertiesAPI,
} from '@/lib/services/userService'
import type { CreateUserPayload, UpdateUserPayload } from '@/lib/types'
import type { EmployeeActivityParams } from '@/lib/types/employeeActivity'
import { useLocationStore } from '@/lib/stores/locationStore'

export const USER_KEYS = {
  all: (locationId?: string | null, search?: string) => ['users', locationId || 'all', search || ''] as const,
  byId: (id?: string) => ['users', id] as const,
  accessibleProperties: ['users', 'accessible-properties'] as const,
  byRole: (roleCodes: string[], locationId?: string | null) => ['users', 'by-role', roleCodes, locationId] as const,
}

export const useUsersQuery = (search?: string, overrideLocationId?: string | null) => {
  const storeLocationId = useLocationStore((state) => state.selectedLocationId)
  const locationId = overrideLocationId !== undefined ? overrideLocationId : storeLocationId
  return useQuery({
    queryKey: USER_KEYS.all(locationId, search),
    queryFn: () => getUsersAPI(locationId, search),
  })
}

/** Query only users with specific roles (e.g. Doctor, Nurse) */
export const useUsersByRoleQuery = (roleCodes: string[], locationId?: string | null, enabled = true) => {
  return useQuery({
    queryKey: USER_KEYS.byRole(roleCodes, locationId),
    queryFn: () => getUsersByRoleAPI(roleCodes, locationId),
    enabled: enabled && roleCodes.length > 0,
  })
}

export const useUserByIdQuery = (id?: string) => {
  return useQuery({
    queryKey: USER_KEYS.byId(id),
    queryFn: () => getUserByIdAPI(id!),
    enabled: !!id,
  })
}

export const useEmployeeActivitySummary = (id: string | undefined, params: EmployeeActivityParams) => {
  return useQuery({
    queryKey: ['users', id, 'activity', 'summary', params] as const,
    queryFn: () => getEmployeeActivitySummaryAPI(id!, params),
    enabled: !!id,
    placeholderData: keepPreviousData,
  })
}

export const useEmployeeActivityRecords = (id: string | undefined, params: EmployeeActivityParams, enabled = true) => {
  return useQuery({
    queryKey: ['users', id, 'activity', 'records', params] as const,
    queryFn: () => getEmployeeActivityRecordsAPI(id!, params),
    enabled: !!id && enabled,
    placeholderData: keepPreviousData,
  })
}

export const useEmployeeWorkLog = (id: string | undefined, params: Omit<EmployeeActivityParams, 'page'>) => {
  return useInfiniteQuery({
    queryKey: ['users', id, 'activity', 'work-log', params] as const,
    queryFn: ({ pageParam }) => getEmployeeWorkLogAPI(id!, { ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasMore ? last.pagination.page + 1 : undefined),
    enabled: !!id,
  })
}

export const useCreateUserMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUserAPI(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) => updateUserAPI(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: USER_KEYS.byId(variables.id) })
    },
  })
}

export const useUpdateUserPropertiesMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, propertyIds }: { userId: string; propertyIds: string[] }) =>
      updateUserPropertiesAPI(userId, propertyIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: USER_KEYS.byId(variables.userId) })
    },
  })
}

export const useUserAccessiblePropertiesQuery = () => {
  return useQuery({
    queryKey: USER_KEYS.accessibleProperties,
    queryFn: getUserAccessiblePropertiesAPI,
  })
}
