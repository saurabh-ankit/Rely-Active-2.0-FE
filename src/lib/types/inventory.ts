export type InventoryKind = 'categories' | 'vendors' | 'items'
export type InventoryValue = string | number | boolean | null
export interface InventoryFieldDefinition {
  id: string
  categoryId: string
  fieldName: string
  fieldLabel: string
  fieldType: 'text' | 'number' | 'select' | 'date' | 'boolean'
  isRequired: boolean
  defaultValue: InventoryValue
  enumValues: string[]
  displayOrder: number
}
export interface InventoryCategory {
  id: string
  name: string
  description: string | null
  image: string | null
  isActive: boolean
  locationIds: string[]
  itemCount: number
  fieldDefinitions: InventoryFieldDefinition[]
}
export interface InventoryVendor {
  id: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
  locationIds: string[]
}
export interface InventoryLocationThreshold {
  locationId: string
  minQuantity: number
  maxQuantity: number
  threshold: number
}
export interface InventoryItem {
  id: string
  categoryId: string
  name: string
  isActive: boolean
  packType: string
  packQuantity: number
  packUnit: string
  /** Shared location thresholds, expressed in integer base units. */
  minQuantity: number
  maxQuantity: number
  threshold: number
  locationIds: string[]
  customFields: { fieldDefinitionId: string; value: InventoryValue }[]
  vendorAssignments: InventoryVendorAssignment[]
  locationThresholds?: InventoryLocationThreshold[]
}
export interface InventoryVendorAssignment {
  vendorId: string
  locationId: string
}
export interface InventoryRecords {
  categories: InventoryCategory
  vendors: InventoryVendor
  items: InventoryItem
}
export interface InventoryListParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  vendorId?: string
  locationId?: string
  isActive?: 'true' | 'false'
  sortBy?: 'name' | 'createdAt' | 'updatedAt'
  sortOrder?: 'ASC' | 'DESC'
}
export interface InventoryList<T> {
  records: T[]
  pagination: { page: number; limit: number; totalItems: number; totalPages: number }
}
export interface InventoryPackageOptions {
  packageTypes: string[]
  stockUnits: string[]
  allowedUnitsByPackageType: Record<string, string[]>
}
export interface InventoryPayloads {
  categories: Pick<InventoryCategory, 'name' | 'description' | 'image' | 'isActive'> & {
    fieldDefinitions?: (Omit<InventoryFieldDefinition, 'id' | 'categoryId'> & { id?: string })[]
  }
  vendors: Pick<InventoryVendor, 'name' | 'contactPerson' | 'email' | 'phone' | 'address' | 'isActive' | 'locationIds'>
  items: Omit<InventoryItem, 'id' | 'vendorAssignments' | 'locationThresholds'>
}
