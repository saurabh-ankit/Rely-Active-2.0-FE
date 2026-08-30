import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  KeyRound,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import type { CreateResidentPayload, ResidentItem, ResidentType } from '@/lib/types'
import { residentService } from '@/lib/services/residentService'
import { getPropertyByIdAPI } from '@/lib/services/propertyService'
import type { PropertyUnit } from '@/pages/Property/types'
import { useLocationContext } from '@/hooks/useLocation'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { notifyError, notifySuccess } from '@/utils/toast'
import type { FieldErrors } from 'react-hook-form'

const familyMemberSchema = z.object({
  id: z.string().optional(),
  residentId: z.string().optional(),
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name cannot exceed 50 characters'),
  lastName: z.string().trim().max(50, 'Last name cannot exceed 50 characters').optional().or(z.literal('')),
  relation: z.string().trim().min(1, 'Relation is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dob: z.string().trim().min(1, 'Date of birth is required'),
  phone: z
    .string()
    .trim()
    .min(1, 'Mobile phone is required')
    .refine(
      (val) => /^[6-9]\d{9}$/.test(val.replace(/[\s-]/g, '')),
      'Mobile phone must be a 10-digit number starting with 6, 7, 8, or 9',
    ),
  email: z.string().trim().min(1, 'Email address is required').email('Please enter a valid email address'),
  bloodGroup: z.string().optional().or(z.literal('')),
  photoUrl: z.string().optional().or(z.literal('')),
  username: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || /^[a-zA-Z0-9_]{3,30}$/.test(val),
      'Username handle must be 3-30 characters (letters, numbers, underscores only)',
    ),
  password: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.length >= 6, 'Password must be at least 6 characters long'),
  isResiding: z.boolean().optional(),
})

const residentFormSchema = z.object({
  unitId: z.string().min(1, 'Property Flat / Unit is required'),
  locId: z.string().min(1, 'Property Location is required'),
  companyId: z.string().optional(),
  residentType: z.enum(['OWNER', 'TENANT']),
  ownershipType: z.enum(['PRIMARY', 'CO_OWNER', 'DEPENDENT']).optional(),
  isResiding: z.boolean(),
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name cannot exceed 50 characters'),
  lastName: z.string().trim().max(50, 'Last name cannot exceed 50 characters').optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dob: z.string().trim().min(1, 'Date of birth is required'),
  username: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || /^[a-zA-Z0-9_]{3,30}$/.test(val),
      'Username handle must be 3-30 characters (letters, numbers, underscores only)',
    ),
  password: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.length >= 6, 'Password must be at least 6 characters long'),
  email: z.string().trim().min(1, 'Email address is required').email('Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(1, 'Mobile phone is required')
    .refine(
      (val) => /^[6-9]\d{9}$/.test(val.replace(/[\s-]/g, '')),
      'Mobile phone must be a 10-digit number starting with 6, 7, 8, or 9',
    ),
  emergencyContact: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || /^[6-9]\d{9}$/.test(val.replace(/[\s-]/g, '')),
      'Emergency contact phone must be a 10-digit number starting with 6, 7, 8, or 9',
    ),
  bloodGroup: z.string().optional().or(z.literal('')),
  photoUrl: z.string().optional().or(z.literal('')),
  moveInDate: z.string().min(1, 'Move-in date is required'),
  familyMembers: z.array(familyMemberSchema).default([]),
})

export type ResidentFormValues = z.infer<typeof residentFormSchema>

interface UnitWithOccupancy extends PropertyUnit {
  occupancyStatus?: string
}

interface FloorOption {
  id: string
  floor_number: number
  floor_name: string
  blockName?: string
  label: string
}

interface OnboardResidentScreenProps {
  isEditMode?: boolean
  isGlobalMode?: boolean
}

export const OnboardResidentScreen: React.FC<OnboardResidentScreenProps> = ({
  isEditMode = false,
  isGlobalMode = false,
}) => {
  const navigate = useNavigate()
  const { id: editResidentId } = useParams<{ id: string }>()
  const { selectedLocationId } = useLocationContext()

  const isGlobal = isGlobalMode || window.location.pathname.includes('/global-settings')
  const backUrl = isGlobal ? '/global-settings/residents' : '/admin/residents'

  const [units, setUnits] = useState<UnitWithOccupancy[]>([])
  const [floors, setFloors] = useState<FloorOption[]>([])
  const [selectedFloorId, setSelectedFloorId] = useState<string>('')
  const [existingResidents, setExistingResidents] = useState<ResidentItem[]>([])

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // React Hook Form + Zod validation matching Employee screen standard
  const {
    register,
    handleSubmit: handleHookSubmit,
    setValue,
    control,
    reset: resetForm,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(residentFormSchema),
    mode: 'onChange',
    defaultValues: {
      unitId: '',
      locId: '',
      companyId: '',
      residentType: 'OWNER' as const,
      ownershipType: 'PRIMARY' as const,
      isResiding: true,
      firstName: '',
      lastName: '',
      gender: 'MALE' as const,
      dob: '',
      username: '',
      password: '',
      email: '',
      phone: '',
      emergencyContact: '',
      bloodGroup: '',
      photoUrl: '',
      moveInDate: new Date().toISOString().split('T')[0],
      familyMembers: [],
    },
  })

  const {
    fields: familyMemberFields,
    append: appendFamilyMember,
    remove: removeFamilyMember,
  } = useFieldArray({
    control,
    name: 'familyMembers',
  })

  const watchedResidentType = useWatch({ control, name: 'residentType' })
  const watchedIsResiding = useWatch({ control, name: 'isResiding' })
  const watchedPhotoUrl = useWatch({ control, name: 'photoUrl' })
  const watchedFamilyMembers = useWatch({ control, name: 'familyMembers' })
  const watchedUnitId = useWatch({ control, name: 'unitId' })

  // Check if editing owner residing status change is disabled
  const isEditingOwnerResidingDisabled = useMemo(() => {
    if (!isEditMode || watchedResidentType !== 'OWNER') {
      return false
    }

    const targetRes = existingResidents.find((r) => r.id === editResidentId)
    const initialIsResiding = targetRes ? targetRes.isResiding : false

    // Case 1: When the resident is off-site landlord (initialIsResiding === false)
    if (!initialIsResiding) {
      // Check if flat currently has ANY other active residing occupant (e.g. residing tenant or residing owner)
      const activeOccupantsInUnit = existingResidents.filter(
        (r) => r.unitId === watchedUnitId && r.id !== editResidentId && r.isResiding && r.status !== 'MOVED_OUT',
      )
      // If flat has active residing occupants, disable changing residing status to Physically Residing
      return activeOccupantsInUnit.length > 0
    }

    // Case 2: When the resident is Physically residing (initialIsResiding === true)
    // Owner is allowed to change residing status
    return false
  }, [isEditMode, watchedResidentType, existingResidents, editResidentId, watchedUnitId])

  // Helper to check if a unit is occupied by owner or tenant
  const checkIsUnitOccupied = (u: UnitWithOccupancy): boolean => {
    return (
      u.occupancyStatus === 'OCCUPIED (Owner)' ||
      u.occupancyStatus === 'OCCUPIED (Tenant)' ||
      u.occupancyStatus === 'OWNER_OCCUPIED' ||
      u.occupancyStatus === 'TENANT_OCCUPIED' ||
      u.occupancyStatus === 'OCCUPIED'
    )
  }

  // Photo upload helper using FileReader base64 data URL
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          callback(reader.result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Helper to determine occupancy status for each unit based on existing residents
  const getOccupancyStatusForUnit = (unitId: string, residents: ResidentItem[]): string => {
    const activeResidents = residents.filter(
      (r) => r.unitId === unitId && r.status !== 'INACTIVE' && r.status !== 'MOVED_OUT',
    )
    if (activeResidents.length === 0) {
      return 'VACANT'
    }
    const residingTenant = activeResidents.find((r) => r.residentType === 'TENANT' && r.isResiding)
    if (residingTenant) {
      return 'OCCUPIED (Tenant)'
    }
    const residingOwner = activeResidents.find((r) => r.residentType === 'OWNER' && r.isResiding)
    if (residingOwner) {
      return 'OCCUPIED (Owner)'
    }
    const offsiteOwner = activeResidents.find((r) => r.residentType === 'OWNER' && !r.isResiding)
    if (offsiteOwner) {
      return 'VACANT (Off-site Owner)'
    }
    return 'OCCUPIED'
  }

  // Load properties and initial data
  useEffect(() => {
    let isMounted = true

    const init = async () => {
      setIsLoading(true)
      try {
        if (!selectedLocationId) {
          setIsLoading(false)
          return
        }

        setValue('locId', selectedLocationId)

        const [resList, propDetails] = await Promise.all([
          residentService.getResidents({ locId: selectedLocationId }),
          getPropertyByIdAPI(selectedLocationId),
        ])

        if (!isMounted) return
        setExistingResidents(resList)

        const allFloors: FloorOption[] = []
        const allUnits: UnitWithOccupancy[] = []
        const hasMultipleBlocks = (propDetails.blocks?.length || 0) > 1

        propDetails.blocks?.forEach((b) => {
          b.floors?.forEach((f) => {
            const floorName = f.floor_name || (f.floor_number === 1 ? 'Ground Floor' : `Floor ${f.floor_number}`)
            const label = hasMultipleBlocks && b.block_name ? `${b.block_name} — ${floorName}` : floorName

            allFloors.push({
              id: f.id,
              floor_number: f.floor_number,
              floor_name: floorName,
              blockName: b.block_name,
              label,
            })

            f.units?.forEach((u) => {
              const computedOccupancy = getOccupancyStatusForUnit(u.id, resList)
              allUnits.push({
                ...u,
                floorId: u.floorId || f.id,
                occupancyStatus: u.occupancyStatus || computedOccupancy,
              } as UnitWithOccupancy)
            })
          })
        })

        allFloors.sort((a, b) => {
          if (a.blockName !== b.blockName) {
            return (a.blockName || '').localeCompare(b.blockName || '')
          }
          return a.floor_number - b.floor_number
        })

        setFloors(allFloors)
        setUnits(allUnits)

        if (isEditMode && editResidentId) {
          const targetRes = resList.find((r) => r.id === editResidentId)
          if (targetRes) {
            const targetUnit = allUnits.find((u) => u.id === targetRes.unitId)
            if (targetUnit) {
              const targetFloor = allFloors.find((f) => f.id === targetUnit.floorId)
              if (targetFloor) {
                setSelectedFloorId(targetFloor.id)
              }
            }
            resetForm({
              unitId: targetRes.unitId,
              locId: targetRes.locId,
              residentType: targetRes.residentType,
              ownershipType: targetRes.ownershipType || 'PRIMARY',
              isResiding: targetRes.isResiding,
              firstName: targetRes.firstName,
              lastName: targetRes.lastName || '',
              gender: targetRes.gender || 'MALE',
              dob: targetRes.dob || '',
              username: targetRes.username || '',
              password: '',
              email: targetRes.email || '',
              phone: targetRes.phone || '',
              emergencyContact: targetRes.emergencyContact || '',
              bloodGroup: targetRes.bloodGroup || '',
              photoUrl: targetRes.photoUrl || '',
              moveInDate: targetRes.moveInDate || new Date().toISOString().split('T')[0],
              familyMembers: (targetRes.familyMembers || []).map((fm) => ({
                id: fm.id,
                residentId: fm.residentId,
                firstName: fm.firstName,
                lastName: fm.lastName || '',
                relation: fm.relation || 'Spouse',
                isResiding: fm.isResiding !== undefined ? fm.isResiding : targetRes.isResiding,
                gender: fm.gender || 'MALE',
                dob: fm.dob || '',
                phone: fm.phone || '',
                email: fm.email || '',
                bloodGroup: fm.bloodGroup || '',
                photoUrl: fm.photoUrl || '',
                username: fm.username || '',
                password: '',
              })),
            })
          }
        } else if (allFloors.length > 0) {
          const firstFloorId = allFloors[0].id
          setSelectedFloorId(firstFloorId)
          const unitsOnFirstFloor = allUnits.filter((u) => u.floorId === firstFloorId)
          const firstAvailable = unitsOnFirstFloor.find((u) => !checkIsUnitOccupied(u))
          if (firstAvailable) {
            setValue('unitId', firstAvailable.id)
          } else {
            setValue('unitId', '')
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return
        setFormError(err instanceof Error ? err.message : 'Failed to load property units')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void init()
    return () => {
      isMounted = false
    }
  }, [selectedLocationId, isEditMode, editResidentId, setValue, resetForm])

  // Family Members helpers
  const handleAddFamilyMember = () => {
    appendFamilyMember({
      firstName: '',
      lastName: '',
      relation: 'Spouse',
      isResiding: watchedIsResiding,
      gender: 'MALE',
      dob: '',
      bloodGroup: '',
      photoUrl: '',
      phone: '',
      email: '',
      username: '',
      password: '',
    })
  }

  const handleRemoveFamilyMember = (index: number) => {
    removeFamilyMember(index)
  }

  const onInvalid = (fieldErrors: FieldErrors<ResidentFormValues>) => {
    console.error('Form Validation Errors on Submit:', fieldErrors)
    let desc = 'Please fill in all mandatory required fields highlighted in red.'
    if (fieldErrors.phone) desc = fieldErrors.phone.message as string
    else if (fieldErrors.email) desc = fieldErrors.email.message as string
    else if (fieldErrors.dob) desc = fieldErrors.dob.message as string
    else if (fieldErrors.gender) desc = fieldErrors.gender.message as string
    else if (fieldErrors.firstName) desc = fieldErrors.firstName.message as string
    else if (fieldErrors.unitId) desc = fieldErrors.unitId.message as string
    else if (fieldErrors.familyMembers) desc = 'Please resolve validation errors in Family Members section.'

    notifyError('Validation Error', desc)
  }

  const onSubmit = async (values: ResidentFormValues) => {
    setFormError(null)
    setFormSuccess(null)

    setIsSubmitting(true)

    const payload: CreateResidentPayload = {
      ...values,
      isResiding: values.residentType === 'TENANT' ? true : values.isResiding,
      familyMembers: values.familyMembers || [],
    }

    try {
      if (isEditMode && editResidentId) {
        await residentService.updateResident(editResidentId, payload)
        const msg = 'Resident details updated successfully!'
        setFormSuccess(msg)
        notifySuccess('Resident Profile Updated', msg)
      } else {
        await residentService.createResident(payload)
        const msg = 'Resident onboarded successfully!'
        setFormSuccess(msg)
        notifySuccess('Resident Onboarded Successfully', msg)
      }
      setTimeout(() => {
        navigate(backUrl)
      }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save resident record'
      setFormError(msg)
      notifyError('Onboarding Failed', msg)
      setIsSubmitting(false)
    }
  }

  // Filter available units based on Resident Type
  // For Tenants: Only show units that have an already registered Off-site Owner (isResiding === false)
  const availableUnits = units.filter((u) => {
    if (watchedResidentType === 'TENANT') {
      const hasOffsiteOwner = existingResidents.some(
        (r) => r.unitId === u.id && r.residentType === 'OWNER' && !r.isResiding,
      )
      return hasOffsiteOwner
    }
    return true
  })

  // Filter units for the selected floor
  const filteredFloorUnits = availableUnits.filter((u) => u.floorId === selectedFloorId)

  const isOwnerMissingForTenant = watchedResidentType === 'TENANT' && availableUnits.length === 0

  const handleFloorChange = (floorId: string) => {
    setSelectedFloorId(floorId)
    const unitsOnFloor = availableUnits.filter((u) => u.floorId === floorId)
    const firstSelectable = unitsOnFloor.find((u) => !checkIsUnitOccupied(u) || (isEditMode && u.id === watchedUnitId))
    if (firstSelectable) {
      setValue('unitId', firstSelectable.id, { shouldValidate: true })
    } else {
      setValue('unitId', '', { shouldValidate: true })
    }
  }

  const handleResidentTypeChange = (newType: ResidentType) => {
    setValue('residentType', newType, { shouldValidate: true })
    if (newType === 'TENANT') {
      setValue('isResiding', true)
    }

    const newAvailableUnits = units.filter((u) => {
      if (newType === 'TENANT') {
        return existingResidents.some((r) => r.unitId === u.id && r.residentType === 'OWNER' && !r.isResiding)
      }
      return true
    })

    const unitsOnCurrentFloor = newAvailableUnits.filter((u) => u.floorId === selectedFloorId)
    const firstSelectable = unitsOnCurrentFloor.find(
      (u) => !checkIsUnitOccupied(u) || (isEditMode && u.id === watchedUnitId),
    )
    if (firstSelectable) {
      setValue('unitId', firstSelectable.id)
    } else {
      const firstFloorWithUnits = floors.find((f) => newAvailableUnits.some((u) => u.floorId === f.id))
      if (firstFloorWithUnits) {
        setSelectedFloorId(firstFloorWithUnits.id)
        const firstUnit = newAvailableUnits.find(
          (u) =>
            u.floorId === firstFloorWithUnits.id && (!checkIsUnitOccupied(u) || (isEditMode && u.id === watchedUnitId)),
        )
        if (firstUnit) {
          setValue('unitId', firstUnit.id)
        } else {
          setValue('unitId', '')
        }
      } else {
        setValue('unitId', '')
      }
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Back Navigation Link */}
      <button
        type="button"
        onClick={() => navigate(backUrl)}
        className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#005390] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Resident Directory
      </button>

      {/* Page Header Card */}
      <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#005390]/10 text-[#005390] shadow-xs">
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
              {isEditMode ? 'Edit Resident Profile' : 'Onboard Resident / Tenant'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Register flat owner or tenant, set physically residing status, add family members, and configure mobile
              credentials.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(backUrl)}
          className="rounded-xl border-gray-200 shrink-0"
        >
          Cancel & Back
        </Button>
      </div>

      {formError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 font-bold flex items-center gap-2 shadow-xs">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-700 font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-3xl border border-white/60 bg-white/80 p-12 text-center text-sm text-gray-400 shadow-xl backdrop-blur-xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#005390]" />
          Loading property units...
        </div>
      ) : (
        <form onSubmit={handleHookSubmit(onSubmit, onInvalid)} className="space-y-6">
          {/* Section 1: Resident Type & Residing Status Card (PLACED ON TOP) */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 pb-3">
              <UserCheck className="w-5 h-5 text-[#005390]" />
              Resident Type & Residing Status
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label htmlFor="select-resident-type" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Resident Role Type
                </label>
                <select
                  id="select-resident-type"
                  value={watchedResidentType}
                  disabled={isEditMode}
                  onChange={(e) => handleResidentTypeChange(e.target.value as ResidentType)}
                  className={cn(
                    'h-9 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-1 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 shadow-2xs',
                    isEditMode && 'bg-gray-100/80 text-gray-500 cursor-not-allowed border-gray-200',
                  )}
                >
                  <option value="OWNER">Owner (Property Owner)</option>
                  <option value="TENANT">Tenant (Renter)</option>
                </select>
                {isEditMode ? (
                  <p className="mt-1 text-[11px] font-medium text-gray-400">
                    Resident role type (Owner/Tenant) cannot be changed while editing.
                  </p>
                ) : (
                  errors.residentType && (
                    <p className="mt-1 text-xs font-semibold text-red-500">{errors.residentType.message}</p>
                  )
                )}
              </div>

              {watchedResidentType !== 'TENANT' && (
                <div>
                  <label htmlFor="select-residing-key" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Residing Status
                  </label>
                  <select
                    id="select-residing-key"
                    value={watchedIsResiding ? 'true' : 'false'}
                    disabled={isEditingOwnerResidingDisabled}
                    onChange={(e) => setValue('isResiding', e.target.value === 'true')}
                    className={cn(
                      'h-9 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-1 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 shadow-2xs',
                      isEditingOwnerResidingDisabled &&
                        'bg-gray-100/80 text-gray-500 cursor-not-allowed border-gray-200',
                    )}
                  >
                    <option value="true">Physically Residing (Living in Flat)</option>
                    <option value="false">Off-site Landlord (Non-residing)</option>
                  </select>
                  {isEditingOwnerResidingDisabled && (
                    <p className="mt-1 text-[11px] font-semibold text-amber-600">
                      Residing status cannot be changed to Physically Residing because this flat is currently occupied
                      by a tenant.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Mandatory Off-site Owner Hint Banner for Tenants */}
            {watchedResidentType === 'TENANT' && availableUnits.length === 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl flex items-start gap-2.5 shadow-xs">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>No Eligible Units for Tenant Onboarding:</strong> Tenants can only be onboarded to flats that
                  already have a registered <strong>Off-site Owner (Landlord)</strong>. Please onboard an Off-site Owner
                  first.
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Property & Unit Selection Card */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 pb-3">
              <Building2 className="w-5 h-5 text-[#005390]" />
              Property & Flat Unit Mapping
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label htmlFor="select-floor" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Floor <span className="text-red-500 font-bold">*</span>
                </label>
                <select
                  id="select-floor"
                  value={selectedFloorId}
                  onChange={(e) => handleFloorChange(e.target.value)}
                  className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-1 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 shadow-2xs"
                >
                  <option value="">Select Floor...</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="select-unit" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Property Flat / Unit <span className="text-red-500 font-bold">*</span>
                </label>
                <select
                  id="select-unit"
                  {...register('unitId')}
                  disabled={!selectedFloorId}
                  className={`h-9 w-full rounded-xl border bg-white px-3.5 py-1 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 shadow-2xs ${
                    errors.unitId ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200'
                  } disabled:bg-gray-100 disabled:opacity-70`}
                >
                  {!selectedFloorId ? (
                    <option value="">Select Floor first...</option>
                  ) : filteredFloorUnits.length === 0 ? (
                    <option value="">No flats available on this floor</option>
                  ) : (
                    <>
                      <option value="">Select Flat...</option>
                      {filteredFloorUnits.map((u) => {
                        const isOccupied = checkIsUnitOccupied(u)
                        const isDisabled = isOccupied && (!isEditMode || u.id !== watchedUnitId)

                        return (
                          <option
                            key={u.id}
                            value={u.id}
                            disabled={isDisabled}
                            className={
                              isDisabled ? 'text-gray-400 bg-gray-100 font-normal' : 'text-gray-900 font-medium'
                            }
                          >
                            Unit {u.unit_number} ({u.unit_type}) — Occupancy: {u.occupancyStatus || 'VACANT'}{' '}
                            {isDisabled ? '(Occupied - Unavailable)' : ''}
                          </option>
                        )
                      })}
                    </>
                  )}
                </select>
                {errors.unitId && <p className="mt-1 text-xs font-semibold text-red-500">{errors.unitId.message}</p>}
              </div>
            </div>
          </div>

          {/* Section 3: Personal & Family Information Card */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 pb-3">
              <UserPlus className="w-5 h-5 text-[#005390]" />
              Personal & Family Profile
            </h2>

            {/* Main Resident Profile Photo Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden shadow-2xs group-hover:border-[#005390] transition">
                  {watchedPhotoUrl ? (
                    <img src={watchedPhotoUrl} alt="Main Resident" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 p-2 text-center">
                      <Camera className="w-6 h-6 mb-1 text-[#005390]" />
                      <span className="text-[10px] font-semibold text-gray-500">Upload Photo</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  id="main-resident-photo-upload"
                  onChange={(e) => handlePhotoUpload(e, (url) => setValue('photoUrl', url, { shouldValidate: true }))}
                  className="hidden"
                />
                <label
                  htmlFor="main-resident-photo-upload"
                  className="absolute -bottom-2 -right-2 bg-[#005390] text-white p-1.5 rounded-xl shadow-md cursor-pointer hover:bg-[#003d6b] transition"
                  title="Upload Resident Photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </label>
                {watchedPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setValue('photoUrl', '')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition"
                    title="Remove Photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-1 text-center sm:text-left pt-1">
                <h3 className="text-sm font-bold text-gray-800">Main Resident Profile</h3>
                <p className="text-xs text-gray-500">
                  Enter primary occupant details including full name, gender, date of birth, blood group, and contact
                  details.
                </p>
              </div>
            </div>

            {/* Main Resident Input Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="First Name"
                required
                {...register('firstName')}
                error={errors.firstName?.message}
                placeholder="e.g. Rahul"
              />
              <Input
                label="Last Name"
                {...register('lastName')}
                error={errors.lastName?.message}
                placeholder="e.g. Sharma"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label htmlFor="resident-gender-select" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Gender <span className="text-red-500 font-bold">*</span>
                </label>
                <select
                  id="resident-gender-select"
                  {...register('gender')}
                  className={cn(
                    'h-9 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3.5 py-1 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20',
                    errors.gender && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                  )}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                {errors.gender && <p className="mt-1 text-xs font-semibold text-red-500">{errors.gender.message}</p>}
              </div>

              <Input label="Date of Birth" required type="date" {...register('dob')} error={errors.dob?.message} />

              <div>
                <label
                  htmlFor="resident-blood-group-select"
                  className="block text-xs font-semibold text-gray-700 mb-1.5"
                >
                  Blood Group
                </label>
                <select
                  id="resident-blood-group-select"
                  {...register('bloodGroup')}
                  className="h-9 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3.5 py-1 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20"
                >
                  <option value="">Select Blood Group...</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Mobile Phone"
                required
                {...register('phone')}
                error={errors.phone?.message}
                placeholder="e.g. 9876543210"
                icon={<Phone className="h-4 w-4 text-gray-400" />}
              />
              <Input
                label="Email Address"
                required
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="e.g. rahul@example.com"
                icon={<Mail className="h-4 w-4 text-gray-400" />}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Emergency Contact Phone"
                {...register('emergencyContact')}
                error={errors.emergencyContact?.message}
                placeholder="e.g. 99887 76655"
                icon={<Phone className="h-4 w-4 text-gray-400" />}
              />
              <Input
                label="Move-In Date"
                required
                type="date"
                {...register('moveInDate')}
                error={errors.moveInDate?.message}
              />
            </div>

            {/* Dynamic Family Members Section (Vertical Cards) */}
            <div className="mt-6 pt-5 border-t border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-gray-800 text-sm">
                  <Users className="w-4 h-4 text-[#005390]" />
                  Family Members (Living in this Flat)
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddFamilyMember}
                  className="rounded-xl border-[#005390]/20 text-[#005390] hover:bg-[#005390]/10 font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Add Family Member
                </Button>
              </div>

              {familyMemberFields.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">No family members added yet.</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Click "+ Add Family Member" above to add relatives living in this flat.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {familyMemberFields.map((fieldItem, idx) => {
                    const fm = watchedFamilyMembers?.[idx] || fieldItem
                    const fmErrors = errors.familyMembers?.[idx]

                    return (
                      <div
                        key={fieldItem.id}
                        className="p-5 bg-white border border-gray-200/90 rounded-2xl shadow-xs space-y-4 relative transition hover:border-[#005390]/40"
                      >
                        {/* Card Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#005390]/10 text-[#005390] font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-xs text-gray-800">
                              {fm.firstName
                                ? `${fm.firstName} ${fm.lastName || ''}`.trim()
                                : `Family Member #${idx + 1}`}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold text-[#005390] bg-blue-50 rounded-md border border-blue-100">
                              {fm.relation || 'Relative'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFamilyMember(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Vertical Form Grid inside Family Member Card */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                          {/* Family Member Photo Upload Thumbnail */}
                          <div className="relative group shrink-0">
                            <div className="w-20 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden">
                              {fm.photoUrl ? (
                                <img
                                  src={fm.photoUrl}
                                  alt={`Family Member ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-gray-400 p-1 text-center">
                                  <Camera className="w-5 h-5 mb-0.5 text-[#005390]" />
                                  <span className="text-[9px] font-semibold text-gray-400">Photo</span>
                                </div>
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              id={`fm-photo-upload-${idx}`}
                              onChange={(e) =>
                                handlePhotoUpload(e, (url) =>
                                  setValue(`familyMembers.${idx}.photoUrl`, url, { shouldValidate: true }),
                                )
                              }
                              className="hidden"
                            />
                            <label
                              htmlFor={`fm-photo-upload-${idx}`}
                              className="absolute -bottom-1.5 -right-1.5 bg-[#005390] text-white p-1 rounded-lg shadow-sm cursor-pointer hover:bg-[#003d6b] transition"
                              title="Upload Photo"
                            >
                              <Camera className="w-3 h-3" />
                            </label>
                            {fm.photoUrl && (
                              <button
                                type="button"
                                onClick={() => setValue(`familyMembers.${idx}.photoUrl`, '')}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 rounded-full shadow-sm hover:bg-red-600 transition"
                                title="Remove Photo"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>

                          {/* Form Input Grid */}
                          <div className="flex-1 w-full space-y-3">
                            {/* Row 1: First Name & Last Name */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label
                                  htmlFor={`fm-first-name-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  First Name <span className="text-red-500 font-bold">*</span>
                                </label>
                                <input
                                  id={`fm-first-name-${idx}`}
                                  type="text"
                                  placeholder="e.g. Ananya"
                                  {...register(`familyMembers.${idx}.firstName`)}
                                  className={cn(
                                    'h-9 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20',
                                    fmErrors?.firstName && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                                  )}
                                />
                                {fmErrors?.firstName && (
                                  <p className="mt-1 text-xs font-semibold text-red-500">
                                    {fmErrors.firstName.message}
                                  </p>
                                )}
                              </div>
                              <div>
                                <label
                                  htmlFor={`fm-last-name-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Last Name
                                </label>
                                <input
                                  id={`fm-last-name-${idx}`}
                                  type="text"
                                  placeholder="e.g. Sharma"
                                  {...register(`familyMembers.${idx}.lastName`)}
                                  className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20"
                                />
                              </div>
                            </div>

                            {/* Row 2: Relation & Gender */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label
                                  htmlFor={`fm-relation-select-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Relation <span className="text-red-500 font-bold">*</span>
                                </label>
                                <select
                                  id={`fm-relation-select-${idx}`}
                                  {...register(`familyMembers.${idx}.relation`)}
                                  className={cn(
                                    'h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20',
                                    fmErrors?.relation && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                                  )}
                                >
                                  <option value="Spouse">Spouse</option>
                                  <option value="Son">Son</option>
                                  <option value="Daughter">Daughter</option>
                                  <option value="Father">Father</option>
                                  <option value="Mother">Mother</option>
                                  <option value="Brother">Brother</option>
                                  <option value="Sister">Sister</option>
                                  <option value="Other">Other</option>
                                </select>
                                {fmErrors?.relation && (
                                  <p className="mt-1 text-xs font-semibold text-red-500">{fmErrors.relation.message}</p>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor={`fm-gender-select-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Gender <span className="text-red-500 font-bold">*</span>
                                </label>
                                <select
                                  id={`fm-gender-select-${idx}`}
                                  {...register(`familyMembers.${idx}.gender`)}
                                  className={cn(
                                    'h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20',
                                    fmErrors?.gender && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                                  )}
                                >
                                  <option value="MALE">Male</option>
                                  <option value="FEMALE">Female</option>
                                  <option value="OTHER">Other</option>
                                </select>
                                {fmErrors?.gender && (
                                  <p className="mt-1 text-xs font-semibold text-red-500">{fmErrors.gender.message}</p>
                                )}
                              </div>
                            </div>

                            {/* Row 3: Date of Birth & Blood Group */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label
                                  htmlFor={`fm-dob-input-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Date of Birth <span className="text-red-500 font-bold">*</span>
                                </label>
                                <input
                                  id={`fm-dob-input-${idx}`}
                                  type="date"
                                  {...register(`familyMembers.${idx}.dob`)}
                                  className={cn(
                                    'h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20',
                                    fmErrors?.dob && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                                  )}
                                />
                                {fmErrors?.dob && (
                                  <p className="mt-1 text-xs font-semibold text-red-500">{fmErrors.dob.message}</p>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor={`fm-blood-group-select-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Blood Group
                                </label>
                                <select
                                  id={`fm-blood-group-select-${idx}`}
                                  {...register(`familyMembers.${idx}.bloodGroup`)}
                                  className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20"
                                >
                                  <option value="">Select Blood Group...</option>
                                  <option value="A+">A+</option>
                                  <option value="A-">A-</option>
                                  <option value="B+">B+</option>
                                  <option value="B-">B-</option>
                                  <option value="AB+">AB+</option>
                                  <option value="AB-">AB-</option>
                                  <option value="O+">O+</option>
                                  <option value="O-">O-</option>
                                </select>
                              </div>
                            </div>

                            {/* Row 4: Phone & Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label
                                  htmlFor={`fm-phone-input-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Mobile Phone <span className="text-red-500 font-bold">*</span>
                                </label>
                                <input
                                  id={`fm-phone-input-${idx}`}
                                  type="text"
                                  placeholder="e.g. 9876543210"
                                  {...register(`familyMembers.${idx}.phone`)}
                                  className={cn(
                                    'h-9 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20',
                                    fmErrors?.phone && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                                  )}
                                />
                                {fmErrors?.phone && (
                                  <p className="mt-1 text-xs font-semibold text-red-500">{fmErrors.phone.message}</p>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor={`fm-email-input-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Email Address <span className="text-red-500 font-bold">*</span>
                                </label>
                                <input
                                  id={`fm-email-input-${idx}`}
                                  type="email"
                                  placeholder="e.g. member@example.com"
                                  {...register(`familyMembers.${idx}.email`)}
                                  className={cn(
                                    'h-9 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20',
                                    fmErrors?.email && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                                  )}
                                />
                                {fmErrors?.email && (
                                  <p className="mt-1 text-xs font-semibold text-red-500">{fmErrors.email.message}</p>
                                )}
                              </div>
                            </div>

                            {/* Mobile App Login Credentials for Family Member */}
                            <div className="pt-3 border-t border-gray-100">
                              <label
                                htmlFor={`fm-login-access-${idx}`}
                                className="inline-flex items-center gap-2 text-xs font-semibold text-[#005390] cursor-pointer"
                              >
                                <input
                                  id={`fm-login-access-${idx}`}
                                  type="checkbox"
                                  checked={Boolean(fm?.username)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setValue(
                                        `familyMembers.${idx}.username`,
                                        `${(fm?.firstName || 'member').toLowerCase()}_${Date.now().toString().slice(-4)}`,
                                        { shouldValidate: true },
                                      )
                                    } else {
                                      setValue(`familyMembers.${idx}.username`, '', { shouldValidate: true })
                                      setValue(`familyMembers.${idx}.password`, '', { shouldValidate: true })
                                    }
                                  }}
                                  className="rounded border-gray-300 text-[#005390] focus:ring-[#005390]"
                                />
                                <KeyRound className="w-3.5 h-3.5" />
                                Enable Individual Mobile App Login Credentials
                              </label>

                              {Boolean(fm?.username) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                                  <div>
                                    <label
                                      htmlFor={`fm-username-input-${idx}`}
                                      className="block text-[10px] font-semibold text-gray-600 mb-1"
                                    >
                                      Username Handle
                                    </label>
                                    <input
                                      id={`fm-username-input-${idx}`}
                                      type="text"
                                      placeholder="e.g. priya_101"
                                      {...register(`familyMembers.${idx}.username`)}
                                      className={cn(
                                        'h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-900 font-mono',
                                        fmErrors?.username && 'border-red-500',
                                      )}
                                    />
                                    {fmErrors?.username && (
                                      <p className="mt-1 text-[10px] font-semibold text-red-500">
                                        {fmErrors.username.message}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <label
                                      htmlFor={`fm-password-input-${idx}`}
                                      className="block text-[10px] font-semibold text-gray-600 mb-1"
                                    >
                                      Initial Password
                                    </label>
                                    <input
                                      id={`fm-password-input-${idx}`}
                                      type="password"
                                      placeholder="Default: Resident@123"
                                      {...register(`familyMembers.${idx}.password`)}
                                      className={cn(
                                        'h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-900',
                                        fmErrors?.password && 'border-red-500',
                                      )}
                                    />
                                    {fmErrors?.password && (
                                      <p className="mt-1 text-[10px] font-semibold text-red-500">
                                        {fmErrors.password.message}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Mobile App Credentials Card */}
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 pb-3">
              <KeyRound className="w-5 h-5 text-[#005390]" />
              Mobile App Login Account
            </h2>

            <div className="p-5 bg-blue-50/50 border border-blue-100/80 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <Input
                label="Mobile Username Handle"
                {...register('username')}
                error={errors.username?.message}
                placeholder="e.g. rahul_101"
              />
              <Input
                label="Initial Password"
                type="password"
                {...register('password')}
                error={errors.password?.message}
                placeholder="Default: Resident@123"
              />
            </div>
          </div>

          {/* Action Footer Card (Matching Employee Screen Footer) */}
          <div className="flex items-center justify-end gap-3 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/residents')}
              className="rounded-xl border-gray-200"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting || isOwnerMissingForTenant}
              title={isOwnerMissingForTenant ? 'Owner must be onboarded first before onboarding a tenant' : ''}
              className="bg-[#005390] hover:bg-[#003d6b] text-white rounded-xl shadow-md shadow-[#005390]/20 font-semibold"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {isEditMode ? 'Updating Resident...' : 'Saving Resident...'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  {isEditMode ? 'Update Resident' : 'Save & Onboard Resident'}
                </span>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default OnboardResidentScreen
