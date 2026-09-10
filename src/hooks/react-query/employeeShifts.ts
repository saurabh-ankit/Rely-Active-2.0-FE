import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  bulkCreateEmployeeShiftsAPI,
  createEmployeeShiftAPI,
  deleteEmployeeShiftAPI,
  exportEmployeeShiftsAPI,
  listEmployeeShiftsAPI,
  type BulkCreateEmployeeShiftPayload,
  type CreateEmployeeShiftPayload,
} from '@/lib/services/employeeShiftService'
import { useLocationStore } from '@/lib/stores/locationStore'
import { ROSTER_KEYS } from './rosterKeys'

type ApiError = { response?: { data?: { message?: string } }; message?: string }

const useLocationId = () => useLocationStore((s) => s.selectedLocationId)

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
