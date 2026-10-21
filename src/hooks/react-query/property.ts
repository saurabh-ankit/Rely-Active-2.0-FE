import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  checkPropertyNameAPI,
  createPropertyAPI,
  deletePropertyAPI,
  getPropertiesAPI,
  getPropertyByIdAPI,
  updatePropertyAPI,
} from '@/lib/services/propertyService'
import type { CreatePropertyPayload } from '@/lib/types'

export const PROPERTY_KEYS = {
  all: (companyId?: string) => ['property', companyId] as const,
  byId: (id?: string) => ['property', 'detail', id] as const,
  nameAvailability: (name: string, excludeId?: string) => ['property', 'name-availability', name, excludeId] as const,
}

export const usePropertyNameAvailability = (name: string, excludeId?: string) =>
  useQuery({
    queryKey: PROPERTY_KEYS.nameAvailability(name, excludeId),
    queryFn: () => checkPropertyNameAPI(name, excludeId),
    enabled: name.trim().length >= 2,
  })

export const usePropertiesQuery = (companyId?: string) => {
  return useQuery({
    queryKey: PROPERTY_KEYS.all(companyId),
    queryFn: () => getPropertiesAPI(companyId),
  })
}

export const usePropertyByIdQuery = (id?: string) => {
  return useQuery({
    queryKey: PROPERTY_KEYS.byId(id),
    queryFn: () => getPropertyByIdAPI(id!),
    enabled: !!id,
  })
}

export const useCreatePropertyMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePropertyPayload) => createPropertyAPI(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property'] })
    },
  })
}

export const useUpdatePropertyMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreatePropertyPayload> }) =>
      updatePropertyAPI(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['property'] })
      queryClient.invalidateQueries({ queryKey: PROPERTY_KEYS.byId(variables.id) })
    },
  })
}

export const useDeletePropertyMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePropertyAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property'] })
    },
  })
}
