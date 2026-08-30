interface ApiError {
  response?: { data?: { message?: string } }
  message?: string
}
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as assetService from '@/lib/services/assetService'
import { useLocationStore } from '@/lib/stores/locationStore'
import type {
  CreateAssetAssignmentRequest,
  CreateAssetCategoryRequest,
  CreateAssetItemRequest,
  CreateAssetRequest,
  CreateAssetVendorRequest,
  CreateServiceLogRequest,
  CreateTrainingRequest,
  CreateWarrantyRequest,
  PaginationParams,
  ReturnAssetRequest,
} from '@/lib/types'

// Asset Categories
export const useGetAssetCategories = (params?: PaginationParams & { enabled?: boolean }) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true, ...queryParams } = params || {}

  return useQuery({
    queryKey: ['assetCategories', locationId, queryParams],
    queryFn: () => assetService.getAssetCategories(locationId, queryParams),
    enabled: enabled && !!locationId,
  })
}

export const useCreateAssetCategory = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: (data: CreateAssetCategoryRequest) => assetService.createAssetCategory(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetCategories'] })
    },
  })
}

export const useUpdateAssetCategory = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAssetCategoryRequest> }) =>
      assetService.updateAssetCategory(locationId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetCategories'] })
    },
  })
}

export const useDeleteAssetCategory = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: (id: string) => assetService.deleteAssetCategory(locationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetCategories'] })
    },
  })
}

// Asset Vendors
export const useGetAssetVendors = (params?: PaginationParams & { enabled?: boolean }) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true, ...queryParams } = params || {}

  return useQuery({
    queryKey: ['assetVendors', locationId, queryParams],
    queryFn: () => assetService.getAssetVendors(locationId, queryParams),
    enabled: enabled && !!locationId,
  })
}

export const useGetAssetVendorsDropdown = (options?: { categoryId?: string; enabled?: boolean }) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true, categoryId } = options || {}

  return useQuery({
    queryKey: ['assetVendorsDropdown', locationId, categoryId],
    queryFn: () => assetService.getAssetVendorsDropdown(locationId, categoryId),
    enabled: enabled && !!locationId,
  })
}

export const useCreateAssetVendor = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: (data: CreateAssetVendorRequest | FormData) => assetService.createAssetVendor(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetVendors'] })
      queryClient.invalidateQueries({ queryKey: ['assetVendorsDropdown'] })
    },
  })
}

export const useUpdateAssetVendor = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAssetVendorRequest> | FormData }) =>
      assetService.updateAssetVendor(locationId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetVendors'] })
      queryClient.invalidateQueries({ queryKey: ['assetVendorsDropdown'] })
    },
  })
}

export const useDeleteAssetVendor = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: (id: string) => assetService.deleteAssetVendor(locationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetVendors'] })
      queryClient.invalidateQueries({ queryKey: ['assetVendorsDropdown'] })
    },
  })
}

// Asset Items
export const useGetAssetItems = (params?: PaginationParams & { categoryId?: string; enabled?: boolean }) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true, ...queryParams } = params || {}

  return useQuery({
    queryKey: ['assetItems', locationId, queryParams],
    queryFn: () => assetService.getAssetItems(locationId, queryParams),
    enabled: enabled && !!locationId,
  })
}

export const useGetAssetItemsDropdown = (options?: { categoryId?: string; enabled?: boolean }) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true, categoryId } = options || {}

  return useQuery({
    queryKey: ['assetItemsDropdown', locationId, categoryId],
    queryFn: () => assetService.getAssetItemsDropdown(locationId, categoryId),
    enabled: enabled && !!locationId,
  })
}

export const useCreateAssetItem = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: (data: CreateAssetItemRequest) => assetService.createAssetItem(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetItems'] })
      queryClient.invalidateQueries({ queryKey: ['assetItemsDropdown'] })
    },
  })
}

export const useUpdateAssetItem = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAssetItemRequest> }) =>
      assetService.updateAssetItem(locationId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetItems'] })
      queryClient.invalidateQueries({ queryKey: ['assetItemsDropdown'] })
    },
  })
}

export const useDeleteAssetItem = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: (id: string) => assetService.deleteAssetItem(locationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetItems'] })
      queryClient.invalidateQueries({ queryKey: ['assetItemsDropdown'] })
    },
  })
}

// Assets
export const useGetAssets = (
  params?: PaginationParams & {
    itemId?: string
    categoryId?: string
    status?: string
    condition?: string
    enabled?: boolean
  },
) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true, ...queryParams } = params || {}

  return useQuery({
    queryKey: ['assets', locationId, queryParams],
    queryFn: () => assetService.getAssets(locationId, queryParams),
    enabled: enabled && !!locationId,
  })
}

export const useGetAssetById = (id: string, options?: { enabled?: boolean }) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['asset', locationId, id],
    queryFn: () => assetService.getAssetById(locationId, id),
    enabled: enabled && !!locationId && !!id,
  })
}

export const useCreateAsset = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: (data: CreateAssetRequest | FormData) => assetService.createAsset(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['assetStats'] })
    },
  })
}

export const useUpdateAsset = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAssetRequest> | FormData }) =>
      assetService.updateAsset(locationId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['assetStats'] })
    },
  })
}

export const useDeleteAsset = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: (id: string) => assetService.deleteAsset(locationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['assetStats'] })
    },
  })
}

export const useGetAssetStats = (options?: { enabled?: boolean }) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['assetStats', locationId],
    queryFn: () => assetService.getAssetStats(locationId),
    enabled: enabled && !!locationId,
  })
}

// Asset Assignments
export const useGetAssetAssignments = (
  params?: PaginationParams & {
    assetId?: string
    assigneeType?: string
    assigneeId?: string
    enabled?: boolean
  },
) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true, ...queryParams } = params || {}

  return useQuery({
    queryKey: ['assetAssignments', locationId, queryParams],
    queryFn: () => assetService.getAssetAssignments(locationId, queryParams),
    enabled: enabled && !!locationId,
  })
}

export const useGetActiveAssignments = (options?: { enabled?: boolean }) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['activeAssignments', locationId],
    queryFn: () => assetService.getActiveAssignments(locationId),
    enabled: enabled && !!locationId,
  })
}

export const useCreateAssetAssignment = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: (data: CreateAssetAssignmentRequest) => assetService.createAssetAssignment(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetAssignments'] })
      queryClient.invalidateQueries({ queryKey: ['activeAssignments'] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['assetStats'] })
    },
  })
}

export const useReturnAsset = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReturnAssetRequest }) =>
      assetService.returnAsset(locationId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetAssignments'] })
      queryClient.invalidateQueries({ queryKey: ['activeAssignments'] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['assetStats'] })
    },
  })
}

// Assignee Dropdowns
export const useGetEmployeesForAssignment = (options?: { enabled?: boolean }) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['employeesForAssignment', locationId],
    queryFn: () => assetService.getEmployeesForAssignment(locationId),
    enabled: enabled && !!locationId,
  })
}

export const useGetPatientsForAssignment = (options?: { enabled?: boolean }) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['patientsForAssignment', locationId],
    queryFn: () => assetService.getPatientsForAssignment(locationId),
    enabled: enabled && !!locationId,
  })
}

export const useGetRoomsForAssignment = (options?: { enabled?: boolean }) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['roomsForAssignment', locationId],
    queryFn: () => assetService.getRoomsForAssignment(locationId),
    enabled: enabled && !!locationId,
  })
}

export const useGetBedsForRoom = (roomId: string, options?: { enabled?: boolean }) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const { enabled = true } = options || {}

  return useQuery({
    queryKey: ['bedsForRoom', locationId, roomId],
    queryFn: () => assetService.getBedsForRoom(locationId, roomId),
    enabled: enabled && !!locationId && !!roomId,
  })
}

// Maintenance Hooks
export const useGetServiceLogs = (params?: PaginationParams) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useQuery({
    queryKey: ['serviceLogs', locationId, params],
    queryFn: () => assetService.getServiceLogs(locationId, params),
    enabled: !!locationId,
  })
}

export const useCreateServiceLog = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateServiceLogRequest) => assetService.createServiceLog(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceLogs', locationId] })
      queryClient.invalidateQueries({ queryKey: ['assets', locationId] })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create service log'
      toast.error(errorMessage)
    },
  })
}

export const useUpdateServiceLog = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateServiceLogRequest> }) =>
      assetService.updateServiceLog(locationId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceLogs', locationId] })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update service log'
      toast.error(errorMessage)
    },
  })
}

export const useDeleteServiceLog = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => assetService.deleteServiceLog(locationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceLogs', locationId] })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete service log'
      toast.error(errorMessage)
    },
  })
}

export const useCompleteServiceLog = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { completionRemarks: string } }) =>
      assetService.completeServiceLog(locationId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceLogs', locationId] })
      queryClient.invalidateQueries({ queryKey: ['assets', locationId] })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to complete service log'
      toast.error(errorMessage)
    },
  })
}

// Warranties
export const useGetWarranties = (params?: PaginationParams) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useQuery({
    queryKey: ['warranties', locationId, params],
    queryFn: () => assetService.getWarranties(locationId, params),
    enabled: !!locationId,
  })
}

export const useCreateWarranty = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateWarrantyRequest | FormData) => assetService.createWarranty(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties', locationId] })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create warranty'
      toast.error(errorMessage)
    },
  })
}

export const useUpdateWarranty = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateWarrantyRequest> | FormData }) =>
      assetService.updateWarranty(locationId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties', locationId] })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update warranty'
      toast.error(errorMessage)
    },
  })
}

export const useDeleteWarranty = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => assetService.deleteWarranty(locationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties', locationId] })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete warranty'
      toast.error(errorMessage)
    },
  })
}

// Calibrations
export const useGetCalibrations = (params?: PaginationParams) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useQuery({
    queryKey: ['calibrations', locationId, params],
    queryFn: () => assetService.getCalibrations(locationId, params),
    enabled: !!locationId,
  })
}

export const useCreateCalibration = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: FormData) => assetService.createCalibration(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calibrations', locationId] })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create calibration'
      toast.error(errorMessage)
    },
  })
}

export const useUpdateCalibration = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => assetService.updateCalibration(locationId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calibrations', locationId] })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update calibration'
      toast.error(errorMessage)
    },
  })
}

export const useDeleteCalibration = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => assetService.deleteCalibration(locationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calibrations', locationId] })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete calibration'
      toast.error(errorMessage)
    },
  })
}

// Upcoming Maintenance
export const useGetUpcomingMaintenance = (days?: number) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useQuery({
    queryKey: ['upcomingMaintenance', locationId, days],
    queryFn: () => assetService.getUpcomingMaintenance(locationId, days),
    enabled: !!locationId,
  })
}

// Compliance Hooks
export const useGetCertifications = (params?: PaginationParams) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useQuery({
    queryKey: ['certifications', locationId, params],
    queryFn: () => assetService.getCertifications(locationId, params),
    enabled: !!locationId,
  })
}

export const useCreateCertification = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: FormData) => assetService.createCertification(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['certifications', locationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['complianceStatus', locationId],
      })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create certification'
      toast.error(errorMessage)
    },
  })
}

export const useUpdateCertification = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      assetService.updateCertification(locationId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['certifications', locationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['complianceStatus', locationId],
      })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update certification'
      toast.error(errorMessage)
    },
  })
}

export const useDeleteCertification = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => assetService.deleteCertification(locationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['certifications', locationId],
      })
      queryClient.invalidateQueries({
        queryKey: ['complianceStatus', locationId],
      })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete certification'
      toast.error(errorMessage)
    },
  })
}

export const useGetExpiringCertifications = (days?: number) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useQuery({
    queryKey: ['expiringCertifications', locationId, days],
    queryFn: () => assetService.getExpiringCertifications(locationId, days),
    enabled: !!locationId,
  })
}

export const useGetInspections = (params?: PaginationParams) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useQuery({
    queryKey: ['inspections', locationId, params],
    queryFn: () => assetService.getInspections(locationId, params),
    enabled: !!locationId,
  })
}

export const useCreateInspection = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: FormData) => assetService.createInspection(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections', locationId] })
      queryClient.invalidateQueries({
        queryKey: ['complianceStatus', locationId],
      })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create inspection'
      toast.error(errorMessage)
    },
  })
}

export const useUpdateInspection = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => assetService.updateInspection(locationId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections', locationId] })
      queryClient.invalidateQueries({
        queryKey: ['complianceStatus', locationId],
      })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update inspection'
      toast.error(errorMessage)
    },
  })
}

export const useDeleteInspection = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => assetService.deleteInspection(locationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections', locationId] })
      queryClient.invalidateQueries({
        queryKey: ['complianceStatus', locationId],
      })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete inspection'
      toast.error(errorMessage)
    },
  })
}

export const useGetTraining = (params?: PaginationParams) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useQuery({
    queryKey: ['training', locationId, params],
    queryFn: () => assetService.getTraining(locationId, params),
    enabled: !!locationId,
  })
}

export const useCreateTraining = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTrainingRequest) => assetService.createTraining(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training', locationId] })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create training'
      toast.error(errorMessage)
    },
  })
}

export const useUpdateTraining = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTrainingRequest> }) =>
      assetService.updateTraining(locationId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training', locationId] })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update training'
      toast.error(errorMessage)
    },
  })
}

export const useDeleteTraining = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => assetService.deleteTraining(locationId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training', locationId] })
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete training'
      toast.error(errorMessage)
    },
  })
}

export const useGetComplianceStatus = (assetId?: string) => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useQuery({
    queryKey: ['complianceStatus', locationId, assetId],
    queryFn: () => assetService.getComplianceStatus(locationId, assetId),
    enabled: !!locationId,
  })
}

export const useGenerateBulkAssetTemplate = () => {
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: (data: { categoryId: string; itemId: string; vendorId: string; numberOfRecords: number }) =>
      assetService.generateBulkAssetTemplate(locationId, data),
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || 'Failed to generate template'
      toast.error(errorMessage)
    },
  })
}

export const useUploadBulkAssets = () => {
  const queryClient = useQueryClient()
  const { selectedLocationId } = useLocationStore()
  const locationId = selectedLocationId || 'all'

  return useMutation({
    mutationFn: (file: File) => assetService.uploadBulkAssets(locationId, file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['assetStats'] })
      toast.success(`Successfully created ${data.data.created} asset(s)!`)
    },
    onError: (error: ApiError) => {
      const errorMessage = error.response?.data?.message || 'Failed to upload assets'
      toast.error(errorMessage)
    },
  })
}
