import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
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
}

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
