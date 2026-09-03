import { useState, useEffect, useMemo, useCallback } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ZodIssue } from 'zod'
import {
  Calendar as CalendarIcon,
  UserCheck,
  Stethoscope,
  Clock,
  Sliders,
  Plus,
  RefreshCw,
  CheckCircle2,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCheck2,
  CalendarDays,
  Layers,
  Home,
  Sparkles,
  UserPlus,
  Activity,
  CalendarX,
  Copy,
  Download,
  Filter,
  X,
  Users,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ResponsiveTabs } from '@/components/common/ResponsiveTabs'
import { rosterService } from '@/lib/services/rosterService'
import { getPropertiesAPI } from '@/lib/services/propertyService'
import type { Property } from '@/pages/Property/types'
import { DataTable } from '@/components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { notifyError } from '@/utils/toast'
import { useMedicalStore } from '@/lib/stores/medicalStore'
import { MedicalSpecializationModal } from '@/components/medical/MedicalSpecializationModal'
import { useLocationContext } from '@/hooks/useLocation'
import { useDepartmentsQuery } from '@/hooks/react-query/rbac'
import {
  useGetFrequencies,
  useCreateFrequency,
  useCancelRosterDate,
  useRequestReplacement,
  useCreateShift,
  useUpdateShift,
  useRosterContext,
} from '@/hooks/react-query/rosterManagement'
import type { ValidationResult } from '@/lib/services/rosterService'

import {
  type RosterGridRow,
  type SchedulableResource,
  type TargetLocation,
  type OpdSlot,
  type RosterBuilderState,
  type RosterShiftItem,
  getBuilderScheduleDates,
  isStaffAvailableForBuilderSchedule,
  mapSchedulingResourceToStaff,
} from './types'
import { mapRosterDateToGridRow } from './utils/mapRosterDates'
import { useRosterPageData } from './hooks/useRosterPageData'
import { usePublishRosterAssignment } from './hooks/usePublishRosterAssignment'
import { StatCardsHeader } from './components/StatCardsHeader'
import { ShiftTemplatesTab } from './components/ShiftTemplatesTab'
import { CreateCustomShiftModal } from './components/CreateCustomShiftModal'
import { AddTargetLocationModal } from './components/AddTargetLocationModal'
import { OpdBookingModal } from './components/OpdBookingModal'
import { StaffPickerPanel } from './components/StaffPickerPanel'
import { OpdConfigSection } from './components/OpdConfigSection'
import { OnboardDoctorModal } from './components/OnboardDoctorModal'
import { ValidationResultPanel } from './components/ValidationResultPanel'
import { CopyAssignmentModal } from './components/CopyAssignmentModal'
import {
  rosterBuilderSchema,
  type CreateShiftFormValues,
  type AddTargetLocationFormValues,
  type RequestReplacementFormValues,
  type CancelRosterDateFormValues,
  type AddStaffToRosterFormValues,
  requestReplacementFormSchema,
  cancelRosterDateFormSchema,
  addStaffToRosterSchema,
} from './schemas/roster.schemas'
import { FieldErrorMessage } from './utils/FieldErrorMessage'
import { notifyFormValidationErrors, notifyZodValidationError } from './utils/rosterFormHelpers'
import { extractApiList } from './utils/apiHelpers'

export type { RosterGridRow, SchedulableResource, TargetLocation, OpdSlot, RosterBuilderState }

export default function ShiftRosterPage() {
  const [activeTab, setActiveTab] = useState('grid')
  const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'employee'>('calendar')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | 'EMPLOYEE' | 'DOCTOR'>('ALL')
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('ALL')
  const [selectedDutyTypeFilter, setSelectedDutyTypeFilter] = useState<string>('ALL')

  // Location Context & Dynamic Schedulable Target Locations Pool
  const { accessibleLocations, selectedLocationName } = useLocationContext()
  const { companyId, locationId } = useRosterContext()

  // Dynamic API state bound directly to database
  const [liveProperties, setLiveProperties] = useState<Property[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const rosterDateFilterParams = useMemo(() => {
    const params: Record<string, unknown> = {}
    if (selectedCategoryFilter !== 'ALL') params.resourceType = selectedCategoryFilter
    return params
  }, [selectedCategoryFilter])

  const { data: departmentsData } = useDepartmentsQuery()
  const departments = useMemo(() => extractApiList<{ id: string; name: string }>(departmentsData), [departmentsData])
  const { staffList, specializations, fetchSpecializations } = useMedicalStore()
  const [isMedicalOnboardingOpen, setIsMedicalOnboardingOpen] = useState(false)
  const [isOnboardDoctorOpen, setIsOnboardDoctorOpen] = useState(false)
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [validationPanelMode, setValidationPanelMode] = useState<'blocked' | 'override'>('blocked')
  const [isValidationPanelOpen, setIsValidationPanelOpen] = useState(false)
  const [pendingOverrideReason, setPendingOverrideReason] = useState('')

  const createShiftMutation = useCreateShift()
  const updateShiftMutation = useUpdateShift()
  const cancelRosterDateMutation = useCancelRosterDate()
  const requestReplacementMutation = useRequestReplacement()
  const { publish: publishRoster, isPublishing: isPublishHookPending } = usePublishRosterAssignment()
  const { data: frequenciesResponse } = useGetFrequencies()
  const createFrequencyMutation = useCreateFrequency()

  const frequencies = useMemo(
    () => extractApiList<{ id: string; frequencyName: string }>(frequenciesResponse),
    [frequenciesResponse],
  )

  const [customLocations, setCustomLocations] = useState<TargetLocation[]>([])

  useEffect(() => {
    fetchSpecializations()
  }, [fetchSpecializations])

  const targetLocations: TargetLocation[] = useMemo(() => {
    const list: TargetLocation[] = []

    // 1. PROPERTY, BLOCK, FLOOR, ROOM_UNIT targets from live DB properties
    if (liveProperties && liveProperties.length > 0) {
      liveProperties.forEach((loc) => {
        list.push({
          id: `prop-${loc.id}`,
          name: loc.property_name,
          type: 'PROPERTY',
        })

        loc.blocks?.forEach((block) => {
          list.push({
            id: `block-${block.id}`,
            name: `${block.block_name} (${loc.property_name})`,
            type: 'BLOCK',
          })

          block.floors?.forEach((floor) => {
            const floorLabel = floor.floor_name || `Floor ${floor.floor_number}`
            list.push({
              id: `floor-${floor.id}`,
              name: `${floorLabel} - ${block.block_name}`,
              type: 'FLOOR',
            })

            floor.units?.forEach((unit) => {
              list.push({
                id: `unit-${unit.id}`,
                name: `Flat ${unit.unit_number} (${floorLabel}, ${block.block_name})`,
                type: 'ROOM_UNIT',
              })
            })
          })
        })
      })
    } else {
      if (accessibleLocations && accessibleLocations.length > 0) {
        accessibleLocations.forEach((loc) => {
          list.push({
            id: `prop-${loc.id}`,
            name: loc.property_name,
            type: 'PROPERTY',
          })
        })
      } else if (selectedLocationName) {
        list.push({
          id: 'prop-active',
          name: selectedLocationName,
          type: 'PROPERTY',
        })
      }
    }

    // 2. DEPARTMENT targets from real departments API
    departments.forEach((dept) => {
      list.push({
        id: dept.id,
        name: dept.name,
        type: 'DEPARTMENT',
      })
    })

    // 3. SERVICE targets from medical specializations
    specializations.forEach((s) => {
      if (s.name) {
        list.push({
          id: s.id || s.name,
          name: s.name,
          type: 'SERVICE',
        })
      }
    })
    const clinicRooms = new Set<string>()
    staffList.forEach((s) => {
      if (s.assignedClinicRoom) clinicRooms.add(s.assignedClinicRoom)
    })
    clinicRooms.forEach((cName, idx) => {
      list.push({
        id: `clinic-${idx}`,
        name: cName,
        type: 'CLINIC_VENUE',
      })
    })

    // 4. User-added custom locations
    list.push(...customLocations)

    return list
  }, [
    liveProperties,
    accessibleLocations,
    selectedLocationName,
    departments,
    specializations,
    staffList,
    customLocations,
  ])

  // Categorized Target Locations for dropdowns
  const groupedTargetLocations = useMemo(() => {
    const groups: { [key: string]: { label: string; items: TargetLocation[] } } = {
      PROPERTY: { label: '🏢 Facilities / Properties', items: [] },
      BLOCK: { label: '🏬 Blocks & Buildings', items: [] },
      FLOOR: { label: '🪜 Floors & Wings', items: [] },
      ROOM_UNIT: { label: '🚪 Resident Units & Rooms', items: [] },
      CLINIC_VENUE: { label: '🏥 OPD Clinics & Venues', items: [] },
      DEPARTMENT: { label: '📋 Departments & Specializations', items: [] },
    }
    targetLocations.forEach((t) => {
      if (groups[t.type]) {
        groups[t.type].items.push(t)
      } else {
        if (!groups.DEPARTMENT) groups.DEPARTMENT = { label: '📋 Departments & Other', items: [] }
        groups.DEPARTMENT.items.push(t)
      }
    })
    return Object.values(groups).filter((g) => g.items.length > 0)
  }, [targetLocations])

  // Quick Add Location / Department Modal State
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false)
  const addLocationDefaultValues: AddTargetLocationFormValues = {
    name: '',
    type: 'DEPARTMENT',
  }

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date())
  const [selectedCellDate, setSelectedCellDate] = useState<string | null>(null)

  // Shift Modal State (Create & Edit)
  const [isCreateShiftModalOpen, setIsCreateShiftModalOpen] = useState(false)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [isSubmittingShift, setIsSubmittingShift] = useState(false)
  const shiftDefaultValues: CreateShiftFormValues = {
    shiftName: '',
    code: '',
    description: '',
    startTime: '08:00',
    endTime: '16:00',
    breakStartTime: '12:00',
    breakEndTime: '13:00',
    slotGenerationMode: 'AUTO_GENERATE',
    slotDurationMinutes: 30,
    numberOfSlots: 8,
    shiftCategory: 'GENERAL',
  }
  const [shiftFormDefaults, setShiftFormDefaults] = useState<CreateShiftFormValues>(shiftDefaultValues)

  // Replacement Modal State
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false)
  const [selectedDateForReplacement, setSelectedDateForReplacement] = useState<RosterGridRow | null>(null)
  const [isSubmittingReplacement, setIsSubmittingReplacement] = useState(false)
  const replacementFormMethods = useForm<RequestReplacementFormValues>({
    resolver: zodResolver(requestReplacementFormSchema),
    defaultValues: { replacementResourceId: '', reason: '' },
  })

  // Cancellation Modal State (Non-Destructive Cancellation Lifecycle)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [selectedDateForCancel, setSelectedDateForCancel] = useState<RosterGridRow | null>(null)
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)
  const cancelFormMethods = useForm<CancelRosterDateFormValues>({
    resolver: zodResolver(cancelRosterDateFormSchema),
    defaultValues: { cancellationReason: '' },
  })

  // Add Employee to Existing Roster Modal State
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false)
  const [isSubmittingAddStaff, setIsSubmittingAddStaff] = useState(false)
  const addStaffFormMethods = useForm<AddStaffToRosterFormValues>({
    resolver: zodResolver(addStaffToRosterSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      dutyType: 'SHIFT',
      resourceId: '',
      resourceName: '',
      resourceType: 'EMPLOYEE',
      shiftId: '',
      shiftName: '',
      shiftTime: '',
      targetId: '',
      targetName: '',
      isEmployeeLocked: false,
    },
  })
  const addStaffForm = useWatch({ control: addStaffFormMethods.control }) as AddStaffToRosterFormValues

  // Copy Forward Roster Modal State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false)
  const [isOpdBookingOpen, setIsOpdBookingOpen] = useState(false)
  const [opdBookingDateId, setOpdBookingDateId] = useState<string | null>(null)
  const [opdBookingLabel, setOpdBookingLabel] = useState('')
  // Roster Builder State
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(false)

  const defaultRange = useMemo(() => {
    const today = new Date()
    const thirtyDaysLater = new Date(today.getTime() + 30 * 86400000)
    return {
      from: today.toISOString().split('T')[0],
      until: thirtyDaysLater.toISOString().split('T')[0],
    }
  }, [])

  const builderDefaultValues: RosterBuilderState = {
    dutyType: 'SHIFT',
    resourceType: 'EMPLOYEE',
    selectedResourceIds: [],
    selectedResourceNames: [],
    targetScopeType: 'PROPERTY',
    selectedTargetId: '',
    selectedTargetName: '',
    selectedShiftId: '',
    selectedShiftName: '',
    selectedShiftTime: '',
    frequencyId: '',
    frequencyType: 'WEEKLY',
    selectedDaysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    effectiveFrom: defaultRange.from,
    effectiveUntil: defaultRange.until,
    holidayPolicy: 'SKIP',
    instructions: '',
    overrideReason: '',
    overrideConfirmed: false,
    enableOpdSlots: true,
    opdSlotDurationMinutes: 15,
    opdBufferMinutes: 0,
  }

  const builderFormMethods = useForm<RosterBuilderState>({
    defaultValues: builderDefaultValues,
    mode: 'onChange',
  })

  const builderForm = useWatch({ control: builderFormMethods.control }) as RosterBuilderState
  const builderErrors = builderFormMethods.formState.errors

  const applyBuilderValidationErrors = (issues: ZodIssue[]) => {
    builderFormMethods.clearErrors()
    issues.forEach((issue) => {
      const field = issue.path[0]
      if (typeof field === 'string') {
        builderFormMethods.setError(field as keyof RosterBuilderState, { message: issue.message })
      }
    })
  }

  const setBuilderForm = useCallback(
    (updater: RosterBuilderState | ((prev: RosterBuilderState) => RosterBuilderState)) => {
      const current = builderFormMethods.getValues()
      const next = typeof updater === 'function' ? updater(current) : updater
      ;(Object.keys(next) as (keyof RosterBuilderState)[]).forEach((key) => {
        builderFormMethods.setValue(key, next[key] as RosterBuilderState[typeof key], {
          shouldValidate: true,
          shouldDirty: true,
        })
      })
    },
    [builderFormMethods],
  )

  // Roster data via React Query
  const {
    shifts: liveShifts,
    rosterDates: liveRosterDates,
    schedulingResources,
    isLoading,
    refetch: refetchRosterData,
  } = useRosterPageData({
    companyId,
    locationId,
    calendarMonth: currentCalendarDate,
    rosterDateParams: rosterDateFilterParams,
    builderDutyType: activeTab === 'builder' ? builderForm.dutyType : undefined,
    builderTargetScopeType: activeTab === 'builder' ? builderForm.targetScopeType : undefined,
    builderSelectedTargetId: activeTab === 'builder' ? builderForm.selectedTargetId : undefined,
  })

  const sampleResources: SchedulableResource[] = useMemo(() => {
    if (schedulingResources.length > 0) {
      return schedulingResources.map((r) =>
        mapSchedulingResourceToStaff(
          r as { id: string; name?: string; email?: string; resourceType: 'EMPLOYEE' | 'DOCTOR' },
        ),
      )
    }
    return staffList.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role === 'DOCTOR' ? 'Doctor' : s.department || 'Staff',
      type: s.role === 'DOCTOR' ? ('DOCTOR' as const) : ('EMPLOYEE' as const),
      subType: s.doctorType,
      specialization: s.specialization,
    }))
  }, [schedulingResources, staffList])

  useEffect(() => {
    if (!companyId || !locationId) return
    getPropertiesAPI(companyId).then((props) => {
      setLiveProperties(Array.isArray(props) ? props : [])
    })
  }, [companyId, locationId])

  useEffect(() => {
    if (frequencies.length === 0 && companyId && locationId) {
      createFrequencyMutation.mutate({
        frequencyName: 'Weekly Default',
        frequencyType: 'WEEKLY',
        allowedDaysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
        description: 'Auto-created default frequency',
      })
    }
  }, [frequencies.length, companyId, locationId, createFrequencyMutation])

  useEffect(() => {
    if (frequencies.length > 0 && !builderForm.frequencyId) {
      setBuilderForm((prev) => ({ ...prev, frequencyId: frequencies[0].id }))
    }
  }, [frequencies, builderForm.frequencyId, setBuilderForm])

  const fetchLiveData = refetchRosterData

  useEffect(() => {
    if (targetLocations.length > 0 && !builderForm.selectedTargetId) {
      const firstTarget = targetLocations[0]
      setBuilderForm((prev) => ({
        ...prev,
        targetScopeType: firstTarget.type,
        selectedTargetId: firstTarget.id,
        selectedTargetName: firstTarget.name,
      }))
      addStaffFormMethods.setValue('targetId', firstTarget.id)
      addStaffFormMethods.setValue('targetName', firstTarget.name)
    }
  }, [targetLocations, builderForm.selectedTargetId, addStaffFormMethods, setBuilderForm])

  const availableShifts = useMemo(() => {
    return liveShifts
  }, [liveShifts])

  useEffect(() => {
    if (availableShifts.length > 0 && !builderForm.selectedShiftId) {
      const firstShift = availableShifts[0]
      setBuilderForm((prev) => ({
        ...prev,
        selectedShiftId: firstShift.id,
        selectedShiftName: firstShift.shiftName,
        selectedShiftTime: `${firstShift.startTime} - ${firstShift.endTime}`,
      }))
      addStaffFormMethods.setValue('shiftId', firstShift.id)
      addStaffFormMethods.setValue('shiftName', firstShift.shiftName)
      addStaffFormMethods.setValue('shiftTime', `${firstShift.startTime} - ${firstShift.endTime}`)
    }
  }, [availableShifts, builderForm.selectedShiftId, addStaffFormMethods, setBuilderForm])

  const displayRosterDates: RosterGridRow[] = useMemo(() => {
    return liveRosterDates.map((d) => {
      const row = mapRosterDateToGridRow(d as Record<string, unknown>)
      if (row.resource === 'Staff Member' && sampleResources.length > 0) {
        const matched = sampleResources.find((r) => r.id === row.schedulingResourceId || r.id === row.resourceUserId)
        if (matched) row.resource = matched.name
      }
      return row
    })
  }, [liveRosterDates, sampleResources])

  const totalRosterConflicts = useMemo(() => {
    const seenMap: Record<string, number> = {}
    let count = 0
    displayRosterDates.forEach((duty) => {
      if (duty.status === 'CANCELLED') return
      const resId =
        duty.schedulingResourceId || duty.resourceUserId || (duty.resource ? duty.resource.toLowerCase() : '')
      if (!resId || !duty.date) return
      const key = `${resId}_${duty.date}`
      seenMap[key] = (seenMap[key] || 0) + 1
      if (seenMap[key] === 2) {
        count += 1
      }
    })
    return count
  }, [displayRosterDates])

  // Conflict Prevention & Staff Availability Checker
  const getStaffAvailabilityStatus = (staffIdOrName: string, dateStr: string) => {
    if (!dateStr || !staffIdOrName) {
      return {
        isAvailable: true,
        statusText: 'Available',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      }
    }

    const conflicts = displayRosterDates.filter((item) => {
      if (item.status === 'CANCELLED') return false
      if (item.date !== dateStr) return false
      const matchName = item.resource && item.resource.toLowerCase() === staffIdOrName.toLowerCase()
      const matchResId = item.schedulingResourceId === staffIdOrName
      const matchUserId = item.resourceUserId === staffIdOrName
      return matchName || matchResId || matchUserId
    })

    if (conflicts.length > 0) {
      const firstConflict = conflicts[0]
      return {
        isAvailable: false,
        conflictDetails: `${firstConflict.shift} (${firstConflict.time}) @ ${firstConflict.target}`,
        statusText: `Busy: ${firstConflict.shift}`,
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
      }
    }

    return {
      isAvailable: true,
      conflictDetails: null,
      statusText: 'Free / Available',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    }
  }

  // Check shift pattern availability for a selected staff member
  const getShiftPatternAvailabilityForStaff = (staffIdOrName: string, dateStr: string, shiftId: string) => {
    if (!staffIdOrName || !dateStr || !shiftId) return { isFree: true, label: 'Free' }
    const selectedShift = availableShifts.find((s) => s.id === shiftId)
    if (!selectedShift) return { isFree: true, label: 'Free' }

    const conflict = displayRosterDates.find((item) => {
      if (item.status === 'CANCELLED') return false
      if (item.date !== dateStr) return false
      const matchName = item.resource && item.resource.toLowerCase() === staffIdOrName.toLowerCase()
      const matchResId = item.schedulingResourceId === staffIdOrName
      const matchUserId = item.resourceUserId === staffIdOrName
      if (!matchName && !matchResId && !matchUserId) return false
      if (item.shift.toLowerCase() === selectedShift.shiftName.toLowerCase()) return true
      if (item.time === `${selectedShift.startTime} - ${selectedShift.endTime}`) return true
      return false
    })

    if (conflict) {
      return { isFree: false, label: `Occupied @ ${conflict.target}` }
    }
    return { isFree: true, label: 'Free' }
  }

  const filteredPersonnelOptions = useMemo(() => {
    if (selectedCategoryFilter === 'DOCTOR') {
      return sampleResources.filter((r) => r.type === 'DOCTOR')
    }
    if (selectedCategoryFilter === 'EMPLOYEE') {
      return sampleResources.filter((r) => r.type === 'EMPLOYEE')
    }
    return sampleResources
  }, [sampleResources, selectedCategoryFilter])

  const filteredDates = useMemo(() => {
    return displayRosterDates.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.shift.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.dutyType.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory =
        selectedCategoryFilter === 'ALL' ||
        (selectedCategoryFilter === 'DOCTOR' && item.type.includes('DOCTOR')) ||
        (selectedCategoryFilter === 'EMPLOYEE' && !item.type.includes('DOCTOR'))

      const matchesEmployee =
        selectedEmployeeFilter === 'ALL' || item.resource.toLowerCase() === selectedEmployeeFilter.toLowerCase()

      const matchesDutyType = selectedDutyTypeFilter === 'ALL' || item.dutyType === selectedDutyTypeFilter

      return matchesSearch && matchesCategory && matchesEmployee && matchesDutyType
    })
  }, [displayRosterDates, searchTerm, selectedCategoryFilter, selectedEmployeeFilter, selectedDutyTypeFilter])

  const displayStaffList = useMemo(() => {
    let list = sampleResources
    if (selectedCategoryFilter === 'DOCTOR') {
      list = list.filter((r) => r.type === 'DOCTOR')
    } else if (selectedCategoryFilter === 'EMPLOYEE') {
      list = list.filter((r) => r.type === 'EMPLOYEE')
    }

    if (selectedEmployeeFilter !== 'ALL') {
      list = list.filter(
        (r) => r.name.toLowerCase() === selectedEmployeeFilter.toLowerCase() || r.id === selectedEmployeeFilter,
      )
    }
    return list
  }, [sampleResources, selectedCategoryFilter, selectedEmployeeFilter])

  // Dates in the builder schedule (working days within effective range)
  const builderScheduleDates = useMemo(
    () =>
      getBuilderScheduleDates(builderForm.effectiveFrom, builderForm.effectiveUntil, builderForm.selectedDaysOfWeek),
    [builderForm.effectiveFrom, builderForm.effectiveUntil, builderForm.selectedDaysOfWeek],
  )

  const isBuilderScheduleConfigured = builderScheduleDates.length > 0 && !!builderForm.selectedShiftTime

  // Filtered schedulable resources — only staff available for selected dates & shift time
  const availableResources = useMemo(() => {
    return sampleResources.filter((r) => {
      const matchesType = r.type === builderForm.resourceType
      if (!matchesType) return false
      if (!isBuilderScheduleConfigured) return true
      return isStaffAvailableForBuilderSchedule(
        r,
        builderScheduleDates,
        builderForm.selectedShiftTime,
        displayRosterDates,
      )
    })
  }, [
    sampleResources,
    builderForm.resourceType,
    builderForm.selectedShiftTime,
    builderScheduleDates,
    isBuilderScheduleConfigured,
    displayRosterDates,
  ])

  const filterStaffAvailableForSchedule = useCallback(
    (resources: SchedulableResource[], maxCount?: number) => {
      const filtered = resources.filter((r) => {
        if (!isBuilderScheduleConfigured) return true
        return isStaffAvailableForBuilderSchedule(
          r,
          builderScheduleDates,
          builderForm.selectedShiftTime,
          displayRosterDates,
        )
      })
      return maxCount !== undefined ? filtered.slice(0, maxCount) : filtered
    },
    [isBuilderScheduleConfigured, builderScheduleDates, builderForm.selectedShiftTime, displayRosterDates],
  )

  // Remove selected staff who become unavailable when schedule or shift changes
  useEffect(() => {
    setBuilderForm((prev) => {
      const availableIds = new Set(availableResources.map((r) => r.id))
      const nextIds = prev.selectedResourceIds.filter((id) => availableIds.has(id))
      const nextNames = prev.selectedResourceNames.filter((_, idx) => availableIds.has(prev.selectedResourceIds[idx]))

      if (
        nextIds.length === prev.selectedResourceIds.length &&
        nextNames.length === prev.selectedResourceNames.length
      ) {
        return prev
      }

      return {
        ...prev,
        selectedResourceIds: nextIds,
        selectedResourceNames: nextNames,
      }
    })
  }, [availableResources, setBuilderForm])

  // Initial staff selection when resources first load
  useEffect(() => {
    if (sampleResources.length === 0 || builderForm.selectedResourceIds.length > 0) return
    const pool =
      availableResources.length > 0
        ? availableResources
        : sampleResources.filter((r) => r.type === builderForm.resourceType)
    if (pool.length === 0) return
    const first = pool[0]
    setBuilderForm((prev) => ({
      ...prev,
      selectedResourceIds: [first.id],
      selectedResourceNames: [first.name],
    }))
    addStaffFormMethods.setValue('resourceId', first.id)
    addStaffFormMethods.setValue('resourceName', first.name)
  }, [
    sampleResources,
    availableResources,
    builderForm.selectedResourceIds.length,
    builderForm.resourceType,
    setBuilderForm,
    addStaffFormMethods,
  ])

  // Multi-Resource Toggle Handler for Step 1
  const handleToggleResourceSelection = (res: SchedulableResource) => {
    setBuilderForm((prev) => {
      const exists = prev.selectedResourceIds.includes(res.id)
      let newIds: string[]
      let newNames: string[]

      if (exists) {
        newIds = prev.selectedResourceIds.filter((id) => id !== res.id)
        newNames = prev.selectedResourceNames.filter((name) => name !== res.name)
      } else {
        newIds = [...prev.selectedResourceIds, res.id]
        newNames = [...prev.selectedResourceNames, res.name]
      }

      return {
        ...prev,
        selectedResourceIds: newIds,
        selectedResourceNames: newNames,
      }
    })
  }

  const handleClearAllResources = () => {
    setBuilderForm((prev) => ({
      ...prev,
      selectedResourceIds: [],
      selectedResourceNames: [],
    }))
  }

  // Computed Date Instances Preview across ALL selected resources for Step 7
  const generatedDateInstancesPreview = useMemo(() => {
    if (!builderForm.effectiveFrom || !builderForm.effectiveUntil || builderForm.selectedResourceIds.length === 0)
      return []

    const instances: Array<{ date: string; dayName: string; resourceName: string }> = []
    const start = new Date(builderForm.effectiveFrom)
    const end = new Date(builderForm.effectiveUntil)

    const dayMap: Record<number, string> = {
      0: 'SUN',
      1: 'MON',
      2: 'TUE',
      3: 'WED',
      4: 'THU',
      5: 'FRI',
      6: 'SAT',
    }

    const current = new Date(start)
    while (current <= end) {
      const dayCode = dayMap[current.getDay()]
      if (builderForm.selectedDaysOfWeek.includes(dayCode)) {
        const dateStr = current.toISOString().split('T')[0]
        const dayNameStr = current.toLocaleDateString('en-US', { weekday: 'short' })

        // Create an instance for EVERY selected resource
        builderForm.selectedResourceNames.forEach((resName) => {
          instances.push({
            date: dateStr,
            dayName: dayNameStr,
            resourceName: resName,
          })
        })
      }
      current.setDate(current.getDate() + 1)
    }

    return instances
  }, [
    builderForm.effectiveFrom,
    builderForm.effectiveUntil,
    builderForm.selectedDaysOfWeek,
    builderForm.selectedResourceIds,
    builderForm.selectedResourceNames,
  ])

  // Non-Destructive Duty Cancellation Handler
  const handleConfirmCancellation = cancelFormMethods.handleSubmit(
    async (values) => {
      if (!selectedDateForCancel) return

      setIsSubmittingCancel(true)
      try {
        await cancelRosterDateMutation.mutateAsync({
          dateInstanceId: selectedDateForCancel.id,
          payload: { cancellationReason: values.cancellationReason },
        })
        setIsCancelModalOpen(false)
        cancelFormMethods.reset()
        refetchRosterData()
      } catch {
        notifyError('Cancellation failed', 'Failed to cancel duty.')
      } finally {
        setIsSubmittingCancel(false)
      }
    },
    (errors) => notifyFormValidationErrors(errors),
  )

  const handleAddStaffToRoster = addStaffFormMethods.handleSubmit(
    async (values) => {
      if (!companyId || !locationId) {
        notifyError('Missing context', 'Select an active property before adding staff to the roster.')
        return
      }
      setIsSubmittingAddStaff(true)
      try {
        await rosterService.createSingleDayAssignment(companyId, locationId, {
          rosterName: `Ad-hoc — ${values.resourceName} — ${values.date}`,
          dutyType: values.dutyType,
          schedulingResourceId: values.resourceId,
          shiftId: values.shiftId,
          slotTimeRange: values.shiftTime,
          frequencyId: frequencies[0]?.id,
          instructions: `Ad-hoc assignment for ${values.targetName}`,
          holidayPolicy: 'SKIP',
          targets: [{ targetType: 'PROPERTY', targetId: values.targetId }],
          date: values.date,
        })
        setIsAddStaffModalOpen(false)
        addStaffFormMethods.reset()
        refetchRosterData()
        toast.success(`Assigned ${values.resourceName} to ${values.shiftName} on ${values.date}`)
      } catch (err: unknown) {
        notifyError(
          'Add staff failed',
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to add staff to roster.',
        )
      } finally {
        setIsSubmittingAddStaff(false)
      }
    },
    (errors) => notifyFormValidationErrors(errors),
  )

  // Shift Master Modals
  const handleOpenCreateShift = () => {
    setEditingShiftId(null)
    setShiftFormDefaults({
      shiftName: '',
      code: '',
      description: '',
      startTime: '08:00',
      endTime: '16:00',
      breakStartTime: '12:00',
      breakEndTime: '13:00',
      slotGenerationMode: 'AUTO_GENERATE',
      slotDurationMinutes: 30,
      numberOfSlots: 8,
      shiftCategory: 'GENERAL',
    })
    setIsCreateShiftModalOpen(true)
  }

  const handleOpenEditShift = (shift: RosterShiftItem) => {
    setEditingShiftId(shift.id)
    setShiftFormDefaults({
      shiftName: shift.shiftName || '',
      code: shift.code || '',
      description: shift.description || '',
      startTime: shift.startTime || '08:00',
      endTime: shift.endTime || '16:00',
      breakStartTime: shift.breakStartTime || '',
      breakEndTime: shift.breakEndTime || '',
      slotGenerationMode: (shift.slotGenerationMode as CreateShiftFormValues['slotGenerationMode']) || 'AUTO_GENERATE',
      slotDurationMinutes: shift.slotDurationMinutes || 30,
      numberOfSlots: shift.numberOfSlots || 8,
      shiftCategory: (shift.shiftCategory as CreateShiftFormValues['shiftCategory']) || 'GENERAL',
      departmentId: shift.departmentId || '',
    })
    setIsCreateShiftModalOpen(true)
  }

  const handleSaveShift = async (values: CreateShiftFormValues) => {
    setIsSubmittingShift(true)
    try {
      if (editingShiftId) {
        await updateShiftMutation.mutateAsync({ id: editingShiftId, payload: values })
      } else {
        await createShiftMutation.mutateAsync(values)
      }
      setIsCreateShiftModalOpen(false)
      refetchRosterData()
    } catch (err: unknown) {
      notifyError('Failed to save shift', (err as Error)?.message || 'Failed to save shift in database.')
    } finally {
      setIsSubmittingShift(false)
    }
  }

  const handleReplacementSubmit = replacementFormMethods.handleSubmit(
    async (values) => {
      setIsSubmittingReplacement(true)
      try {
        if (selectedDateForReplacement) {
          await requestReplacementMutation.mutateAsync({
            dateId: selectedDateForReplacement.id,
            payload: values,
          })
        }
        setIsReplacementModalOpen(false)
        replacementFormMethods.reset()
        refetchRosterData()
      } catch (err: unknown) {
        notifyError('Replacement failed', (err as Error)?.message || 'Failed to assign replacement staff.')
      } finally {
        setIsSubmittingReplacement(false)
      }
    },
    (errors) => notifyFormValidationErrors(errors),
  )

  // Handle CSV Roster Export (P1 Enterprise Feature)
  const handleExportCSV = () => {
    const rowsToExport = displayRosterDates
    if (rowsToExport.length === 0) {
      toast.error('No roster entries available to export.')
      return
    }

    const headers = [
      'Duty Date',
      'Staff / Doctor Name',
      'Resource Type',
      'Duty Type',
      'Shift Pattern',
      'Time Window',
      'Target Location',
      'Status',
    ]
    const csvContent = [
      headers.join(','),
      ...rowsToExport.map((r) =>
        [
          `"${r.date}"`,
          `"${r.resource}"`,
          `"${r.type}"`,
          `"${r.dutyType || 'SHIFT'}"`,
          `"${r.shift}"`,
          `"${r.time}"`,
          `"${r.target}"`,
          `"${r.status}"`,
        ].join(','),
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Rely_Active_Roster_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${rowsToExport.length} roster entries to CSV format!`)
  }

  const handleFinalPublishRoster = async () => {
    const result = rosterBuilderSchema.safeParse({
      dutyType: builderForm.dutyType,
      effectiveFrom: builderForm.effectiveFrom,
      effectiveUntil: builderForm.effectiveUntil,
      selectedDaysOfWeek: builderForm.selectedDaysOfWeek,
      selectedShiftId: builderForm.selectedShiftId,
      frequencyId: builderForm.frequencyId,
      targetScopeType: builderForm.targetScopeType,
      selectedTargetId: builderForm.selectedTargetId,
      selectedResourceIds: builderForm.selectedResourceIds,
    })

    if (!result.success) {
      applyBuilderValidationErrors(result.error.issues)
      notifyZodValidationError(result.error.issues[0]?.message || 'Please complete all required fields.')
      return
    }

    if (generatedDateInstancesPreview.length === 0) {
      notifyZodValidationError('No roster dates would be generated. Check date range and working days.')
      return
    }

    if (!companyId || !locationId) {
      notifyError('Missing context', 'Select an active property before publishing a roster.')
      return
    }

    const resourceNames: Record<string, string> = {}
    builderForm.selectedResourceIds.forEach((id, idx) => {
      resourceNames[id] = builderForm.selectedResourceNames[idx] || id
    })

    setIsPublishing(true)
    const publishResult = await publishRoster({
      companyId,
      locationId,
      builderForm: { ...builderForm, overrideReason: pendingOverrideReason || builderForm.overrideReason },
      resourceNames,
      onValidationBlocked: (results) => {
        setValidationResults(results)
        setValidationPanelMode('blocked')
        setIsValidationPanelOpen(true)
      },
      onRequiresOverride: (results) => {
        setValidationResults(results)
        setValidationPanelMode('override')
        setIsValidationPanelOpen(true)
        return Promise.resolve(null)
      },
    })

    if (publishResult) {
      setIsPublished(true)
      refetchRosterData()
      setTimeout(() => {
        setIsPublished(false)
        setActiveTab('grid')
        builderFormMethods.reset(builderDefaultValues)
        setPendingOverrideReason('')
      }, 1500)
    }
    setIsPublishing(false)
  }

  const handleConfirmOverridePublish = () => {
    if (!pendingOverrideReason.trim()) return
    setIsValidationPanelOpen(false)
    setBuilderForm((prev) => ({ ...prev, overrideReason: pendingOverrideReason }))
    setTimeout(() => handleFinalPublishRoster(), 0)
  }

  const canPublishRoster = useMemo(() => {
    return (
      !!builderForm.selectedShiftId &&
      !!builderForm.selectedTargetId &&
      !!builderForm.effectiveFrom &&
      !!builderForm.effectiveUntil &&
      builderForm.selectedDaysOfWeek.length > 0 &&
      builderForm.selectedResourceIds.length > 0 &&
      generatedDateInstancesPreview.length > 0
    )
  }, [builderForm, generatedDateInstancesPreview])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ON_DUTY':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'UPCOMING':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'REPLACED':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeBadge = (type: string) => {
    if (type.includes('VISITING')) return 'bg-purple-100 text-purple-800 border-purple-200'
    if (type.includes('IN_HOUSE')) return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getDutyTypeBadge = (dutyType: string) => {
    switch (dutyType) {
      case 'OPD_SESSION':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'ON_CALL':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case 'EMERGENCY':
        return 'bg-rose-100 text-rose-800 border-rose-200 font-bold'
      case 'AD_HOC':
        return 'bg-teal-100 text-teal-800 border-teal-200'
      default:
        return 'bg-blue-100 text-[#004B87] border-blue-200'
    }
  }

  const columns: ColumnDef<RosterGridRow>[] = [
    {
      accessorKey: 'resource',
      header: 'Resource',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-gray-900">{row.original.resource}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge className={`text-[10px] ${getTypeBadge(row.original.type)}`}>{row.original.type}</Badge>
            <Badge className={`text-[9px] ${getDutyTypeBadge(row.original.dutyType)}`}>{row.original.dutyType}</Badge>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date & Time',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.date}</p>
          <p className="text-xs text-gray-500">{row.original.time}</p>
        </div>
      ),
    },
    {
      accessorKey: 'shift',
      header: 'Shift Pattern',
      cell: ({ row }) => <span className="font-medium text-gray-800">{row.original.shift}</span>,
    },
    {
      accessorKey: 'target',
      header: 'Target Location',
      cell: ({ row }) => <span className="text-gray-700">{row.original.target}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge className={getStatusBadge(row.original.status)}>{row.original.status}</Badge>,
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {row.original.status !== 'CANCELLED' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDateForReplacement(row.original)
                  replacementFormMethods.reset({ replacementResourceId: '', reason: '' })
                  setIsReplacementModalOpen(true)
                }}
                className="text-xs gap-1"
              >
                <UserCheck2 className="w-3.5 h-3.5" /> Substitute
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDateForCancel(row.original)
                  cancelFormMethods.reset({ cancellationReason: '' })
                  setIsCancelModalOpen(true)
                }}
                className="text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Cancel Duty Instance"
              >
                <CalendarX className="w-3.5 h-3.5" /> Cancel Duty
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  // Calendar Days calculation for September 2026
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear()
    const month = currentCalendarDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayIndex = new Date(year, month, 1).getDay()

    const days: Array<{ dateString: string; dayNumber: number; isCurrentMonth: boolean }> = []

    // Previous month filler
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({
        dateString: prevDate.toISOString().split('T')[0],
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        dateString: dateStr,
        dayNumber: d,
        isCurrentMonth: true,
      })
    }

    return days
  }, [currentCalendarDate])

  const toggleDayOfWeek = (day: string) => {
    setBuilderForm((prev) => {
      const exists = prev.selectedDaysOfWeek.includes(day)
      const updated = exists ? prev.selectedDaysOfWeek.filter((d) => d !== day) : [...prev.selectedDaysOfWeek, day]
      return { ...prev, selectedDaysOfWeek: updated }
    })
  }

  return (
    <div className="space-y-6 pt-2 pb-6">
      {/* Header matching System UI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Shift & Roster Management</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Track and manage staff assignments, shift patterns, calendar schedules, and conflict-free roster generation
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold h-9 px-4 rounded-lg text-sm transition-colors cursor-pointer">
              <Sliders className="h-4 w-4 text-gray-600" /> Actions{' '}
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 bg-white border border-gray-200 shadow-md rounded-xl p-1 z-50"
            >
              <DropdownMenuItem
                onClick={() => setIsOnboardDoctorOpen(true)}
                className="gap-2 cursor-pointer py-2 px-3 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-700"
              >
                <Stethoscope className="h-4 w-4 text-gray-500" /> Onboard Doctor
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsCopyModalOpen(true)}
                className="gap-2 cursor-pointer py-2 px-3 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-700"
              >
                <Copy className="h-4 w-4 text-gray-500" /> Copy Roster
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportCSV}
                className="gap-2 cursor-pointer py-2 px-3 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-700"
              >
                <Download className="h-4 w-4 text-gray-500" /> Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={() => setActiveTab('builder')}
            className="gap-2 bg-[#004B87] hover:bg-[#003865] shadow-sm font-bold"
          >
            <Sparkles className="h-4 w-4" /> Create Roster
          </Button>
        </div>
      </div>

      {/* Standard Stats Grid */}
      <StatCardsHeader
        displayRosterDates={displayRosterDates}
        sampleResources={sampleResources}
        isLoading={isLoading}
        isLoadingUsers={isLoading}
      />

      {/* Standard System Tabs */}
      <ResponsiveTabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
        tabs={[
          {
            value: 'grid',
            label: 'Operational Grid',
            shortLabel: 'Grid',
            icon: CalendarIcon,
            content: (
              <Card className="shadow-xs border-gray-200">
                <CardHeader className="pb-3 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">
                        Roster Calendar & Operational Grid
                      </CardTitle>
                      <CardDescription className="text-xs">
                        View, filter, edit, and manage scheduled shift instances.
                      </CardDescription>
                    </div>

                    {/* View Switcher: Calendar vs Table vs Employee Matrix */}
                    <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setViewMode('calendar')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          viewMode === 'calendar'
                            ? 'bg-white text-[#004B87] shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <CalendarDays className="w-4 h-4" /> Calendar View
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          viewMode === 'table'
                            ? 'bg-white text-[#004B87] shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <LayoutList className="w-4 h-4" /> Table View
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('employee')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          viewMode === 'employee'
                            ? 'bg-white text-[#004B87] shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Users className="w-4 h-4" /> By Employee
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Universal Filter Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 mb-5 bg-gray-50/80 rounded-xl border border-gray-200">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <Filter className="w-3.5 h-3.5 text-[#004B87]" /> Filter Roster:
                      </div>

                      {/* Category / Role Filter */}
                      <div className="min-w-[175px]">
                        <Select
                          value={selectedCategoryFilter}
                          onValueChange={(val: 'ALL' | 'EMPLOYEE' | 'DOCTOR') => {
                            setSelectedCategoryFilter(val)
                            setSelectedEmployeeFilter('ALL')
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white border-gray-200 font-semibold">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All Staff & Doctors</SelectItem>
                            <SelectItem value="EMPLOYEE">Staff / Employee</SelectItem>
                            <SelectItem value="DOCTOR">Doctor / Specialist</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Specific Personnel Filter */}
                      <div className="min-w-[210px]">
                        <Select value={selectedEmployeeFilter} onValueChange={setSelectedEmployeeFilter}>
                          <SelectTrigger className="h-8 text-xs bg-white border-gray-200 font-semibold">
                            <SelectValue placeholder="All Personnel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All Personnel ({filteredPersonnelOptions.length})</SelectItem>
                            {filteredPersonnelOptions.map((res) => (
                              <SelectItem key={res.id} value={res.name}>
                                {res.name} ({res.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Consistent 2 Duty Types Filter */}
                      <div className="min-w-[160px]">
                        <Select value={selectedDutyTypeFilter} onValueChange={setSelectedDutyTypeFilter}>
                          <SelectTrigger className="h-8 text-xs bg-white border-gray-200 font-semibold">
                            <SelectValue placeholder="All Duty Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All Duty Types</SelectItem>
                            <SelectItem value="SHIFT">Regular Shift</SelectItem>
                            <SelectItem value="OPD_SESSION">OPD Session</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Clear Filters button */}
                      {(selectedCategoryFilter !== 'ALL' ||
                        selectedEmployeeFilter !== 'ALL' ||
                        selectedDutyTypeFilter !== 'ALL' ||
                        searchTerm) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCategoryFilter('ALL')
                            setSelectedEmployeeFilter('ALL')
                            setSelectedDutyTypeFilter('ALL')
                            setSearchTerm('')
                          }}
                          className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 font-semibold"
                        >
                          <X className="w-3.5 h-3.5" /> Clear Filters
                        </Button>
                      )}
                    </div>

                    {/* Quick Action Controls */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          addStaffFormMethods.reset({
                            date: new Date().toISOString().split('T')[0],
                            dutyType: 'SHIFT',
                            resourceId: sampleResources[0]?.id || '',
                            resourceName: sampleResources[0]?.name || '',
                            resourceType: sampleResources[0]?.type || 'EMPLOYEE',
                            shiftId: availableShifts[0]?.id || '',
                            shiftName: availableShifts[0]?.shiftName || '',
                            shiftTime: availableShifts[0]
                              ? `${availableShifts[0].startTime} - ${availableShifts[0].endTime}`
                              : '',
                            targetId: targetLocations[0]?.id || '',
                            targetName: targetLocations[0]?.name || '',
                            isEmployeeLocked: false,
                          })
                          setIsAddStaffModalOpen(true)
                        }}
                        className="h-8 text-xs font-semibold gap-1.5 border-gray-200"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-[#004B87]" /> Add Staff to Duty
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchLiveData}
                        disabled={isLoading}
                        className="h-8 text-xs font-semibold gap-1.5 border-gray-200"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                      </Button>
                    </div>
                  </div>

                  {viewMode === 'table' ? (
                    <DataTable
                      columns={columns}
                      data={filteredDates}
                      isLoading={isLoading}
                      searchValue={searchTerm}
                      onSearchChange={setSearchTerm}
                      searchPlaceholder="Search roster instances by staff name, shift, target venue..."
                    />
                  ) : viewMode === 'employee' ? (
                    /* Employee-Wise Roster Matrix View */
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#004B87]" />
                          <span className="text-xs font-bold text-gray-900">
                            Employee-Wise Roster Matrix — {displayStaffList.length} Active Staff Members
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-600 font-medium">
                          Click on any duty to manage replacement/cancel, or click '+' on an empty day to assign a
                          shift.
                        </span>
                      </div>

                      <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white shadow-xs">
                        <table className="w-full text-left border-collapse min-w-[1100px]">
                          <thead>
                            <tr className="bg-gray-50 text-gray-600 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200">
                              <th className="p-3 sticky left-0 z-20 bg-gray-50 border-r border-gray-200 min-w-[230px] shadow-xs">
                                Staff Member / Specialist
                              </th>
                              {calendarDays.map((c) => (
                                <th
                                  key={c.dateString}
                                  className={`p-2 text-center border-r border-gray-100 min-w-[75px] ${
                                    !c.isCurrentMonth ? 'bg-gray-100/50 text-gray-400' : ''
                                  }`}
                                >
                                  <div className="text-[10px] text-gray-400 uppercase font-mono">
                                    {new Date(c.dateString + 'T00:00:00').toLocaleDateString('en-US', {
                                      weekday: 'short',
                                    })}
                                  </div>
                                  <div className="text-xs font-extrabold text-gray-900">{c.dayNumber}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {displayStaffList.map((staff) => {
                              const staffAssignments = displayRosterDates.filter((d: RosterGridRow) => {
                                if (d.resource && d.resource.toLowerCase() === staff.name.toLowerCase()) return true
                                if (d.schedulingResourceId && d.schedulingResourceId === staff.id) return true
                                if (d.resourceUserId && d.resourceUserId === staff.id) return true
                                if (displayStaffList.length === 1) return true
                                return false
                              })
                              const activeCount = staffAssignments.filter((d) => d.status !== 'CANCELLED').length

                              return (
                                <tr key={staff.id} className="hover:bg-gray-50/80 transition-colors">
                                  {/* Sticky Staff Info Column */}
                                  <td className="p-3 sticky left-0 z-10 bg-white border-r border-gray-200 min-w-[230px] shadow-xs">
                                    <div className="flex items-center gap-2.5">
                                      <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-2xs ${
                                          staff.type === 'DOCTOR' ? 'bg-[#004B87]' : 'bg-emerald-600'
                                        }`}
                                      >
                                        {staff.name.charAt(0)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-gray-900 truncate text-xs">{staff.name}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <Badge
                                            variant="outline"
                                            className={`text-[9px] px-1.5 py-0 font-semibold ${
                                              staff.type === 'DOCTOR'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                            }`}
                                          >
                                            {staff.role}
                                          </Badge>
                                          <span className="text-[10px] text-gray-500 font-semibold">
                                            ({activeCount} shifts)
                                          </span>
                                        </div>
                                      </div>
                                      {(() => {
                                        const dutyCount = displayRosterDates.filter(
                                          (d) =>
                                            d.status !== 'CANCELLED' &&
                                            (d.resource.toLowerCase() === staff.name.toLowerCase() ||
                                              d.schedulingResourceId === staff.id ||
                                              d.resourceUserId === staff.id),
                                        ).length
                                        if (dutyCount > 0) {
                                          return (
                                            <Badge
                                              variant="outline"
                                              className="text-[9.5px] px-2 py-0.5 bg-amber-50 text-amber-800 border-amber-300 font-bold shrink-0"
                                            >
                                              {dutyCount} Scheduled {dutyCount === 1 ? 'Duty' : 'Duties'}
                                            </Badge>
                                          )
                                        }
                                        return (
                                          <Badge
                                            variant="outline"
                                            className="text-[9.5px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold shrink-0"
                                          >
                                            Free / Available
                                          </Badge>
                                        )
                                      })()}
                                    </div>
                                  </td>

                                  {/* Daily Shift Cells */}
                                  {calendarDays.map((c) => {
                                    const duty = staffAssignments.find((d) => d.date === c.dateString)

                                    return (
                                      <td
                                        key={c.dateString}
                                        className={`p-1 text-center border-r border-gray-100 align-middle ${
                                          !c.isCurrentMonth ? 'bg-gray-50/50' : ''
                                        }`}
                                      >
                                        {duty ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (duty.dutyType === 'OPD_SESSION') {
                                                setOpdBookingDateId(duty.id)
                                                setOpdBookingLabel(`${duty.resource} — ${duty.shift} (${duty.time})`)
                                                setIsOpdBookingOpen(true)
                                              } else {
                                                setSelectedDateForReplacement(duty)
                                              }
                                            }}
                                            className={`w-full text-left p-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer truncate shadow-2xs ${
                                              duty.status === 'CANCELLED'
                                                ? 'bg-rose-50 text-rose-800 border-rose-200 line-through opacity-60'
                                                : duty.dutyType === 'OPD_SESSION'
                                                  ? 'bg-purple-50 text-purple-900 border-purple-200 hover:border-purple-400 hover:shadow-xs'
                                                  : 'bg-blue-50 text-[#004B87] border-blue-200 hover:border-blue-400 hover:shadow-xs'
                                            }`}
                                            title={`${duty.resource} — ${duty.shift} (${duty.time}) @ ${duty.target}`}
                                          >
                                            <p className="truncate font-extrabold">{duty.shift}</p>
                                            <p className="text-[9px] font-normal opacity-80 truncate">{duty.time}</p>
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              addStaffFormMethods.reset({
                                                date: c.dateString,
                                                dutyType: 'SHIFT',
                                                resourceId: staff.id,
                                                resourceName: staff.name,
                                                resourceType: staff.type,
                                                shiftId: availableShifts[0]?.id || '',
                                                shiftName: availableShifts[0]?.shiftName || '',
                                                shiftTime: availableShifts[0]
                                                  ? `${availableShifts[0].startTime} - ${availableShifts[0].endTime}`
                                                  : '',
                                                targetId: targetLocations[0]?.id || '',
                                                targetName: targetLocations[0]?.name || '',
                                                isEmployeeLocked: true,
                                              })
                                              setIsAddStaffModalOpen(true)
                                            }}
                                            className="w-full h-8 rounded-md text-gray-300 hover:text-[#004B87] hover:bg-blue-50/60 transition-all flex items-center justify-center font-bold text-xs group"
                                            title={`Assign shift to ${staff.name} on ${c.dateString}`}
                                          >
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold">
                                              +
                                            </span>
                                            <span className="group-hover:hidden text-gray-300 text-xs">—</span>
                                          </button>
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Full Interactive Calendar View */
                    <div className="space-y-4">
                      {/* Calendar Navigation */}
                      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                          <h2 className="text-lg font-bold text-gray-900">
                            {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </h2>
                          <Badge
                            variant="outline"
                            className="text-xs bg-blue-50 text-[#004B87] border-blue-200 font-semibold"
                          >
                            {filteredDates.length} Shifts Scheduled
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentCalendarDate(
                                new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1),
                              )
                            }
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setCurrentCalendarDate(new Date())}>
                            Today
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentCalendarDate(
                                new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1),
                              )
                            }
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Month Grid Header */}
                      <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-500 uppercase tracking-wider py-2 bg-gray-50 rounded-lg">
                        <div>Sun</div>
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div>Fri</div>
                        <div>Sat</div>
                      </div>

                      {/* Month Days Cells */}
                      <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((cell, idx) => {
                          const dateAssignments = displayRosterDates.filter((item) => item.date === cell.dateString)

                          return (
                            <button
                              type="button"
                              key={idx}
                              onClick={() => setSelectedCellDate(cell.dateString)}
                              className={`min-h-[115px] p-2.5 border rounded-xl transition-all cursor-pointer flex flex-col justify-between text-left w-full ${
                                cell.isCurrentMonth
                                  ? 'bg-white border-gray-200 hover:border-[#004B87]/50 hover:shadow-md'
                                  : 'bg-gray-50/50 border-gray-100 text-gray-400'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-xs font-bold ${
                                    cell.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                                  }`}
                                >
                                  {cell.dayNumber}
                                </span>
                                {dateAssignments.length > 0 && (
                                  <Badge className="bg-blue-100 text-[#004B87] text-[10px] px-1.5 py-0 font-bold">
                                    {dateAssignments.length}
                                  </Badge>
                                )}
                              </div>

                              {/* Duty Chips inside cell */}
                              <div className="space-y-1 my-1 overflow-hidden">
                                {dateAssignments.slice(0, 2).map((assignment) => (
                                  <div
                                    key={assignment.id}
                                    className={`p-1.5 rounded-md text-[11px] font-semibold truncate border ${
                                      assignment.status === 'CANCELLED'
                                        ? 'bg-rose-50 text-rose-800 border-rose-200 line-through'
                                        : assignment.type.includes('VISITING')
                                          ? 'bg-purple-50 text-purple-900 border-purple-200'
                                          : assignment.type.includes('IN_HOUSE')
                                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                    }`}
                                  >
                                    <p className="font-bold truncate text-gray-900 leading-tight">{assignment.shift}</p>
                                    <p className="text-[9.5px] font-medium text-gray-600 truncate mt-0.5">
                                      {assignment.resource}
                                    </p>
                                  </div>
                                ))}
                                {dateAssignments.length > 2 && (
                                  <p className="text-[10px] text-gray-500 font-semibold pl-1">
                                    +{dateAssignments.length - 2} more
                                  </p>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'builder',
            label: 'Express Roster Builder',
            shortLabel: 'Builder',
            icon: Sliders,
            content: (
              <Card className="shadow-xs border-gray-200">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Express Roster Builder</CardTitle>
                    <CardDescription className="text-xs">
                      Configure shift schedules, assign staff, review conflicts, and publish rosters in one unified
                      form.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="space-y-10">
                    {/* Section A: Scope & Schedule */}
                    <section className="space-y-6">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Scope & Schedule</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Set duty type, date range, working days, shift template, and target location.
                        </p>
                      </div>
                      {/* Duty Type Selector */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-900">Operational Duty Type *</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { type: 'SHIFT', label: 'Regular Shift', icon: Activity },
                            { type: 'OPD_SESSION', label: 'OPD Session', icon: Stethoscope },
                          ].map((item) => (
                            <button
                              key={item.type}
                              type="button"
                              onClick={() => {
                                if (item.type === 'OPD_SESSION') {
                                  const doctors = filterStaffAvailableForSchedule(
                                    sampleResources.filter((r) => r.type === 'DOCTOR'),
                                    1,
                                  )
                                  const matchingClinic =
                                    targetLocations.find((t) => t.type === 'CLINIC_VENUE' || t.type === 'DEPARTMENT') ||
                                    targetLocations[0]
                                  const firstDoc = doctors[0]
                                  setBuilderForm({
                                    ...builderForm,
                                    dutyType: 'OPD_SESSION',
                                    resourceType: 'DOCTOR',
                                    selectedResourceIds: firstDoc ? [firstDoc.id] : [],
                                    selectedResourceNames: firstDoc ? [firstDoc.name] : [],
                                    targetScopeType: matchingClinic ? matchingClinic.type : 'DEPARTMENT',
                                    selectedTargetId: matchingClinic ? matchingClinic.id : builderForm.selectedTargetId,
                                    selectedTargetName: matchingClinic
                                      ? matchingClinic.name
                                      : builderForm.selectedTargetName,
                                  })
                                } else {
                                  const employees = filterStaffAvailableForSchedule(
                                    sampleResources.filter((r) => r.type === 'EMPLOYEE'),
                                    2,
                                  )
                                  const matchingFloor =
                                    targetLocations.find((t) => t.type === 'FLOOR' || t.type === 'PROPERTY') ||
                                    targetLocations[0]
                                  setBuilderForm({
                                    ...builderForm,
                                    dutyType: 'SHIFT',
                                    resourceType: 'EMPLOYEE',
                                    selectedResourceIds: employees.map((e) => e.id),
                                    selectedResourceNames: employees.map((e) => e.name),
                                    targetScopeType: matchingFloor ? matchingFloor.type : 'PROPERTY',
                                    selectedTargetId: matchingFloor ? matchingFloor.id : builderForm.selectedTargetId,
                                    selectedTargetName: matchingFloor
                                      ? matchingFloor.name
                                      : builderForm.selectedTargetName,
                                  })
                                }
                              }}
                              className={`p-4 border rounded-xl flex items-center justify-center gap-3 transition-all text-sm font-bold ${
                                builderForm.dutyType === item.type
                                  ? 'border-[#004B87] bg-blue-50/80 text-[#004B87] ring-2 ring-[#004B87]/20 shadow-xs'
                                  : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <item.icon className="w-5 h-5 text-[#004B87]" />
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-semibold">Effective From Date *</Label>
                          <Input
                            type="date"
                            value={builderForm.effectiveFrom}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => {
                              const effectiveFrom = e.target.value
                              const effectiveUntil =
                                effectiveFrom &&
                                builderForm.effectiveUntil &&
                                builderForm.effectiveUntil < effectiveFrom
                                  ? effectiveFrom
                                  : builderForm.effectiveUntil
                              setBuilderForm({ ...builderForm, effectiveFrom, effectiveUntil })
                            }}
                            className="mt-1.5 h-10"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold">Effective Until Date *</Label>
                          <Input
                            type="date"
                            value={builderForm.effectiveUntil}
                            min={builderForm.effectiveFrom || new Date().toISOString().split('T')[0]}
                            disabled={!builderForm.effectiveFrom}
                            onChange={(e) => setBuilderForm({ ...builderForm, effectiveUntil: e.target.value })}
                            className="mt-1.5 h-10"
                          />
                        </div>
                      </div>
                      <FieldErrorMessage
                        message={builderErrors.effectiveFrom?.message || builderErrors.effectiveUntil?.message}
                      />

                      {/* Working Days */}
                      <div className="space-y-3">
                        <Label className="text-xs font-semibold">Working Days *</Label>
                        <div className="flex flex-wrap items-center gap-2">
                          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => {
                            const isSelected = builderForm.selectedDaysOfWeek.includes(day)
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleDayOfWeek(day)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                  isSelected
                                    ? 'bg-[#004B87] text-white border-[#004B87] shadow-xs'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {day}
                              </button>
                            )
                          })}
                        </div>
                        <FieldErrorMessage message={builderErrors.selectedDaysOfWeek?.message} />
                      </div>

                      {/* Shift Templates */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold text-gray-900">Shift Template *</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleOpenCreateShift}
                            className="text-xs h-7 text-[#004B87] gap-1 hover:bg-blue-50 font-semibold"
                          >
                            <Plus className="w-3.5 h-3.5" /> Create Custom Shift
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {availableShifts.map((shift) => (
                            <button
                              type="button"
                              key={shift.id}
                              onClick={() =>
                                setBuilderForm({
                                  ...builderForm,
                                  selectedShiftId: shift.id,
                                  selectedShiftName: shift.shiftName,
                                  selectedShiftTime: `${shift.startTime} - ${shift.endTime}`,
                                })
                              }
                              className={`p-3.5 border rounded-xl cursor-pointer transition-all text-left ${
                                builderForm.selectedShiftId === shift.id
                                  ? 'border-[#004B87] bg-blue-50/70 ring-2 ring-[#004B87]/20 shadow-xs'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-xs text-gray-900">{shift.shiftName}</p>
                                {builderForm.selectedShiftId === shift.id && (
                                  <CheckCircle2 className="w-4 h-4 text-[#004B87]" />
                                )}
                              </div>
                              <p className="text-xs font-bold text-[#004B87] mt-2">
                                {shift.startTime} - {shift.endTime}
                              </p>
                            </button>
                          ))}
                        </div>
                        <FieldErrorMessage message={builderErrors.selectedShiftId?.message} />
                      </div>

                      {frequencies.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-900">Frequency Template</Label>
                          <Select
                            value={builderForm.frequencyId}
                            onValueChange={(v: string) => setBuilderForm({ ...builderForm, frequencyId: v })}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              {frequencies.map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.frequencyName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {(builderForm.dutyType === 'OPD_SESSION' || builderForm.enableOpdSlots) && (
                        <OpdConfigSection
                          shiftTime={builderForm.selectedShiftTime}
                          enableOpdSlots={builderForm.enableOpdSlots ?? builderForm.dutyType === 'OPD_SESSION'}
                          slotDurationMinutes={builderForm.opdSlotDurationMinutes ?? 30}
                          slotBufferMinutes={builderForm.opdBufferMinutes ?? 0}
                          onEnableChange={(enabled) => setBuilderForm({ ...builderForm, enableOpdSlots: enabled })}
                          onDurationChange={(minutes) =>
                            setBuilderForm({ ...builderForm, opdSlotDurationMinutes: minutes })
                          }
                          onBufferChange={(minutes) => setBuilderForm({ ...builderForm, opdBufferMinutes: minutes })}
                        />
                      )}

                      {/* Duty Target Scope (Simplified Core Hierarchy) */}
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold text-gray-900">Duty Target Scope & Location *</Label>
                          <button
                            type="button"
                            onClick={() => setIsAddLocationModalOpen(true)}
                            className="text-xs text-[#004B87] font-semibold hover:underline flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-all hover:bg-blue-100"
                          >
                            <Plus className="w-3.5 h-3.5" /> + Add New Location / Dept
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {[
                            {
                              type: 'ROOM_UNIT' as const,
                              label: 'Flat / Unit',
                              icon: Home,
                              desc: 'Flat or Resident Unit',
                            },
                            { type: 'FLOOR' as const, label: 'Floor / Wing', icon: Layers, desc: 'Caregiver Floor' },
                            {
                              type: 'CLINIC_VENUE' as const,
                              label: 'Clinic Suite',
                              icon: Stethoscope,
                              desc: 'Doctor OPD Room',
                            },
                            { type: 'DEPARTMENT' as const, label: 'Department', icon: Activity, desc: 'Nursing & Med' },
                          ].map((item) => {
                            const availableCount = targetLocations.filter((t) => t.type === item.type).length
                            const isSelected = builderForm.targetScopeType === item.type
                            return (
                              <button
                                type="button"
                                key={item.type}
                                onClick={() => {
                                  const matching = targetLocations.filter((t) => t.type === item.type)
                                  const firstMatch = matching[0]
                                  setBuilderForm({
                                    ...builderForm,
                                    targetScopeType: item.type,
                                    selectedTargetId: firstMatch ? firstMatch.id : '',
                                    selectedTargetName: firstMatch ? firstMatch.name : 'No Target Available',
                                  })
                                }}
                                className={`p-3 border rounded-xl cursor-pointer transition-all flex flex-col items-center text-center gap-1.5 ${
                                  isSelected
                                    ? 'border-[#004B87] bg-blue-50/80 text-[#004B87] font-bold ring-2 ring-[#004B87]/20 shadow-xs'
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <item.icon className="w-4 h-4 text-[#004B87]" />
                                  <span className="text-xs font-semibold">{item.label}</span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-normal">
                                  {availableCount} Available
                                </span>
                              </button>
                            )
                          })}
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-gray-700">
                              Select Target Location (
                              {targetLocations.filter((t) => t.type === builderForm.targetScopeType).length} Available)
                              *
                            </Label>
                          </div>
                          <Select
                            value={builderForm.selectedTargetId}
                            onValueChange={(val: string) => {
                              const found = targetLocations.find((t) => t.id === val)
                              setBuilderForm({
                                ...builderForm,
                                selectedTargetId: val,
                                selectedTargetName: found?.name || val,
                              })
                            }}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select specific location target..." />
                            </SelectTrigger>
                            <SelectContent>
                              {groupedTargetLocations
                                .map((group) => {
                                  const matchingItems = group.items.filter(
                                    (target) => target.type === builderForm.targetScopeType,
                                  )
                                  if (matchingItems.length === 0) return null
                                  return (
                                    <SelectGroup key={group.label}>
                                      <SelectLabel className="font-bold text-[#004B87] uppercase text-[10px] tracking-wider px-2 py-1 bg-gray-50/80 my-1 rounded-sm">
                                        {group.label}
                                      </SelectLabel>
                                      {matchingItems.map((target) => (
                                        <SelectItem key={target.id} value={target.id}>
                                          {target.name}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  )
                                })
                                .filter(Boolean)}
                            </SelectContent>
                          </Select>
                          <FieldErrorMessage message={builderErrors.selectedTargetId?.message} />
                        </div>
                      </div>
                    </section>

                    <Separator />

                    {/* Section B: Personnel Selection */}
                    <section className="space-y-6">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Personnel Selection</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Select personnel to assign for{' '}
                          <strong>
                            {builderForm.selectedShiftName} ({builderForm.selectedShiftTime})
                          </strong>{' '}
                          from{' '}
                          <strong>
                            {builderForm.effectiveFrom} to {builderForm.effectiveUntil}
                          </strong>
                          .
                        </p>
                      </div>

                      {/* Staff Selection Category */}
                      <div className="space-y-3 pt-2">
                        <Label className="text-sm font-semibold text-gray-900">Select Resource Category *</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              const employees = filterStaffAvailableForSchedule(
                                sampleResources.filter((r) => r.type === 'EMPLOYEE'),
                                2,
                              )
                              const matchingFloor =
                                targetLocations.find((t) => t.type === 'FLOOR' || t.type === 'PROPERTY') ||
                                targetLocations[0]
                              setBuilderForm({
                                ...builderForm,
                                resourceType: 'EMPLOYEE',
                                selectedResourceIds: employees.map((e) => e.id),
                                selectedResourceNames: employees.map((e) => e.name),
                                targetScopeType: matchingFloor ? matchingFloor.type : builderForm.targetScopeType,
                                selectedTargetId: matchingFloor ? matchingFloor.id : builderForm.selectedTargetId,
                                selectedTargetName: matchingFloor ? matchingFloor.name : builderForm.selectedTargetName,
                              })
                            }}
                            className={`p-4 border rounded-xl flex items-center gap-3 transition-all ${
                              builderForm.resourceType === 'EMPLOYEE'
                                ? 'border-[#004B87] bg-blue-50/70 text-[#004B87] ring-2 ring-[#004B87]/20 shadow-xs'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <UserCheck className="w-6 h-6 text-[#004B87]" />
                            <div className="text-left">
                              <p className="font-bold text-sm">Staff Employees</p>
                              <p className="text-xs text-gray-500 font-normal">Nurses & Caregivers</p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const doctors = filterStaffAvailableForSchedule(
                                sampleResources.filter((r) => r.type === 'DOCTOR'),
                                1,
                              )
                              const matchingClinic =
                                targetLocations.find((t) => t.type === 'CLINIC_VENUE' || t.type === 'DEPARTMENT') ||
                                targetLocations[0]
                              const firstDoc = doctors[0]
                              setBuilderForm({
                                ...builderForm,
                                resourceType: 'DOCTOR',
                                selectedResourceIds: firstDoc ? [firstDoc.id] : [],
                                selectedResourceNames: firstDoc ? [firstDoc.name] : [],
                                targetScopeType: matchingClinic ? matchingClinic.type : builderForm.targetScopeType,
                                selectedTargetId: matchingClinic ? matchingClinic.id : builderForm.selectedTargetId,
                                selectedTargetName: matchingClinic
                                  ? matchingClinic.name
                                  : builderForm.selectedTargetName,
                              })
                            }}
                            className={`p-4 border rounded-xl flex items-center gap-3 transition-all ${
                              builderForm.resourceType === 'DOCTOR'
                                ? 'border-[#004B87] bg-blue-50/70 text-[#004B87] ring-2 ring-[#004B87]/20 shadow-xs'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <Stethoscope className="w-6 h-6 text-[#004B87]" />
                            <div className="text-left">
                              <p className="font-bold text-sm">Doctor Resources</p>
                              <p className="text-xs text-gray-500 font-normal">In-House or Visiting Specialists</p>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Staff selection via scheduling resources API */}
                      <StaffPickerPanel
                        builderForm={builderForm}
                        rosterDates={displayRosterDates}
                        scheduleDates={builderScheduleDates}
                        onToggleResource={handleToggleResourceSelection}
                        onSelectAll={(resources) => {
                          setBuilderForm((prev) => ({
                            ...prev,
                            selectedResourceIds: resources.map((r) => r.id),
                            selectedResourceNames: resources.map((r) => r.name),
                          }))
                        }}
                        onClearAll={handleClearAllResources}
                        onOnboardDoctor={() => setIsOnboardDoctorOpen(true)}
                      />
                      <FieldErrorMessage message={builderErrors.selectedResourceIds?.message} />
                    </section>

                    <Separator />

                    {/* Section C: Review & Publish */}
                    <section className="space-y-6">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Review & Publish</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Pre-flight policy evaluation, duty schedule preview, and roster submission.
                        </p>
                      </div>

                      {isPublished ? (
                        <div className="space-y-5 p-8 border border-emerald-200 bg-emerald-50/70 rounded-2xl text-center">
                          <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto animate-bounce" />
                          <div>
                            <h3 className="text-xl font-bold text-emerald-900">
                              Roster Assignment Successfully Published!
                            </h3>
                            <p className="text-xs text-emerald-700 mt-1">
                              Committed {generatedDateInstancesPreview.length} date instances across{' '}
                              {builderForm.selectedResourceIds.length} personnel.
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-3 pt-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsPublished(false)
                                builderFormMethods.reset(builderDefaultValues)
                              }}
                              className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-semibold"
                            >
                              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Create Another Roster
                            </Button>
                            <Button
                              onClick={() => setActiveTab('grid')}
                              className="bg-[#004B87] hover:bg-[#003865] text-xs font-bold gap-1.5"
                            >
                              <LayoutList className="w-3.5 h-3.5" /> View Duty Grid
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Pre-Flight Status */}
                          {totalRosterConflicts === 0 ? (
                            <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                                <div>
                                  <p className="font-bold text-sm text-emerald-900">0 Policy Conflicts Detected</p>
                                  <p className="text-xs text-emerald-700">
                                    All {builderForm.selectedResourceIds.length} staff pass overlap checks and rest
                                    period policy benchmarks.
                                  </p>
                                </div>
                              </div>
                              <Badge className="bg-emerald-600 text-white shrink-0">PASSED</Badge>
                            </div>
                          ) : (
                            <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                                <div>
                                  <p className="font-bold text-sm text-amber-900">
                                    {totalRosterConflicts} Overlap Conflict{totalRosterConflicts > 1 ? 's' : ''}{' '}
                                    Detected
                                  </p>
                                  <p className="text-xs text-amber-700">
                                    Some selected personnel already have duties scheduled in this timeframe. You can
                                    review preview below or proceed with override.
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className="bg-amber-100 text-amber-800 border-amber-300 font-bold shrink-0"
                              >
                                ATTENTION
                              </Badge>
                            </div>
                          )}

                          {/* Operational Notes */}
                          <div className="p-4 border border-gray-200 bg-gray-50 rounded-xl space-y-2">
                            <Label className="text-xs font-bold text-gray-800">
                              Operational Notes / Special Instructions
                            </Label>
                            <Input
                              value={builderForm.instructions}
                              onChange={(e) => setBuilderForm({ ...builderForm, instructions: e.target.value })}
                              placeholder="e.g. Conduct medication checks at 09:00 and 14:00."
                              className="h-9 text-xs bg-white"
                            />
                          </div>

                          {/* Duty Dates Preview Table */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold text-gray-900">
                                Calculated Duty Dates Preview ({generatedDateInstancesPreview.length} Instances)
                              </Label>
                              <span className="text-[11px] text-gray-500 font-mono">
                                {generatedDateInstancesPreview.length * 8} Total Hours
                              </span>
                            </div>
                            <div className="border rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-gray-100 text-gray-600 font-bold uppercase sticky top-0">
                                  <tr>
                                    <th className="p-2.5">Date</th>
                                    <th className="p-2.5">Resource</th>
                                    <th className="p-2.5">Shift</th>
                                    <th className="p-2.5">Target Location</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                  {generatedDateInstancesPreview.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                      <td className="p-2.5 font-bold text-gray-900">
                                        {item.date} ({item.dayName})
                                      </td>
                                      <td className="p-2.5 font-semibold text-gray-800">{item.resourceName}</td>
                                      <td className="p-2.5 text-[#004B87] font-medium">
                                        {builderForm.selectedShiftName}
                                      </td>
                                      <td className="p-2.5 text-gray-600">{builderForm.selectedTargetName}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      )}

                      {!isPublished && (
                        <div className="flex justify-end border-t border-gray-100 pt-6">
                          <Button
                            onClick={handleFinalPublishRoster}
                            disabled={isPublishing || isPublishHookPending || !canPublishRoster}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-6 font-bold shadow-xs"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {isPublishing || isPublishHookPending
                              ? 'Publishing Roster...'
                              : `Publish & Commit Roster (${generatedDateInstancesPreview.length} Dates)`}
                          </Button>
                        </div>
                      )}
                    </section>
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'shifts',
            label: 'Shift Templates',
            shortLabel: 'Shifts',
            icon: Clock,
            content: (
              <ShiftTemplatesTab
                availableShifts={availableShifts}
                departments={departments}
                onOpenCreateShift={handleOpenCreateShift}
                onOpenEditShift={handleOpenEditShift}
              />
            ),
          },
        ]}
      />

      {/* Modal 1: Create or Edit Shift Master Template */}
      <CreateCustomShiftModal
        isOpen={isCreateShiftModalOpen}
        onOpenChange={setIsCreateShiftModalOpen}
        editingShiftId={editingShiftId}
        defaultValues={shiftFormDefaults}
        departments={departments}
        onSubmit={handleSaveShift}
        isSubmitting={isSubmittingShift}
      />

      {/* Modal 2: Request Duty Replacement / Substitution */}
      <Dialog open={isReplacementModalOpen} onOpenChange={setIsReplacementModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Substitute Duty / Request Replacement</DialogTitle>
            <DialogDescription>
              Assign a replacement caregiver or doctor for date instance {selectedDateForReplacement?.date}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReplacementSubmit} className="space-y-4 py-2">
            <div className="p-3 border rounded-lg bg-gray-50 text-xs space-y-1">
              <p>
                <strong>Current Duty:</strong> {selectedDateForReplacement?.resource} (
                {selectedDateForReplacement?.type})
              </p>
              <p>
                <strong>Shift:</strong> {selectedDateForReplacement?.shift} ({selectedDateForReplacement?.time})
              </p>
              <p>
                <strong>Target Location:</strong> {selectedDateForReplacement?.target}
              </p>
            </div>

            <div>
              <Label>Select Replacement Caregiver / Doctor *</Label>
              <Controller
                control={replacementFormMethods.control}
                name="replacementResourceId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select replacement staff..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleResources.map((res) => (
                        <SelectItem key={res.id} value={res.id}>
                          {res.name} ({res.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldErrorMessage message={replacementFormMethods.formState.errors.replacementResourceId?.message} />
            </div>

            <div>
              <Label>Replacement Reason *</Label>
              <Input
                placeholder="e.g. Medical leave approved by HR."
                className="mt-1"
                {...replacementFormMethods.register('reason')}
              />
              <FieldErrorMessage message={replacementFormMethods.formState.errors.reason?.message} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsReplacementModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingReplacement} className="bg-emerald-600 hover:bg-emerald-700">
                {isSubmittingReplacement ? 'Assigning...' : 'Confirm Replacement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Non-Destructive Duty Cancellation Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-rose-700">
              <CalendarX className="w-5 h-5" /> Cancel Operational Duty Instance
            </DialogTitle>
            <DialogDescription>
              Cancel duty for {selectedDateForCancel?.resource} on {selectedDateForCancel?.date}. Instance remains in
              historical record as CANCELLED.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmCancellation} className="space-y-4 py-2">
            <div className="p-3 border border-rose-200 bg-rose-50/50 rounded-xl text-xs space-y-1">
              <p>
                <strong>Target Venue:</strong> {selectedDateForCancel?.target}
              </p>
              <p>
                <strong>Shift Pattern:</strong> {selectedDateForCancel?.shift} ({selectedDateForCancel?.time})
              </p>
            </div>

            <div>
              <Label className="text-xs font-bold text-rose-900">Mandatory Cancellation Reason (Audited) *</Label>
              <textarea
                rows={3}
                placeholder="e.g. Facility Maintenance / Doctor Illness / Operational Venue Shutdown."
                className="w-full p-2.5 mt-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                {...cancelFormMethods.register('cancellationReason')}
              />
              <FieldErrorMessage message={cancelFormMethods.formState.errors.cancellationReason?.message} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCancelModalOpen(false)}>
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingCancel}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Add Employee to Existing Roster Modal */}
      <Dialog open={isAddStaffModalOpen} onOpenChange={setIsAddStaffModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#004B87]" /> Add Staff / Duty to Roster
            </DialogTitle>
            <DialogDescription>
              {addStaffForm.isEmployeeLocked ? (
                <span className="flex items-center gap-1.5 mt-1 text-xs text-gray-700 font-medium">
                  Assigning roster duty for{' '}
                  <Badge className="bg-[#004B87] text-white text-xs px-2 py-0.5">{addStaffForm.resourceName}</Badge> (
                  {addStaffForm.resourceType})
                </span>
              ) : (
                'Assign a new employee or doctor directly into an existing roster schedule.'
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStaffToRoster} className="space-y-4 py-2">
            <div>
              <Label>Duty Date *</Label>
              <Input type="date" className="mt-1" {...addStaffFormMethods.register('date')} />
              <FieldErrorMessage message={addStaffFormMethods.formState.errors.date?.message} />
            </div>

            <div>
              <Label>Shift Pattern *</Label>
              <Controller
                control={addStaffFormMethods.control}
                name="shiftId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val: string) => {
                      const shift = availableShifts.find((s) => s.id === val)
                      field.onChange(val)
                      addStaffFormMethods.setValue('shiftName', shift?.shiftName || val, { shouldValidate: true })
                      addStaffFormMethods.setValue(
                        'shiftTime',
                        shift ? `${shift.startTime} - ${shift.endTime}` : '08:00 - 16:00',
                        { shouldValidate: true },
                      )
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select shift..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableShifts.map((shift) => {
                        const staffTarget = addStaffForm.resourceName || addStaffForm.resourceId
                        const shiftAvail = getShiftPatternAvailabilityForStaff(staffTarget, addStaffForm.date, shift.id)
                        return (
                          <SelectItem key={shift.id} value={shift.id}>
                            <div className="flex items-center justify-between w-full gap-3 py-0.5 min-w-[260px]">
                              <span className="font-medium text-gray-900">
                                {shift.shiftName} ({shift.startTime} - {shift.endTime})
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9.5px] px-2 py-0.5 font-bold ${
                                  shiftAvail.isFree
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}
                              >
                                {shiftAvail.label}
                              </Badge>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldErrorMessage message={addStaffFormMethods.formState.errors.shiftId?.message} />
            </div>

            <div>
              <Label>Target Location Venue *</Label>
              <Controller
                control={addStaffFormMethods.control}
                name="targetId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val: string) => {
                      const target = targetLocations.find((t) => t.id === val)
                      field.onChange(val)
                      addStaffFormMethods.setValue('targetName', target?.name || val, { shouldValidate: true })
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select target..." />
                    </SelectTrigger>
                    <SelectContent>
                      {groupedTargetLocations.map((group) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel className="font-bold text-[#004B87] uppercase text-[10px] tracking-wider px-2 py-1 bg-gray-50/80 my-1 rounded-sm">
                            {group.label}
                          </SelectLabel>
                          {group.items.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldErrorMessage message={addStaffFormMethods.formState.errors.targetId?.message} />
            </div>

            <div>
              <Label>Operational Duty Type *</Label>
              <Controller
                control={addStaffFormMethods.control}
                name="dutyType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select duty type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SHIFT">SHIFT (Regular Operational Duty)</SelectItem>
                      <SelectItem value="OPD_SESSION">OPD_SESSION (Doctor Consultation Session)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldErrorMessage message={addStaffFormMethods.formState.errors.dutyType?.message} />
            </div>

            {!addStaffForm.isEmployeeLocked && (
              <div>
                <Label>Select Staff Member / Doctor *</Label>
                <Controller
                  control={addStaffFormMethods.control}
                  name="resourceId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val: string) => {
                        const res = sampleResources.find((r) => r.id === val)
                        field.onChange(val)
                        addStaffFormMethods.setValue('resourceName', res?.name || val, { shouldValidate: true })
                        addStaffFormMethods.setValue('resourceType', res?.type || 'EMPLOYEE', { shouldValidate: true })
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select staff..." />
                      </SelectTrigger>
                      <SelectContent>
                        {[...sampleResources]
                          .sort((a, b) => {
                            const availA = getStaffAvailabilityStatus(a.name, addStaffForm.date).isAvailable ? 0 : 1
                            const availB = getStaffAvailabilityStatus(b.name, addStaffForm.date).isAvailable ? 0 : 1
                            return availA - availB
                          })
                          .map((res) => {
                            const avail = getStaffAvailabilityStatus(res.name, addStaffForm.date)
                            return (
                              <SelectItem key={res.id} value={res.id}>
                                <div className="flex items-center justify-between w-full gap-3 py-0.5 min-w-[260px]">
                                  <span className="font-medium text-gray-900">
                                    {res.name} ({res.role})
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9.5px] px-2 py-0.5 font-bold ${avail.badgeColor}`}
                                  >
                                    {avail.statusText}
                                  </Badge>
                                </div>
                              </SelectItem>
                            )
                          })}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldErrorMessage message={addStaffFormMethods.formState.errors.resourceId?.message} />
              </div>
            )}

            {(() => {
              const staffTarget = addStaffForm.resourceName || addStaffForm.resourceId
              const avail = getStaffAvailabilityStatus(staffTarget, addStaffForm.date)
              if (!avail.isAvailable) {
                return (
                  <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs mt-3">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-900">⚠️ Double-Booking Conflict Detected</p>
                      <p className="text-[11px] text-amber-800 leading-snug">
                        <strong>{addStaffForm.resourceName || 'Selected Staff'}</strong> is already scheduled on{' '}
                        <strong>{addStaffForm.date}</strong>:
                      </p>
                      <p className="text-[11px] font-bold text-amber-950 bg-amber-100/80 px-2.5 py-1 rounded border border-amber-200 inline-block">
                        📍 {avail.conflictDetails}
                      </p>
                      <p className="text-[10px] text-amber-700 italic">
                        Assigning will create an overlapping shift for this staff member.
                      </p>
                    </div>
                  </div>
                )
              }
              return null
            })()}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddStaffModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingAddStaff}
                className={`${
                  !getStaffAvailabilityStatus(addStaffForm.resourceName || addStaffForm.resourceId, addStaffForm.date)
                    .isAvailable
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-[#004B87] hover:bg-[#003865]'
                }`}
              >
                {isSubmittingAddStaff
                  ? 'Adding...'
                  : !getStaffAvailabilityStatus(addStaffForm.resourceName || addStaffForm.resourceId, addStaffForm.date)
                        .isAvailable
                    ? 'Assign Staff (Override Conflict)'
                    : 'Assign Staff to Roster'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Selected Calendar Cell Details Modal */}
      {selectedCellDate && (
        <Dialog open={!!selectedCellDate} onOpenChange={() => setSelectedCellDate(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[#004B87]" /> Scheduled Duties for {selectedCellDate}
                </DialogTitle>
              </div>
              <DialogDescription>
                Review active shift instances, substitute, or cancel staff for this date.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
              {displayRosterDates.filter((item) => item.date === selectedCellDate).length > 0 ? (
                displayRosterDates
                  .filter((item) => item.date === selectedCellDate)
                  .map((item) => (
                    <div key={item.id} className="p-3.5 border rounded-xl space-y-2 bg-white shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 text-sm">{item.resource}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge className={getTypeBadge(item.type)}>{item.type}</Badge>
                          <Badge className={getDutyTypeBadge(item.dutyType)}>{item.dutyType}</Badge>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p>
                          <strong>Shift Pattern:</strong> {item.shift} ({item.time})
                        </p>
                        <p>
                          <strong>Target Venue:</strong> {item.target}
                        </p>
                        <p>
                          <strong>Status:</strong> <Badge className={getStatusBadge(item.status)}>{item.status}</Badge>
                        </p>
                      </div>
                      {item.status !== 'CANCELLED' && (
                        <div className="pt-2 flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCellDate(null)
                              setSelectedDateForReplacement(item)
                              setIsReplacementModalOpen(true)
                            }}
                            className="text-xs gap-1"
                          >
                            <UserCheck2 className="w-3.5 h-3.5" /> Substitute
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCellDate(null)
                              setSelectedDateForCancel(item)
                              cancelFormMethods.reset({ cancellationReason: '' })
                              setIsCancelModalOpen(true)
                            }}
                            className="text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <CalendarX className="w-3.5 h-3.5" /> Cancel Duty
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <div className="p-6 text-center text-gray-500 text-sm bg-gray-50 rounded-xl">
                  No shift assignments scheduled for this date.
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  addStaffFormMethods.reset({
                    ...addStaffFormMethods.getValues(),
                    date: selectedCellDate || new Date().toISOString().split('T')[0],
                    isEmployeeLocked: false,
                  })
                  setSelectedCellDate(null)
                  setIsAddStaffModalOpen(true)
                }}
                className="gap-1.5 text-xs text-[#004B87] border-blue-200"
              >
                <UserPlus className="w-4 h-4" /> Add Staff to {selectedCellDate}
              </Button>
              <Button variant="outline" onClick={() => setSelectedCellDate(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* COPY FORWARD ROSTER DIALOG (P1 Enterprise Feature) */}
      <CopyAssignmentModal
        open={isCopyModalOpen}
        onOpenChange={setIsCopyModalOpen}
        onSuccess={() => refetchRosterData()}
      />

      <ValidationResultPanel
        open={isValidationPanelOpen}
        onOpenChange={setIsValidationPanelOpen}
        results={validationResults}
        mode={validationPanelMode}
        overrideReason={pendingOverrideReason}
        onOverrideReasonChange={setPendingOverrideReason}
        onConfirmOverride={validationPanelMode === 'override' ? handleConfirmOverridePublish : undefined}
      />

      <OnboardDoctorModal
        open={isOnboardDoctorOpen}
        onOpenChange={setIsOnboardDoctorOpen}
        specializations={specializations}
        targetLocations={targetLocations}
      />

      {/* Quick Add Location / Department Modal */}
      <AddTargetLocationModal
        isOpen={isAddLocationModalOpen}
        onOpenChange={setIsAddLocationModalOpen}
        defaultValues={addLocationDefaultValues}
        onSubmit={(values) => {
          const newId = `target-custom-${Date.now()}`
          const createdLoc: TargetLocation = {
            id: newId,
            name: values.name.trim(),
            type: values.type,
          }
          setCustomLocations((prev) => [...prev, createdLoc])
          setBuilderForm((prev) => ({
            ...prev,
            targetScopeType: values.type,
            selectedTargetId: newId,
            selectedTargetName: createdLoc.name,
          }))
          setIsAddLocationModalOpen(false)
          toast.success(`Location "${createdLoc.name}" created and selected!`)
        }}
      />

      {/* Medical Onboarding & Specializations Modal */}
      <MedicalSpecializationModal open={isMedicalOnboardingOpen} onOpenChange={setIsMedicalOnboardingOpen} />

      <OpdBookingModal
        open={isOpdBookingOpen}
        onOpenChange={setIsOpdBookingOpen}
        dateId={opdBookingDateId || ''}
        dutyLabel={opdBookingLabel}
        locationId={locationId ?? undefined}
      />
    </div>
  )
}
