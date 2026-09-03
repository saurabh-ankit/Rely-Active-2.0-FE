import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  rosterService,
  type CreateShiftPayload,
  type CreateAssignmentPayload,
  type OnboardDoctorPayload,
} from '@/lib/services/rosterService'
import { getCompaniesAPI } from '@/lib/services/companyService'
import { useAuth } from '@/hooks/useAuth'
import { ACTIVE_PROP_ID_KEY, useLocationStore } from '@/lib/stores/locationStore'

interface ApiError {
  response?: { data?: { message?: string } }
  message?: string
}

export const ROSTER_COMPANY_ID_KEY = 'rely_active_company_id'

/**
 * Shared helper to resolve companyId & locationId for roster APIs.
 * Resolution order: localStorage → auth user → first company from API.
 */
export function useRosterContext() {
  const { user } = useAuth()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId ?? localStorage.getItem(ACTIVE_PROP_ID_KEY) ?? null

  const storedCompanyId = localStorage.getItem(ROSTER_COMPANY_ID_KEY)
  const userCompanyId = user?.companyId ?? null

  const needsCompanyLookup = !storedCompanyId && !userCompanyId
  const { data: companies } = useQuery({
    queryKey: ['companies', 'roster-context'],
    queryFn: getCompaniesAPI,
    staleTime: 10 * 60 * 1000,
    enabled: needsCompanyLookup,
  })

  const companyId = useMemo(
    () => storedCompanyId ?? userCompanyId ?? companies?.[0]?.id ?? null,
    [storedCompanyId, userCompanyId, companies],
  )

  useEffect(() => {
    if (companyId && companyId !== storedCompanyId) {
      localStorage.setItem(ROSTER_COMPANY_ID_KEY, companyId)
    }
  }, [companyId, storedCompanyId])

  return {
    companyId,
    locationId,
    isContextReady: Boolean(companyId && locationId),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Shifts Master Hooks
// ─────────────────────────────────────────────────────────────────────────────

export const useGetShifts = (
  params?: { departmentId?: string; shiftCategory?: string },
  options?: { enabled?: boolean },
) => {
  const { companyId, locationId } = useRosterContext()
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['rosterShifts', companyId, locationId, params],
    queryFn: () => rosterService.getShifts(companyId!, locationId!, params),
    enabled: enabled && !!companyId && !!locationId,
  })
}

export const useGetSchedulingResources = (
  params?: { departmentId?: string; resourceType?: 'EMPLOYEE' | 'DOCTOR' },
  options?: { enabled?: boolean },
) => {
  const { companyId, locationId } = useRosterContext()
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['schedulingResources', companyId, locationId, params],
    queryFn: () => rosterService.getSchedulingResources(companyId!, locationId!, params),
    enabled: enabled && !!companyId && !!locationId,
  })
}

export const useSyncSchedulingResources = () => {
  const queryClient = useQueryClient()
  const { companyId, locationId } = useRosterContext()

  return useMutation({
    mutationFn: () => rosterService.syncSchedulingResources(companyId!, locationId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedulingResources', companyId, locationId] })
      toast.success(data?.message || 'Employee resources synced!')
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to sync resources')
    },
  })
}

export const useGetOpdSlots = (dateId?: string, options?: { enabled?: boolean }) => {
  const { companyId, locationId } = useRosterContext()
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['opdSlots', companyId, locationId, dateId],
    queryFn: () => rosterService.getOpdSlots(companyId!, locationId!, dateId!),
    enabled: enabled && !!companyId && !!locationId && !!dateId,
  })
}

export const useBookOpdSlot = () => {
  const queryClient = useQueryClient()
  const { companyId, locationId } = useRosterContext()

  return useMutation({
    mutationFn: ({ slotId, payload }: { slotId: string; payload: { residentId: string; notes?: string } }) =>
      rosterService.bookOpdSlot(companyId!, locationId!, slotId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['opdSlots', companyId, locationId] })
      queryClient.invalidateQueries({ queryKey: ['rosterDates', companyId, locationId] })
      toast.success(data?.message || 'OPD slot booked successfully!')
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to book OPD slot')
    },
  })
}

export const useCancelOpdBooking = () => {
  const queryClient = useQueryClient()
  const { companyId, locationId } = useRosterContext()

  return useMutation({
    mutationFn: ({ bookingId, cancelledReason }: { bookingId: string; cancelledReason: string }) =>
      rosterService.cancelOpdBooking(companyId!, locationId!, bookingId, { cancelledReason }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['opdSlots', companyId, locationId] })
      toast.success(data?.message || 'Booking cancelled successfully!')
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to cancel booking')
    },
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
      queryClient.invalidateQueries({ queryKey: ['schedulingResources', companyId, locationId] })
      toast.success(data?.message || 'Doctor profile & scoping updated!')
    },
    onError: (error: ApiError) => {
      const msg = error.response?.data?.message || error.message || 'Failed to update doctor profile'
      toast.error(msg)
    },
  })
}

export const useGetAssignments = (options?: { enabled?: boolean }) => {
  const { companyId, locationId } = useRosterContext()
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['rosterAssignments', companyId, locationId],
    queryFn: () => rosterService.getAssignments(companyId!, locationId!),
    enabled: enabled && !!companyId && !!locationId,
  })
}

export const useGetFrequencies = (options?: { enabled?: boolean }) => {
  const { companyId, locationId } = useRosterContext()
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['rosterFrequencies', companyId, locationId],
    queryFn: () => rosterService.getFrequencies(companyId!, locationId!),
    enabled: enabled && !!companyId && !!locationId,
  })
}

export const useCreateFrequency = () => {
  const queryClient = useQueryClient()
  const { companyId, locationId } = useRosterContext()

  return useMutation({
    mutationFn: (payload: Parameters<typeof rosterService.createFrequency>[2]) =>
      rosterService.createFrequency(companyId!, locationId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rosterFrequencies', companyId, locationId] })
    },
  })
}

export const useValidateAssignment = () => {
  const { companyId, locationId } = useRosterContext()

  return useMutation({
    mutationFn: (payload: Partial<CreateAssignmentPayload>) =>
      rosterService.validateAssignment(companyId!, locationId!, payload),
  })
}

export const useCancelRosterDate = () => {
  const queryClient = useQueryClient()
  const { companyId, locationId } = useRosterContext()

  return useMutation({
    mutationFn: ({ dateInstanceId, payload }: { dateInstanceId: string; payload?: { cancellationReason: string } }) =>
      rosterService.deleteRosterDate(companyId!, locationId!, dateInstanceId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rosterDates', companyId, locationId] })
      toast.success(data?.message || 'Duty cancelled successfully!')
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to cancel duty')
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
    mutationFn: ({ dateId, payload }: { dateId: string; payload: { replacementResourceId: string; reason: string } }) =>
      rosterService.requestReplacement(companyId!, locationId!, dateId, payload),
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
