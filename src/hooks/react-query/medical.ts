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
  getPackageSubscriptionsAPI,
  changePackageAPI,
  updateSubscriptionStatusAPI,
  renewPackageSubscriptionAPI,
  getCareTaskAssignmentsAPI,
  getCareTaskAssignmentByIdAPI,
  createCareTaskAssignmentAPI,
  updateCareTaskAssignmentAPI,
  completeCareTaskAPI,
  stopCareTaskAssignmentAPI,
  cancelCareTaskAssignmentAPI,
  deleteCareTaskAssignmentAPI,
  getCareTaskCompletionsAPI,
} from '@/lib/services/medicalService'
import type {
  CarePackageQueryParams,
  CareTaskQueryParams,
  CreateCarePackagePayload,
  UpdateCarePackagePayload,
  ChangePackageRequest,
  UpdateSubscriptionStatusRequest,
  CreateCareTaskAssignmentPayload,
  CompleteCareTaskPayload,
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
  subscriptions: {
    all: ['medical', 'subscriptions'] as const,
    list: (locationId?: string | null, params?: unknown) =>
      ['medical', 'subscriptions', 'list', locationId, params] as const,
    byId: (id?: string) => ['medical', 'subscriptions', 'detail', id] as const,
  },
  assignments: {
    all: ['medical', 'assignments'] as const,
    list: (params?: Record<string, unknown>) => ['medical', 'assignments', 'list', params] as const,
    byId: (id?: string) => ['medical', 'assignments', 'detail', id] as const,
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

// ============================================================================
// Package Subscriptions Hooks
// ============================================================================

export const usePackageSubscriptionsQuery = (
  locationId?: string | null,
  params?: { status?: string; residentId?: string; search?: string },
  enabled = true,
) => {
  return useQuery({
    queryKey: MEDICAL_KEYS.subscriptions.list(locationId, params),
    queryFn: () => getPackageSubscriptionsAPI(locationId, params),
    enabled,
  })
}

export const useChangePackageMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ subscriptionId, payload }: { subscriptionId: string; payload: ChangePackageRequest }) =>
      changePackageAPI(subscriptionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.subscriptions.all })
    },
  })
}

export const useUpdateSubscriptionStatusMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ subscriptionId, payload }: { subscriptionId: string; payload: UpdateSubscriptionStatusRequest }) =>
      updateSubscriptionStatusAPI(subscriptionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.subscriptions.all })
    },
  })
}

export const useRenewPackageSubscriptionMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ subscriptionId, payload }: { subscriptionId: string; payload?: { startDate?: string } }) =>
      renewPackageSubscriptionAPI(subscriptionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.subscriptions.all })
    },
  })
}

// ============================================================================
// Care Task Assignments Hooks
// ============================================================================

export const useCareTaskAssignmentsQuery = (params?: Record<string, unknown>, enabled = true) => {
  return useQuery({
    queryKey: [...MEDICAL_KEYS.assignments.all, params],
    queryFn: () => getCareTaskAssignmentsAPI(params),
    enabled,
  })
}

export const useCareTaskCompletionsQuery = (params?: Record<string, unknown>, enabled = true) => {
  return useQuery({
    queryKey: [...MEDICAL_KEYS.assignments.all, 'completions', params],
    queryFn: () => getCareTaskCompletionsAPI(params),
    enabled,
  })
}

export const useCareTaskAssignmentByIdQuery = (id?: string, enabled = true) => {
  return useQuery({
    queryKey: MEDICAL_KEYS.assignments.byId(id),
    queryFn: () => getCareTaskAssignmentByIdAPI(id!),
    enabled: enabled && !!id,
  })
}

export const useCreateCareTaskAssignmentMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCareTaskAssignmentPayload) => createCareTaskAssignmentAPI(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.assignments.all })
    },
  })
}

export const useUpdateCareTaskAssignmentMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateCareTaskAssignmentPayload> }) =>
      updateCareTaskAssignmentAPI(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.assignments.all })
    },
  })
}

export const useCompleteCareTaskMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: CompleteCareTaskPayload }) =>
      completeCareTaskAPI(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.assignments.all })
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.subscriptions.all })
    },
  })
}

export const useStopCareTaskAssignmentMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => stopCareTaskAssignmentAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.assignments.all })
    },
  })
}

export const useCancelCareTaskAssignmentMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelCareTaskAssignmentAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.assignments.all })
    },
  })
}

export const useDeleteCareTaskAssignmentMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCareTaskAssignmentAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDICAL_KEYS.assignments.all })
    },
  })
}
