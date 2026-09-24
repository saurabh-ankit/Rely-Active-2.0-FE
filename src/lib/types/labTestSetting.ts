export interface LabTestSetting {
  id: string
  name: string
  description: string
  instructions?: string | null
  imageUrl?: string | null
  isActive?: boolean
  isDeleted?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateLabTestSettingRequest {
  name: string
  description: string
  instructions?: string | null
  imageUrl?: string | null
  isActive?: boolean
}

export type UpdateLabTestSettingRequest = Partial<CreateLabTestSettingRequest>

export interface LabTestSettingsPagination {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface LabTestSettingsListResult {
  data: LabTestSetting[]
  pagination: LabTestSettingsPagination
}
