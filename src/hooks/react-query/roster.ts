import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  bulkCreateEmployeeShiftsAPI,
  coverShiftDateAPI,
  createAreaAPI,
  createEmployeeShiftAPI,
  createResidentPoolAPI,
  createShiftAPI,
  createShiftEmployeeDateAPI,
  deleteAreaAPI,
  deleteEmployeeShiftAPI,
  deleteResidentPoolAPI,
  deleteShiftAPI,
  exportEmployeeShiftsAPI,
  generateShiftEmployeeDatesAPI,
  listAreasAPI,
  listEmployeeShiftsAPI,
  listResidentPoolsAPI,
  listShiftEmployeeDatesAPI,
  listShiftsAPI,
  markDayOffAPI,
  swapShiftDatesAPI,
  unmarkDayOffAPI,
  updateAreaAPI,
  updateShiftAPI,
  type BulkCreateEmployeeShiftPayload,
  type CoverShiftDatePayload,
  type CreateAreaPayload,
  type CreateEmployeeShiftPayload,
  type CreateResidentPoolPayload,
  type CreateShiftEmployeeDatePayload,
  type CreateShiftPayload,
  type GenerateShiftEmployeeDatesPayload,
  type ListParams,
  type MarkDayOffPayload,
  type SwapShiftDatesPayload,
  type UpdateShiftPayload,
} from '@/lib/services/rosterService'
import { useLocationStore } from '@/lib/stores/locationStore'

// ── Query keys ────────────────────────────────────────────────────────────────

export const ROSTER_KEYS = {
  all: ['roster'] as const,
  shifts: (locationId?: string | null) => ['shifts', locationId] as const,
  employeeShifts: (locationId?: string | null, employeeId?: string) =>
    ['employee-shifts', locationId, employeeId || 'all'] as const,
  shiftEmployeeDates: (locationId?: string | null, params?: Record<string, unknown>) =>
    ['shift-employee-dates', locationId, params] as const,
  residentPools: (locationId?: string | null, params?: Record<string, unknown>) =>
    ['shift-resident-pools', locationId, params] as const,
  areas: (locationId?: string | null, params?: Record<string, unknown>) =>
    ['roster-areas', locationId, params] as const,
} as const

type ApiError = { response?: { data?: { message?: string } }; message?: string }

const useLocationId = () => useLocationStore((s) => s.selectedLocationId)

// ── Shifts ────────────────────────────────────────────────────────────────────

export const useListShifts = (enabled = true) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ROSTER_KEYS.shifts(locationId),
    queryFn: () => listShiftsAPI(locationId!),
    enabled: enabled && !!locationId,
  })
}

export const useCreateShift = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: CreateShiftPayload) => createShiftAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success(data.message || 'Shift created successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to create shift')
    },
  })
}

export const useUpdateShift = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShiftPayload }) => updateShiftAPI(locationId!, id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success(data.message || 'Shift updated successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to update shift')
    },
  })
}

export const useDeleteShift = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (id: string) => deleteShiftAPI(locationId!, id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast.success(data.message || 'Shift deleted successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to delete shift')
    },
  })
}

// ── Employee shifts ───────────────────────────────────────────────────────────

export const useListEmployeeShifts = (employeeId?: string, enabled = true) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ROSTER_KEYS.employeeShifts(locationId, employeeId),
    queryFn: () => listEmployeeShiftsAPI(locationId!, employeeId),
    enabled: enabled && !!locationId,
  })
}

export const useCreateEmployeeShift = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: CreateEmployeeShiftPayload) => createEmployeeShiftAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] })
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Employee assigned to shift')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to assign shift')
    },
  })
}

export const useBulkCreateEmployeeShifts = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: BulkCreateEmployeeShiftPayload) => bulkCreateEmployeeShiftsAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] })
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Employees assigned to shift')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to assign shifts')
    },
  })
}

export const useDeleteEmployeeShift = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (employeeShiftId: string) => deleteEmployeeShiftAPI(locationId!, employeeShiftId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employee-shifts'] })
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Assignment removed')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to remove assignment')
    },
  })
}

export const useExportEmployeeShifts = () => {
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (params?: Record<string, string>) => exportEmployeeShiftsAPI(locationId!, params),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `employee-shifts-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to export')
    },
  })
}

// ── Shift employee dates ──────────────────────────────────────────────────────

export const useListShiftEmployeeDates = (
  params?: {
    assignmentId?: string
    date?: string
    status?: string
    includeDeleted?: string
  },
  enabled = true,
) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ROSTER_KEYS.shiftEmployeeDates(locationId, params),
    queryFn: () => listShiftEmployeeDatesAPI(locationId!, params),
    enabled: enabled && !!locationId,
  })
}

export const useCreateShiftEmployeeDate = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: CreateShiftEmployeeDatePayload) => createShiftEmployeeDateAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Shift date created')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to create date')
    },
  })
}

export const useGenerateShiftEmployeeDates = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: GenerateShiftEmployeeDatesPayload) => generateShiftEmployeeDatesAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Dates generated')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to generate dates')
    },
  })
}

export const useMarkDayOff = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ dateId, data }: { dateId: string; data: MarkDayOffPayload }) =>
      markDayOffAPI(locationId!, dateId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Day off marked')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to mark day off')
    },
  })
}

export const useUnmarkDayOff = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (dateId: string) => unmarkDayOffAPI(locationId!, dateId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Day off removed')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to unmark day off')
    },
  })
}

export const useCoverShiftDate = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ dateId, data }: { dateId: string; data: CoverShiftDatePayload }) =>
      coverShiftDateAPI(locationId!, dateId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Cover assigned')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to assign cover')
    },
  })
}

export const useSwapShiftDates = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ dateId, data }: { dateId: string; data: SwapShiftDatesPayload }) =>
      swapShiftDatesAPI(locationId!, dateId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-employee-dates'] })
      toast.success(data.message || 'Shifts swapped')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to swap shifts')
    },
  })
}

// ── Shift resident pool ───────────────────────────────────────────────────────

export const useListResidentPools = (
  params?: { shiftEmployeeDateId?: string; unitId?: string; date?: string },
  enabled = true,
) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ROSTER_KEYS.residentPools(locationId, params),
    queryFn: () => listResidentPoolsAPI(locationId!, params),
    enabled: enabled && !!locationId,
  })
}

export const useCreateResidentPool = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: CreateResidentPoolPayload) => createResidentPoolAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-resident-pools'] })
      toast.success(data.message || 'Flat assigned')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to assign flat')
    },
  })
}

export const useDeleteResidentPool = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (poolId: string) => deleteResidentPoolAPI(locationId!, poolId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift-resident-pools'] })
      toast.success(data.message || 'Flat removed from pool')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to remove flat')
    },
  })
}

// ── Areas ─────────────────────────────────────────────────────────────────────

export const useListAreas = (params?: ListParams, enabled = true) => {
  const locationId = useLocationId()
  return useQuery({
    queryKey: ROSTER_KEYS.areas(locationId, params),
    queryFn: () => listAreasAPI(locationId!, params),
    enabled: enabled && !!locationId,
  })
}

export const useCreateArea = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (data: CreateAreaPayload) => createAreaAPI(locationId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roster-areas'] })
      toast.success(data.message || 'Area created')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to create area')
    },
  })
}

export const useUpdateArea = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAreaPayload> }) =>
      updateAreaAPI(locationId!, id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roster-areas'] })
      toast.success(data.message || 'Area updated')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to update area')
    },
  })
}

export const useDeleteArea = () => {
  const queryClient = useQueryClient()
  const locationId = useLocationId()
  return useMutation({
    mutationFn: (id: string) => deleteAreaAPI(locationId!, id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roster-areas'] })
      toast.success(data.message || 'Area deleted')
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || error.message || 'Failed to delete area')
    },
  })
}
