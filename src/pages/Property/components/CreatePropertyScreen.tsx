import React, { useState } from 'react'
import { ArrowLeft, Building2, Layers, MapPin, Plus, Sparkles, Trash2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { propertyApi } from '@/api/property'
import { CommonProgressBar, type ProgressBarStep } from '@/components/common/CommonProgressBar'
import type {
  AreaUnit,
  BHKTemplateVariant,
  BlockInput,
  CreatePropertyPayload,
  FloorInput,
  PropertyType,
  UnitInput,
  UnitType,
} from '../types'

type PartialBHKVariant = Partial<BHKTemplateVariant>

// ─── Constants ────────────────────────────────────────────────────────────────
const PROPERTY_TYPES: PropertyType[] = ['apartment', 'villa', 'duplex', 'triplex']
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
const SUGGESTED_AMENITIES = ['Swimming Pool', 'Gym', 'Clubhouse', '24/7 Security']

// ─── Step progress config ───────────────────────────────────────────────────
const STEPS: ProgressBarStep[] = [
  { id: 1, count: 1, label: 'Property Details', icon: Building2, description: 'Basic property info' },
  { id: 2, count: 2, label: 'Address', icon: MapPin, description: 'Location & area' },
  { id: 3, count: 3, label: 'Structure Builder', icon: Layers, description: 'Towers & unit matrix' },
]

// ─── Input helpers ────────────────────────────────────────────────────────────
function InputField({
  label,
  required,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        {...props}
        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none transition focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20 disabled:bg-gray-100 disabled:opacity-75"
      />
    </div>
  )
}

function SelectField({
  label,
  required,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        {...props}
        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 outline-none transition focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20 disabled:opacity-50"
      >
        {children}
      </select>
    </div>
  )
}

function TextareaField({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider block">{label}</label>
      <textarea
        {...props}
        rows={3}
        className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none transition focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20 resize-none"
      />
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
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 – Property details
  const [propertyName, setPropertyName] = useState('')
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment')
  const [description, setDescription] = useState('')
  const [totalArea, setTotalArea] = useState('')
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('sqft')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [customAmenityInput, setCustomAmenityInput] = useState('')

  // Step 2 – Address
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [country, setCountry] = useState('India')

  // Step 3 – Structure Builder (Towers state)
  const [blocks, setBlocks] = useState<BlockInput[]>([
    {
      block_name: 'Tower A',
      prefix: 'A',
      total_floors: 3,
      units_per_floor: 3,
      nomenclature_template: '{{TowerPrefix}}-{{FloorNumber}}{{Position}}',
      bhk_templates: [],
      floors: [],
    },
  ])
  const [activeBlockIndex, setActiveBlockIndex] = useState(0)
  const [expandedAssignVariantIndex, setExpandedAssignVariantIndex] = useState<number | null>(null)
  const [previewGenerated, setPreviewGenerated] = useState(false)

  // Fetch property details if editing
  React.useEffect(() => {
    if (!editPropertyId) return
    propertyApi
      .getById(editPropertyId)
      .then((p) => {
        if (p) {
          setPropertyName(p.property_name || '')
          setPropertyType(p.property_type || 'apartment')
          setDescription(p.description || '')
          setStreet(p.street || '')
          setCity(p.city || '')
          setState(p.state || '')
          setPincode(p.pincode || '')
          setCountry(p.country || 'India')
          setTotalArea(p.total_area ? String(p.total_area) : '')
          setAreaUnit(p.area_unit || 'sqft')
          setSelectedAmenities(p.amenities || [])
          if (p.blocks && p.blocks.length > 0) {
            setBlocks(p.blocks)
            setPreviewGenerated(true)
          }
        }
      })
      .catch(() => {})
  }, [editPropertyId])

  const activeBlock = blocks[activeBlockIndex] || blocks[0]

  const updateActiveBlock = (updated: Partial<BlockInput>) => {
    setBlocks((prev) => {
      const next = [...prev]
      next[activeBlockIndex] = { ...next[activeBlockIndex], ...updated }
      return next
    })
  }

  const addBlock = () => {
    const letter = String.fromCharCode(65 + blocks.length)
    const newTowerName = `Tower ${letter}`
    const newBlock: BlockInput = {
      block_name: newTowerName,
      prefix: letter,
      total_floors: 3,
      units_per_floor: 3,
      nomenclature_template: '{{TowerPrefix}}-{{FloorNumber}}{{Position}}',
      bhk_templates: [],
      floors: [],
    }
    setBlocks([...blocks, newBlock])
    setActiveBlockIndex(blocks.length)
  }

  const removeBlock = (index: number) => {
    if (blocks.length <= 1) return
    const next = blocks.filter((_, i) => i !== index)
    setBlocks(next)
    setActiveBlockIndex(Math.max(0, index - 1))
  }

  // BHK template management
  const addBHKTemplateVariant = (type: UnitType) => {
    const currentTemplates = activeBlock.bhk_templates || []
    const existingCount = currentTemplates.filter((t) => t.type === type).length
    const newVariant: BHKTemplateVariant = {
      type,
      carpet_area: 1200,
      super_built_up_area: 1200,
      positions: [{ position: existingCount + 1, direction: 'North-East', view_facing: 'Garden View' }],
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

    const generatedFloors: FloorInput[] = []

    for (let f = 1; f <= totalFloors; f++) {
      const isGround = f === 1
      const floorType = isGround ? 'GROUND_FLOOR' : 'FLOOR'
      const isSellable = !isGround

      const floorUnits: UnitInput[] = []
      if (isSellable) {
        for (let p = 1; p <= unitsPerFloor; p++) {
          const assignedBHK = bhkTemplates.find((t) => t.positions.some((pos) => pos.position === p))
          const unitType = assignedBHK ? assignedBHK.type : '2BHK'
          const carpetArea = assignedBHK ? assignedBHK.carpet_area : 1200
          const sbaArea = assignedBHK ? assignedBHK.super_built_up_area : 1200
          const posObj = assignedBHK?.positions.find((pos) => pos.position === p)
          const direction = posObj?.direction || 'North-East'
          const viewFacing = posObj?.view_facing || 'Garden View'
          const unitNum = `${prefix}-${f}${p}`

          floorUnits.push({
            unit_number: unitNum,
            unit_type: unitType,
            position: p,
            direction,
            view_facing: viewFacing,
            is_sellable: true,
            carpet_area: carpetArea,
            built_up_area: sbaArea,
            super_built_up_area: sbaArea,
            status: 'available',
          })
        }
      }

      generatedFloors.push({
        floor_number: f,
        floor_name: isGround ? 'Ground Floor' : `${f - 1}th Floor`,
        floor_type: floorType,
        is_sellable: isSellable,
        units: floorUnits,
      })
    }

    updateActiveBlock({ floors: generatedFloors })
    setPreviewGenerated(true)
  }

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity))
    } else {
      setSelectedAmenities([...selectedAmenities, amenity])
    }
  }

  const addCustomAmenity = () => {
    const trimmed = customAmenityInput.trim()
    if (trimmed && !selectedAmenities.includes(trimmed)) {
      setSelectedAmenities([...selectedAmenities, trimmed])
      setCustomAmenityInput('')
    }
  }

  const validate = () => {
    if (step === 1 && !propertyName.trim()) return 'Property name is required'
    if (step === 2) {
      if (!city.trim()) return 'City is required'
      if (!state.trim()) return 'State is required'
      if (!pincode.trim()) return 'Pincode is required'
    }
    return null
  }

  const handleNext = () => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setStep((s) => s + 1)
  }

  const handleSubmit = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const processedBlocks = blocks.map((b) => {
        if ((!b.floors || b.floors.length === 0) && b.total_floors && b.total_floors > 0) {
          const totalFloors = b.total_floors
          const unitsPerFloor = b.units_per_floor || 4
          const prefix = b.prefix || 'A'
          const bhkTemplates = b.bhk_templates || []
          const generatedFloors: FloorInput[] = []

          for (let f = 1; f <= totalFloors; f++) {
            const isGround = f === 1
            const floorType = isGround ? 'GROUND_FLOOR' : 'FLOOR'
            const isSellable = !isGround
            const floorUnits: UnitInput[] = []

            if (isSellable) {
              for (let p = 1; p <= unitsPerFloor; p++) {
                const assignedBHK = bhkTemplates.find((t) => t.positions.some((pos) => pos.position === p))
                const unitType = assignedBHK ? assignedBHK.type : '2BHK'
                const carpetArea = assignedBHK ? assignedBHK.carpet_area : 1200
                const sbaArea = assignedBHK ? assignedBHK.super_built_up_area : 1200
                const posObj = assignedBHK?.positions.find((pos) => pos.position === p)
                const direction = posObj?.direction || 'North-East'
                const viewFacing = posObj?.view_facing || 'Garden View'
                const unitNum = `${prefix}-${f}${String(p).padStart(2, '0')}`

                floorUnits.push({
                  unit_number: unitNum,
                  unit_type: unitType,
                  position: p,
                  direction,
                  view_facing: viewFacing,
                  is_sellable: true,
                  carpet_area: carpetArea,
                  built_up_area: sbaArea,
                  super_built_up_area: sbaArea,
                  status: 'available',
                })
              }
            }

            generatedFloors.push({
              floor_number: f,
              floor_name: isGround ? 'Ground Floor' : `Floor ${f}`,
              floor_type: floorType,
              is_sellable: isSellable,
              units: floorUnits,
            })
          }

          return { ...b, floors: generatedFloors }
        }
        return b
      })

      const payload: CreatePropertyPayload = {
        companyId,
        property_name: propertyName.trim(),
        property_type: propertyType,
        description: description || null,
        street: street || null,
        city,
        state,
        pincode,
        country: country || 'India',
        total_area: totalArea ? Number(totalArea) : null,
        area_unit: areaUnit,
        amenities: selectedAmenities.length > 0 ? selectedAmenities : null,
        blocks: processedBlocks.length > 0 ? processedBlocks : undefined,
      }

      if (editPropertyId) {
        await propertyApi.update(editPropertyId, payload)
      } else {
        await propertyApi.create(payload)
      }
      onSuccess()
      onBack()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

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
            <p className="text-xs text-gray-500">Configure property details, location, and tower structure</p>
          </div>
        </div>
      </div>

      {/* Main Screen Container */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
        <CommonProgressBar steps={STEPS} currentStep={step} onStepClick={(sId) => setStep(sId)} className="mb-6" />

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Step 1: Property Details */}
        {step === 1 && (
          <div className="space-y-5 max-w-3xl mx-auto py-2">
            <InputField
              label="Property / Project Name"
              required
              placeholder="e.g. Green Valley Residency"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
            />

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                Property Type <span className="text-red-500">*</span>
              </div>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {PROPERTY_TYPES.map((t) => {
                  const isSelected = propertyType === t
                  const label =
                    t === 'apartment' ? 'Apartment' : t === 'villa' ? 'Villa' : t === 'duplex' ? 'Duplex' : 'Triplex'
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setPropertyType(t)}
                      className={`inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold px-4 py-2 border transition-all ${
                        isSelected
                          ? 'bg-[#005390] border-[#005390] text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-[#005390]/40 hover:bg-[#005390]/10'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                      {label}
                    </button>
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
              <SelectField label="Area Unit" value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}>
                {AREA_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                Amenities Suggestions
              </div>
              {selectedAmenities.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-[#005390]/20 bg-[#005390]/10 mb-2">
                  {selectedAmenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#005390] text-white text-xs font-medium px-3 py-1 shadow-sm"
                    >
                      {amenity}
                      <button
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className="hover:bg-[#004274] rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTED_AMENITIES.map((suggestion) => {
                  const isSelected = selectedAmenities.includes(suggestion)
                  return (
                    <button
                      type="button"
                      key={suggestion}
                      onClick={() => toggleAmenity(suggestion)}
                      className={`inline-flex items-center gap-1.5 rounded-xl text-xs font-medium px-3.5 py-2 border transition-all ${
                        isSelected
                          ? 'bg-[#005390]/10 border-[#005390]/30 text-[#005390] font-semibold shadow-xs'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-[#005390]/30 hover:bg-[#005390]/10'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-[#005390]" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 text-gray-400" />
                      )}
                      {suggestion}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add custom amenity..."
                  value={customAmenityInput}
                  onChange={(e) => setCustomAmenityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomAmenity()
                    }
                  }}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 outline-none focus:border-[#005390] focus:ring-2 focus:ring-[#005390]/20"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomAmenity}
                  className="rounded-xl text-xs px-4 py-2 border-gray-200 hover:bg-[#005390]/10 hover:text-[#005390]"
                >
                  Add
                </Button>
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
          <div className="space-y-4 max-w-3xl mx-auto py-2">
            <InputField
              label="Street Address"
              placeholder="e.g. 12, MG Road, Near Central Park"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
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
            {/* Left Sidebar Tree Panel */}
            <div className="md:col-span-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Property Structure</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addBlock}
                    className="h-8 px-2.5 text-[11px] font-semibold rounded-lg border-gray-300 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Entity
                  </Button>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[480px] pr-1">
                  {blocks.map((b, idx) => {
                    const isSelected = idx === activeBlockIndex
                    return (
                      <div key={idx} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setActiveBlockIndex(idx)}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-blue-50 border border-blue-200 text-blue-700 shadow-xs'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-600" />
                            <span>{b.block_name || `Tower ${idx + 1}`}</span>
                          </div>
                          <span className="rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-0.5">
                            Tower
                          </span>
                        </button>

                        {isSelected && b.total_floors && b.total_floors > 0 && (
                          <div className="pl-4 space-y-1 border-l-2 border-blue-100 ml-3 py-1">
                            {Array.from({ length: b.total_floors }).map((_, fIdx) => (
                              <div
                                key={fIdx}
                                className="flex items-center justify-between text-[11px] text-gray-600 px-2 py-1 rounded-lg hover:bg-white"
                              >
                                <span>Floor {fIdx + 1}</span>
                                <span className="text-[10px] text-gray-400 font-semibold">
                                  {b.floors?.[fIdx]?.units?.length || 0} units
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Main Configuration Panel */}
            <div className="md:col-span-9 rounded-2xl border border-gray-200 bg-white p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">{activeBlock.block_name}</h3>
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-0.5 text-[11px] font-semibold text-blue-700">
                    Tower
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <InputField
                    label="Tower name"
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
                    value={activeBlock.units_per_floor ?? ''}
                    onChange={(e) =>
                      updateActiveBlock({
                        units_per_floor: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <InputField
                  label="Prefix"
                  placeholder="e.g. B"
                  value={activeBlock.prefix ?? ''}
                  onChange={(e) => updateActiveBlock({ prefix: e.target.value })}
                />
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
                <div>
                  <h4 className="text-xs font-bold text-gray-900">BHK templates</h4>
                  <p className="text-[11px] text-gray-500">Click a BHK chip to add a new template variant.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_BHK_TYPES.map((bhkType) => {
                    const variantsCount = (activeBlock.bhk_templates || []).filter((t) => t.type === bhkType).length

                    return (
                      <button
                        type="button"
                        key={bhkType}
                        onClick={() => addBHKTemplateVariant(bhkType)}
                        className={`rounded-xl px-4 py-2 text-xs font-semibold border transition-all ${
                          variantsCount > 0
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50/30'
                        }`}
                      >
                        {bhkType} {variantsCount > 0 && `(${variantsCount})`}
                      </button>
                    )
                  })}
                </div>

                {activeBlock.bhk_templates && activeBlock.bhk_templates.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold">
                        <tr>
                          <th className="p-3">Type</th>
                          <th className="p-3">Carpet</th>
                          <th className="p-3">SBA</th>
                          <th className="p-3">Layout</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {activeBlock.bhk_templates.map((variant, vIdx) => {
                          const isAssignExpanded = expandedAssignVariantIndex === vIdx

                          return (
                            <React.Fragment key={vIdx}>
                              <tr>
                                <td className="p-3 font-bold text-gray-900">{variant.type}</td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={variant.carpet_area}
                                    onChange={(e) =>
                                      updateBHKTemplateVariant(vIdx, {
                                        carpet_area: Number(e.target.value),
                                      })
                                    }
                                    className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={variant.super_built_up_area}
                                    onChange={(e) =>
                                      updateBHKTemplateVariant(vIdx, {
                                        super_built_up_area: Number(e.target.value),
                                      })
                                    }
                                    className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
                                  />
                                </td>
                                <td className="p-3">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setExpandedAssignVariantIndex(isAssignExpanded ? null : vIdx)}
                                    className="h-8 rounded-lg text-xs font-semibold px-3 py-1 border-gray-300 hover:bg-blue-50 hover:text-blue-600"
                                  >
                                    Assign ({variant.positions.length})
                                  </Button>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => removeBHKTemplateVariant(vIdx)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>

                              {isAssignExpanded && (
                                <tr>
                                  <td colSpan={5} className="bg-gray-50/70 p-4 border-b border-gray-200">
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-3 gap-3">
                                        <SelectField
                                          label="Position"
                                          value={variant.positions[0]?.position || 1}
                                          onChange={(e) => {
                                            const pos = Number(e.target.value)
                                            const updatedPos = [{ ...variant.positions[0], position: pos }]
                                            updateBHKTemplateVariant(vIdx, {
                                              positions: updatedPos,
                                            })
                                          }}
                                        >
                                          {Array.from({
                                            length: activeBlock.units_per_floor || 3,
                                          }).map((_, pI) => (
                                            <option key={pI + 1} value={pI + 1}>
                                              Position {pI + 1}
                                            </option>
                                          ))}
                                        </SelectField>

                                        <SelectField
                                          label="Direction"
                                          value={variant.positions[0]?.direction || 'North-East'}
                                          onChange={(e) => {
                                            const dir = e.target.value
                                            const updatedPos = [{ ...variant.positions[0], direction: dir }]
                                            updateBHKTemplateVariant(vIdx, {
                                              positions: updatedPos,
                                            })
                                          }}
                                        >
                                          {DIRECTION_OPTIONS.map((d) => (
                                            <option key={d} value={d}>
                                              {d}
                                            </option>
                                          ))}
                                        </SelectField>

                                        <SelectField
                                          label="View facing"
                                          value={variant.positions[0]?.view_facing || 'Garden View'}
                                          onChange={(e) => {
                                            const view = e.target.value
                                            const updatedPos = [{ ...variant.positions[0], view_facing: view }]
                                            updateBHKTemplateVariant(vIdx, {
                                              positions: updatedPos,
                                            })
                                          }}
                                        >
                                          {VIEW_FACING_OPTIONS.map((vf) => (
                                            <option key={vf} value={vf}>
                                              {vf}
                                            </option>
                                          ))}
                                        </SelectField>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
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
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
                      <tr>
                        <th className="p-3">Floor #</th>
                        <th className="p-3">Floor type</th>
                        <th className="p-3">Sellable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Array.from({ length: activeBlock.total_floors || 3 }).map((_, fI) => {
                        const floorNum = fI + 1
                        const isGround = floorNum === 1

                        return (
                          <tr key={floorNum}>
                            <td className="p-3 font-bold text-gray-900">{floorNum}</td>
                            <td className="p-3">
                              <select className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none">
                                {FLOOR_TYPE_OPTIONS.map((ft) => (
                                  <option
                                    key={ft}
                                    value={ft}
                                    selected={isGround ? ft === 'GROUND_FLOOR' : ft === 'FLOOR'}
                                  >
                                    {ft}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked={!isGround} className="sr-only peer" />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                                <span className="ml-2 text-xs font-medium text-gray-700">
                                  {!isGround ? 'Yes' : 'No'}
                                </span>
                              </label>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
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
                    Generated units: {activeBlock.floors?.reduce((s, f) => s + (f.units?.length ?? 0), 0) || 0}
                  </span>
                </div>

                {previewGenerated && activeBlock.floors && activeBlock.floors.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700 sticky top-0">
                        <tr>
                          <th className="p-2.5">Unit</th>
                          <th className="p-2.5">Floor</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Area</th>
                          <th className="p-2.5">Dir/View</th>
                          <th className="p-2.5">Sellable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {activeBlock.floors.flatMap((f) =>
                          (f.units || []).map((u, uI) => (
                            <tr key={`${f.floor_number}-${uI}`}>
                              <td className="p-2.5 font-bold text-gray-900">{u.unit_number}</td>
                              <td className="p-2.5">{f.floor_number}</td>
                              <td className="p-2.5 font-semibold text-blue-600">{u.unit_type}</td>
                              <td className="p-2.5">{u.built_up_area} sqft</td>
                              <td className="p-2.5 text-gray-500">
                                {u.direction || 'North-East'} / {u.view_facing || 'Garden View'}
                              </td>
                              <td className="p-2.5 text-emerald-600 font-bold">Yes</td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  onClick={() => removeBlock(activeBlockIndex)}
                  disabled={blocks.length <= 1}
                  className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 shadow-xs disabled:opacity-50"
                >
                  Delete Tower
                </Button>
              </div>
            </div>
          </div>
        )}

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
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
      </div>
    </div>
  )
}
