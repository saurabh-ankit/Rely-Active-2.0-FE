import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createUserAPI,
  getUserAccessiblePropertiesAPI,
  getUserByIdAPI,
  getUsersAPI,
  updateUserAPI,
  updateUserPropertiesAPI,
} from '@/lib/services/userService'
import type { CreateUserPayload, UpdateUserPayload } from '@/lib/types'
import { useLocationStore } from '@/lib/stores/locationStore'

export const USER_KEYS = {
  all: (locationId?: string | null, search?: string) => ['users', locationId || 'all', search || ''] as const,
  byId: (id?: string) => ['users', id] as const,
  accessibleProperties: ['users', 'accessible-properties'] as const,
}

export const useUsersQuery = (search?: string, overrideLocationId?: string | null) => {
  const storeLocationId = useLocationStore((state) => state.selectedLocationId)
  const locationId = overrideLocationId !== undefined ? overrideLocationId : storeLocationId
  return useQuery({
    queryKey: USER_KEYS.all(locationId, search),
    queryFn: () => getUsersAPI(locationId, search),
  })
}

export const useUserByIdQuery = (id?: string) => {
  return useQuery({
    queryKey: USER_KEYS.byId(id),
    queryFn: () => getUserByIdAPI(id!),
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
