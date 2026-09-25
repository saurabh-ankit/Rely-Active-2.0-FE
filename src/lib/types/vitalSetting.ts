export type VitalInputType = 'single' | 'composite'

export interface VitalSetting {
  id: string
  name: string
  code?: string | null
  description?: string | null
  imageUrl: string
  unit: string
  inputType: VitalInputType
  lowRiskyBelow?: number | null
  lowBelow?: number | null
  normalMin?: number | null
  normalMax?: number | null
  highAbove?: number | null
  highRiskyAbove?: number | null
  isActive?: boolean
  isDeleted?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateVitalSettingRequest {
  name: string
  code?: string | null
  description?: string | null
  imageUrl: string
  unit: string
  inputType: VitalInputType
  lowRiskyBelow?: number | null
  lowBelow?: number | null
  normalMin?: number | null
  normalMax?: number | null
  highAbove?: number | null
  highRiskyAbove?: number | null
  isActive?: boolean
}

export type UpdateVitalSettingRequest = Partial<CreateVitalSettingRequest>

export interface VitalSettingsPagination {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface VitalSettingsListResult {
  data: VitalSetting[]
  pagination: VitalSettingsPagination
}
