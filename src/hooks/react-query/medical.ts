import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCarePackageAPI,
  createCareTaskAPI,
  deleteCarePackageAPI,
  deleteCareTaskAPI,
  getCarePackageByIdAPI,
  getCarePackagesAPI,
  getCareTaskByIdAPI,
  getCareTasksAPI,
  updateCarePackageAPI,
  updateCareTaskAPI,
} from '@/lib/services/medicalService'
import type {
  CarePackageQueryParams,
  CareTaskQueryParams,
  CreateCarePackagePayload,
  UpdateCarePackagePayload,
} from '@/lib/types/medical'

export const MEDICAL_KEYS = {
  careTasks: {
    all: ['medical', 'careTasks'] as const,
    list: (params?: CareTaskQueryParams) => ['medical', 'careTasks', 'list', params] as const,
    byId: (id?: string) => ['medical', 'careTasks', 'detail', id] as const,
  },
  carePackages: {
    all: ['medical', 'carePackages'] as const,
    list: (params?: CarePackageQueryParams) => ['medical', 'carePackages', 'list', params] as const,
    byId: (id?: string) => ['medical', 'carePackages', 'detail', id] as const,
  },
}

// ============================================================================
// Care Tasks Hooks
// ============================================================================

export const useCareTasksQuery = (params?: CareTaskQueryParams, enabled = true) => {
  return useQuery({
    queryKey: MEDICAL_KEYS.careTasks.list(params),
    queryFn: () => getCareTasksAPI(params),
    enabled,
  })
}

export const useCareTaskByIdQuery = (id?: string, enabled = true) => {
  return useQuery({
    queryKey: MEDICAL_KEYS.careTasks.byId(id),
    queryFn: () => getCareTaskByIdAPI(id!),
    enabled: enabled && !!id,
  })
}

export const useCreateCareTaskMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => createCareTaskAPI(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.careTasks.all })
    },
  })
}

export const useUpdateCareTaskMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => updateCareTaskAPI(id, formData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.careTasks.all })
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.careTasks.byId(variables.id) })
    },
  })
}

export const useDeleteCareTaskMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCareTaskAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.careTasks.all })
    },
  })
}

// ============================================================================
// Care Packages Hooks
// ============================================================================

export const useCarePackagesQuery = (params?: CarePackageQueryParams, enabled = true) => {
  return useQuery({
    queryKey: MEDICAL_KEYS.carePackages.list(params),
    queryFn: () => getCarePackagesAPI(params),
    enabled,
  })
}

export const useCarePackageByIdQuery = (id?: string, enabled = true) => {
  return useQuery({
    queryKey: MEDICAL_KEYS.carePackages.byId(id),
    queryFn: () => getCarePackageByIdAPI(id!),
    enabled: enabled && !!id,
  })
}

export const useCreateCarePackageMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCarePackagePayload) => createCarePackageAPI(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.carePackages.all })
    },
  })
}

export const useUpdateCarePackageMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCarePackagePayload }) =>
      updateCarePackageAPI(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.carePackages.all })
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.carePackages.byId(variables.id) })
    },
  })
}

export const useDeleteCarePackageMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCarePackageAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.carePackages.all })
    },
  })
}
