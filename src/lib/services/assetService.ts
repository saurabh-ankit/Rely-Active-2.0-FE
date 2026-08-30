import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type {
  ApiResponse,
  Asset,
  AssetAssignment,
  AssetCalibration,
  AssetCategory,
  AssetComplianceCertification,
  AssetComplianceInspection,
  AssetComplianceTraining,
  AssetItem,
  AssetServiceLog,
  AssetStats,
  AssetVendor,
  AssetWarranty,
  ComplianceStatusResponse,
  CreateAssetAssignmentRequest,
  CreateAssetCategoryRequest,
  CreateAssetItemRequest,
  CreateAssetRequest,
  CreateAssetVendorRequest,
  CreateServiceLogRequest,
  CreateTrainingRequest,
  CreateWarrantyRequest,
  IdNamePair,
  PaginationParams,
  ReturnAssetRequest,
  UpcomingMaintenanceResponse,
} from '@/lib/types'

const formatUrl = (template: string, locationId: string, id?: string) => {
  let url = template.replace(':locationId', locationId || 'all')
  if (id) {
    url = url.replace(':id', id)
  }
  return url
}

// Categories
export const getAssetCategories = async (locationId: string, params?: PaginationParams) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.categories.list, locationId)
  const response = await api.get<ApiResponse<{ categories: AssetCategory[]; pagination: unknown }>>(url, { params })
  return response.data
}

export const createAssetCategory = async (locationId: string, data: CreateAssetCategoryRequest) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.categories.create, locationId)
  const response = await api.post<ApiResponse<AssetCategory>>(url, data)
  return response.data
}

export const updateAssetCategory = async (
  locationId: string,
  id: string,
  data: Partial<CreateAssetCategoryRequest>,
) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.categories.update, locationId, id)
  const response = await api.put<ApiResponse<AssetCategory>>(url, data)
  return response.data
}

export const deleteAssetCategory = async (locationId: string, id: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.categories.delete, locationId, id)
  const response = await api.delete<ApiResponse<null>>(url)
  return response.data
}

// Vendors
export const getAssetVendors = async (locationId: string, params?: PaginationParams) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.vendors.list, locationId)
  const response = await api.get<ApiResponse<{ vendors: AssetVendor[]; pagination: unknown }>>(url, { params })
  return response.data
}

export const getAssetVendorsDropdown = async (locationId: string, categoryId?: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.vendors.dropdown, locationId)
  const response = await api.get<ApiResponse<IdNamePair[]>>(url, {
    params: { categoryId },
  })
  return response.data
}

export const createAssetVendor = async (locationId: string, data: CreateAssetVendorRequest | FormData) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.vendors.create, locationId)

  if (data instanceof FormData) {
    const response = await api.post<ApiResponse<AssetVendor>>(url, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  const response = await api.post<ApiResponse<AssetVendor>>(url, data)
  return response.data
}

export const updateAssetVendor = async (
  locationId: string,
  id: string,
  data: Partial<CreateAssetVendorRequest> | FormData,
) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.vendors.update, locationId, id)

  if (data instanceof FormData) {
    const response = await api.put<ApiResponse<AssetVendor>>(url, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  const response = await api.put<ApiResponse<AssetVendor>>(url, data)
  return response.data
}

export const deleteAssetVendor = async (locationId: string, id: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.vendors.delete, locationId, id)
  const response = await api.delete<ApiResponse<null>>(url)
  return response.data
}

// Items
export const getAssetItems = async (locationId: string, params?: PaginationParams & { categoryId?: string }) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.items.list, locationId)
  const response = await api.get<ApiResponse<{ items: AssetItem[]; pagination: unknown }>>(url, { params })
  return response.data
}

export const getAssetItemsDropdown = async (locationId: string, categoryId?: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.items.dropdown, locationId)
  const response = await api.get<ApiResponse<IdNamePair[]>>(url, {
    params: { categoryId },
  })
  return response.data
}

export const createAssetItem = async (locationId: string, data: CreateAssetItemRequest) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.items.create, locationId)
  const response = await api.post<ApiResponse<AssetItem>>(url, data)
  return response.data
}

export const updateAssetItem = async (locationId: string, id: string, data: Partial<CreateAssetItemRequest>) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.items.update, locationId, id)
  const response = await api.put<ApiResponse<AssetItem>>(url, data)
  return response.data
}

export const deleteAssetItem = async (locationId: string, id: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.items.delete, locationId, id)
  const response = await api.delete<ApiResponse<null>>(url)
  return response.data
}

// Assets
export const getAssets = async (
  locationId: string,
  params?: PaginationParams & {
    itemId?: string
    categoryId?: string
    status?: string
    condition?: string
  },
) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assets.list, locationId)
  const response = await api.get<ApiResponse<{ assets: Asset[]; pagination: unknown }>>(url, { params })
  return response.data
}

export const getAssetById = async (locationId: string, id: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assets.get, locationId, id)
  const response = await api.get<ApiResponse<Asset>>(url)
  return response.data
}

export const createAsset = async (locationId: string, data: CreateAssetRequest | FormData) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assets.create, locationId)

  if (data instanceof FormData) {
    const response = await api.post<ApiResponse<Asset>>(url, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  const response = await api.post<ApiResponse<Asset>>(url, data)
  return response.data
}

export const updateAsset = async (locationId: string, id: string, data: Partial<CreateAssetRequest> | FormData) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assets.update, locationId, id)

  if (data instanceof FormData) {
    const response = await api.put<ApiResponse<Asset>>(url, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  const response = await api.put<ApiResponse<Asset>>(url, data)
  return response.data
}

export const deleteAsset = async (locationId: string, id: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assets.delete, locationId, id)
  const response = await api.delete<ApiResponse<null>>(url)
  return response.data
}

export const getAssetStats = async (locationId: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assets.stats, locationId)
  const response = await api.get<ApiResponse<AssetStats>>(url)
  return response.data
}

// Assignments
export const getAssetAssignments = async (
  locationId: string,
  params?: PaginationParams & {
    assetId?: string
    assigneeType?: string
    assigneeId?: string
  },
) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assignments.list, locationId)
  const response = await api.get<ApiResponse<{ assignments: AssetAssignment[]; pagination: unknown }>>(url, { params })
  return response.data
}

export const getActiveAssignments = async (locationId: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assignments.active, locationId)
  const response = await api.get<ApiResponse<AssetAssignment[]>>(url)
  return response.data
}

export const createAssetAssignment = async (locationId: string, data: CreateAssetAssignmentRequest) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assignments.create, locationId)
  const response = await api.post<ApiResponse<AssetAssignment>>(url, data)
  return response.data
}

export const returnAsset = async (locationId: string, id: string, data: ReturnAssetRequest) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assignments.return, locationId, id)
  const response = await api.put<ApiResponse<AssetAssignment>>(url, data)
  return response.data
}

// Assignee Dropdowns
export const getEmployeesForAssignment = async (locationId: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assignees.employees, locationId)
  const response = await api.get<ApiResponse<Array<{ id: string; name: string; role?: string }>>>(url)
  return response.data
}

export const getResidentsForAssignment = async (locationId: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assignees.residents, locationId)
  const response =
    await api.get<ApiResponse<Array<{ id: string; name: string; residentType?: string; flatInfo?: string }>>>(url)
  return response.data
}

export const getPatientsForAssignment = async (locationId: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assignees.patients, locationId)
  const response = await api.get<ApiResponse<Array<{ id: string; name: string; patientNumber?: string }>>>(url)
  return response.data
}

export const getRoomsForAssignment = async (locationId: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assignees.rooms, locationId)
  const response =
    await api.get<ApiResponse<Array<{ id: string; name: string; roomNumber: string; status: string }>>>(url)
  return response.data
}

export const getBedsForRoom = async (locationId: string, roomId: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.assignees.beds, locationId)
  const response = await api.get<ApiResponse<Array<{ id: string; name: string; bedNumber: string; status: string }>>>(
    url,
    { params: { roomId } },
  )
  return response.data
}

// Maintenance Services
export const getServiceLogs = async (locationId: string, params?: PaginationParams) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.serviceLogs.list, locationId)
  const response = await api.get<ApiResponse<{ serviceLogs: AssetServiceLog[]; pagination: unknown }>>(url, { params })
  return response.data
}

export const createServiceLog = async (locationId: string, data: CreateServiceLogRequest) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.serviceLogs.create, locationId)
  const response = await api.post<ApiResponse<AssetServiceLog>>(url, data)
  return response.data
}

export const updateServiceLog = async (locationId: string, id: string, data: Partial<CreateServiceLogRequest>) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.serviceLogs.update, locationId, id)
  const response = await api.put<ApiResponse<AssetServiceLog>>(url, data)
  return response.data
}

export const deleteServiceLog = async (locationId: string, id: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.serviceLogs.delete, locationId, id)
  const response = await api.delete<ApiResponse<null>>(url)
  return response.data
}

export const completeServiceLog = async (locationId: string, id: string, data: { completionRemarks: string }) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.serviceLogs.complete, locationId, id)
  const response = await api.put<ApiResponse<AssetServiceLog>>(url, data)
  return response.data
}

export const getWarranties = async (locationId: string, params?: PaginationParams) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.warranties.list, locationId)
  const response = await api.get<ApiResponse<{ warranties: AssetWarranty[]; pagination: unknown }>>(url, { params })
  return response.data
}

export const createWarranty = async (locationId: string, data: CreateWarrantyRequest | FormData) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.warranties.create, locationId)
  const response = await api.post<ApiResponse<AssetWarranty>>(url, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  })
  return response.data
}

export const updateWarranty = async (
  locationId: string,
  id: string,
  data: Partial<CreateWarrantyRequest> | FormData,
) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.warranties.update, locationId, id)
  const response = await api.put<ApiResponse<AssetWarranty>>(url, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  })
  return response.data
}

export const deleteWarranty = async (locationId: string, id: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.warranties.delete, locationId, id)
  const response = await api.delete<ApiResponse<null>>(url)
  return response.data
}

export const getCalibrations = async (locationId: string, params?: PaginationParams) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.calibrations.list, locationId)
  const response = await api.get<ApiResponse<{ calibrations: AssetCalibration[]; pagination: unknown }>>(url, {
    params,
  })
  return response.data
}

export const createCalibration = async (locationId: string, data: FormData) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.calibrations.create, locationId)
  const response = await api.post<ApiResponse<AssetCalibration>>(url, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const updateCalibration = async (locationId: string, id: string, data: FormData) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.calibrations.update, locationId, id)
  const response = await api.put<ApiResponse<AssetCalibration>>(url, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const deleteCalibration = async (locationId: string, id: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.calibrations.delete, locationId, id)
  const response = await api.delete<ApiResponse<null>>(url)
  return response.data
}

export const getUpcomingMaintenance = async (locationId: string, days?: number) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.maintenance.upcoming, locationId)
  const response = await api.get<ApiResponse<UpcomingMaintenanceResponse>>(url, {
    params: { days },
  })
  return response.data
}

// Compliance Services
export const getCertifications = async (locationId: string, params?: PaginationParams) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.certifications.list, locationId)
  const response = await api.get<
    ApiResponse<{
      certifications: AssetComplianceCertification[]
      pagination: unknown
    }>
  >(url, { params })
  return response.data
}

export const createCertification = async (locationId: string, data: FormData) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.certifications.create, locationId)
  const response = await api.post<ApiResponse<AssetComplianceCertification>>(url, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const updateCertification = async (locationId: string, id: string, data: FormData) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.certifications.update, locationId, id)
  const response = await api.put<ApiResponse<AssetComplianceCertification>>(url, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const deleteCertification = async (locationId: string, id: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.certifications.delete, locationId, id)
  const response = await api.delete<ApiResponse<null>>(url)
  return response.data
}

export const getExpiringCertifications = async (locationId: string, days?: number) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.certifications.expiring, locationId)
  const response = await api.get<ApiResponse<AssetComplianceCertification[]>>(url, {
    params: { days },
  })
  return response.data
}

export const getInspections = async (locationId: string, params?: PaginationParams) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.inspections.list, locationId)
  const response = await api.get<ApiResponse<{ inspections: AssetComplianceInspection[]; pagination: unknown }>>(url, {
    params,
  })
  return response.data
}

export const createInspection = async (locationId: string, data: FormData) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.inspections.create, locationId)
  const response = await api.post<ApiResponse<AssetComplianceInspection>>(url, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const updateInspection = async (locationId: string, id: string, data: FormData) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.inspections.update, locationId, id)
  const response = await api.put<ApiResponse<AssetComplianceInspection>>(url, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const deleteInspection = async (locationId: string, id: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.inspections.delete, locationId, id)
  const response = await api.delete<ApiResponse<null>>(url)
  return response.data
}

export const getTraining = async (locationId: string, params?: PaginationParams) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.training.list, locationId)
  const response = await api.get<ApiResponse<{ training: AssetComplianceTraining[]; pagination: unknown }>>(url, {
    params,
  })
  return response.data
}

export const createTraining = async (locationId: string, data: CreateTrainingRequest) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.training.create, locationId)
  const response = await api.post<ApiResponse<AssetComplianceTraining>>(url, data)
  return response.data
}

export const updateTraining = async (locationId: string, id: string, data: Partial<CreateTrainingRequest>) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.training.update, locationId, id)
  const response = await api.put<ApiResponse<AssetComplianceTraining>>(url, data)
  return response.data
}

export const deleteTraining = async (locationId: string, id: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.training.delete, locationId, id)
  const response = await api.delete<ApiResponse<null>>(url)
  return response.data
}

export const getComplianceStatus = async (locationId: string, assetId?: string) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.compliance.status, locationId)
  const response = await api.get<ApiResponse<ComplianceStatusResponse>>(url, {
    params: { assetId },
  })
  return response.data
}

export const generateBulkAssetTemplate = async (
  locationId: string,
  data: {
    categoryId: string
    itemId: string
    vendorId: string
    numberOfRecords: number
  },
) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.bulk.template, locationId)
  const response = await api.post(url, data, {
    responseType: 'blob',
  })
  return response.data
}

export const uploadBulkAssets = async (locationId: string, file: File) => {
  const url = formatUrl(API_ENDPOINTS.assetManagement.bulk.upload, locationId)
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<ApiResponse<{ created: number; assets: Asset[] }>>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}
