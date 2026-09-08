export type PriceOption = 'Daily' | 'Monthly' | 'Session Wise'

export interface CareTask {
  id: string
  careTaskName: string
  taskName?: string
  careTaskDescription: string | null
  taskDescription?: string | null
  dailyRate: number
  monthlyRate: number
  sessionRate: number
  sessionWiseRate?: number
  careTaskPrice?: number | null
  price?: number | null
  priceOption?: PriceOption | string | null
  careTaskImage?: string | null
  taskImage?: string | null
  taskType?: string
  propertyId: string | null
  isActive: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  property?: {
    id: string
    property_name: string
    city?: string
    state?: string
  } | null
}

// Backward compatibility alias
export type Task = CareTask

export interface PackageTaskItem {
  taskId: string
  careTaskName?: string
  taskName?: string
  taskType?: string
  dailyRate?: number
  monthlyRate?: number
  sessionRate?: number
  priceOption?: string
  careTaskPrice?: number | null
  price?: number | null
  careTaskImage?: string | null
  taskImage?: string | null
  complimentaryCount?: number | null
}

export interface CarePackage {
  id: string
  packageName: string
  packageCost: number
  duration: 'Monthly' | 'Yearly' | string
  tasks: PackageTaskItem[]
  description?: string | null
  propertyId: string | null
  isActive: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  property?: {
    id: string
    property_name: string
    city?: string
    state?: string
  } | null
}

// Backward compatibility alias
export type Package = CarePackage

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CareTaskQueryParams {
  page?: number
  limit?: number
  search?: string
  propertyId?: string | null
  includeGlobal?: boolean | string
}

export interface CarePackageQueryParams {
  page?: number
  limit?: number
  search?: string
  propertyId?: string | null
  includeGlobal?: boolean | string
}

export interface CareTasksListResponse {
  success: boolean
  message?: string
  data: CareTask[]
  pagination?: PaginationMeta
}

export interface CarePackagesListResponse {
  success: boolean
  message?: string
  data: CarePackage[]
  pagination?: PaginationMeta
}

export interface CreateCarePackagePayload {
  packageName: string
  packageCost: number
  duration: string
  description?: string
  tasks: PackageTaskItem[]
  propertyId?: string | null
}

export type UpdateCarePackagePayload = Partial<CreateCarePackagePayload>
