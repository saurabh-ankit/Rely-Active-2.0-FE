export type AssetStatus = 'available' | 'assigned' | 'maintenance' | 'retired' | 'disposed'

export type AssetCondition = 'excellent' | 'good' | 'fair' | 'poor'

export type AssigneeType = 'employee' | 'patient' | 'room'

export type ServiceType = 'repair' | 'preventive' | 'inspection' | 'cleaning' | 'upgrade'

export type WarrantyType = 'manufacturer' | 'extended' | 'service_contract'

export type CalibrationResult = 'pass' | 'fail'

export type CertificationType = 'regulatory' | 'safety' | 'quality' | 'environmental'

export type InspectionType = 'routine' | 'safety' | 'regulatory' | 'quality'

export type ComplianceStatus = 'valid' | 'expired' | 'expiring_soon' | 'pending_renewal'

export type TrainingRequiredFor = 'all_staff' | 'clinical' | 'maintenance'

export interface BaseEntity {
  id: string
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}

export interface IdNamePair {
  id: string
  name: string
  property_name?: string
}

export interface AssetCategory extends BaseEntity {
  name: string
  description?: string
  vendorCount?: number
  itemCount?: number
}

export interface VendorCustomField {
  fieldName: string
  fieldLabel: string
  fieldType: 'text' | 'number' | 'date' | 'bool' | 'select' | 'document'
  fieldValue?: string
  displayOrder?: number
  isRequired?: boolean
  defaultValue?: string
  enumValues?: string[]
  file?: File | null
}

export interface AssetVendor extends BaseEntity {
  name: string
  categoryId: string
  category?: AssetCategory
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  website?: string
  taxId?: string
  locations?: IdNamePair[]
  customFields?: VendorCustomField[]
}

export interface AssetItem extends BaseEntity {
  name: string
  description?: string
  categoryId: string
  category?: AssetCategory
  vendorId?: string
  vendor?: AssetVendor
  model?: string
  manufacturer?: string
  specifications?: Record<string, unknown>
  locations?: IdNamePair[]
}

export interface Asset extends BaseEntity {
  itemId: string
  item?: AssetItem
  locationId: string
  location?: IdNamePair
  vendorId: string
  vendor?: AssetVendor
  serialNumber?: string
  assetTag?: string
  qrCode?: string
  purchaseDate?: string
  purchasePrice?: number
  currentValue?: number
  warrantyEndDate?: string
  warrantyDocumentUrl?: string
  condition: AssetCondition
  status: AssetStatus
  notes?: string
}

export interface AssetAssignment extends BaseEntity {
  assetId: string
  asset?: Asset
  assigneeType: AssigneeType
  assigneeId: string
  bedId?: string
  bed?: {
    id: string
    bedNumber: string
    status: string
    room?: {
      id: string
      roomNumber: string
      status: string
    }
  }
  room?: {
    id: string
    roomNumber: string
    status: string
  }
  locationId: string
  location?: IdNamePair
  assignedBy: string
  assigner?: IdNamePair
  assignedAt: string
  expectedReturnDate?: string
  returnedAt?: string
  returnCondition?: string
  notes?: string
  assigneeDetails?:
    | {
        id: string
        name: string
        email?: string
        role?: string
      }
    | {
        id: string
        name: string
        patientNumber?: string
      }
    | {
        id: string
        roomNumber: string
        status: string
      }
}

export interface AssetServiceLog extends BaseEntity {
  assetId: string
  asset?: Asset
  serviceDate: string
  serviceType: ServiceType
  performedBy?: string
  vendorId?: string
  vendor?: AssetVendor
  cost?: number
  description?: string
  nextServiceDate?: string
  completionStatus: 'pending' | 'completed'
  completedDate?: string
  completionRemarks?: string
}

export interface AssetWarranty extends BaseEntity {
  assetId: string
  asset?: Asset
  vendorId?: string
  vendor?: AssetVendor
  warrantyStartDate: string
  warrantyEndDate: string
  warrantyType: WarrantyType
  coverageDetails?: string
  documentUrl?: string
}

export interface AssetCalibration extends BaseEntity {
  assetId: string
  asset?: Asset
  calibrationDate: string
  nextCalibrationDate?: string
  calibratedBy?: string
  certificateNumber?: string
  result: CalibrationResult
  notes?: string
  documentUrl?: string
}

export interface AssetComplianceCertification extends BaseEntity {
  assetId: string
  asset?: Asset
  certificationType: CertificationType
  certificateNumber?: string
  issuingAuthority?: string
  issueDate: string
  expiryDate: string
  documentUrl?: string
  status: ComplianceStatus
}

export interface AssetComplianceInspection extends BaseEntity {
  assetId: string
  asset?: Asset
  inspectionType: InspectionType
  inspectorName?: string
  inspectionDate: string
  nextInspectionDate?: string
  result: CalibrationResult
  findings?: string
  recommendations?: string
  documentUrl?: string
}

export interface AssetComplianceTraining extends BaseEntity {
  assetId: string
  asset?: Asset
  trainingTitle: string
  requiredFor: TrainingRequiredFor
  validityPeriod?: number
  notes?: string
}

export interface AssetStats {
  totalAssets: number
  availableAssets: number
  assignedAssets: number
  maintenanceAssets: number
  retiredAssets: number
  disposedAssets: number
  totalValue: number
  underWarranty: number
  recentAdditions: number
}

export interface CreateAssetCategoryRequest {
  name: string
  description?: string
}

export interface CreateAssetVendorRequest {
  name: string
  categoryId: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  website?: string
  taxId?: string
  locationIds?: string[]
  customFields?: VendorCustomField[]
}

export interface CreateAssetItemRequest {
  name: string
  description?: string
  categoryId: string
  vendorId?: string
  model?: string
  manufacturer?: string
  specifications?: Record<string, unknown>
  locationIds?: string[]
}

export interface CreateAssetRequest {
  itemId: string
  locationId: string
  vendorId?: string
  serialNumber?: string
  assetTag?: string
  qrCode?: string
  purchaseDate?: string
  purchasePrice?: number
  currentValue?: number
  warrantyEndDate?: string
  warrantyDocument?: File | null
  condition: AssetCondition
  status: AssetStatus
  notes?: string
}

export interface CreateAssetAssignmentRequest {
  assetId: string
  assigneeType: AssigneeType
  assigneeId: string
  bedId?: string
  assignedAt: string
  expectedReturnDate?: string
  notes?: string
}

export interface ReturnAssetRequest {
  returnedAt?: string
  returnCondition: AssetCondition
  notes?: string
}

export interface CreateServiceLogRequest {
  assetId: string
  serviceDate: string
  serviceType: ServiceType
  performedBy?: string
  vendorId?: string
  cost?: number
  description?: string
  nextServiceDate?: string
}

export interface CreateWarrantyRequest {
  assetId: string
  vendorId?: string
  warrantyStartDate: string
  warrantyEndDate: string
  warrantyType: WarrantyType
  coverageDetails?: string
  document?: File | null
}

export interface CreateCalibrationRequest {
  assetId: string
  calibrationDate: string
  nextCalibrationDate?: string
  calibratedBy?: string
  certificateNumber?: string
  result: CalibrationResult
  notes?: string
  document?: File | null
}

export interface CreateCertificationRequest {
  assetId: string
  certificationType: CertificationType
  certificateNumber?: string
  issuingAuthority?: string
  issueDate: string
  expiryDate: string
  status: ComplianceStatus
  document?: File | null
}

export interface CreateInspectionRequest {
  assetId: string
  inspectionType: InspectionType
  inspectorName?: string
  inspectionDate: string
  nextInspectionDate?: string
  result: CalibrationResult
  findings?: string
  recommendations?: string
  document?: File | null
}

export interface CreateTrainingRequest {
  assetId: string
  trainingTitle: string
  requiredFor: TrainingRequiredFor
  validityPeriod?: number
  notes?: string
}

export interface UpcomingMaintenanceResponse {
  services: AssetServiceLog[]
  calibrations: AssetCalibration[]
}

export interface ComplianceStatusResponse {
  certifications: {
    valid: number
    expired: number
    expiringSoon: number
    pendingRenewal: number
    total: number
  }
  inspections: {
    passed: number
    failed: number
    total: number
  }
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
}
