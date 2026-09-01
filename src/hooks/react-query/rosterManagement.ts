import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  rosterService,
  type CreateShiftPayload,
  type CreateAssignmentPayload,
  type OnboardDoctorPayload,
} from '@/lib/services/rosterService'
import { useLocationStore } from '@/lib/stores/locationStore'

interface ApiError {
  response?: { data?: { message?: string } }
  message?: string
}

/**
 * Shared helper to resolve companyId & locationId from the location store.
 * Falls back to localStorage keys written by the auth flow.
 * Returns null values if neither is found — callers use `enabled` guards.
 */
function useRosterContext() {
  const { selectedLocationId } = useLocationStore()
  const companyId = localStorage.getItem('rely_active_company_id') ?? null
  const locationId = selectedLocationId ?? localStorage.getItem('rely_active_property_id') ?? null
  return { companyId, locationId }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Shifts Master Hooks
// ─────────────────────────────────────────────────────────────────────────────

export const useGetShifts = (options?: { enabled?: boolean }) => {
  const { companyId, locationId } = useRosterContext()
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['rosterShifts', companyId, locationId],
    queryFn: () => rosterService.getShifts(companyId!, locationId!),
    enabled: enabled && !!companyId && !!locationId,
  })
}

export const useCreateShift = () => {
  const queryClient = useQueryClient()
  const { companyId, locationId } = useRosterContext()

  return useMutation({
    mutationFn: (payload: CreateShiftPayload) => rosterService.createShift(companyId!, locationId!, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rosterShifts', companyId, locationId] })
      toast.success(data?.message || 'Shift master template created successfully!')
    },
    onError: (error: ApiError) => {
      const msg = error.response?.data?.message || error.message || 'Failed to create shift master template'
      toast.error(msg)
    },
  })
}

export const useUpdateShift = () => {
  const queryClient = useQueryClient()
  const { companyId, locationId } = useRosterContext()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateShiftPayload> }) =>
      rosterService.updateShift(companyId!, locationId!, id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rosterShifts', companyId, locationId] })
      toast.success(data?.message || 'Shift master template updated successfully!')
    },
    onError: (error: ApiError) => {
      const msg = error.response?.data?.message || error.message || 'Failed to update shift master template'
      toast.error(msg)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Doctor Roster Profile Hooks
// ─────────────────────────────────────────────────────────────────────────────

export const useGetDoctors = (options?: { enabled?: boolean }) => {
  const { companyId, locationId } = useRosterContext()
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['rosterDoctors', companyId, locationId],
    queryFn: () => rosterService.getDoctors(companyId!, locationId!),
    enabled: enabled && !!companyId && !!locationId,
  })
}

export const useOnboardDoctor = () => {
  const queryClient = useQueryClient()
  const { companyId, locationId } = useRosterContext()

  return useMutation({
    mutationFn: (payload: OnboardDoctorPayload) => rosterService.onboardDoctor(companyId!, locationId!, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rosterDoctors', companyId, locationId] })
      toast.success(data?.message || 'Doctor profile & scoping updated!')
    },
    onError: (error: ApiError) => {
      const msg = error.response?.data?.message || error.message || 'Failed to update doctor profile'
      toast.error(msg)
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Roster Date Instances Hooks
// ─────────────────────────────────────────────────────────────────────────────

export const useGetRosterDates = (params?: Record<string, unknown>, options?: { enabled?: boolean }) => {
  const { companyId, locationId } = useRosterContext()
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['rosterDates', companyId, locationId, params],
    queryFn: () => rosterService.getRosterDates(companyId!, locationId!, params),
    enabled: enabled && !!companyId && !!locationId,
  })
}

export const useCreateAssignment = () => {
  const queryClient = useQueryClient()
  const { companyId, locationId } = useRosterContext()

  return useMutation({
    mutationFn: (payload: CreateAssignmentPayload) => rosterService.createAssignment(companyId!, locationId!, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rosterDates', companyId, locationId] })
      toast.success(data?.message || 'Roster assignment created!')
    },
    onError: (error: ApiError) => {
      const msg = error.response?.data?.message || error.message || 'Failed to create roster assignment'
      toast.error(msg)
    },
  })
}

export const usePublishAssignment = () => {
  const queryClient = useQueryClient()
  const { companyId, locationId } = useRosterContext()

  return useMutation({
    mutationFn: ({ id, overrideReason }: { id: string; overrideReason?: string }) =>
      rosterService.publishAssignment(companyId!, locationId!, id, overrideReason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rosterDates', companyId, locationId] })
      toast.success((data as { message?: string })?.message || 'Roster published & committed with MySQL locks!')
    },
    onError: (error: ApiError) => {
      const msg = error.response?.data?.message || error.message || 'Failed to publish roster assignment'
      toast.error(msg)
    },
  })
}

export const useRequestReplacement = () => {
  const queryClient = useQueryClient()
  const { companyId, locationId } = useRosterContext()

  return useMutation({
    mutationFn: ({
      dateId,
      payload,
    }: {
      dateId: string
      payload: { replacementResourceId: string; reason: string }
    }) => rosterService.requestReplacement(companyId!, locationId!, dateId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rosterDates', companyId, locationId] })
      toast.success(data?.message || 'Replacement caregiver assigned & duty updated!')
    },
    onError: (error: ApiError) => {
      const msg = error.response?.data?.message || error.message || 'Failed to request duty replacement'
      toast.error(msg)
    },
  })
}

export const useCopyAssignment = () => {
  const queryClient = useQueryClient()
  const { companyId, locationId } = useRosterContext()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: { targetEffectiveFrom: string; targetEffectiveUntil: string; newRosterName?: string }
    }) => rosterService.copyAssignment(companyId!, locationId!, id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rosterDates', companyId, locationId] })
      toast.success((data as { message?: string })?.message || 'Roster copied forward successfully!')
    },
    onError: (error: ApiError) => {
      const msg = error.response?.data?.message || error.message || 'Failed to copy roster'
      toast.error(msg)
    },
  })
}
