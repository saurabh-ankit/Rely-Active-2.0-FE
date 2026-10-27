import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageLoader from '@/components/shared/PageLoader'
import { type FieldPath, useFieldArray, useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Camera,
  Check,
  CheckCircle2,
  IndianRupee,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Plus,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import type {
  CreateResidentPayload,
  ResidentItem,
  ResidentType,
  UnitChangeChoices,
  UnitChangeImpact,
} from '@/lib/types'
import { residentService } from '@/lib/services/residentService'
import { getPropertyByIdAPI } from '@/lib/services/propertyService'
import { useCarePackagesQuery } from '@/hooks/react-query/medical'
import type { CarePackage } from '@/lib/types/medical'
import { getCareTaskAssignmentsAPI } from '@/lib/services/medicalService'
import api from '@/lib/api/axios'
import {
  OnboardFoodPackages,
  type ExistingFoodPackage,
  type FoodPackageChoice,
  type FoodPackagePerson,
} from './OnboardFoodPackages'
import { useQuery } from '@tanstack/react-query'
import { FamilyCarePackages, type FamilyCareRow } from './FamilyCarePackages'
import { AssignedPackage } from './AssignedPackage'
import { UnitChangePanel } from './UnitChangePanel'
import type { PropertyUnit } from '@/pages/Property/types'
import { useLocationContext } from '@/hooks/useLocation'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { cn, getFileUrl } from '@/lib/utils'
import { floorLabel, isHiddenFloor } from '@/utils/unitLabel'

import { notifyError, notifySuccess } from '@/utils/toast'
import type { FieldErrors } from 'react-hook-form'
import {
  PackageTaskSchedulesConfig,
  type PackageTaskItemInfo,
  type TaskScheduleConfig,
} from '@/components/common/PackageTaskSchedulesConfig'

/** One numbered step of the form: a white card with a short title and hint. */
/** Today as YYYY-MM-DD in local time. */
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Start date of the resident's active care package subscription, if any. */
const currentCareStart = (r: ResidentItem) => {
  const sub = (r.packageSubscriptions || []).find((s) => s.status === 'ACTIVE' && !s.isPrevious && !s.familyMemberId)
  return sub?.startDate ? String(sub.startDate).slice(0, 10) : ''
}

function StepCard({
  step,
  title,
  hint,
  action,
  children,
}: {
  step: number
  title: string
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="gap-0 rounded-2xl border-gray-100 bg-white p-5 shadow-2xs md:p-6 dark:border-gray-800 dark:bg-slate-900">
      <CardHeader className="mb-5 flex flex-wrap flex-row items-start justify-between gap-3 p-0">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#005390] text-xs font-bold text-white">
            {step}
          </span>
          <div>
            <CardTitle className="text-base font-bold text-gray-900 dark:text-white">{title}</CardTitle>
            {hint && <CardDescription className="text-xs text-gray-500">{hint}</CardDescription>}
          </div>
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  )
}

/** A large selectable option with a title and one-line explanation. */
function ChoiceCard({
  selected,
  disabled,
  title,
  hint,
  onSelect,
}: {
  selected: boolean
  disabled?: boolean
  title: string
  hint: string
  onSelect: () => void
}) {
  return (
    <Button
      variant="ghost"
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full h-auto items-start gap-3 rounded-xl border p-3.5 text-left transition-colors font-normal whitespace-normal justify-start',
        selected
          ? 'border-[#005390] bg-[#005390]/5 ring-2 ring-[#005390]/15 hover:bg-[#005390]/5'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
          selected ? 'border-[#005390] bg-[#005390]' : 'border-gray-300 bg-white',
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span>
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
    </Button>
  )
}

const selectClass =
  'h-9 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3.5 py-1 text-xs font-medium text-gray-900 shadow-2xs focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70'

function formatTimeTo12h(time24: string): string {
  if (!time24) return '10:00 AM'
  const trimmed = time24.trim()
  if (/^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i.test(trimmed)) {
    return trimmed.toUpperCase()
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return time24
  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${String(hours).padStart(2, '0')}:${minutes} ${meridiem}`
}

function formatTimeTo24h(time12: string): string {
  if (!time12) return '10:00'
  const trimmed = time12.trim()
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!match) {
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      const [h, m] = trimmed.split(':')
      return `${h.padStart(2, '0')}:${m}`
    }
    return '10:00'
  }
  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const meridiem = match[3]?.toUpperCase()
  if (meridiem === 'PM' && hours < 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0
  return `${String(hours).padStart(2, '0')}:${minutes}`
}

function extractApiErrorMessage(err: unknown, defaultFallback: string): string {
  if (!err) return defaultFallback
  const apiErr = err as {
    response?: {
      data?:
        | {
            message?: string | string[]
            error?: string | { message?: string }
            errors?: Record<string, string[]> | string[]
          }
        | string
    }
    message?: string
  }

  const responseData = apiErr?.response?.data

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData.trim()
  }

  if (responseData && typeof responseData === 'object') {
    if (typeof responseData.message === 'string' && responseData.message.trim()) {
      return responseData.message.trim()
    }
    if (Array.isArray(responseData.message) && responseData.message.length > 0) {
      return String(responseData.message[0]).trim()
    }
    if (typeof responseData.error === 'string' && responseData.error.trim()) {
      return responseData.error.trim()
    }
    if (typeof responseData.error === 'object' && responseData.error?.message) {
      return String(responseData.error.message).trim()
    }
    if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
      const first = responseData.errors[0]
      if (typeof first === 'string') return first.trim()
      if (typeof first === 'object' && first !== null && 'message' in first) {
        return String((first as { message?: unknown }).message).trim()
      }
    }
    if (responseData.errors && typeof responseData.errors === 'object') {
      const keys = Object.keys(responseData.errors)
      if (keys.length > 0) {
        const val = responseData.errors[keys[0]]
        if (Array.isArray(val) && val.length > 0) return String(val[0]).trim()
        if (typeof val === 'string') return val.trim()
      }
    }
  }

  if (err instanceof Error && err.message && !err.message.toLowerCase().includes('status code')) {
    return err.message.trim()
  }

  return defaultFallback
}

const familyMemberSchema = z.object({
  id: z.string().optional(),
  residentId: z.string().optional(),
  carePackageId: z.string().optional().or(z.literal('')),
  carePackageStartDate: z.string().optional().or(z.literal('')),
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .refine((val) => !/\d/.test(val), 'First name cannot contain numbers'),
  lastName: z
    .string()
    .trim()
    .max(50, 'Last name cannot exceed 50 characters')
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || !/\d/.test(val), 'Last name cannot contain numbers'),
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
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .refine((val) => !/\d/.test(val), 'First name cannot contain numbers'),
  lastName: z
    .string()
    .trim()
    .max(50, 'Last name cannot exceed 50 characters')
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || !/\d/.test(val), 'Last name cannot contain numbers'),
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
  rentAmount: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), 'Rent amount must be a non-negative number'),
  payRentToCompany: z.boolean().default(false),
  carePackageId: z.string().optional().or(z.literal('')),
  carePackageStartDate: z.string().optional().or(z.literal('')),
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
  /** Hidden floor of an entity without floors (villas, plots…): never shown, picked automatically. */
  hidden: boolean
}

interface BlockOption {
  id: string
  block_name: string
  /** The entity (Apartment, Villa…) this block belongs to; hidden blocks stand in for skipped levels. */
  entityId?: string | null
  is_virtual?: boolean
  floors: Array<{
    id: string
    floor_number: number
    floor_name?: string | null
    floor_type?: string | null
    is_virtual?: boolean
    units?: UnitWithOccupancy[]
  }>
}

const toFloorOptions = (block: BlockOption): FloorOption[] =>
  block.floors
    .map((f) => {
      const label = floorLabel(f) ?? 'All units'
      return {
        id: f.id,
        floor_number: f.floor_number,
        floor_name: label,
        blockName: block.block_name || '',
        label,
        hidden: isHiddenFloor(f),
      }
    })
    .sort((a, b) => a.floor_number - b.floor_number)

/** An entity of the property and the levels it uses, e.g. Villa → ['unit'] labelled "Villa". */
interface EntityOption {
  key: string
  name: string
  levels: Array<'block' | 'floor' | 'unit'>
  labels: Partial<Record<'block' | 'floor' | 'unit', string>>
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

  const [blocks, setBlocks] = useState<BlockOption[]>([])
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([])
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('')
  const [selectedBlockId, setSelectedBlockId] = useState<string>('')
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
    setError,
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
      rentAmount: '',
      payRentToCompany: false,
      carePackageId: '',
      carePackageStartDate: localToday(),
      familyMembers: [],
    },
  })

  const lettersOnly = (value: string) => value.replace(/[0-9]/g, '')

  const registerFiltered = (name: FieldPath<ResidentFormValues>, filter: (value: string) => string) => {
    const registration = register(name)
    return {
      ...registration,
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (/\d/.test(e.key)) {
          e.preventDefault()
        }
      },
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.target.value = filter(e.target.value)
        return registration.onChange(e)
      },
    }
  }

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
  const watchedPayRentToCompany = useWatch({ control, name: 'payRentToCompany' })
  const watchedCarePackageId = useWatch({ control, name: 'carePackageId' })
  // Edit mode: the flat the resident lives in now. Picking another one moves them (see UnitChangePanel).
  const [originalUnitId, setOriginalUnitId] = useState<string>('')
  const [unitChange, setUnitChange] = useState<UnitChangeChoices>({})
  const [unitChangeImpact, setUnitChangeImpact] = useState<UnitChangeImpact | null>(null)
  const isMovingFlat = isEditMode && !!originalUnitId && !!watchedUnitId && watchedUnitId !== originalUnitId
  // Edit mode: the care package the resident has now, which keeps its own start date.
  const [originalCare, setOriginalCare] = useState<{ packageId: string; startDate: string } | null>(null)
  const keepsCurrentCare = !!originalCare && watchedCarePackageId === originalCare.packageId
  // Edit mode: each family member's current care package, by family member id.
  const [originalFamilyCare, setOriginalFamilyCare] = useState<
    Record<string, { packageId: string; startDate: string }>
  >({})
  const pickCarePackage = (packageId: string) => {
    setValue('carePackageId', packageId, { shouldValidate: true })
    setValue(
      'carePackageStartDate',
      originalCare && packageId === originalCare.packageId ? originalCare.startDate : localToday(),
    )
  }

  const isResidingEffective = watchedResidentType === 'TENANT' ? true : Boolean(watchedIsResiding)

  // Food package per person, keyed 'PRIMARY', the family member's id, or (new member) the row's field id.
  const [foodChoices, setFoodChoices] = useState<Record<string, FoodPackageChoice | undefined>>({})
  const memberKey = (idx: number) => watchedFamilyMembers?.[idx]?.id || familyMemberFields[idx]?.id || `row-${idx}`

  // Edit mode: the packages the resident and family members have now.
  const { data: currentFoodSubs } = useQuery({
    queryKey: ['fnb', 'resident-package', editResidentId],
    queryFn: async () => {
      const res = await api.get(`/fnb/resident-package/${editResidentId}`)
      return (res.data?.data || []) as {
        familyMemberId?: string | null
        propertyPackageId: string
        startDate: string
        diningType?: string | null
        deliveryCharge?: number | string | null
      }[]
    },
    enabled: isEditMode && !!editResidentId,
  })
  const existingFood = useMemo(() => {
    const map: Record<string, ExistingFoodPackage> = {}
    for (const s of currentFoodSubs ?? []) {
      map[s.familyMemberId || 'PRIMARY'] = {
        propertyPackageId: s.propertyPackageId,
        startDate: String(s.startDate).slice(0, 10),
      }
    }
    return map
  }, [currentFoodSubs])
  // Start the form from the current packages once they load.
  const [foodPrefilled, setFoodPrefilled] = useState(false)
  if (currentFoodSubs && !foodPrefilled) {
    setFoodPrefilled(true)
    const initial: Record<string, FoodPackageChoice> = {}
    for (const s of currentFoodSubs) {
      initial[s.familyMemberId || 'PRIMARY'] = {
        propertyPackageId: s.propertyPackageId,
        startDate: String(s.startDate).slice(0, 10),
      }
    }
    setFoodChoices(initial)
  }
  const watchedFirstName = useWatch({ control, name: 'firstName' })
  const watchedLastName = useWatch({ control, name: 'lastName' })
  // Care package per family member (stored on each familyMembers row of the form).
  const familyCareRows: FamilyCareRow[] = familyMemberFields.map((field, idx) => {
    const fm = watchedFamilyMembers?.[idx]
    return {
      index: idx,
      key: field.id,
      name: `${fm?.firstName || ''} ${fm?.lastName || ''}`.trim() || `Family member ${idx + 1}`,
      tag: fm?.relation ? `Family member · ${fm.relation}` : 'Family member',
      carePackageId: fm?.carePackageId || '',
      startDate: fm?.carePackageStartDate || '',
      current: (fm?.id && originalFamilyCare[fm.id]) || null,
    }
  })
  const pickFamilyCarePackage = (idx: number, packageId: string) => {
    const current = familyCareRows[idx]?.current
    setValue(`familyMembers.${idx}.carePackageId`, packageId)
    setValue(
      `familyMembers.${idx}.carePackageStartDate`,
      current && current.packageId === packageId ? current.startDate : localToday(),
    )
  }

  const foodPeople = useMemo<FoodPackagePerson[]>(
    () => [
      {
        key: 'PRIMARY',
        name: `${watchedFirstName || ''} ${watchedLastName || ''}`.trim() || 'Resident',
        tag: 'Resident',
      },
      ...familyMemberFields.map((field, idx) => {
        const fm = watchedFamilyMembers?.[idx]
        return {
          key: fm?.id || field.id,
          name: `${fm?.firstName || ''} ${fm?.lastName || ''}`.trim() || `Family member ${idx + 1}`,
          tag: fm?.relation ? `Family member · ${fm.relation}` : 'Family member',
        }
      }),
    ],
    [watchedFirstName, watchedLastName, familyMemberFields, watchedFamilyMembers],
  )

  useEffect(() => {
    if (!isResidingEffective) {
      setValue('carePackageId', '')
    }
  }, [isResidingEffective, setValue])

  // Query care packages for this property/global
  const { data: carePackagesData, isLoading: isLoadingPackages } = useCarePackagesQuery(
    { propertyId: selectedLocationId, includeGlobal: true },
    !!selectedLocationId,
  )
  const carePackages = useMemo<CarePackage[]>(() => carePackagesData?.data || [], [carePackagesData?.data])

  const selectedOnboardPackage = useMemo(() => {
    return carePackages.find((pkg) => pkg.id === watchedCarePackageId)
  }, [carePackages, watchedCarePackageId])

  const onboardPackageTasks: PackageTaskItemInfo[] = useMemo(() => {
    if (!selectedOnboardPackage) return []
    if (selectedOnboardPackage.features && selectedOnboardPackage.features.length > 0) {
      return selectedOnboardPackage.features.map((f) => ({
        taskId: f.id,
        taskName: f.taskName || f.careTaskName || 'Care Task',
        complimentaryCount: f.CarePackageFeaturesMap?.complimentaryCount ?? 0,
        billingType: f.billingType || 'SESSION',
        price: f.price || 0,
      }))
    }
    if (selectedOnboardPackage.tasks && selectedOnboardPackage.tasks.length > 0) {
      return selectedOnboardPackage.tasks.map((t) => ({
        taskId: t.taskId,
        taskName: t.taskName || t.careTaskName || 'Care Task',
        complimentaryCount: t.complimentaryCount ?? 0,
        billingType: t.billingType || 'SESSION',
        price: t.price || 0,
      }))
    }
    return []
  }, [selectedOnboardPackage])

  const [packageTaskSchedules, setPackageTaskSchedules] = useState<Record<string, TaskScheduleConfig>>({})

  // Initialize or reconcile package tasks without overwriting existing user-configured schedules
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!onboardPackageTasks || onboardPackageTasks.length === 0) {
        setPackageTaskSchedules({})
        return
      }
      setPackageTaskSchedules((prev) => {
        const updated: Record<string, TaskScheduleConfig> = {}
        for (const t of onboardPackageTasks) {
          if (prev[t.taskId]) {
            updated[t.taskId] = prev[t.taskId]
          } else {
            updated[t.taskId] = {
              taskId: t.taskId,
              taskName: t.taskName,
              frequency: 1,
              times: ['10:00'],
            }
          }
        }
        return updated
      })
    }, 0)

    return () => clearTimeout(timer)
  }, [onboardPackageTasks])

  // In edit mode, load existing package task schedules and frequencies for this resident
  useEffect(() => {
    if (!isEditMode || !editResidentId) return

    let isMounted = true
    async function fetchExistingSchedules() {
      try {
        const res = await getCareTaskAssignmentsAPI({ residentId: editResidentId })
        const assignments = (res?.data || []) as Array<{
          taskId?: string
          source?: string
          sources?: string[]
          task?: { careTaskName?: string }
          slots?: Array<{ time?: string; rawAssignment?: { time?: string } }>
          time?: string
          rawAssignment?: { time?: string }
        }>
        const existingMap: Record<string, TaskScheduleConfig> = {}

        for (const a of assignments) {
          const isPkg = a.source === 'PACKAGE' || a.sources?.includes('PACKAGE')
          if (isPkg && a.taskId) {
            if (!existingMap[a.taskId]) {
              existingMap[a.taskId] = {
                taskId: a.taskId,
                taskName: a.task?.careTaskName || 'Care Task',
                frequency: 0,
                times: [],
              }
            }
            const slotList = a.slots && a.slots.length > 0 ? a.slots : [a]
            for (const s of slotList) {
              const timeVal = s.time || s.rawAssignment?.time
              if (timeVal) {
                const formatted24h = formatTimeTo24h(timeVal)
                if (!existingMap[a.taskId].times.includes(formatted24h)) {
                  existingMap[a.taskId].times.push(formatted24h)
                }
              }
            }
          }
        }

        for (const tid of Object.keys(existingMap)) {
          existingMap[tid].frequency = Math.max(existingMap[tid].times.length, 1)
          if (existingMap[tid].times.length === 0) {
            existingMap[tid].times = ['10:00']
          }
        }

        if (isMounted && Object.keys(existingMap).length > 0) {
          setPackageTaskSchedules((prev) => ({
            ...prev,
            ...existingMap,
          }))
        }
      } catch (err) {
        console.error('Error fetching existing package schedules for resident:', err)
      }
    }

    void fetchExistingSchedules()
    return () => {
      isMounted = false
    }
  }, [isEditMode, editResidentId])

  const [enabledFmLogins, setEnabledFmLogins] = useState<Record<number, boolean>>({})

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

        setEntityOptions(
          (propDetails.entities || []).map((e) => ({
            key: e.id ?? '',
            name: e.name,
            levels: e.levels,
            labels: e.level_labels ?? {},
          })),
        )

        const loadedBlocks: BlockOption[] = (propDetails.blocks || []).map((b) => ({
          id: b.id,
          block_name: b.block_name,
          entityId: b.entityId ?? null,
          is_virtual: Boolean(b.is_virtual),
          floors: (b.floors || []).map((f) => ({
            id: f.id,
            floor_number: f.floor_number,
            floor_name: f.floor_name || (f.floor_number === 1 ? 'Ground Floor' : `Floor ${f.floor_number}`),
            // Needed to spot the hidden floor of entities without floors (villas…).
            floor_type: f.floor_type ?? null,
            is_virtual: Boolean(f.is_virtual),
            units: (f.units || []).map((u) => {
              const computedOccupancy = getOccupancyStatusForUnit(u.id, resList)
              return {
                ...u,
                floorId: u.floorId || f.id,
                occupancyStatus: u.occupancyStatus || computedOccupancy,
              } as UnitWithOccupancy
            }),
          })),
        }))

        setBlocks(loadedBlocks)

        const allUnits: UnitWithOccupancy[] = []
        loadedBlocks.forEach((b) => {
          b.floors.forEach((f) => {
            f.units?.forEach((u) => {
              allUnits.push(u)
            })
          })
        })
        setUnits(allUnits)

        if (isEditMode && editResidentId) {
          const targetRes = resList.find((r) => r.id === editResidentId)
          if (targetRes) {
            const familyCare: Record<string, { packageId: string; startDate: string }> = {}
            for (const sub of targetRes.packageSubscriptions || []) {
              if (sub.familyMemberId && sub.status === 'ACTIVE' && !sub.isPrevious) {
                familyCare[sub.familyMemberId] = {
                  packageId: sub.carePackageId,
                  startDate: String(sub.startDate).slice(0, 10),
                }
              }
            }
            setOriginalFamilyCare(familyCare)
            setOriginalUnitId(targetRes.unitId)
            if (targetRes.carePackageId) {
              setValue('carePackageId', targetRes.carePackageId)
              setOriginalCare({
                packageId: targetRes.carePackageId,
                startDate: currentCareStart(targetRes) || localToday(),
              })
            }
            const targetUnit = allUnits.find((u) => u.id === targetRes.unitId)
            if (targetUnit) {
              let targetBlock: BlockOption | undefined
              let targetFloor: BlockOption['floors'][number] | undefined

              for (const b of loadedBlocks) {
                const f = b.floors.find((fl) => fl.id === targetUnit.floorId)
                if (f) {
                  targetBlock = b
                  targetFloor = f
                  break
                }
              }

              if (targetBlock && targetFloor) {
                setSelectedEntityKey(targetBlock.entityId ?? '')
                setSelectedBlockId(targetBlock.id)
                const blockFloorOptions = toFloorOptions(targetBlock)

                setFloors(blockFloorOptions)
                setSelectedFloorId(targetFloor.id)
              }
            }

            const initLogins: Record<number, boolean> = {}
            ;(targetRes.familyMembers || []).forEach((fm, index) => {
              if (fm.username) {
                initLogins[index] = true
              }
            })
            setEnabledFmLogins(initLogins)

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
              rentAmount:
                targetRes.rentAmount !== undefined && targetRes.rentAmount !== null ? String(targetRes.rentAmount) : '',
              payRentToCompany: targetRes.payRentToCompany ?? false,
              carePackageId: targetRes.carePackageId || '',
              carePackageStartDate: currentCareStart(targetRes) || localToday(),
              familyMembers: (targetRes.familyMembers || []).map((fm) => ({
                id: fm.id,
                carePackageId: familyCare[fm.id || '']?.packageId || '',
                carePackageStartDate: familyCare[fm.id || '']?.startDate || localToday(),
                residentId: fm.residentId,
                firstName: fm.firstName,
                lastName: fm.lastName || '',
                relation: fm.relation || 'Spouse',
                isResiding: targetRes.residentType === 'TENANT' || targetRes.isResiding ? true : Boolean(fm.isResiding),
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
        } else if (loadedBlocks.length > 0) {
          const firstBlock = loadedBlocks[0]
          setSelectedEntityKey(firstBlock.entityId ?? '')
          setSelectedBlockId(firstBlock.id)

          const blockFloorOptions = toFloorOptions(firstBlock)

          setFloors(blockFloorOptions)

          if (blockFloorOptions.length > 0) {
            const firstFloorId = blockFloorOptions[0].id
            setSelectedFloorId(firstFloorId)
            const unitsOnFirstFloor = allUnits.filter((u) => u.floorId === firstFloorId)
            const firstAvailable = unitsOnFirstFloor.find((u) => !checkIsUnitOccupied(u))
            if (firstAvailable) {
              setValue('unitId', firstAvailable.id)
            } else {
              setValue('unitId', '')
            }
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

  /** Picking an entity narrows the blocks to it and skips the levels it doesn't use. */
  const handleEntityChange = (key: string) => {
    setSelectedEntityKey(key)
    const entity = entityOptions.find((e) => e.key === key)
    const entityBlocks = blocks.filter((b) => (b.entityId ?? '') === key)
    if (entity && !entity.levels.includes('block') && entityBlocks[0]) {
      // No block level (villas, or floor → unit): use its hidden block straight away.
      handleBlockChange(entityBlocks[0].id)
      return
    }
    setSelectedBlockId('')
    setFloors([])
    setSelectedFloorId('')
    setValue('unitId', '')
  }

  const handleBlockChange = (blockId: string) => {
    setSelectedBlockId(blockId)
    const targetBlock = blocks.find((b) => b.id === blockId)

    const blockFloorOptions = targetBlock ? toFloorOptions(targetBlock) : []
    setFloors(blockFloorOptions)

    // Villas…: the type has no floor level (its only floor is hidden), so go straight to the unit.
    const blockEntity = entityOptions.find((e) => e.key === (targetBlock?.entityId ?? ''))
    const typeHasNoFloors = blockEntity ? !blockEntity.levels.includes('floor') : false
    const onlyFloor = blockFloorOptions.length === 1 ? blockFloorOptions[0] : undefined
    if (onlyFloor && (onlyFloor.hidden || typeHasNoFloors)) {
      handleFloorChange(onlyFloor.id)
      return
    }
    setSelectedFloorId('')
    setValue('unitId', '')
  }

  // Family Members helpers
  const handleAddFamilyMember = () => {
    const effectiveIsResiding = watchedResidentType === 'TENANT' ? true : watchedIsResiding
    appendFamilyMember({
      firstName: '',
      lastName: '',
      relation: 'Spouse',
      isResiding: effectiveIsResiding,
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

  /**
   * Saves the food packages picked for the resident and family members. On edit, a person whose
   * package was removed is sent with no package, which ends their current one.
   */
  const saveFoodPackages = async (created: ResidentItem, values: ResidentFormValues) => {
    const createdMembers = created.familyMembers || []
    const used = new Set<string>()
    // Match each submitted family member to the one the server created (same name and relation).
    const memberIdFor = (idx: number) => {
      const fm = values.familyMembers?.[idx]
      if (fm?.id) return fm.id
      const match =
        createdMembers.find(
          (c) =>
            !used.has(c.id) &&
            c.firstName === fm?.firstName &&
            (c.lastName || '') === (fm?.lastName || '') &&
            (c.relation || '') === (fm?.relation || ''),
        ) ?? createdMembers.filter((c) => !used.has(c.id))[0]
      if (match) used.add(match.id)
      return match?.id ?? null
    }
    const people = [
      { key: 'PRIMARY', familyMemberId: null as string | null },
      ...familyMemberFields.map((_, idx) => ({ key: memberKey(idx), familyMemberId: memberIdFor(idx) })),
    ]
    const subscriptions = people.flatMap(({ key, familyMemberId }) => {
      if (key !== 'PRIMARY' && !familyMemberId) return []
      const choice = foodChoices[key]
      if (!choice) return existingFood[key] ? [{ familyMemberId, propertyPackageId: null }] : []
      return [
        {
          familyMemberId,
          propertyPackageId: choice.propertyPackageId,
          startDate: choice.startDate,
          // Food packages are dine-in only.
          diningType: 'dine_in',
          deliveryCharge: 0,
        },
      ]
    })
    if (!subscriptions.length) return
    try {
      await api.post('/fnb/resident-package', { residentId: created.id, subscriptions })
    } catch (err) {
      notifyError(
        'Food Packages Not Saved',
        `${extractApiErrorMessage(err, 'Could not save the food packages')}. Open Edit resident to try again.`,
      )
    }
  }

  const onSubmit = async (values: ResidentFormValues) => {
    setFormError(null)
    setFormSuccess(null)
    if (values.carePackageId && !keepsCurrentCare && !values.carePackageStartDate) {
      notifyError('Validation Error', 'Pick a start date for the care package.')
      return
    }
    if (
      (values.familyMembers || []).some(
        (fm) =>
          fm.carePackageId &&
          !fm.carePackageStartDate &&
          (!fm.id || originalFamilyCare[fm.id]?.packageId !== fm.carePackageId),
      )
    ) {
      notifyError('Validation Error', "Pick a start date for each family member's care package.")
      return
    }
    if (Object.values(foodChoices).some((c) => c && !c.startDate)) {
      notifyError('Validation Error', 'Pick a start date for each food package.')
      return
    }
    if (isMovingFlat && !unitChangeImpact) {
      notifyError('Please wait', 'Still checking what moves with the resident to the new flat.')
      return
    }
    if (isMovingFlat && unitChangeImpact?.blockers.length) {
      notifyError('Cannot change the flat', unitChangeImpact.blockers.join(' '))
      return
    }

    setIsSubmitting(true)

    const effectiveIsResiding = values.residentType === 'TENANT' ? true : Boolean(values.isResiding)
    const formattedTaskSchedules = Object.values(packageTaskSchedules).map((sched) => ({
      taskId: sched.taskId,
      taskName: sched.taskName,
      frequency: sched.frequency,
      times: sched.times.map((t) => formatTimeTo12h(t)),
    }))

    const payload: CreateResidentPayload = {
      ...values,
      isResiding: effectiveIsResiding,
      rentAmount:
        values.residentType === 'TENANT' && values.rentAmount !== undefined && values.rentAmount !== ''
          ? Number(values.rentAmount)
          : null,
      payRentToCompany: values.residentType === 'TENANT' ? Boolean(values.payRentToCompany) : false,
      carePackageId: effectiveIsResiding ? values.carePackageId || null : null,
      carePackageStartDate:
        effectiveIsResiding && values.carePackageId && !keepsCurrentCare ? values.carePackageStartDate || null : null,
      taskSchedules:
        effectiveIsResiding && values.carePackageId && !keepsCurrentCare && formattedTaskSchedules.length > 0
          ? formattedTaskSchedules
          : undefined,
      ...(isMovingFlat ? { unitChange } : {}),
      familyMembers: (values.familyMembers || []).map((fm) => {
        const current = fm.id ? originalFamilyCare[fm.id] : undefined
        const carePackageId = effectiveIsResiding ? fm.carePackageId || null : null
        return {
          ...fm,
          isResiding: effectiveIsResiding,
          carePackageId,
          // An unchanged package keeps its own start date.
          carePackageStartDate:
            carePackageId && current?.packageId !== carePackageId ? fm.carePackageStartDate || null : null,
        }
      }),
    }

    try {
      if (isEditMode && editResidentId) {
        const updated = await residentService.updateResident(editResidentId, payload)
        if (effectiveIsResiding) await saveFoodPackages(updated, values)
        const msg = 'Resident details updated successfully!'
        setFormSuccess(msg)
        notifySuccess('Resident Profile Updated', msg)
      } else {
        const created = await residentService.createResident(payload)
        const msg = 'Resident onboarded successfully!'
        setFormSuccess(msg)
        notifySuccess('Resident Onboarded Successfully', msg)
        if (effectiveIsResiding) await saveFoodPackages(created, values)
      }
      setTimeout(() => {
        navigate(backUrl)
      }, 1200)
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(
        err,
        isEditMode ? 'Failed to update resident record' : 'Failed to save resident record',
      )
      setFormError(msg)
      if (msg && msg.toLowerCase().includes('username')) {
        setError('username', { type: 'manual', message: msg })
      }
      notifyError(isEditMode ? 'Resident Update Failed' : 'Onboarding Failed', msg)
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

  // Entities without floors only have one hidden floor, so the Floor step is skipped.
  const activeEntity =
    entityOptions.find((e) => e.key === selectedEntityKey) ??
    (entityOptions.length === 1 ? entityOptions[0] : undefined)
  const showEntityPicker = entityOptions.length > 1
  const showBlockPicker = activeEntity ? activeEntity.levels.includes('block') : true
  const floorsHidden =
    (activeEntity ? !activeEntity.levels.includes('floor') : false) ||
    (floors.length > 0 && floors.every((f) => f.hidden))
  const blockWord = activeEntity?.labels.block?.trim() || 'Block'
  const unitWord = activeEntity?.labels.unit?.trim() || 'Flat'
  // Only this entity's own (visible) blocks.
  const blockChoices = blocks
    .filter((b) => !b.is_virtual && (!showEntityPicker || (b.entityId ?? '') === selectedEntityKey))
    .sort((a, b) => a.block_name.localeCompare(b.block_name, undefined, { numeric: true }))
  const pickerCount = [showEntityPicker, showBlockPicker, !floorsHidden, true].filter(Boolean).length

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
      <PageHeader
        icon={UserPlus}
        title={isEditMode ? 'Edit Resident' : 'Onboard Resident'}
        description={
          isEditMode
            ? 'Update this resident’s details, family members and app login.'
            : 'Add an owner or tenant to a flat in a few steps.'
        }
        onBack={() => navigate(backUrl)}
      />

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
        <PageLoader isVisible={true} message="Loading..." />
      ) : (
        <form onSubmit={handleHookSubmit(onSubmit, onInvalid)} className="space-y-6">
          <StepCard
            step={1}
            title="Owner or tenant?"
            hint={
              isEditMode
                ? 'Owner/tenant can’t be changed after onboarding.'
                : 'Tell us how this person is linked to the flat.'
            }
          >
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-700">Resident type</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ChoiceCard
                    selected={watchedResidentType === 'OWNER'}
                    disabled={isEditMode}
                    title="Owner"
                    hint="Owns the flat"
                    onSelect={() => handleResidentTypeChange('OWNER')}
                  />
                  <ChoiceCard
                    selected={watchedResidentType === 'TENANT'}
                    disabled={isEditMode}
                    title="Tenant"
                    hint="Rents the flat from its owner"
                    onSelect={() => handleResidentTypeChange('TENANT')}
                  />
                </div>
                {!isEditMode && errors.residentType && (
                  <p className="mt-1 text-xs font-semibold text-red-500">{errors.residentType.message}</p>
                )}
              </div>

              {watchedResidentType !== 'TENANT' && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-700">Does the owner live in the flat?</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ChoiceCard
                      selected={Boolean(watchedIsResiding)}
                      disabled={isEditingOwnerResidingDisabled}
                      title="Residing"
                      hint="Lives in this flat"
                      onSelect={() => setValue('isResiding', true)}
                    />
                    <ChoiceCard
                      selected={!watchedIsResiding}
                      disabled={isEditingOwnerResidingDisabled}
                      title="Off-site Resident"
                      hint="Lives elsewhere, e.g. rents the flat out"
                      onSelect={() => setValue('isResiding', false)}
                    />
                  </div>
                  {isEditingOwnerResidingDisabled && (
                    <p className="mt-1.5 text-[11px] font-semibold text-amber-600">
                      A tenant lives in this flat, so the owner can’t be marked as residing.
                    </p>
                  )}
                </div>
              )}

              {watchedResidentType === 'TENANT' && availableUnits.length === 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p>
                    <strong>No flat is ready for a tenant yet.</strong> A tenant can only be added to a flat whose owner
                    is registered as an <strong>Off-site Resident</strong>. Onboard the owner first.
                  </p>
                </div>
              )}
            </div>
          </StepCard>

          <StepCard step={2} title="Which home?" hint="Pick the type, then where it is, then the flat or villa.">
            <div
              className={cn(
                'grid grid-cols-1 gap-5 text-xs',
                pickerCount === 4 ? 'md:grid-cols-4' : pickerCount === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2',
              )}
            >
              {/* Entity (Apartment, Villa…) — only when the property has more than one */}
              {showEntityPicker && (
                <div>
                  <Label htmlFor="select-entity" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Type <span className="text-red-500 font-bold">*</span>
                  </Label>
                  <Select value={selectedEntityKey || undefined} onValueChange={(val) => handleEntityChange(val || '')}>
                    <SelectTrigger id="select-entity" className={cn(selectClass, 'h-auto')}>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {entityOptions.map((e) => (
                        <SelectItem key={e.key} value={e.key}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Block (named by the entity, e.g. Tower) — skipped for entities without blocks */}
              {showBlockPicker && (
                <div>
                  <Label htmlFor="select-block" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {blockWord} <span className="text-red-500 font-bold">*</span>
                  </Label>
                  <Select
                    value={selectedBlockId || undefined}
                    disabled={showEntityPicker && !selectedEntityKey}
                    onValueChange={(val) => handleBlockChange(val || '')}
                  >
                    <SelectTrigger id="select-block" className={cn(selectClass, 'h-auto')}>
                      <SelectValue
                        placeholder={showEntityPicker && !selectedEntityKey ? 'Select a type first…' : 'Select…'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {blockChoices.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.block_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Floor Selection (not shown for villas, plots… which have no floors) */}
              {!floorsHidden && (
                <div>
                  <Label htmlFor="select-floor" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Floor <span className="text-red-500 font-bold">*</span>
                  </Label>
                  <Select
                    value={selectedFloorId || undefined}
                    disabled={!selectedBlockId || floors.length === 0}
                    onValueChange={(val) => handleFloorChange(val || '')}
                  >
                    <SelectTrigger id="select-floor" className={cn(selectClass, 'h-auto')}>
                      <SelectValue
                        placeholder={
                          !selectedBlockId
                            ? 'Select Block first...'
                            : floors.length === 0
                              ? 'No floors in this block'
                              : 'Select Floor...'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {floors.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Unit Selection */}
              <div>
                <Label htmlFor="select-unit" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {unitWord} <span className="text-red-500 font-bold">*</span>
                </Label>
                <Controller
                  control={control}
                  name="unitId"
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(val) => field.onChange(val || '')}
                      disabled={!selectedFloorId}
                    >
                      <SelectTrigger
                        id="select-unit"
                        className={cn(
                          'h-9 w-full rounded-xl border bg-white px-3.5 py-1 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20 shadow-2xs disabled:bg-gray-100 disabled:opacity-70',
                          errors.unitId ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200',
                        )}
                      >
                        <SelectValue
                          placeholder={
                            !selectedFloorId
                              ? !floorsHidden
                                ? 'Select Floor first...'
                                : showBlockPicker
                                  ? `Select a ${blockWord.toLowerCase()} first…`
                                  : 'Select a type first…'
                              : filteredFloorUnits.length === 0
                                ? `No ${unitWord.toLowerCase()}s available`
                                : `Select ${unitWord}…`
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredFloorUnits.map((u) => {
                          const isOccupied = checkIsUnitOccupied(u)
                          const isDisabled = isOccupied && (!isEditMode || u.id !== watchedUnitId)

                          return (
                            <SelectItem
                              key={u.id}
                              value={u.id}
                              disabled={isDisabled}
                              className={
                                isDisabled ? 'text-gray-400 bg-gray-100 font-normal' : 'text-gray-900 font-medium'
                              }
                            >
                              {u.unit_number}
                              {u.unit_type ? ` · ${u.unit_type}` : ''}
                              {isDisabled
                                ? ' · Occupied'
                                : ` · ${(u.occupancyStatus || 'VACANT').toLowerCase().replace(/_/g, ' ')}`}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.unitId && <p className="mt-1 text-xs font-semibold text-red-500">{errors.unitId.message}</p>}
              </div>
            </div>
            {isMovingFlat && editResidentId && (
              <UnitChangePanel
                residentId={editResidentId}
                toUnitId={watchedUnitId}
                value={unitChange}
                onChange={setUnitChange}
                onImpact={setUnitChangeImpact}
              />
            )}
          </StepCard>

          <StepCard step={3} title="Personal details" hint="Fields marked * are required.">
            <div className="space-y-5">
              <div className="flex flex-col gap-5 sm:flex-row">
                <div className="relative shrink-0 self-center sm:self-start">
                  <Label
                    htmlFor="main-resident-photo-upload"
                    className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-[#005390]"
                    title="Upload photo"
                  >
                    {watchedPhotoUrl ? (
                      <img src={getFileUrl(watchedPhotoUrl)} alt="Resident" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <Camera className="mb-1 h-5 w-5 text-[#005390]" />
                        <span className="text-[10px] font-semibold text-gray-500">Add photo</span>
                      </>
                    )}
                  </Label>
                  <input
                    type="file"
                    accept="image/*"
                    id="main-resident-photo-upload"
                    onChange={(e) => handlePhotoUpload(e, (url) => setValue('photoUrl', url, { shouldValidate: true }))}
                    className="hidden"
                  />
                  {watchedPhotoUrl && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      type="button"
                      onClick={() => setValue('photoUrl', '')}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 h-auto text-white shadow-md transition hover:bg-red-600 hover:text-white"
                      title="Remove photo"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {/* Main Resident Input Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input
                      label="First Name"
                      required
                      {...registerFiltered('firstName', lettersOnly)}
                      error={errors.firstName?.message}
                      placeholder="e.g. Rahul"
                    />
                    <Input
                      label="Last Name"
                      {...registerFiltered('lastName', lettersOnly)}
                      error={errors.lastName?.message}
                      placeholder="e.g. Sharma"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <Label htmlFor="resident-gender-select" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Gender <span className="text-red-500 font-bold">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={(val) => field.onChange(val || 'MALE')}>
                        <SelectTrigger
                          id="resident-gender-select"
                          className={cn(
                            selectClass,
                            'h-auto',
                            errors.gender && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                          )}
                        >
                          <SelectValue placeholder="Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.gender && <p className="mt-1 text-xs font-semibold text-red-500">{errors.gender.message}</p>}
                </div>

                <Controller
                  control={control}
                  name="dob"
                  render={({ field }) => (
                    <Input
                      label="Date of Birth"
                      required
                      type="date"
                      name={field.name}
                      ref={field.ref}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      min="1900-01-01"
                      max={new Date().toISOString().split('T')[0]}
                      error={errors.dob?.message}
                    />
                  )}
                />

                <div>
                  <Label
                    htmlFor="resident-blood-group-select"
                    className="block text-xs font-semibold text-gray-700 mb-1.5"
                  >
                    Blood Group
                  </Label>
                  <Controller
                    control={control}
                    name="bloodGroup"
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={(val) => field.onChange(val || '')}>
                        <SelectTrigger id="resident-blood-group-select" className={cn(selectClass, 'h-auto')}>
                          <SelectValue placeholder="Not known" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Mobile number"
                  required
                  {...register('phone')}
                  error={errors.phone?.message}
                  placeholder="e.g. 9876543210"
                  icon={<Phone className="h-4 w-4 text-gray-400" />}
                />
                <Input
                  label="Email"
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
                  label="Emergency contact number"
                  {...register('emergencyContact')}
                  error={errors.emergencyContact?.message}
                  placeholder="e.g. 99887 76655"
                  icon={<Phone className="h-4 w-4 text-gray-400" />}
                />
                <Input
                  label="Move-in date"
                  required
                  type="date"
                  {...register('moveInDate')}
                  error={errors.moveInDate?.message}
                />
              </div>
            </div>
          </StepCard>

          {watchedResidentType === 'TENANT' && (
            <StepCard step={4} title="Rent" hint="How much the tenant pays and who collects it.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Monthly rent (₹)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 25000"
                  {...register('rentAmount')}
                  error={errors.rentAmount?.message}
                  icon={<IndianRupee className="h-4 w-4 text-gray-400" />}
                />

                <div className="flex flex-col justify-start">
                  <span className="block text-xs font-bold text-gray-700 mb-1.5">Who receives the rent?</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setValue('payRentToCompany', false, { shouldValidate: true })}
                      className={cn(
                        'flex items-center justify-center gap-2 p-2.5 h-auto rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left',
                        !watchedPayRentToCompany
                          ? 'border-[#005390] bg-[#005390]/10 text-[#005390] ring-1 ring-[#005390] shadow-2xs hover:bg-[#005390]/10 hover:text-[#005390]'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      <input
                        type="radio"
                        name="rentRouting"
                        checked={!watchedPayRentToCompany}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 text-[#005390]"
                      />
                      <span>Owner directly</span>
                    </Button>

                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setValue('payRentToCompany', true, { shouldValidate: true })}
                      className={cn(
                        'flex items-center justify-center gap-2 p-2.5 h-auto rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left',
                        watchedPayRentToCompany
                          ? 'border-[#005390] bg-[#005390]/10 text-[#005390] ring-1 ring-[#005390] shadow-2xs hover:bg-[#005390]/10 hover:text-[#005390]'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      <input
                        type="radio"
                        name="rentRouting"
                        checked={Boolean(watchedPayRentToCompany)}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 text-[#005390]"
                      />
                      <span>Company</span>
                    </Button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2 font-medium">
                    {watchedPayRentToCompany
                      ? 'Rent is added to the tenant’s monthly company bill.'
                      : 'Tenant pays the owner; it isn’t added to the company bill.'}
                  </p>
                </div>
              </div>
            </StepCard>
          )}

          <StepCard
            step={watchedResidentType === 'TENANT' ? 5 : 4}
            title="Family members"
            hint="Optional. Add people who live in this flat with the resident."
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddFamilyMember}
                className="rounded-xl border-[#005390]/20 text-[#005390] hover:bg-[#005390]/10 font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add member
              </Button>
            }
          >
            <div className="space-y-4">
              {familyMemberFields.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">No family members added.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {familyMemberFields.map((fieldItem, idx) => {
                    const fm = watchedFamilyMembers?.[idx] || fieldItem
                    const fmErrors = errors.familyMembers?.[idx]

                    return (
                      <Card
                        key={fieldItem.id}
                        className="gap-0 p-5 bg-white border-gray-200/90 rounded-2xl shadow-xs space-y-4 relative transition hover:border-[#005390]/40"
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
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            type="button"
                            onClick={() => handleRemoveFamilyMember(idx)}
                            className="p-1.5 h-auto text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                            aria-label="Remove Member"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Vertical Form Grid inside Family Member Card */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                          {/* Family Member Photo Upload Thumbnail */}
                          <div className="relative group shrink-0">
                            <div className="w-20 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden">
                              {fm.photoUrl ? (
                                <img
                                  src={getFileUrl(fm.photoUrl)}
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
                            <Label
                              htmlFor={`fm-photo-upload-${idx}`}
                              className="absolute -bottom-1.5 -right-1.5 bg-[#005390] text-white p-1 rounded-lg shadow-sm cursor-pointer hover:bg-[#003d6b] transition"
                              title="Upload Photo"
                            >
                              <Camera className="w-3 h-3" />
                            </Label>
                            {fm.photoUrl && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                type="button"
                                onClick={() => setValue(`familyMembers.${idx}.photoUrl`, '')}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 h-auto rounded-full shadow-sm hover:bg-red-600 hover:text-white transition"
                                aria-label="Remove Photo"
                                title="Remove Photo"
                              >
                                <X className="w-2.5 h-2.5" />
                              </Button>
                            )}
                          </div>

                          {/* Form Input Grid */}
                          <div className="flex-1 w-full space-y-3">
                            {/* Row 1: First Name & Last Name */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label
                                  htmlFor={`fm-first-name-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  First Name <span className="text-red-500 font-bold">*</span>
                                </Label>
                                <Input
                                  id={`fm-first-name-${idx}`}
                                  type="text"
                                  placeholder="e.g. Ananya"
                                  {...registerFiltered(`familyMembers.${idx}.firstName`, lettersOnly)}
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
                                <Label
                                  htmlFor={`fm-last-name-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Last Name
                                </Label>
                                <Input
                                  id={`fm-last-name-${idx}`}
                                  type="text"
                                  placeholder="e.g. Sharma"
                                  {...registerFiltered(`familyMembers.${idx}.lastName`, lettersOnly)}
                                  className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20"
                                />
                              </div>
                            </div>

                            {/* Row 2: Relation & Gender */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label
                                  htmlFor={`fm-relation-select-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Relation <span className="text-red-500 font-bold">*</span>
                                </Label>
                                <Controller
                                  control={control}
                                  name={`familyMembers.${idx}.relation` as const}
                                  render={({ field }) => (
                                    <Select
                                      value={field.value || undefined}
                                      onValueChange={(val) => field.onChange(val || 'Spouse')}
                                    >
                                      <SelectTrigger
                                        id={`fm-relation-select-${idx}`}
                                        className={cn(
                                          'h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20',
                                          fmErrors?.relation &&
                                            'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                                        )}
                                      >
                                        <SelectValue placeholder="Relation" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Spouse">Spouse</SelectItem>
                                        <SelectItem value="Son">Son</SelectItem>
                                        <SelectItem value="Daughter">Daughter</SelectItem>
                                        <SelectItem value="Father">Father</SelectItem>
                                        <SelectItem value="Mother">Mother</SelectItem>
                                        <SelectItem value="Brother">Brother</SelectItem>
                                        <SelectItem value="Sister">Sister</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                                {fmErrors?.relation && (
                                  <p className="mt-1 text-xs font-semibold text-red-500">{fmErrors.relation.message}</p>
                                )}
                              </div>

                              <div>
                                <Label
                                  htmlFor={`fm-gender-select-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Gender <span className="text-red-500 font-bold">*</span>
                                </Label>
                                <Controller
                                  control={control}
                                  name={`familyMembers.${idx}.gender` as const}
                                  render={({ field }) => (
                                    <Select
                                      value={field.value || undefined}
                                      onValueChange={(val) => field.onChange(val || 'MALE')}
                                    >
                                      <SelectTrigger
                                        id={`fm-gender-select-${idx}`}
                                        className={cn(
                                          'h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20',
                                          fmErrors?.gender &&
                                            'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                                        )}
                                      >
                                        <SelectValue placeholder="Gender" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="MALE">Male</SelectItem>
                                        <SelectItem value="FEMALE">Female</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                                {fmErrors?.gender && (
                                  <p className="mt-1 text-xs font-semibold text-red-500">{fmErrors.gender.message}</p>
                                )}
                              </div>
                            </div>

                            {/* Row 3: Date of Birth & Blood Group */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label
                                  htmlFor={`fm-dob-input-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Date of Birth <span className="text-red-500 font-bold">*</span>
                                </Label>
                                <Controller
                                  control={control}
                                  name={`familyMembers.${idx}.dob`}
                                  render={({ field }) => (
                                    <Input
                                      id={`fm-dob-input-${idx}`}
                                      type="date"
                                      name={field.name}
                                      ref={field.ref}
                                      value={field.value || ''}
                                      onChange={(e) => field.onChange(e.target.value)}
                                      onBlur={field.onBlur}
                                      min="1900-01-01"
                                      max={new Date().toISOString().split('T')[0]}
                                      className={cn(
                                        'h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20',
                                        fmErrors?.dob && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                                      )}
                                    />
                                  )}
                                />
                                {fmErrors?.dob && (
                                  <p className="mt-1 text-xs font-semibold text-red-500">{fmErrors.dob.message}</p>
                                )}
                              </div>

                              <div>
                                <Label
                                  htmlFor={`fm-blood-group-select-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Blood Group
                                </Label>
                                <Controller
                                  control={control}
                                  name={`familyMembers.${idx}.bloodGroup` as const}
                                  render={({ field }) => (
                                    <Select
                                      value={field.value || undefined}
                                      onValueChange={(val) => field.onChange(val || '')}
                                    >
                                      <SelectTrigger
                                        id={`fm-blood-group-select-${idx}`}
                                        className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-900 font-medium focus:border-[#005390] focus:outline-none focus:ring-2 focus:ring-[#005390]/20"
                                      >
                                        <SelectValue placeholder="Not known" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="A+">A+</SelectItem>
                                        <SelectItem value="A-">A-</SelectItem>
                                        <SelectItem value="B+">B+</SelectItem>
                                        <SelectItem value="B-">B-</SelectItem>
                                        <SelectItem value="AB+">AB+</SelectItem>
                                        <SelectItem value="AB-">AB-</SelectItem>
                                        <SelectItem value="O+">O+</SelectItem>
                                        <SelectItem value="O-">O-</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </div>
                            </div>

                            {/* Row 4: Phone & Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label
                                  htmlFor={`fm-phone-input-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Mobile number <span className="text-red-500 font-bold">*</span>
                                </Label>
                                <Input
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
                                <Label
                                  htmlFor={`fm-email-input-${idx}`}
                                  className="block text-xs font-semibold text-gray-700 mb-1"
                                >
                                  Email <span className="text-red-500 font-bold">*</span>
                                </Label>
                                <Input
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
                            {(() => {
                              const isCurrentlyEnabled = Boolean(
                                enabledFmLogins[idx] !== undefined
                                  ? enabledFmLogins[idx]
                                  : fm?.username && fm.username.trim().length > 0,
                              )

                              return (
                                <div className="pt-3 border-t border-gray-100">
                                  <Label
                                    htmlFor={`fm-login-access-${idx}`}
                                    className="inline-flex items-center gap-2 text-xs font-semibold text-[#005390] cursor-pointer"
                                  >
                                    <Checkbox
                                      id={`fm-login-access-${idx}`}
                                      checked={isCurrentlyEnabled}
                                      onCheckedChange={(checked) => {
                                        const isChecked = checked === true
                                        setEnabledFmLogins((prev) => ({ ...prev, [idx]: isChecked }))
                                        if (isChecked) {
                                          if (!fm?.username) {
                                            setValue(
                                              `familyMembers.${idx}.username`,
                                              `${(fm?.firstName || 'member').toLowerCase()}_${Date.now().toString().slice(-4)}`,
                                              { shouldValidate: true },
                                            )
                                          }
                                        } else {
                                          setValue(`familyMembers.${idx}.username`, '', { shouldValidate: true })
                                          setValue(`familyMembers.${idx}.password`, '', { shouldValidate: true })
                                        }
                                      }}
                                      className="data-checked:border-[#005390] data-checked:bg-[#005390] data-checked:text-white"
                                    />
                                    <KeyRound className="w-3.5 h-3.5" />
                                    Give this member their own app login
                                  </Label>

                                  {isCurrentlyEnabled && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                                      <div>
                                        <Label
                                          htmlFor={`fm-username-input-${idx}`}
                                          className="block text-[10px] font-semibold text-gray-600 mb-1"
                                        >
                                          Username
                                        </Label>
                                        <Input
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
                                        <Input
                                          id={`fm-password-input-${idx}`}
                                          label="Password"
                                          type="password"
                                          placeholder="Blank = default password"
                                          {...register(`familyMembers.${idx}.password`)}
                                          error={fmErrors?.password?.message}
                                          helperText="Type a new password only to change it."
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </StepCard>

          {isResidingEffective && (
            <StepCard
              step={watchedResidentType === 'TENANT' ? 6 : 5}
              title="Care package"
              hint="Optional. Wellness and clinical tasks bundled for the resident, and for each family member below."
            >
              <div className="space-y-5">
                {isLoadingPackages ? (
                  <div className="text-center py-6 text-xs text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-primary" />
                    Loading care packages...
                  </div>
                ) : carePackages.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-500 text-center">
                    No care packages set up yet. Add them in Settings → Packages.
                  </div>
                ) : originalCare ? (
                  <AssignedPackage
                    name={carePackages.find((pkg) => pkg.id === originalCare.packageId)?.packageName || 'Care package'}
                    detail={(() => {
                      const pkg = carePackages.find((p) => p.id === originalCare.packageId)
                      const day = originalCare.startDate
                      return `${pkg ? `₹${Number(pkg.packageCost).toLocaleString('en-IN')} · ${pkg.duration} · ` : ''}since ${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`
                    })()}
                    manageIn="Medical → Package Subscriptions"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Option for No Package */}
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => pickCarePackage('')}
                      className={cn(
                        'cursor-pointer rounded-2xl border p-4 transition-all duration-200 hover:shadow-md flex flex-col justify-between text-left w-full h-auto whitespace-normal font-normal items-stretch',
                        !watchedCarePackageId
                          ? 'border-[#005390] bg-blue-50/50 ring-2 ring-[#005390]/20 hover:bg-blue-50/50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-white',
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800">No Care Package</span>
                          {!watchedCarePackageId && (
                            <span className="inline-flex items-center justify-center size-5 rounded-full bg-[#005390] text-white">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">Skip the care package for now.</p>
                      </div>
                    </Button>

                    {/* Available Care Packages */}
                    {carePackages.map((pkg) => {
                      const isSelected = watchedCarePackageId === pkg.id
                      const taskCount = pkg.features?.length || pkg.tasks?.length || 0
                      return (
                        <Button
                          variant="ghost"
                          key={pkg.id}
                          type="button"
                          onClick={() => pickCarePackage(pkg.id)}
                          className={cn(
                            'cursor-pointer rounded-2xl border p-4 transition-all duration-200 hover:shadow-md flex flex-col justify-between text-left w-full h-auto whitespace-normal font-normal items-stretch',
                            isSelected
                              ? 'border-[#005390] bg-blue-50/50 ring-2 ring-[#005390]/20 hover:bg-blue-50/50'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-white',
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-900">{pkg.packageName}</span>
                              {isSelected && (
                                <span className="inline-flex items-center justify-center size-5 rounded-full bg-[#005390] text-white">
                                  <Check className="w-3 h-3" />
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-sm font-black text-[#005390]">
                                ₹{Number(pkg.packageCost).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                {pkg.duration}
                              </span>
                            </div>

                            {pkg.description && (
                              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{pkg.description}</p>
                            )}

                            {taskCount > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                                {(pkg.features || []).map((feat) => {
                                  const count = feat?.CarePackageFeaturesMap?.complimentaryCount ?? 0
                                  return (
                                    <span
                                      key={feat.id}
                                      className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    >
                                      {feat.taskName || feat.careTaskName || 'Task'}{' '}
                                      {count > 0 ? `× ${count}` : '(Free)'}
                                    </span>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                )}

                {watchedCarePackageId && !originalCare && (
                  <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
                    <Label className="block text-xs">
                      <span className="mb-1 block font-semibold text-gray-700">
                        Package start date <span className="text-rose-600">*</span>
                      </span>
                      <Input
                        type="date"
                        {...register('carePackageStartDate')}
                        disabled={keepsCurrentCare}
                        className="h-9 rounded-lg border border-gray-200 px-3 text-xs focus:border-[#005390] focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </Label>
                    <p className="pb-2 text-[11px] text-gray-500">
                      {keepsCurrentCare
                        ? 'Current package – its start date stays as it is.'
                        : originalCare?.packageId
                          ? 'The current package ends today; the new one is billed from this date.'
                          : 'The package is billed from this date.'}
                    </p>
                  </div>
                )}

                {carePackages.length > 0 && (
                  <FamilyCarePackages
                    packages={carePackages}
                    rows={familyCareRows}
                    onPick={pickFamilyCarePackage}
                    onStartDate={(idx, day) => setValue(`familyMembers.${idx}.carePackageStartDate`, day)}
                  />
                )}

                {/* Package Tasks Frequency & Times Schedule Configuration */}
                {selectedOnboardPackage && !originalCare && onboardPackageTasks.length > 0 && (
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <PackageTaskSchedulesConfig
                      tasks={onboardPackageTasks}
                      schedules={packageTaskSchedules}
                      onChange={setPackageTaskSchedules}
                    />
                  </div>
                )}
              </div>
            </StepCard>
          )}

          {isResidingEffective && (
            <StepCard
              step={(watchedResidentType === 'TENANT' ? 6 : 5) + 1}
              title="Food package"
              hint="Optional. A monthly meal plan for the resident and each family member."
            >
              <OnboardFoodPackages
                locId={selectedLocationId || ''}
                people={foodPeople}
                value={foodChoices}
                onChange={setFoodChoices}
                existing={existingFood}
              />
            </StepCard>
          )}

          <StepCard
            step={(watchedResidentType === 'TENANT' ? 6 : 5) + (isResidingEffective ? 2 : 0)}
            title="App login"
            hint="Used to sign in to the resident app."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <Input
                label="Username"
                {...register('username')}
                error={errors.username?.message}
                placeholder="e.g. rahul_101"
              />
              <Input
                label="Password"
                type="password"
                {...register('password')}
                error={errors.password?.message}
                helperText={
                  isEditMode ? 'Type a new password only to change it.' : 'Leave blank to use the default password.'
                }
                placeholder="Blank = default password"
              />
            </div>
          </StepCard>

          <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 rounded-2xl border border-gray-100 bg-white/95 px-5 py-3 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-slate-900/95">
            {isOwnerMissingForTenant && (
              <p className="mr-auto text-xs font-medium text-amber-700">Onboard the flat’s owner first.</p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(backUrl)}
              className="rounded-xl border-gray-200"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={
                isSubmitting || isOwnerMissingForTenant || (isMovingFlat && !!unitChangeImpact?.blockers.length)
              }
              title={
                isOwnerMissingForTenant
                  ? 'Owner must be onboarded first before onboarding a tenant'
                  : isMovingFlat && unitChangeImpact?.blockers.length
                    ? unitChangeImpact.blockers.join(' ')
                    : ''
              }
              className="bg-[#005390] hover:bg-[#003d6b] text-white rounded-xl shadow-md shadow-[#005390]/20 font-semibold"
            >
              {isSubmitting ? (
                isEditMode ? (
                  'Saving…'
                ) : (
                  'Onboarding…'
                )
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  {isEditMode ? 'Save Changes' : 'Onboard Resident'}
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
