/* eslint-disable react-refresh/only-export-components */
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import React, { useState } from 'react'
import { ArrowLeft, Building2, Home, Layers, Loader2, MapPin, Plus, Sparkles, Trash2, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AddEntityDialog } from './structure/AddEntityDialog'
import { EntityUnitsEditor } from './structure/EntityUnitsEditor'
import { ApplyToAllButton, BulkAddControl } from './structure/BlockCopyBar'
import { HomeEditor } from './structure/HomeEditor'
import {
  allUnitNumbers,
  countUnits,
  createEntity,
  ENTITY_PRESETS,
  ENTITY_TYPES,
  addBlocksLike,
  addHomesLike,
  applyHomeToAll,
  copyBlockSetup,
  homeErrors,
  isHomeEntity,
  isTowerEntity,
  readHome,
  writeHome,
  levelLabel,
  isUnitOccupied,
  listNumbers,
  floorNameFor,
  newTower,
  normalizeEntity,
  occupiedInBlock,
  occupiedInEntity,
} from './structure/entityPresets'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createPropertyAPI, getPropertyByIdAPI, updatePropertyAPI } from '@/lib/services/propertyService'
import { getAmenitiesAPI, type Amenity } from '@/lib/services/amenityService'
import { CommonProgressBar, type ProgressBarStep } from '@/components/common/CommonProgressBar'
import { notifyError } from '@/utils/toast'
import { useLocationContext } from '@/hooks/useLocation'
import { z } from 'zod'

export const PINCODE_REGEX = /^[1-9][0-9]{5}$/

export const propertyDetailsSchema = z.object({
  property_name: z.string().trim().min(1, 'Property name is required'),
  property_types: z
    .array(z.enum(['apartment', 'villa', 'duplex', 'triplex']))
    .min(1, 'Pick at least one property type'),
  description: z.string().optional(),
  total_area: z
    .string()
    .optional()
    .refine((val) => !val || val.trim() === '' || (!isNaN(Number(val)) && Number(val) > 0), {
      message: 'Total area must be a positive number',
    }),
  area_unit: z.enum(['sqft', 'sqmt', 'acres']),
  amenities: z.any().optional(),
})

export const propertyAddressSchema = z.object({
  street: z.string().optional(),
  city: z
    .string()
    .trim()
    .min(1, 'City is required')
    .regex(/^[a-zA-Z\s]+$/, 'City can only contain letters and spaces'),
  state: z
    .string()
    .trim()
    .min(1, 'State is required')
    .refine((val) => !/\d/.test(val), {
      message: 'State cannot contain digits',
    })
    .regex(/^[a-zA-Z\s]+$/, 'State can only contain letters and spaces'),
  pincode: z
    .string()
    .trim()
    .min(1, 'Pincode is required')
    .refine((val) => PINCODE_REGEX.test(val), {
      message: 'Pincode must be exactly 6 digits',
    }),
  country: z.string().default('India'),
})

export const fullPropertySchema = propertyDetailsSchema.merge(propertyAddressSchema)

export type PropertyDetailsFormValues = z.infer<typeof propertyDetailsSchema>
export type PropertyAddressFormValues = z.infer<typeof propertyAddressSchema>
export type FullPropertyFormValues = z.infer<typeof fullPropertySchema>
import type {
  AmenitySlotSettings,
  AreaUnit,
  BHKTemplateVariant,
  BlockInput,
  CreatePropertyPayload,
  EntityInput,
  FloorInput,
  PropertyType,
  UnitInput,
  UnitType,
} from '../types'

type PartialBHKVariant = Partial<BHKTemplateVariant>

// ─── Constants ────────────────────────────────────────────────────────────────
const AREA_UNITS: AreaUnit[] = ['sqft', 'sqmt', 'acres']
const AVAILABLE_BHK_TYPES: UnitType[] = ['1BHK', '2BHK', '3BHK', '4BHK', 'studio']
const DIRECTION_OPTIONS = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West']
const VIEW_FACING_OPTIONS = [
  'Garden View',
  'Road View',
  'Pool View',
  'City View',
  'Park View',
  'Clubhouse View',
  'Open View',
]
const FLOOR_TYPE_OPTIONS = ['GROUND_FLOOR', 'FLOOR', 'STILT', 'BASEMENT', 'PENTHOUSE']
const TIME_24_HOUR_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

interface SelectedAmenity {
  amenityId: string | null
  name: string
  slotBookable: boolean
  availableFrom?: string
  availableTo?: string
}

const toTimeMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map((part) => Number(part))
  return hours * 60 + minutes
}

const extractAmenitySlotSettings = (settings: unknown): AmenitySlotSettings | null => {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null
  const source = settings as Record<string, unknown>
  const availableFrom = typeof source.availableFrom === 'string' ? source.availableFrom.trim() : ''
  const availableTo = typeof source.availableTo === 'string' ? source.availableTo.trim() : ''
  const normalized: AmenitySlotSettings = {}

  if (TIME_24_HOUR_REGEX.test(availableFrom)) normalized.availableFrom = availableFrom
  if (TIME_24_HOUR_REGEX.test(availableTo)) normalized.availableTo = availableTo

  return normalized.availableFrom || normalized.availableTo ? normalized : null
}

// ─── Step progress config ───────────────────────────────────────────────────
const STEPS: ProgressBarStep[] = [
  { id: 1, count: 1, label: 'Property Details', icon: Building2, description: 'Basic property info' },
  { id: 2, count: 2, label: 'Address', icon: MapPin, description: 'Location & area' },
  { id: 3, count: 3, label: 'Structure Builder', icon: Layers, description: 'Entities & units' },
]

// ─── Pricing & BHK checks ────────────────────────────────────────────────────

/** Unit price = super built-up area × price per sqft, rounded to the rupee. */
const unitPrice = (sba?: number | null, pricePerSqft?: number | null) =>
  sba && pricePerSqft ? Math.round(sba * pricePerSqft) : null

/** "INR 60.00 L" (lakhs). */
const formatLakh = (amount: number | null) => `INR ${((amount ?? 0) / 100000).toFixed(2)} L`

const isPositive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0

/** Problems with a tower's pricing and BHK templates, e.g. "2BHK: Carpet area should be greater than 0." */
function towerErrors(block: BlockInput): string[] {
  const errors: string[] = []
  const pps = block.price_per_sqft
  if (pps !== null && pps !== undefined && (!Number.isFinite(pps) || pps < 0)) {
    errors.push('Price / sqft can’t be negative.')
  }
  for (const t of block.bhk_templates ?? []) {
    if (!isPositive(t.carpet_area)) errors.push(`${t.type}: Carpet area should be greater than 0.`)
    if (!isPositive(t.super_built_up_area)) errors.push(`${t.type}: Super built-up area should be greater than 0.`)
    if (isPositive(t.carpet_area) && isPositive(t.super_built_up_area) && t.carpet_area > t.super_built_up_area) {
      errors.push(`${t.type}: Carpet area can’t be more than the super built-up area.`)
    }
  }
  return errors
}

// ─── Input helpers ────────────────────────────────────────────────────────────
function InputField({
  label,
  required,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean; error?: string }) {
  const isReq = required || label.includes('*')
  const cleanLabel = label.replace(/\s*\*/g, '')

  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider block">
        {cleanLabel} {isReq && <span className="text-red-500 font-bold">*</span>}
      </Label>
      <Input
        {...props}
        className={`w-full rounded-xl border ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:border-[#005390] focus:ring-[#005390]/20'} bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 disabled:bg-gray-100 disabled:opacity-75`}
      />
      {error && <p className="mt-1 text-xs font-semibold text-red-500">{error}</p>}
    </div>
  )
}

function SelectField({
  label,
  required,
  error,
  value,
  onValueChange,
  placeholder,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  children: React.ReactNode
}) {
  const isReq = required || label.includes('*')
  const cleanLabel = label.replace(/\s*\*/g, '')

  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider block">
        {cleanLabel} {isReq && <span className="text-red-500 font-bold">*</span>}
      </Label>
      <Select value={value || undefined} onValueChange={(val) => onValueChange?.(val || '')}>
        <SelectTrigger
          className={`w-full h-auto rounded-xl border ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-gray-200 focus:border-[#005390] focus:ring-[#005390]/20'
          } bg-white px-3.5 py-2.5 text-xs text-gray-900 outline-none transition focus:ring-2 disabled:opacity-50`}
        >
          <SelectValue placeholder={placeholder || 'Select...'} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
      {error && <p className="mt-1 text-xs font-semibold text-red-500">{error}</p>}
    </div>
  )
}

function TextareaField({
  label,
  required,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; required?: boolean; error?: string }) {
  const isReq = required || label.includes('*')
  const cleanLabel = label.replace(/\s*\*/g, '')

  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider block">
        {cleanLabel} {isReq && <span className="text-red-500 font-bold">*</span>}
      </Label>
      <Textarea
        {...props}
        rows={3}
        className={`w-full rounded-xl border ${error ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20' : 'border-gray-200 focus-visible:border-[#005390] focus-visible:ring-[#005390]/20'} bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none transition focus-visible:ring-2 resize-none`}
      />
      {error && <p className="mt-1 text-xs font-semibold text-red-500">{error}</p>}
    </div>
  )
}

// ─── Main Full-Screen Component ───────────────────────────────────────────────
interface CreatePropertyScreenProps {
  companyId: string
  editPropertyId?: string | null
  onBack: () => void
  onSuccess: () => void
}

export default function CreatePropertyScreen({
  companyId,
  editPropertyId,
  onBack,
  onSuccess,
}: CreatePropertyScreenProps) {
  const { refreshLocations } = useLocationContext()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 – Property details
  const [propertyName, setPropertyName] = useState('')
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>(['apartment'])
  const [description, setDescription] = useState('')
  const [totalArea, setTotalArea] = useState('')
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('sqft')
  const [selectedAmenities, setSelectedAmenities] = useState<SelectedAmenity[]>([])
  const [amenityCatalog, setAmenityCatalog] = useState<Amenity[]>([])
  const [amenitySearch, setAmenitySearch] = useState('')

  // Step 2 – Address
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [country, setCountry] = useState('India')

  // Step 3 – Structure Builder: entities (towers, villas, shops…), each with its own levels
  const [entities, setEntities] = useState<EntityInput[]>(() => [createEntity('apartment')])
  const [activeEntityIndex, setActiveEntityIndex] = useState(0)
  const [addEntityOpen, setAddEntityOpen] = useState(false)
  const activeEntity = entities[activeEntityIndex] ?? entities[0]!
  const updateEntity = (index: number, next: EntityInput) =>
    setEntities((prev) => prev.map((e, i) => (i === index ? next : e)))

  // The tower editor below works on the selected entity's towers.
  const blocks = activeEntity.blocks ?? []
  const setBlocks = (next: BlockInput[] | ((prev: BlockInput[]) => BlockInput[])) =>
    setEntities((prev) =>
      prev.map((e, i) =>
        i === activeEntityIndex ? { ...e, blocks: typeof next === 'function' ? next(e.blocks ?? []) : next } : e,
      ),
    )
  const [activeBlockIndex, setActiveBlockIndex] = useState(0)
  const [expandedAssignVariantIndex, setExpandedAssignVariantIndex] = useState<number | null>(null)
  const [previewGenerated, setPreviewGenerated] = useState(false)

  React.useEffect(() => {
    let mounted = true
    getAmenitiesAPI({ isActive: true })
      .then((list) => {
        if (!mounted) return
        setAmenityCatalog(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (mounted) setAmenityCatalog([])
      })
    return () => {
      mounted = false
    }
  }, [])

  // Fetch property details if editing
  React.useEffect(() => {
    if (!editPropertyId) return
    getPropertyByIdAPI(editPropertyId)
      .then((p) => {
        if (p) {
          const amenitiesByName = new Map(amenityCatalog.map((amenity) => [amenity.name.trim().toLowerCase(), amenity]))
          setPropertyName(p.property_name || '')
          setPropertyTypes(p.property_types?.length ? p.property_types : ['apartment'])
          setDescription(p.description || '')
          setStreet(p.street || '')
          setCity(p.city || '')
          setState(p.state || '')
          setPincode(p.pincode || '')
          setCountry(p.country || 'India')
          setTotalArea(p.total_area ? String(p.total_area) : '')
          setAreaUnit(p.area_unit || 'sqft')
          if (p.propertyAmenities?.length) {
            setSelectedAmenities(
              p.propertyAmenities.map((item) => {
                const slotSettings = extractAmenitySlotSettings(item.settings)
                return {
                  amenityId: item.amenityId,
                  name: item.name,
                  slotBookable: item.slotBookable,
                  availableFrom: slotSettings?.availableFrom || '',
                  availableTo: slotSettings?.availableTo || '',
                }
              }),
            )
          } else {
            setSelectedAmenities(
              (p.amenities || []).map((name) => {
                const catalogItem = amenitiesByName.get(name.trim().toLowerCase())
                return {
                  amenityId: catalogItem?.id || null,
                  name,
                  slotBookable: false,
                  availableFrom: '',
                  availableTo: '',
                }
              }),
            )
          }
          if (p.entities && p.entities.length > 0) {
            setEntities(p.entities.map(normalizeEntity))
            setActiveEntityIndex(0)
            setActiveBlockIndex(0)
            setPreviewGenerated(true)
          }
        }
      })
      .catch(() => {})
  }, [editPropertyId, amenityCatalog])

  const unitNumberCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const n of allUnitNumbers(entities)) {
      const key = n.trim().toLowerCase()
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [entities])

  const activeBlock = (blocks[activeBlockIndex] || blocks[0] || newTower(0)) as BlockInput

  const updateActiveBlock = (updated: Partial<BlockInput>) => {
    setBlocks((prev) => {
      const next = [...prev]
      next[activeBlockIndex] = { ...next[activeBlockIndex], ...updated }
      return next
    })
  }

  // ── Towers: apply to all & bulk add ──
  // activeBlockIndex is the selected tower, or the selected home for villa/duplex/triplex entities.
  const blockWord = levelLabel(activeEntity, 'block')
  const copyCandidates = blocks
    .map((b, i) => ({ index: i, name: b.block_name }))
    .filter((c) => c.index !== activeBlockIndex)

  /** Copies the active tower's setup into every other tower in the entity. */
  const applySetupToAll = () => {
    const source = blocks[activeBlockIndex]
    if (!source) return
    if (
      !window.confirm(
        `Copy ${source.block_name}'s setup into all ${copyCandidates.length} other ${blockWord.toLowerCase()}s? Their current setup will be replaced.`,
      )
    ) {
      return
    }
    setBlocks((prev) => prev.map((b, i) => (i === activeBlockIndex ? b : copyBlockSetup(source, b))))
    setPreviewGenerated(false)
  }

  /** Bulk-adds `count` towers set up like the active one, then selects the first new one. */
  const addBlocksLikeActive = (count: number) => {
    const firstNew = blocks.length
    setBlocks(addBlocksLike({ ...activeEntity, blocks }, activeBlockIndex, count))
    setActiveBlockIndex(firstNew)
  }

  // ── Homes (villa / duplex / triplex): a flat list, each edited on its own ──
  const homes = activeEntity.units ?? []
  const homeWord = levelLabel(activeEntity, 'unit')
  const setHomes = (next: typeof homes) => updateEntity(activeEntityIndex, { ...activeEntity, units: next })

  /** Adds `count` homes with the selected home's details and the next free numbers (V-04, V-05…). */
  const addHomes = (count: number) => {
    const firstNew = homes.length
    setHomes(addHomesLike(activeEntity, activeBlockIndex, count, allUnitNumbers(entities)))
    setActiveBlockIndex(firstNew)
  }

  const removeHome = (index: number) => {
    const home = homes[index]
    if (homes.length <= 1 || !home) return
    if (isUnitOccupied(home)) {
      notifyError(`Can't delete ${home.unit_number}`, 'A resident lives here. Move them out first.')
      return
    }
    if (!window.confirm(`Delete ${home.unit_number || `this ${homeWord.toLowerCase()}`}?`)) return
    setHomes(homes.filter((_, i) => i !== index))
    setActiveBlockIndex((current) =>
      index < current ? current - 1 : index === current ? Math.max(0, index - 1) : current,
    )
  }

  /** Every other home gets the selected home's details (numbers stay their own). */
  const applyHomeDetailsToAll = () => {
    const source = homes[activeBlockIndex]
    if (!source) return
    if (
      !window.confirm(
        `Copy ${source.unit_number}'s details into all ${homes.length - 1} other ${homeWord.toLowerCase()}s? Their current details will be replaced.`,
      )
    ) {
      return
    }
    setHomes(applyHomeToAll(activeEntity, activeBlockIndex))
  }

  // Shown at the bottom of the form, once its details are filled in.
  const applyAllButton = isHomeEntity(activeEntity) ? (
    homes.length > 1 ? (
      <ApplyToAllButton label={homeWord} onApply={applyHomeDetailsToAll} />
    ) : null
  ) : copyCandidates.length > 0 ? (
    <ApplyToAllButton label={blockWord} onApply={applySetupToAll} />
  ) : null

  const selectEntity = (index: number) => {
    setActiveEntityIndex(index)
    setActiveBlockIndex(0)
  }

  const addEntity = (entity: EntityInput) => {
    setEntities((prev) => [...prev, entity])
    selectEntity(entities.length)
    if (!propertyTypes.includes(entity.entity_type)) setPropertyTypes((prev) => [...prev, entity.entity_type])
  }

  const removeEntity = (index: number) => {
    if (entities.length <= 1) return
    const entity = entities[index]
    const occupied = entity ? occupiedInEntity(entity) : []
    if (entity && occupied.length) {
      notifyError(`Can't remove ${entity.name}`, `Residents live in ${listNumbers(occupied)}. Move them out first.`)
      return
    }
    if (entity && !window.confirm(`Remove "${entity.name}" and all its units?`)) return
    setEntities((prev) => prev.filter((_, i) => i !== index))
    selectEntity(Math.max(0, index - 1))
  }

  /** Step 1 types decide the starting entities: add one for each newly picked type. */
  const syncEntitiesWithTypes = () => {
    setEntities((prev) => {
      // On a new property, drop untouched starter entities whose type was unticked.
      const kept = editPropertyId ? prev : prev.filter((e) => e.id || propertyTypes.includes(e.entity_type))
      const missing = propertyTypes.filter((t) => !kept.some((e) => e.entity_type === t))
      const next = [...kept, ...missing.map((t) => createEntity(t))]
      return next.length ? next : [createEntity(propertyTypes[0] ?? 'apartment')]
    })
    selectEntity(0)
  }

  const removeBlock = (index: number) => {
    const block = blocks[index]
    if (blocks.length <= 1 || !block) return
    const occupied = occupiedInBlock(block)
    if (occupied.length) {
      notifyError(
        `Can't delete ${block.block_name}`,
        `Residents live in ${listNumbers(occupied)}. Move them out first.`,
      )
      return
    }
    const word = levelLabel(activeEntity, 'block').toLowerCase()
    if (!window.confirm(`Delete ${block.block_name || `this ${word}`} and all its units?`)) return
    setBlocks(blocks.filter((_, i) => i !== index))
    // Keep the same tower selected when one above it is deleted.
    setActiveBlockIndex((current) =>
      index < current ? current - 1 : index === current ? Math.max(0, index - 1) : current,
    )
    setPreviewGenerated(false)
  }

  // BHK template management
  const addBHKTemplateVariant = (type: UnitType) => {
    const currentTemplates = activeBlock.bhk_templates || []
    const unitsPerFloor = activeBlock.units_per_floor || 3

    if (currentTemplates.length >= unitsPerFloor) {
      notifyError(
        `Limit Reached (${unitsPerFloor} / ${unitsPerFloor})`,
        `Tower "${activeBlock.block_name}" allows a maximum of ${unitsPerFloor} unit positions per floor.`,
      )
      return
    }

    const takenPositions = currentTemplates.flatMap((t) => (t.positions ? t.positions.map((p) => p.position) : []))
    const available = Array.from({ length: unitsPerFloor }, (_, i) => i + 1).filter((p) => !takenPositions.includes(p))

    if (available.length === 0) {
      notifyError(`All ${unitsPerFloor} unit positions are already assigned for this floor.`)
      return
    }

    const nextPosition = available[0]

    const newVariant: BHKTemplateVariant = {
      type,
      carpet_area: 1200,
      super_built_up_area: 1200,
      positions: [{ position: nextPosition, direction: 'North-East', view_facing: 'Garden View' }],
    }
    updateActiveBlock({ bhk_templates: [...currentTemplates, newVariant] })
  }

  const updateBHKTemplateVariant = (vIndex: number, updated: PartialBHKVariant) => {
    const currentTemplates = [...(activeBlock.bhk_templates || [])]
    if (currentTemplates[vIndex]) {
      currentTemplates[vIndex] = { ...currentTemplates[vIndex], ...updated }
      updateActiveBlock({ bhk_templates: currentTemplates })
    }
  }

  const removeBHKTemplateVariant = (vIndex: number) => {
    const currentTemplates = (activeBlock.bhk_templates || []).filter((_, i) => i !== vIndex)
    updateActiveBlock({ bhk_templates: currentTemplates })
  }

  // Generate full floors and units preview
  const generatePreview = () => {
    const totalFloors = activeBlock.total_floors || 3
    const unitsPerFloor = activeBlock.units_per_floor || 3
    const prefix = activeBlock.prefix || 'A'
    const bhkTemplates = activeBlock.bhk_templates || []
    const template = activeBlock.nomenclature_template || null
    const currentFloors = activeBlock.floors || []

    const generatedFloors: FloorInput[] = []

    for (let f = 1; f <= totalFloors; f++) {
      const isGround = f === 1
      const existingFloor = currentFloors.find((fl) => fl.floor_number === f)
      const floorType = existingFloor?.floor_type || (isGround ? 'GROUND_FLOOR' : 'FLOOR')
      const isSellable = existingFloor?.is_sellable !== undefined ? Boolean(existingFloor.is_sellable) : true
      const existingUnits = existingFloor?.units || []

      const floorUnits: UnitInput[] = []
      if (isSellable && unitsPerFloor > 0) {
        for (let p = 1; p <= unitsPerFloor; p++) {
          const existingUnit = existingUnits.find((u) => u.position === p)
          const assignedBHK = bhkTemplates.find((t) => t.positions.some((pos) => pos.position === p))
          const unitType = assignedBHK ? assignedBHK.type : existingUnit?.unit_type || '2BHK'
          const carpetArea = assignedBHK ? assignedBHK.carpet_area : existingUnit?.carpet_area || 1200
          const sbaArea = assignedBHK ? assignedBHK.super_built_up_area : existingUnit?.super_built_up_area || 1200
          const posObj = assignedBHK?.positions.find((pos) => pos.position === p)
          const direction = posObj?.direction || existingUnit?.direction || 'North-East'
          const viewFacing = posObj?.view_facing || existingUnit?.view_facing || 'Garden View'

          let unitNum = `${prefix}-${f}${p}`
          if (template) {
            unitNum = template
              .replace(/\{\{TowerPrefix\}\}/g, prefix)
              .replace(/\{\{FloorNumber\}\}/g, String(f))
              .replace(/\{\{Position\}\}/g, String(p))
          }

          floorUnits.push({
            id: existingUnit?.id,
            unit_number: existingUnit?.unit_number || unitNum,
            unit_type: unitType,
            position: p,
            direction,
            view_facing: viewFacing,
            is_sellable: true,
            carpet_area: carpetArea,
            built_up_area: sbaArea,
            super_built_up_area: sbaArea,
            price_per_sqft: activeBlock.price_per_sqft ?? null,
            price: unitPrice(sbaArea, activeBlock.price_per_sqft),
            status: existingUnit?.status || 'available',
          })
        }
      }

      generatedFloors.push({
        id: existingFloor?.id,
        floor_number: f,
        floor_name: floorNameFor(f, floorType, existingFloor?.floor_name),
        floor_type: floorType,
        is_sellable: isSellable,
        units: floorUnits,
      })
    }

    updateActiveBlock({ floors: generatedFloors })
    setPreviewGenerated(true)
  }

  const toggleAmenity = (amenity: Amenity) => {
    setSelectedAmenities((prev) => {
      const existingById = prev.find((item) => item.amenityId === amenity.id)
      if (existingById) {
        return prev.filter((item) => item.amenityId !== amenity.id)
      }
      const byNameIndex = prev.findIndex((item) => item.name.trim().toLowerCase() === amenity.name.trim().toLowerCase())
      if (byNameIndex >= 0) {
        const next = [...prev]
        const current = next[byNameIndex]
        if (!current) return prev
        next[byNameIndex] = {
          amenityId: amenity.id,
          name: amenity.name,
          slotBookable: current.slotBookable,
          availableFrom: current.availableFrom || '',
          availableTo: current.availableTo || '',
        }
        return next
      }
      return [
        ...prev,
        {
          amenityId: amenity.id,
          name: amenity.name,
          slotBookable: false,
          availableFrom: '',
          availableTo: '',
        },
      ]
    })
  }

  const removeAmenity = (amenity: SelectedAmenity) => {
    setSelectedAmenities((prev) =>
      prev.filter((item) =>
        amenity.amenityId
          ? item.amenityId !== amenity.amenityId
          : item.name.trim().toLowerCase() !== amenity.name.trim().toLowerCase(),
      ),
    )
  }

  const toggleAmenitySlotBookable = (amenity: SelectedAmenity) => {
    setSelectedAmenities((prev) =>
      prev.map((item) => {
        const same = amenity.amenityId
          ? item.amenityId === amenity.amenityId
          : item.name.trim().toLowerCase() === amenity.name.trim().toLowerCase()
        return same ? { ...item, slotBookable: !item.slotBookable } : item
      }),
    )
  }

  const updateAmenityAvailability = (
    amenity: SelectedAmenity,
    field: 'availableFrom' | 'availableTo',
    value: string,
  ) => {
    setSelectedAmenities((prev) =>
      prev.map((item) => {
        const same = amenity.amenityId
          ? item.amenityId === amenity.amenityId
          : item.name.trim().toLowerCase() === amenity.name.trim().toLowerCase()
        return same ? { ...item, [field]: value } : item
      }),
    )
  }

  const validateStep = (): boolean => {
    if (step === 1) {
      for (const amenity of selectedAmenities) {
        const from = (amenity.availableFrom || '').trim()
        const to = (amenity.availableTo || '').trim()
        if (!from && !to) continue

        if (!from || !to) {
          setError(`${amenity.name}: set both Available From and Available To, or leave both empty`)
          return false
        }

        if (!TIME_24_HOUR_REGEX.test(from) || !TIME_24_HOUR_REGEX.test(to)) {
          setError(`${amenity.name}: time must be in HH:mm format`)
          return false
        }

        if (toTimeMinutes(from) >= toTimeMinutes(to)) {
          setError(`${amenity.name}: Available To must be later than Available From`)
          return false
        }
      }

      const res = propertyDetailsSchema.safeParse({
        property_name: propertyName,
        property_types: propertyTypes,
        description,
        total_area: totalArea,
        area_unit: areaUnit,
        amenities: selectedAmenities,
      })
      if (!res.success) {
        setError(res.error.issues[0]?.message || 'Invalid property details')
        return false
      }
    } else if (step === 2) {
      const res = propertyAddressSchema.safeParse({
        street,
        city,
        state,
        pincode,
        country,
      })
      if (!res.success) {
        setError(res.error.issues[0]?.message || 'Invalid property address')
        return false
      }
    } else if (step === 3) {
      for (const entity of entities) {
        if (!entity.name.trim()) {
          setError('Every entity needs a name')
          return false
        }
        const blockName = levelLabel(entity, 'block')
        for (const [i, b] of (entity.blocks ?? []).entries()) {
          if (!b.block_name.trim()) {
            setError(`${entity.name}: ${blockName} #${i + 1} needs a name`)
            return false
          }
          if (isTowerEntity(entity) && b.total_floors && b.total_floors <= 0) {
            setError(`${entity.name}: ${b.block_name} total floors must be greater than 0`)
            return false
          }
          const problems = isTowerEntity(entity) ? towerErrors(b) : []
          if (problems.length) {
            setError(`${entity.name} · ${b.block_name}: ${problems[0]}`)
            return false
          }
        }
        if (isHomeEntity(entity)) {
          for (const unit of entity.units ?? []) {
            const problem = homeErrors(entity, unit)[0]
            if (problem) {
              setError(`${entity.name}: ${problem}`)
              return false
            }
          }
        }
        if (allUnitNumbers([entity]).some((n) => !n.trim())) {
          setError(`${entity.name}: every ${levelLabel(entity, 'unit').toLowerCase()} needs a number`)
          return false
        }
      }
    }
    setError(null)
    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    if (step === 1) syncEntitiesWithTypes()
    setStep((s) => s + 1)
  }

  const handleSubmit = async () => {
    if (!validateStep()) return
    setError(null)
    setIsSubmitting(true)
    try {
      const buildTowerBlocks = (towerBlocks: BlockInput[]) =>
        towerBlocks.map((b) => {
          const totalFloors = b.total_floors || 3
          const unitsPerFloor = b.units_per_floor || 3
          const prefix = b.prefix || 'A'
          const bhkTemplates = b.bhk_templates || []
          const template = b.nomenclature_template || null
          const currentFloors = b.floors || []

          const generatedFloors: FloorInput[] = []

          for (let f = 1; f <= totalFloors; f++) {
            const isGround = f === 1
            const existingFloor = currentFloors.find((fl) => fl.floor_number === f)
            const floorType = existingFloor?.floor_type || (isGround ? 'GROUND_FLOOR' : 'FLOOR')
            const isSellable = existingFloor?.is_sellable !== undefined ? Boolean(existingFloor.is_sellable) : true
            const existingUnits = existingFloor?.units || []

            const floorUnits: UnitInput[] = []
            if (isSellable && unitsPerFloor > 0) {
              for (let p = 1; p <= unitsPerFloor; p++) {
                const existingUnit = existingUnits.find((u) => u.position === p)
                const assignedBHK = bhkTemplates.find((t) => t.positions.some((pos) => pos.position === p))
                const unitType = assignedBHK ? assignedBHK.type : existingUnit?.unit_type || '2BHK'
                const carpetArea = assignedBHK ? assignedBHK.carpet_area : existingUnit?.carpet_area || 1200
                const sbaArea = assignedBHK
                  ? assignedBHK.super_built_up_area
                  : existingUnit?.super_built_up_area || 1200
                const posObj = assignedBHK?.positions.find((pos) => pos.position === p)
                const direction = posObj?.direction || existingUnit?.direction || 'North-East'
                const viewFacing = posObj?.view_facing || existingUnit?.view_facing || 'Garden View'

                let unitNum = `${prefix}-${f}${p}`
                if (template) {
                  unitNum = template
                    .replace(/\{\{TowerPrefix\}\}/g, prefix)
                    .replace(/\{\{FloorNumber\}\}/g, String(f))
                    .replace(/\{\{Position\}\}/g, String(p))
                }

                floorUnits.push({
                  id: existingUnit?.id,
                  unit_number: existingUnit?.unit_number || unitNum,
                  unit_type: unitType,
                  position: p,
                  direction,
                  view_facing: viewFacing,
                  is_sellable: true,
                  carpet_area: carpetArea,
                  built_up_area: sbaArea,
                  super_built_up_area: sbaArea,
                  price_per_sqft: b.price_per_sqft ?? null,
                  price: unitPrice(sbaArea, b.price_per_sqft),
                  status: existingUnit?.status || 'available',
                })
              }
            }

            generatedFloors.push({
              id: existingFloor?.id,
              floor_number: f,
              floor_name: floorNameFor(f, floorType, existingFloor?.floor_name),
              floor_type: floorType,
              is_sellable: isSellable,
              units: floorUnits,
            })
          }

          return {
            ...b,
            bhk_templates: bhkTemplates.map((t) => ({
              ...t,
              price: unitPrice(t.super_built_up_area, b.price_per_sqft),
            })),
            floors: generatedFloors,
          }
        })

      const entitiesPayload: EntityInput[] = entities.map((entity, index) => ({
        ...entity,
        name: entity.name.trim(),
        sort_order: index,
        ...(isTowerEntity(entity) ? { blocks: buildTowerBlocks(entity.blocks ?? []) } : {}),
        ...(isHomeEntity(entity) ? { units: (entity.units ?? []).map((u) => writeHome(entity, u, readHome(u))) } : {}),
      }))

      // Unit numbers identify flats, so they must be unique across every entity.
      const numbers = allUnitNumbers(entitiesPayload).map((n) => n.trim().toLowerCase())
      const duplicate = numbers.find((n, i) => numbers.indexOf(n) !== i)
      if (duplicate) {
        setError(`Unit number "${duplicate.toUpperCase()}" is used more than once. Each unit needs its own number.`)
        setIsSubmitting(false)
        return
      }

      const payload: CreatePropertyPayload = {
        companyId,
        property_name: propertyName.trim(),
        property_types: propertyTypes,
        description: description || null,
        street: street || null,
        city,
        state,
        pincode,
        country: country || 'India',
        total_area: totalArea ? Number(totalArea) : null,
        area_unit: areaUnit,
        amenities: selectedAmenities.length > 0 ? selectedAmenities.map((item) => item.name) : null,
        ...(selectedAmenities.length === 0 || selectedAmenities.some((item) => !!item.amenityId)
          ? {
              propertyAmenities: selectedAmenities
                .filter((item) => !!item.amenityId)
                .map((item) => {
                  const availableFrom = (item.availableFrom || '').trim()
                  const availableTo = (item.availableTo || '').trim()
                  const hasWindow =
                    TIME_24_HOUR_REGEX.test(availableFrom) &&
                    TIME_24_HOUR_REGEX.test(availableTo) &&
                    toTimeMinutes(availableFrom) < toTimeMinutes(availableTo)

                  return {
                    amenityId: item.amenityId as string,
                    slotBookable: item.slotBookable,
                    settings: hasWindow
                      ? {
                          availableFrom,
                          availableTo,
                        }
                      : null,
                  }
                }),
            }
          : {}),
        entities: entitiesPayload,
      }

      if (editPropertyId) {
        await updatePropertyAPI(editPropertyId, payload)
        await refreshLocations(editPropertyId)
      } else {
        const created = await createPropertyAPI(payload)
        await refreshLocations(created?.id)
      }
      onSuccess()
      onBack()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedAmenityIds = new Set(selectedAmenities.map((item) => item.amenityId).filter((id): id is string => !!id))
  const filteredAmenityCatalog = amenityCatalog
    .filter((item) => {
      const term = amenitySearch.trim().toLowerCase()
      if (!term) return true
      return item.name.toLowerCase().includes(term) || (item.description || '').toLowerCase().includes(term)
    })
    .slice(0, 120)

  return (
    <div className="space-y-6">
      {/* Header Bar with Back Button */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="rounded-xl border-gray-200 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {editPropertyId ? 'Edit Property' : 'Create New Property'}
            </h1>
            <p className="text-xs text-gray-500">Configure property details, location, and structure</p>
          </div>
        </div>
      </div>

      {/* Main Screen Container */}
      <Card className="gap-0 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
        <CommonProgressBar steps={STEPS} currentStep={step} onStepClick={(sId) => setStep(sId)} className="mb-6" />

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Step 1: Property Details */}
        {step === 1 && (
          <div className="space-y-5 w-full py-2">
            <InputField
              label="Property / Project Name"
              required
              placeholder="e.g. Green Valley Residency"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
            />

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                What does this property contain? <span className="text-red-500">*</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Pick every kind that applies. Each one becomes an entity you set up in the Structure Builder.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {ENTITY_TYPES.map((t) => {
                  const isSelected = propertyTypes.includes(t)
                  const Icon = ENTITY_PRESETS[t].icon
                  return (
                    <Button
                      type="button"
                      variant="ghost"
                      key={t}
                      aria-pressed={isSelected}
                      onClick={() =>
                        setPropertyTypes((prev) => (isSelected ? prev.filter((x) => x !== t) : [...prev, t]))
                      }
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold px-4 py-2 border transition-all h-auto',
                        isSelected
                          ? 'bg-[#005390] border-[#005390] text-white shadow-sm hover:bg-[#005390] hover:text-white'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-[#005390]/40 hover:bg-[#005390]/10',
                      )}
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5 text-gray-400" />}
                      {ENTITY_PRESETS[t].label}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Total Area"
                type="number"
                placeholder="e.g. 5000"
                value={totalArea}
                onChange={(e) => setTotalArea(e.target.value)}
              />
              <SelectField label="Area Unit" value={areaUnit} onValueChange={(val) => setAreaUnit(val as AreaUnit)}>
                {AREA_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectField>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                Amenities Catalog
              </div>
              <p className="text-[11px] text-gray-500">
                Pick amenities from global settings, choose slot-bookable if needed, and set optional availability
                timings for each amenity.
              </p>

              {selectedAmenities.length > 0 && (
                <div className="space-y-2 rounded-xl border border-[#005390]/20 bg-[#005390]/10 p-3">
                  {selectedAmenities.map((amenity) => {
                    const amenityKey = `${amenity.amenityId || 'legacy'}-${amenity.name}`
                    const inputIdBase = amenityKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                    const availableFromId = `${inputIdBase}-available-from`
                    const availableToId = `${inputIdBase}-available-to`

                    return (
                      <div key={amenityKey} className="rounded-xl border border-[#005390]/15 bg-white/80 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#005390] text-white text-xs font-medium px-3 py-1 shadow-sm">
                            {amenity.name}
                            {amenity.amenityId ? null : <span className="text-[10px] text-white/75">Legacy</span>}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAmenitySlotBookable(amenity)}
                              className={cn(
                                'rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors h-auto',
                                amenity.slotBookable
                                  ? 'border-[#005390]/30 bg-[#005390]/10 text-[#005390]'
                                  : 'border-gray-300 bg-white text-gray-600',
                              )}
                            >
                              {amenity.slotBookable ? 'Slot-bookable' : 'Non-slot'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Remove ${amenity.name}`}
                              onClick={() => removeAmenity(amenity)}
                              className="hover:bg-[#004274] bg-[#005390] text-white rounded-full p-1 h-6 w-6"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <Label
                              htmlFor={availableFromId}
                              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-600"
                            >
                              Available From (Optional)
                            </Label>
                            <Input
                              id={availableFromId}
                              type="time"
                              value={amenity.availableFrom || ''}
                              onChange={(event) =>
                                updateAmenityAvailability(amenity, 'availableFrom', event.target.value)
                              }
                              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20"
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor={availableToId}
                              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gray-600"
                            >
                              Available To (Optional)
                            </Label>
                            <Input
                              id={availableToId}
                              type="time"
                              value={amenity.availableTo || ''}
                              onChange={(event) =>
                                updateAmenityAvailability(amenity, 'availableTo', event.target.value)
                              }
                              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <Input
                type="text"
                placeholder="Search amenities by name or description"
                value={amenitySearch}
                onChange={(e) => setAmenitySearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20"
              />

              <div className="flex flex-wrap gap-2 pt-1 max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2">
                {filteredAmenityCatalog.length === 0 ? (
                  <p className="px-2 py-1 text-[11px] text-gray-500">
                    No amenities found. Create one in Global Settings.
                  </p>
                ) : (
                  filteredAmenityCatalog.map((item) => {
                    const isSelected = selectedAmenityIds.has(item.id)
                    return (
                      <Button
                        type="button"
                        variant="ghost"
                        key={item.id}
                        onClick={() => toggleAmenity(item)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-xl text-xs font-medium px-3.5 py-2 border transition-all h-auto',
                          isSelected
                            ? 'bg-[#005390]/10 border-[#005390]/30 text-[#005390] font-semibold shadow-xs hover:bg-[#005390]/15 hover:text-[#005390]'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-[#005390]/30 hover:bg-[#005390]/10',
                        )}
                      >
                        {isSelected ? (
                          <Check className="h-3.5 w-3.5 text-[#005390]" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 text-gray-400" />
                        )}
                        {item.name}
                      </Button>
                    )
                  })
                )}
              </div>
            </div>

            <TextareaField
              label="Description"
              placeholder="Brief description of the property project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        )}

        {/* Step 2: Address */}
        {step === 2 && (
          <div className="space-y-4 w-full py-2">
            <InputField
              label="Street Address"
              placeholder="e.g. 12, MG Road, Near Central Park"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <InputField
                label="City"
                required
                placeholder="e.g. Pune"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <InputField
                label="State"
                required
                placeholder="e.g. Maharashtra"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
              <InputField
                label="Pincode"
                required
                placeholder="e.g. 411001"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />
              <InputField label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 3: Structure Builder */}
        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[560px]">
            {/* Left: entity tree */}
            <div className="md:col-span-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Property Structure</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddEntityOpen(true)}
                  className="h-8 px-2.5 text-[11px] font-semibold rounded-lg border-gray-300 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Entity
                </Button>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
                {entities.map((entity, eIdx) => {
                  const isActive = eIdx === activeEntityIndex
                  const Icon = ENTITY_PRESETS[entity.entity_type].icon
                  const tower = isTowerEntity(entity)
                  const homeList = isHomeEntity(entity)
                  // Towers and homes are picked one at a time in the editor.
                  const selectable = tower || homeList
                  const children = entity.blocks ?? entity.floors ?? []
                  return (
                    <div key={entity.id ?? `new-${eIdx}`} className="space-y-1">
                      <div className="group/entity flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => selectEntity(eIdx)}
                          className={cn(
                            'min-w-0 flex-1 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer h-auto',
                            isActive
                              ? 'bg-blue-50 border border-blue-200 text-blue-700 shadow-xs hover:bg-blue-50 hover:text-blue-700'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100',
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0 text-blue-600" />
                            <span className="truncate">{entity.name || 'Untitled'}</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-white border border-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5">
                            {countUnits(entity)} {levelLabel(entity, 'unit').toLowerCase()}
                            {countUnits(entity) === 1 ? '' : 's'}
                          </span>
                        </Button>
                        {entities.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Delete ${entity.name}`}
                            title={
                              occupiedInEntity(entity).length
                                ? `Residents live in ${entity.name}, so it can't be removed`
                                : `Delete ${entity.name}`
                            }
                            disabled={occupiedInEntity(entity).length > 0}
                            onClick={() => removeEntity(eIdx)}
                            className="shrink-0 cursor-pointer rounded-lg p-1.5 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover/entity:opacity-100 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-300 h-auto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {isActive && homeList && (
                        <div className="pl-3 space-y-0.5 border-l-2 border-blue-100 ml-3 py-1">
                          <ul className="max-h-72 space-y-0.5 overflow-y-auto">
                            {(entity.units ?? []).map((unit, uIdx) => (
                              <li key={unit.id ?? `h-${uIdx}`} className="group/block flex items-center gap-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => setActiveBlockIndex(uIdx)}
                                  className={cn(
                                    'flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-[11px] hover:bg-white h-auto font-normal',
                                    uIdx === activeBlockIndex
                                      ? 'bg-white font-semibold text-blue-700 shadow-xs'
                                      : 'text-gray-600',
                                  )}
                                >
                                  <span className="flex min-w-0 items-center gap-1.5">
                                    <Home className="h-3 w-3 shrink-0 text-gray-400" />
                                    <span className="truncate">{unit.unit_number || 'New'}</span>
                                  </span>
                                  <span className="shrink-0 text-[10px] font-semibold text-gray-400">
                                    {unit.unit_type}
                                  </span>
                                </Button>
                                {(entity.units?.length ?? 0) > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={`Delete ${unit.unit_number}`}
                                    title={
                                      isUnitOccupied(unit)
                                        ? 'A resident lives here, so it can’t be deleted'
                                        : `Delete ${unit.unit_number}`
                                    }
                                    disabled={isUnitOccupied(unit)}
                                    onClick={() => removeHome(uIdx)}
                                    className="shrink-0 cursor-pointer rounded-md p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover/block:opacity-100 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-300 h-auto"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </li>
                            ))}
                          </ul>
                          <BulkAddControl label={levelLabel(entity, 'unit')} onAdd={addHomes} />
                        </div>
                      )}

                      {isActive && !homeList && children.length > 0 && (
                        <div className="pl-3 space-y-0.5 border-l-2 border-blue-100 ml-3 py-1">
                          {children.map((child, cIdx) => {
                            const name =
                              'block_name' in child
                                ? child.block_name
                                : child.floor_name || `${levelLabel(entity, 'floor')} ${child.floor_number}`
                            const selected = selectable && cIdx === activeBlockIndex
                            const count = tower
                              ? ((child as BlockInput).total_floors || 0) * ((child as BlockInput).units_per_floor || 0)
                              : (child.units?.length ?? 0)
                            return (
                              <div key={cIdx} className="group/block flex items-center gap-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  disabled={!selectable}
                                  onClick={() => setActiveBlockIndex(cIdx)}
                                  className={cn(
                                    'flex min-w-0 flex-1 items-center justify-between rounded-lg px-2 py-1 text-left text-[11px] h-auto font-normal',
                                    selected ? 'bg-white font-semibold text-blue-700 shadow-xs' : 'text-gray-600',
                                    selectable
                                      ? 'cursor-pointer hover:bg-white'
                                      : 'cursor-default hover:bg-transparent',
                                  )}
                                >
                                  <span className="truncate">{name}</span>
                                  <span className="text-[10px] text-gray-400 font-semibold">{count}</span>
                                </Button>
                                {selectable && children.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={`Delete ${name}`}
                                    title={
                                      'block_name' in child && occupiedInBlock(child as BlockInput).length
                                        ? `Residents live in ${name}, so it can't be deleted`
                                        : `Delete ${name}`
                                    }
                                    disabled={'block_name' in child && occupiedInBlock(child as BlockInput).length > 0}
                                    onClick={() => removeBlock(cIdx)}
                                    className="shrink-0 cursor-pointer rounded-md p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover/block:opacity-100 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-300 h-auto"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                          {tower && <BulkAddControl label={levelLabel(entity, 'block')} onAdd={addBlocksLikeActive} />}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Main Configuration Panel */}
            <Card className="gap-0 md:col-span-9 rounded-2xl border-gray-200 bg-white p-6 space-y-6 shadow-xs">
              {/* Entity header: name, kind and how it's organised */}
              {/* Entity name is fixed once the entity is added (it's set in the Add Entity dialog). */}
              <div className="flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Entity</p>
                  <h3 className="text-base font-bold text-gray-900">{activeEntity.name}</h3>
                  <p className="text-[11px] text-gray-500">
                    {ENTITY_PRESETS[activeEntity.entity_type].label} ·{' '}
                    {activeEntity.levels.map((l) => levelLabel(activeEntity, l)).join(' → ')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeEntity(activeEntityIndex)}
                  disabled={entities.length <= 1 || occupiedInEntity(activeEntity).length > 0}
                  title={
                    occupiedInEntity(activeEntity).length
                      ? `Residents live in ${listNumbers(occupiedInEntity(activeEntity))}, so this entity can't be removed`
                      : undefined
                  }
                  className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Remove entity
                </Button>
              </div>

              {isHomeEntity(activeEntity) ? (
                <HomeEditor
                  key={`${activeEntityIndex}-${activeBlockIndex}`}
                  entity={activeEntity}
                  unitIndex={Math.min(activeBlockIndex, homes.length - 1)}
                  onChange={(next) =>
                    setHomes(homes.map((u, i) => (i === Math.min(activeBlockIndex, homes.length - 1) ? next : u)))
                  }
                  onDelete={() => removeHome(Math.min(activeBlockIndex, homes.length - 1))}
                  canDelete={homes.length > 1}
                  numberCounts={unitNumberCounts}
                  footerAction={applyAllButton}
                />
              ) : !isTowerEntity(activeEntity) ? (
                <EntityUnitsEditor
                  entity={activeEntity}
                  onChange={(next) => updateEntity(activeEntityIndex, next)}
                  numberCounts={unitNumberCounts}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{activeBlock.block_name}</h3>
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-0.5 text-[11px] font-semibold text-blue-700">
                        {levelLabel(activeEntity, 'block')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <InputField
                        label={`${levelLabel(activeEntity, 'block')} name`}
                        value={activeBlock.block_name}
                        onChange={(e) => updateActiveBlock({ block_name: e.target.value })}
                      />
                      <InputField
                        label="Total floors"
                        type="number"
                        value={activeBlock.total_floors ?? ''}
                        onChange={(e) =>
                          updateActiveBlock({
                            total_floors: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                      <InputField
                        label="Units / floor"
                        type="number"
                        min={1}
                        value={activeBlock.units_per_floor ?? ''}
                        onChange={(e) => {
                          const newUnitsPerFloor = e.target.value ? Math.max(1, Number(e.target.value)) : null
                          const updatedTemplates = (activeBlock.bhk_templates || [])
                            .map((t) => ({
                              ...t,
                              positions: t.positions
                                ? t.positions.filter((p) => p.position <= (newUnitsPerFloor || 0))
                                : [],
                            }))
                            .filter((t) => t.positions && t.positions.length > 0)
                          updateActiveBlock({
                            units_per_floor: newUnitsPerFloor,
                            bhk_templates: updatedTemplates,
                          })
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <InputField
                        label="Prefix"
                        placeholder="e.g. B"
                        value={activeBlock.prefix ?? ''}
                        onChange={(e) => updateActiveBlock({ prefix: e.target.value })}
                      />
                      <InputField
                        label="Price / sqft (INR)"
                        type="number"
                        min={0}
                        placeholder="e.g. 5000"
                        value={activeBlock.price_per_sqft ?? ''}
                        onChange={(e) =>
                          updateActiveBlock({ price_per_sqft: e.target.value === '' ? null : Number(e.target.value) })
                        }
                      />
                    </div>
                    <InputField
                      label="Unit nomenclature template"
                      value="{{TowerPrefix}}-{{FloorNumber}}{{Position}}"
                      disabled
                      readOnly
                    />
                    <p className="text-[10px] text-gray-400">
                      Tokens: {'{{TowerPrefix}}'}, {'{{FloorNumber}}'}, {'{{Position}}'}, {'{{unitNumber}}'}
                    </p>
                  </div>

                  <div className="space-y-4 pt-3 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">BHK templates</h4>
                        <p className="text-[11px] text-gray-500">
                          Click a BHK chip to add a template variant (Max {activeBlock.units_per_floor || 3} positions
                          per floor).
                        </p>
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            (activeBlock.bhk_templates || []).length >= (activeBlock.units_per_floor || 3)
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-blue-50 text-[#005390] border border-blue-200'
                          }`}
                        >
                          {(activeBlock.bhk_templates || []).length >= (activeBlock.units_per_floor || 3) ? '✓ ' : ''}
                          {(activeBlock.bhk_templates || []).length} / {activeBlock.units_per_floor || 3} Positions
                          Assigned
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_BHK_TYPES.map((bhkType) => {
                        const variantsCount = (activeBlock.bhk_templates || []).filter((t) => t.type === bhkType).length
                        const isLimitReached =
                          (activeBlock.bhk_templates || []).length >= (activeBlock.units_per_floor || 3)

                        return (
                          <Button
                            type="button"
                            variant="ghost"
                            key={bhkType}
                            disabled={isLimitReached}
                            onClick={() => addBHKTemplateVariant(bhkType)}
                            className={cn(
                              'rounded-xl px-4 py-2 text-xs font-semibold border transition-all h-auto',
                              variantsCount > 0
                                ? 'bg-[#005390] border-[#005390] text-white shadow-xs hover:bg-[#005390] hover:text-white'
                                : isLimitReached
                                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                                  : 'bg-white border-gray-200 text-gray-700 hover:border-[#005390]/40 hover:bg-blue-50/30',
                            )}
                          >
                            {bhkType} {variantsCount > 0 && `(${variantsCount})`}
                          </Button>
                        )
                      })}
                    </div>

                    {activeBlock.bhk_templates && activeBlock.bhk_templates.length > 0 && (
                      <div className="rounded-2xl border border-gray-200 overflow-hidden">
                        <Table className="w-full text-left text-xs border-collapse">
                          <TableHeader className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold">
                            <TableRow>
                              <TableHead className="p-3">Type</TableHead>
                              <TableHead className="p-3">Carpet</TableHead>
                              <TableHead className="p-3">SBA</TableHead>
                              <TableHead className="p-3">Price</TableHead>
                              <TableHead className="p-3">Layout</TableHead>
                              <TableHead className="p-3 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-gray-100">
                            {activeBlock.bhk_templates.map((variant, vIdx) => {
                              const isAssignExpanded = expandedAssignVariantIndex === vIdx

                              return (
                                <React.Fragment key={vIdx}>
                                  <TableRow>
                                    <TableCell className="p-3 font-bold text-gray-900">{variant.type}</TableCell>
                                    <TableCell className="p-3">
                                      <Input
                                        type="number"
                                        min={0}
                                        aria-label={`${variant.type} carpet area`}
                                        value={variant.carpet_area}
                                        onChange={(e) =>
                                          updateBHKTemplateVariant(vIdx, {
                                            carpet_area: Number(e.target.value),
                                          })
                                        }
                                        className={cn(
                                          'w-24 rounded-lg border px-2.5 py-1.5 text-xs',
                                          isPositive(variant.carpet_area)
                                            ? 'border-gray-200'
                                            : 'border-red-400 bg-red-50',
                                        )}
                                      />
                                    </TableCell>
                                    <TableCell className="p-3">
                                      <Input
                                        type="number"
                                        min={0}
                                        aria-label={`${variant.type} super built-up area`}
                                        value={variant.super_built_up_area}
                                        onChange={(e) =>
                                          updateBHKTemplateVariant(vIdx, {
                                            super_built_up_area: Number(e.target.value),
                                          })
                                        }
                                        className={cn(
                                          'w-24 rounded-lg border px-2.5 py-1.5 text-xs',
                                          isPositive(variant.super_built_up_area)
                                            ? 'border-gray-200'
                                            : 'border-red-400 bg-red-50',
                                        )}
                                      />
                                    </TableCell>
                                    <TableCell className="p-3 whitespace-nowrap font-semibold text-gray-900">
                                      {formatLakh(unitPrice(variant.super_built_up_area, activeBlock.price_per_sqft))}
                                    </TableCell>
                                    <TableCell className="p-3">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setExpandedAssignVariantIndex(isAssignExpanded ? null : vIdx)}
                                        className="h-8 rounded-lg text-xs font-semibold px-3 py-1 border-gray-300 hover:bg-blue-50 hover:text-blue-600"
                                      >
                                        Assign ({variant.positions.length})
                                      </Button>
                                    </TableCell>
                                    <TableCell className="p-3 text-right">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={`Remove ${variant.type} variant`}
                                        onClick={() => removeBHKTemplateVariant(vIdx)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors h-auto"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>

                                  {isAssignExpanded && (
                                    <TableRow>
                                      <TableCell colSpan={6} className="bg-gray-50/70 p-4 border-b border-gray-200">
                                        <div className="space-y-3">
                                          <div className="grid grid-cols-3 gap-3">
                                            {(() => {
                                              const assignedInOtherVariants = (activeBlock.bhk_templates || [])
                                                .filter((_, idx) => idx !== vIdx)
                                                .flatMap((t) => (t.positions ? t.positions.map((p) => p.position) : []))

                                              const currentPos = variant.positions[0]?.position || 1
                                              const unitsPerFloor = activeBlock.units_per_floor || 3
                                              const availablePositions = Array.from(
                                                { length: unitsPerFloor },
                                                (_, i) => i + 1,
                                              ).filter(
                                                (posNum) =>
                                                  posNum === currentPos || !assignedInOtherVariants.includes(posNum),
                                              )

                                              return (
                                                <SelectField
                                                  label="Position"
                                                  value={String(currentPos)}
                                                  onValueChange={(val) => {
                                                    const pos = Number(val)
                                                    const updatedPos = [{ ...variant.positions[0], position: pos }]
                                                    updateBHKTemplateVariant(vIdx, {
                                                      positions: updatedPos,
                                                    })
                                                  }}
                                                >
                                                  {availablePositions.map((posNum) => (
                                                    <SelectItem key={posNum} value={String(posNum)}>
                                                      Position {posNum}
                                                    </SelectItem>
                                                  ))}
                                                </SelectField>
                                              )
                                            })()}

                                            <SelectField
                                              label="Direction"
                                              value={variant.positions[0]?.direction || 'North-East'}
                                              onValueChange={(val) => {
                                                const dir = val
                                                const updatedPos = [{ ...variant.positions[0], direction: dir }]
                                                updateBHKTemplateVariant(vIdx, {
                                                  positions: updatedPos,
                                                })
                                              }}
                                            >
                                              {DIRECTION_OPTIONS.map((d) => (
                                                <SelectItem key={d} value={d}>
                                                  {d}
                                                </SelectItem>
                                              ))}
                                            </SelectField>

                                            <SelectField
                                              label="View facing"
                                              value={variant.positions[0]?.view_facing || 'Garden View'}
                                              onValueChange={(val) => {
                                                const view = val
                                                const updatedPos = [{ ...variant.positions[0], view_facing: view }]
                                                updateBHKTemplateVariant(vIdx, {
                                                  positions: updatedPos,
                                                })
                                              }}
                                            >
                                              {VIEW_FACING_OPTIONS.map((vf) => (
                                                <SelectItem key={vf} value={vf}>
                                                  {vf}
                                                </SelectItem>
                                              ))}
                                            </SelectField>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {towerErrors(activeBlock).length > 0 && (
                      <ul className="space-y-1">
                        {towerErrors(activeBlock).map((msg) => (
                          <li key={msg} className="text-xs text-red-600">
                            {msg}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="space-y-2 pt-2">
                      <h5 className="text-[11px] font-bold text-gray-700">Floor layout summary</h5>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {Array.from({ length: activeBlock.units_per_floor || 3 }).map((_, pIdx) => {
                          const posNum = pIdx + 1
                          const assignedBHK = (activeBlock.bhk_templates || []).find((t) =>
                            t.positions.some((pos) => pos.position === posNum),
                          )
                          const posObj = assignedBHK?.positions.find((pos) => pos.position === posNum)

                          return (
                            <div
                              key={posNum}
                              className="rounded-xl border border-gray-200 bg-white p-2.5 text-[11px] space-y-0.5"
                            >
                              <p className="font-bold text-gray-800">Position {posNum}</p>
                              {assignedBHK ? (
                                <>
                                  <p className="font-bold text-blue-600">{assignedBHK.type}</p>
                                  <p className="text-gray-500 text-[10px]">{posObj?.direction || 'North-East'}</p>
                                  <p className="text-gray-400 text-[10px]">{posObj?.view_facing || 'Garden View'}</p>
                                </>
                              ) : (
                                <p className="text-gray-400 italic">Unassigned</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Floor preview</h4>
                    </div>
                    <div className="rounded-2xl border border-gray-200 overflow-hidden">
                      <Table className="w-full text-left text-xs border-collapse">
                        <TableHeader className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
                          <TableRow>
                            <TableHead className="p-3">Floor #</TableHead>
                            <TableHead className="p-3">Floor type</TableHead>
                            <TableHead className="p-3">Sellable</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100">
                          {Array.from({ length: activeBlock.total_floors || 3 }).map((_, fI) => {
                            const floorNum = fI + 1
                            const isGround = floorNum === 1
                            const existingFloor = activeBlock.floors?.find((fl) => fl.floor_number === floorNum)
                            const isSellable =
                              existingFloor?.is_sellable !== undefined ? Boolean(existingFloor.is_sellable) : true
                            const currentFloorType = existingFloor?.floor_type || (isGround ? 'GROUND_FLOOR' : 'FLOOR')

                            const updateFloorConfig = (updated: Partial<FloorInput>) => {
                              const currentFloors = activeBlock.floors || []
                              const existingIdx = currentFloors.findIndex((fl) => fl.floor_number === floorNum)
                              let nextFloors: FloorInput[] = []

                              // Changing the type renames an auto-named floor ("Ground Floor" → "Floor 1").
                              const nextType = updated.floor_type ?? currentFloorType
                              const named = {
                                ...updated,
                                floor_name: floorNameFor(floorNum, nextType, existingFloor?.floor_name),
                              }
                              if (existingIdx >= 0) {
                                nextFloors = currentFloors.map((fl, i) =>
                                  i === existingIdx ? { ...fl, ...named } : fl,
                                )
                              } else {
                                nextFloors = [
                                  ...currentFloors,
                                  {
                                    floor_number: floorNum,
                                    floor_type: currentFloorType,
                                    is_sellable: isSellable,
                                    ...named,
                                  },
                                ]
                              }
                              updateActiveBlock({ floors: nextFloors })
                            }

                            return (
                              <TableRow key={floorNum}>
                                <TableCell className="p-3 font-bold text-gray-900">{floorNum}</TableCell>
                                <TableCell className="p-3">
                                  <Select
                                    value={currentFloorType || undefined}
                                    onValueChange={(val) => updateFloorConfig({ floor_type: val || '' })}
                                  >
                                    <SelectTrigger className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs h-auto outline-none">
                                      <SelectValue placeholder="Floor Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FLOOR_TYPE_OPTIONS.map((ft) => (
                                        <SelectItem key={ft} value={ft}>
                                          {ft}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="p-3">
                                  <Label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={isSellable}
                                      onCheckedChange={(checked) =>
                                        updateFloorConfig({ is_sellable: checked === true })
                                      }
                                      className="data-checked:border-[#005390] data-checked:bg-[#005390] data-checked:text-white"
                                    />
                                    <span className="text-xs font-medium text-gray-700">
                                      {isSellable ? 'Yes' : 'No'}
                                    </span>
                                  </Label>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-[10px] text-gray-400">Units are generated only for floors marked as sellable.</p>
                  </div>

                  <div className="space-y-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        onClick={generatePreview}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 text-xs px-4 py-2 shadow-xs"
                      >
                        <Sparkles className="h-4 w-4" /> Generate preview
                      </Button>
                      <span className="rounded-full bg-gray-100 px-3.5 py-1 text-xs font-semibold text-gray-600">
                        Typical floors: {activeBlock.total_floors || 0}
                      </span>
                      <span className="rounded-full bg-gray-100 px-3.5 py-1 text-xs font-semibold text-gray-600">
                        Total units: {(activeBlock.total_floors || 0) * (activeBlock.units_per_floor || 0)}
                      </span>
                    </div>

                    {previewGenerated && activeBlock.floors && activeBlock.floors.length > 0 && (
                      <div className="rounded-2xl border border-gray-200 overflow-hidden max-h-64 overflow-y-auto">
                        <Table className="w-full text-left text-xs border-collapse">
                          <TableHeader className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 sticky top-0">
                            <TableRow>
                              <TableHead className="p-2.5">Unit</TableHead>
                              <TableHead className="p-2.5">Floor</TableHead>
                              <TableHead className="p-2.5">Type</TableHead>
                              <TableHead className="p-2.5">Area</TableHead>
                              <TableHead className="p-2.5">Price</TableHead>
                              <TableHead className="p-2.5">Dir/View</TableHead>
                              <TableHead className="p-2.5">Sellable</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-gray-100">
                            {activeBlock.floors.flatMap((f) =>
                              (f.units || []).map((u, uI) => (
                                <TableRow key={`${f.floor_number}-${uI}`}>
                                  <TableCell className="p-2.5 font-bold text-gray-900">{u.unit_number}</TableCell>
                                  <TableCell className="p-2.5">{f.floor_number}</TableCell>
                                  <TableCell className="p-2.5 font-semibold text-blue-600">{u.unit_type}</TableCell>
                                  <TableCell className="p-2.5">{u.built_up_area} sqft</TableCell>
                                  <TableCell className="p-2.5 whitespace-nowrap">
                                    {u.price ? formatLakh(u.price) : '—'}
                                  </TableCell>
                                  <TableCell className="p-2.5 text-gray-500">
                                    {u.direction || 'North-East'} / {u.view_facing || 'Garden View'}
                                  </TableCell>
                                  <TableCell className="p-2.5 text-emerald-600 font-bold">Yes</TableCell>
                                </TableRow>
                              )),
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                    {applyAllButton ?? <span />}
                    <Button
                      type="button"
                      onClick={() => removeBlock(activeBlockIndex)}
                      disabled={blocks.length <= 1}
                      className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 shadow-xs disabled:opacity-50"
                    >
                      Delete {levelLabel(activeEntity, 'block')}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </div>
        )}

        {addEntityOpen && <AddEntityDialog onOpenChange={setAddEntityOpen} onCreate={addEntity} />}

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => (step > 1 ? setStep((s) => s - 1) : onBack())}
            className="rounded-xl border-gray-200 hover:bg-gray-100"
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>

          {step < STEPS.length ? (
            <Button
              type="button"
              onClick={handleNext}
              className="rounded-xl bg-[#005390] hover:bg-[#004274] text-white px-6"
            >
              Next →
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-xl bg-[#005390] hover:bg-[#004274] text-white px-6 min-w-[140px]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : editPropertyId ? (
                'Save Changes'
              ) : (
                'Create Property'
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
