// ─── Enums ────────────────────────────────────────────────────────────────────

export type PropertyType = 'apartment' | 'villa' | 'duplex' | 'triplex'
export type AreaUnit = 'sqft' | 'sqmt' | 'acres'
export type UnitType = '1BHK' | '2BHK' | '3BHK' | '4BHK' | 'studio' | 'penthouse' | 'shop' | 'office'
export type UnitFacing = 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest'
export type UnitStatus = 'available' | 'booked' | 'sold' | 'on_hold'

// ─── Request / Form types ─────────────────────────────────────────────────────

export interface BHKVariantPosition {
  position: number
  direction?: string | null
  view_facing?: string | null
}

export interface BHKTemplateVariant {
  type: UnitType
  carpet_area: number
  super_built_up_area: number
  price?: number | null
  positions: BHKVariantPosition[]
}

export interface UnitInput {
  unit_number: string
  unit_type: UnitType
  position?: number | null
  direction?: string | null
  view_facing?: string | null
  is_sellable?: boolean
  carpet_area?: number | null
  built_up_area?: number | null
  super_built_up_area?: number | null
  area_unit?: AreaUnit | null
  facing?: UnitFacing | null
  price?: number | null
  price_per_sqft?: number | null
  status: UnitStatus
}

export interface FloorInput {
  floor_number: number
  floor_name?: string | null
  floor_type?: string | null
  is_sellable?: boolean
  description?: string | null
  units?: UnitInput[]
}

export interface BlockInput {
  block_name: string
  total_floors?: number | null
  units_per_floor?: number | null
  prefix?: string | null
  price_per_sqft?: number | null
  nomenclature_template?: string | null
  bhk_templates?: BHKTemplateVariant[] | null
  description?: string | null
  floors?: FloorInput[]
}

export interface CreatePropertyPayload {
  companyId: string
  property_name: string
  property_type: PropertyType
  description?: string | null
  street?: string | null
  city: string
  state: string
  pincode: string
  country?: string
  total_area?: number | null
  area_unit?: AreaUnit | null
  amenities?: string[] | null
  launch_date?: string | null
  blocks?: BlockInput[]
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface PropertyUnit {
  id: string
  floorId: string
  unit_number: string
  unit_type: UnitType
  carpet_area: number | null
  built_up_area: number | null
  super_built_up_area: number | null
  area_unit: AreaUnit | null
  facing: UnitFacing | null
  price: number | null
  price_per_sqft: number | null
  status: UnitStatus
  isActive: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface PropertyFloor {
  id: string
  blockId: string
  floor_number: number
  floor_name: string | null
  floor_type?: string | null
  is_sellable?: boolean
  description: string | null
  isActive: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  units?: PropertyUnit[]
}

export interface PropertyBlock {
  id: string
  propertyId: string
  block_name: string
  total_floors: number | null
  description: string | null
  isActive: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  floors?: PropertyFloor[]
}

export interface Property {
  id: string
  companyId: string
  property_name: string
  property_type: PropertyType
  description: string | null
  street: string | null
  city: string
  state: string
  pincode: string
  country: string
  total_area: number | null
  area_unit: AreaUnit | null
  amenities: string[] | null
  launch_date: string | null
  isActive: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  blocks?: PropertyBlock[]
}

// ─── Label maps ───────────────────────────────────────────────────────────────

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartment',
  villa: 'Villa',
  duplex: 'Duplex',
  triplex: 'Triplex',
}

export const UNIT_STATUS_COLORS: Record<UnitStatus, string> = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  booked: 'bg-blue-50 text-blue-700 border-blue-200',
  sold: 'bg-red-50 text-red-700 border-red-200',
  on_hold: 'bg-amber-50 text-amber-700 border-amber-200',
}
