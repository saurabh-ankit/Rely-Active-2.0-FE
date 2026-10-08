// ─── Enums ────────────────────────────────────────────────────────────────────

export type PropertyType = 'apartment' | 'villa' | 'duplex' | 'triplex'
/** Entities use the same kinds as properties. */
export type EntityType = PropertyType
export type StructureLevel = 'block' | 'floor' | 'unit'
export type LevelLabels = Partial<Record<StructureLevel, string>>
export type AreaUnit = 'sqft' | 'sqmt' | 'acres'
export type UnitType =
  | '1BHK'
  | '2BHK'
  | '3BHK'
  | '4BHK'
  | '5BHK'
  | 'studio'
  | 'penthouse'
  | 'shop'
  | 'office'
  | 'villa'
  | 'duplex'
  | 'triplex'
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
  id?: string
  unit_number: string
  /** Read-only: who lives here, as returned by GET /property/:id (not saved from the form). */
  residents?: Array<{ isDeleted?: boolean; status?: string | null }>
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
  /** Type-specific details, e.g. { plot_area, storeys }. */
  attributes?: Record<string, unknown> | null
}

export interface FloorInput {
  id?: string
  floor_number: number
  floor_name?: string | null
  floor_type?: string | null
  is_sellable?: boolean
  description?: string | null
  units?: UnitInput[]
}

export interface BlockInput {
  id?: string
  block_name: string
  total_floors?: number | null
  units_per_floor?: number | null
  prefix?: string | null
  price_per_sqft?: number | null
  nomenclature_template?: string | null
  bhk_templates?: BHKTemplateVariant[] | null
  description?: string | null
  floors?: FloorInput[]
  /** Used by block → unit entities (no floors). */
  units?: UnitInput[]
  // Villa / duplex / triplex groups: settings that generate `total_units` units.
  plot_area?: number | null
  carpet_area?: number | null
  /** e.g. "G+1" */
  configuration?: string | null
  asset_form?: string | null
  bhk_type?: UnitType | null
  total_units?: number | null
}

/**
 * One group of units inside a property. Its `levels` decide the nesting:
 * block→floor→unit uses `blocks[].floors[].units`, block→unit `blocks[].units`,
 * floor→unit `floors[].units`, and unit-only `units`.
 */
export interface EntityInput {
  id?: string | null
  entity_type: EntityType
  name: string
  levels: StructureLevel[]
  level_labels?: LevelLabels | null
  settings?: Record<string, unknown> | null
  sort_order?: number
  blocks?: BlockInput[]
  floors?: FloorInput[]
  units?: UnitInput[]
}

export interface CreatePropertyPayload {
  companyId: string
  property_name: string
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
  property_types?: PropertyType[]
  blocks?: BlockInput[]
  entities?: EntityInput[]
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
  occupancyStatus?: string | null
  attributes?: Record<string, unknown> | null
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
  /** Hidden floor of an entity that doesn't use floors. */
  is_virtual?: boolean
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
  entityId?: string | null
  /** Hidden block of an entity that doesn't use blocks. */
  is_virtual?: boolean
  block_name: string
  total_floors: number | null
  units_per_floor: number | null
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
  /** Every kind of entity the property contains, e.g. ['apartment', 'villa']. */
  property_types?: PropertyType[] | null
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
  entities?: EntityInput[]
}

/** One unit from GET /property/:id/unit-picker, with a readable label. */
export interface UnitOption {
  id: string
  unit_number: string
  unit_type: string
  occupancyStatus: string
  /** e.g. "Towers · Tower A · Floor 2 · A-21"; hidden levels are left out. */
  label: string
  entityId: string | null
  entityName: string
  blockId: string | null
  blockName: string | null
  floorId: string | null
  floorLabel: string | null
}

// ─── Label maps ───────────────────────────────────────────────────────────────

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Apartment',
  villa: 'Villa',
  duplex: 'Duplex',
  triplex: 'Triplex',
}

/** "Apartment · Villa" — every kind of entity the property contains. */
export const formatPropertyTypes = (property: Pick<Property, 'property_types'>) =>
  (property.property_types ?? []).map((t) => PROPERTY_TYPE_LABELS[t] ?? t).join(' · ')

export const UNIT_STATUS_COLORS: Record<UnitStatus, string> = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  booked: 'bg-blue-50 text-blue-700 border-blue-200',
  sold: 'bg-red-50 text-red-700 border-red-200',
  on_hold: 'bg-amber-50 text-amber-700 border-amber-200',
}
