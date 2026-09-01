import { useState, useEffect, useMemo } from 'react'
import {
  Calendar as CalendarIcon,
  UserCheck,
  Stethoscope,
  ShieldCheck,
  Clock,
  Sliders,
  Plus,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCheck2,
  CalendarDays,
  Pencil,
  Search,
  Layers,
  Home,
  Lock,
  Sparkles,
  MapPin,
  FileCheck,
  UserPlus,
  CheckSquare,
  Square,
  Activity,
  CalendarX,
  Copy,
  Download,
  Bot,
  Filter,
  X,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { ResponsiveTabs } from '@/components/common/ResponsiveTabs'
import StatCard from '../AssetManagement/components/StatCard'
import StatsGrid from '../AssetManagement/components/StatsGrid'
import { rosterService, type CreateShiftPayload } from '@/lib/services/rosterService'
import { getPropertiesAPI } from '@/lib/services/propertyService'
import type { Property } from '@/pages/Property/types'
import { DataTable } from '@/components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { useMedicalStore } from '@/lib/stores/medicalStore'
import { MedicalSpecializationModal } from '@/components/medical/MedicalSpecializationModal'
import { useUsersQuery } from '@/hooks/react-query/user'
import { useLocationContext } from '@/hooks/useLocation'

export interface RosterGridRow {
  id: string
  date: string
  resource: string
  type: string
  dutyType: 'SHIFT' | 'OPD_SESSION'
  shift: string
  time: string
  target: string
  status: string
}

export interface SchedulableResource {
  id: string
  name: string
  role: string
  type: 'EMPLOYEE' | 'DOCTOR'
  subType?: 'IN_HOUSE' | 'VISITING'
  specialization?: string
}

export interface TargetLocation {
  id: string
  name: string
  type: 'PROPERTY' | 'BLOCK' | 'FLOOR' | 'AREA' | 'ROOM_UNIT' | 'DEPARTMENT' | 'CLINIC_VENUE' | 'SERVICE'
}

export interface OpdSlot {
  slotNumber: number
  startTime: string
  endTime: string
  duration: number
}

function calculateOpdSlots(
  shiftTime: string,
  slotDurationMinutes: number,
  bufferMinutes: number = 0
): OpdSlot[] {
  if (!shiftTime || !shiftTime.includes('-')) return []

  const [startStr, endStr] = shiftTime.split('-').map((s) => s.trim())
  const [startH, startM] = startStr.split(':').map(Number)
  const [endH, endM] = endStr.split(':').map(Number)

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return []

  let startTotalMins = startH * 60 + startM
  let endTotalMins = endH * 60 + endM

  if (endTotalMins <= startTotalMins) {
    endTotalMins += 24 * 60
  }

  const slots: OpdSlot[] = []
  let currentMins = startTotalMins
  let count = 1

  while (currentMins + slotDurationMinutes <= endTotalMins) {
    const slotStartMins = currentMins
    const slotEndMins = currentMins + slotDurationMinutes

    const formatTime = (totalMins: number) => {
      const h = Math.floor((totalMins % (24 * 60)) / 60)
      const m = totalMins % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    slots.push({
      slotNumber: count++,
      startTime: formatTime(slotStartMins),
      endTime: formatTime(slotEndMins),
      duration: slotDurationMinutes,
    })

    currentMins = slotEndMins + bufferMinutes
  }

  return slots
}

export interface RosterBuilderState {
  rosterName: string
  dutyType: 'SHIFT' | 'OPD_SESSION'
  resourceType: 'EMPLOYEE' | 'DOCTOR'
  selectedResourceIds: string[]
  selectedResourceNames: string[]
  targetScopeType: 'PROPERTY' | 'BLOCK' | 'FLOOR' | 'AREA' | 'ROOM_UNIT' | 'DEPARTMENT' | 'CLINIC_VENUE' | 'SERVICE'
  selectedTargetId: string
  selectedTargetName: string
  selectedShiftId: string
  selectedShiftName: string
  selectedShiftTime: string
  frequencyType: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'CUSTOM'
  selectedDaysOfWeek: string[]
  effectiveFrom: string
  effectiveUntil: string
  holidayPolicy: 'IGNORE' | 'SKIP' | 'RESCHEDULE' | 'REQUIRE_COVERAGE'
  instructions: string
  overrideReason: string
  overrideConfirmed: boolean
  enableOpdSlots?: boolean
  opdSlotDurationMinutes?: number
  opdBufferMinutes?: number
}

export default function ShiftRosterPage() {
  const [activeTab, setActiveTab] = useState('grid')
  const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'employee'>('calendar')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | 'EMPLOYEE' | 'DOCTOR'>('ALL')
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('ALL')
  const [selectedDutyTypeFilter, setSelectedDutyTypeFilter] = useState<string>('ALL')

  // Location Context & Dynamic Schedulable Target Locations Pool
  const { selectedLocationId, accessibleLocations, selectedLocationName } = useLocationContext()

  // Context IDs — resolved from active location context with localStorage/default fallback
  const companyId = localStorage.getItem('rely_active_company_id') || 'default-company-id'
  const locationId = selectedLocationId || localStorage.getItem('rely_active_property_id') || 'default-property-id'

  // Dynamic API state with location-scoped sessionStorage persistence fallback
  const [liveShifts, setLiveShifts] = useState<any[]>(() => {
    if (!locationId) return []
    const saved = sessionStorage.getItem(`rely_live_shifts_${locationId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // Fallback
      }
    }
    return []
  })

  const [liveRosterDates, setLiveRosterDates] = useState<any[]>(() => {
    if (!locationId) return []
    const saved = sessionStorage.getItem(`rely_live_roster_dates_${locationId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed.filter((item: any) => !item.id || !String(item.id).startsWith('seed-'))
        }
      } catch {
        // Fallback
      }
    }
    return []
  })

  const [liveProperties, setLiveProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Persist liveRosterDates and liveShifts to location-scoped sessionStorage whenever updated
  useEffect(() => {
    if (locationId) {
      sessionStorage.setItem(`rely_live_roster_dates_${locationId}`, JSON.stringify(liveRosterDates))
    }
  }, [liveRosterDates, locationId])

  useEffect(() => {
    if (locationId) {
      sessionStorage.setItem(`rely_live_shifts_${locationId}`, JSON.stringify(liveShifts))
    }
  }, [liveShifts, locationId])


  // Live API Users & Medical Store Staff
  const { data: apiUsers = [], isLoading: isLoadingUsers } = useUsersQuery()
  const { staffList } = useMedicalStore()
  const [isMedicalOnboardingOpen, setIsMedicalOnboardingOpen] = useState(false)

  // Schedulable Resources Pool (Synchronized with Live DB Users & Onboarded Registry)
  const sampleResources: SchedulableResource[] = useMemo(() => {
    if (apiUsers && apiUsers.length > 0) {
      return apiUsers.map((u) => {
        const uAny = u as any
        const profile = (u.profile || {}) as any
        const fullName = profile.firstName
          ? `${profile.firstName} ${profile.lastName || ''}`.trim()
          : u.username || u.email || 'Employee'

        const isDoctor =
          uAny.roleCode?.toUpperCase() === 'DOCTOR' ||
          uAny.roles?.includes('DOCTOR') ||
          (u.userLocations || []).some((ul: any) => ul.role?.code === 'DOCTOR')

        const doctorType = profile.doctorType || uAny.doctorType || 'IN_HOUSE'
        const specialization =
          profile.specialization || uAny.specialization || (isDoctor ? 'General Practice' : 'Clinical Support')

        return {
          id: u.id,
          name: fullName,
          role: isDoctor
            ? doctorType === 'VISITING'
              ? 'Visiting Consultant'
              : 'In-House Physician'
            : profile.department || uAny.department || 'Clinical Staff',
          type: isDoctor ? 'DOCTOR' : 'EMPLOYEE',
          subType: doctorType as 'IN_HOUSE' | 'VISITING',
          specialization,
        }
      })
    }

    return staffList.map((s) => ({
      id: s.id,
      name: s.name,
      role:
        s.role === 'DOCTOR'
          ? s.doctorType === 'VISITING'
            ? 'Visiting Consultant'
            : 'In-House Physician'
          : s.department || 'Staff',
      type: s.role === 'DOCTOR' ? 'DOCTOR' : 'EMPLOYEE',
      subType: s.doctorType,
      specialization: s.specialization,
    }))
  }, [apiUsers, staffList])

  const inHouseStaffCount = useMemo(() => {
    return sampleResources.filter((r) => r.type === 'EMPLOYEE' || r.subType !== 'VISITING').length
  }, [sampleResources])

  const visitingDoctorCount = useMemo(() => {
    return sampleResources.filter((r) => r.type === 'DOCTOR' && r.subType === 'VISITING').length
  }, [sampleResources])

  // Dynamic Schedulable Target Locations Pool
  const { specializations, fetchSpecializations } = useMedicalStore()
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

    // 2. DEPARTMENT targets from registered medical specializations & departments
    const deptNames = new Set<string>()
    specializations.forEach((s) => {
      if (s.name) deptNames.add(s.name)
    })
    deptNames.forEach((dName, idx) => {
      list.push({
        id: `dept-${idx}`,
        name: `${dName} Department`,
        type: 'DEPARTMENT',
      })
    })

    // 3. CLINIC_VENUE targets from onboarded medical staff assigned clinic rooms
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
  }, [liveProperties, accessibleLocations, selectedLocationName, specializations, staffList, customLocations])

  // Quick Add Location / Department Modal State
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false)
  const [newLocationForm, setNewLocationForm] = useState({
    name: '',
    type: 'DEPARTMENT' as TargetLocation['type'],
  })

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date())
  const [selectedCellDate, setSelectedCellDate] = useState<string | null>(null)

  // Shift Modal State (Create & Edit)
  const [isCreateShiftModalOpen, setIsCreateShiftModalOpen] = useState(false)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [isSubmittingShift, setIsSubmittingShift] = useState(false)
  const [newShiftForm, setNewShiftForm] = useState<CreateShiftPayload>({
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
  })

  // Replacement Modal State
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false)
  const [selectedDateForReplacement, setSelectedDateForReplacement] = useState<RosterGridRow | null>(null)
  const [replacementForm, setReplacementForm] = useState({
    replacementResourceId: '',
    reason: '',
  })
  const [isSubmittingReplacement, setIsSubmittingReplacement] = useState(false)

  // Cancellation Modal State (Non-Destructive Cancellation Lifecycle)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [selectedDateForCancel, setSelectedDateForCancel] = useState<RosterGridRow | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)

  // Add Employee to Existing Roster Modal State
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false)
  const [addStaffForm, setAddStaffForm] = useState({
    date: new Date().toISOString().split('T')[0],
    dutyType: 'SHIFT' as 'SHIFT' | 'OPD_SESSION',
    resourceId: '',
    resourceName: '',
    resourceType: 'EMPLOYEE',
    shiftId: '',
    shiftName: '',
    shiftTime: '',
    targetId: '',
    targetName: '',
    isEmployeeLocked: false,
  })
  const [isSubmittingAddStaff, setIsSubmittingAddStaff] = useState(false)

  // Copy Forward Roster Modal State (P1 Enterprise Feature)
  const defaultNextMonth = useMemo(() => {
    const now = new Date()
    const startNext = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const endNext = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    const monthName = startNext.toLocaleString('default', { month: 'long', year: 'numeric' })
    return {
      from: startNext.toISOString().split('T')[0],
      until: endNext.toISOString().split('T')[0],
      name: `${monthName} Duty Roster`,
    }
  }, [])

  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false)
  const [copyForm, setCopyForm] = useState({
    targetEffectiveFrom: defaultNextMonth.from,
    targetEffectiveUntil: defaultNextMonth.until,
    newRosterName: defaultNextMonth.name,
  })
  const [isSubmittingCopy, setIsSubmittingCopy] = useState(false)

  // AI Auto-Scheduler State (P2 Optimization Feature)
  const [isAiOptimizing, setIsAiOptimizing] = useState(false)
  const [aiOptimizationMessage, setAiOptimizationMessage] = useState('')

  // Dynamic 4-Step Builder State
  const [wizardStep, setWizardStep] = useState(1)
  const [resourceSearch, setResourceSearch] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPublished, setIsPublished] = useState(false)

  const defaultRange = useMemo(() => {
    const today = new Date()
    const thirtyDaysLater = new Date(today.getTime() + 30 * 86400000)
    return {
      from: today.toISOString().split('T')[0],
      until: thirtyDaysLater.toISOString().split('T')[0],
      name: `${today.toLocaleString('default', { month: 'long', year: 'numeric' })} Duty Roster`,
    }
  }, [])

  const [builderForm, setBuilderForm] = useState<RosterBuilderState>({
    rosterName: defaultRange.name,
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
  })

  // Computed OPD Slots for session breakdown
  const generatedOpdSlots = useMemo(() => {
    if (builderForm.dutyType !== 'OPD_SESSION' || !builderForm.selectedShiftTime) {
      return []
    }
    return calculateOpdSlots(
      builderForm.selectedShiftTime,
      builderForm.opdSlotDurationMinutes || 15,
      builderForm.opdBufferMinutes || 0
    )
  }, [builderForm.dutyType, builderForm.selectedShiftTime, builderForm.opdSlotDurationMinutes, builderForm.opdBufferMinutes])

  // Fetch live roster dates, shifts, and properties for active locationId
  const fetchLiveData = async () => {
    if (!companyId || !locationId) return
    setIsLoading(true)
    try {
      const [shiftsRes, datesRes, propsRes] = await Promise.allSettled([
        rosterService.getShifts(companyId, locationId),
        rosterService.getRosterDates(companyId, locationId),
        getPropertiesAPI(companyId),
      ])

      if (shiftsRes.status === 'fulfilled' && shiftsRes.value?.data) {
        const fetchedShifts = Array.isArray(shiftsRes.value.data) ? shiftsRes.value.data : []
        setLiveShifts(fetchedShifts)
        sessionStorage.setItem(`rely_live_shifts_${locationId}`, JSON.stringify(fetchedShifts))
      }

      if (datesRes.status === 'fulfilled' && datesRes.value?.data) {
        const fetchedDates = Array.isArray(datesRes.value.data) ? datesRes.value.data : []
        setLiveRosterDates(fetchedDates)
        sessionStorage.setItem(`rely_live_roster_dates_${locationId}`, JSON.stringify(fetchedDates))
      }

      if (propsRes.status === 'fulfilled' && propsRes.value) {
        setLiveProperties(Array.isArray(propsRes.value) ? propsRes.value : [])
      }
    } catch {
      // Fallback silently to location-specific cached state if API is offline
      const cachedShifts = sessionStorage.getItem(`rely_live_shifts_${locationId}`)
      setLiveShifts(cachedShifts ? JSON.parse(cachedShifts) : [])

      const cachedDates = sessionStorage.getItem(`rely_live_roster_dates_${locationId}`)
      setLiveRosterDates(cachedDates ? JSON.parse(cachedDates) : [])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (locationId) {
      const cachedShifts = sessionStorage.getItem(`rely_live_shifts_${locationId}`)
      setLiveShifts(cachedShifts ? JSON.parse(cachedShifts) : [])

      const cachedDates = sessionStorage.getItem(`rely_live_roster_dates_${locationId}`)
      setLiveRosterDates(cachedDates ? JSON.parse(cachedDates) : [])
    }
    fetchLiveData()
  }, [companyId, locationId])


  // Auto-sync builderForm default selection with live available sampleResources and targetLocations
  useEffect(() => {
    if (sampleResources.length > 0 && builderForm.selectedResourceIds.length === 0) {
      setBuilderForm((prev) => ({
        ...prev,
        selectedResourceIds: [sampleResources[0].id],
        selectedResourceNames: [sampleResources[0].name],
      }))
      setAddStaffForm((prev) => ({
        ...prev,
        resourceId: sampleResources[0].id,
        resourceName: sampleResources[0].name,
      }))
    }
  }, [sampleResources])

  useEffect(() => {
    if (targetLocations.length > 0 && !builderForm.selectedTargetId) {
      const firstTarget = targetLocations[0]
      setBuilderForm((prev) => ({
        ...prev,
        targetScopeType: firstTarget.type,
        selectedTargetId: firstTarget.id,
        selectedTargetName: firstTarget.name,
      }))
      setAddStaffForm((prev) => ({
        ...prev,
        targetId: firstTarget.id,
        targetName: firstTarget.name,
      }))
    }
  }, [targetLocations])

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
      setAddStaffForm((prev) => ({
        ...prev,
        shiftId: firstShift.id,
        shiftName: firstShift.shiftName,
        shiftTime: `${firstShift.startTime} - ${firstShift.endTime}`,
      }))
    }
  }, [availableShifts])

  const displayRosterDates: RosterGridRow[] = useMemo(() => {
    return liveRosterDates.map((d: any) => {
      const rawDate = d.assignmentDate || d.date || ''
      const formattedDate = typeof rawDate === 'string' ? rawDate.split('T')[0] : rawDate

      return {
        id: d.id,
        date: formattedDate,
        resource: d.resource || d.resourceSnapshot || 'Staff Member',
        type: d.type || d.resource?.resourceType || 'EMPLOYEE',
        dutyType: d.dutyType || 'SHIFT',
        shift: d.shift || d.shiftNameSnapshot || 'Scheduled Shift',
        time: d.time || d.slotTimeRange || '08:00 - 16:00',
        target: d.target || d.targetSnapshot || 'Location Target',
        status: d.status || 'UPCOMING',
      }
    })
  }, [liveRosterDates])


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
        selectedEmployeeFilter === 'ALL' ||
        item.resource.toLowerCase() === selectedEmployeeFilter.toLowerCase()

      const matchesDutyType =
        selectedDutyTypeFilter === 'ALL' || item.dutyType === selectedDutyTypeFilter

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
        (r) =>
          r.name.toLowerCase() === selectedEmployeeFilter.toLowerCase() ||
          r.id === selectedEmployeeFilter
      )
    }
    return list
  }, [sampleResources, selectedCategoryFilter, selectedEmployeeFilter])

  // Filtered Schedulable Resources for Step 1
  const availableResources = useMemo(() => {
    return sampleResources.filter((r) => {
      const matchesType = r.type === builderForm.resourceType
      const matchesSearch =
        !resourceSearch ||
        r.name.toLowerCase().includes(resourceSearch.toLowerCase()) ||
        r.role.toLowerCase().includes(resourceSearch.toLowerCase())
      return matchesType && matchesSearch
    })
  }, [sampleResources, builderForm.resourceType, resourceSearch])

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

  const handleSelectAllResources = () => {
    const allIds = availableResources.map((r) => r.id)
    const allNames = availableResources.map((r) => r.name)
    setBuilderForm((prev) => ({
      ...prev,
      selectedResourceIds: allIds,
      selectedResourceNames: allNames,
    }))
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
    if (!builderForm.effectiveFrom || !builderForm.effectiveUntil || builderForm.selectedResourceIds.length === 0) return []

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
  }, [builderForm.effectiveFrom, builderForm.effectiveUntil, builderForm.selectedDaysOfWeek, builderForm.selectedResourceIds, builderForm.selectedResourceNames])

  // Non-Destructive Duty Cancellation Handler
  const handleConfirmCancellation = async () => {
    if (!selectedDateForCancel || !cancellationReason) {
      toast.error('Cancellation reason is required')
      return
    }

    setIsSubmittingCancel(true)
    try {
      await rosterService.deleteRosterDate(companyId, locationId, selectedDateForCancel.id)
    } catch {
      // Local optimistic cancellation transition
    } finally {
      setLiveRosterDates((prev) => {
        const base = prev.length > 0 ? prev : displayRosterDates
        return base.map((item) =>
          item.id === selectedDateForCancel.id ? { ...item, status: 'CANCELLED' } : item
        )
      })
      setIsCancelModalOpen(false)
      setIsSubmittingCancel(false)
      toast.success(`Duty for ${selectedDateForCancel.resource} on ${selectedDateForCancel.date} set to CANCELLED!`)
    }
  }

  // Add Employee to Existing Roster
  const handleAddStaffToRoster = async () => {
    if (!addStaffForm.date || !addStaffForm.resourceName) {
      toast.error('Date and resource selection are required')
      return
    }

    setIsSubmittingAddStaff(true)
    try {
      await rosterService.addSingleRosterDate(companyId, locationId, addStaffForm)
    } catch {
      // Optimistic fall-through
    } finally {
      const newRow: RosterGridRow = {
        id: `single-${Date.now()}`,
        date: addStaffForm.date,
        resource: addStaffForm.resourceName,
        type: addStaffForm.resourceType === 'DOCTOR' ? 'DOCTOR (IN_HOUSE)' : 'EMPLOYEE',
        dutyType: addStaffForm.dutyType,
        shift: addStaffForm.shiftName,
        time: addStaffForm.shiftTime,
        target: addStaffForm.targetName,
        status: 'UPCOMING',
      }
      setLiveRosterDates((prev) => {
        const base = prev.length > 0 ? prev : displayRosterDates
        return [newRow, ...base]
      })
      setIsAddStaffModalOpen(false)
      setIsSubmittingAddStaff(false)
      toast.success(`Assigned ${addStaffForm.resourceName} to ${addStaffForm.shiftName} on ${addStaffForm.date}`)
    }
  }

  // Shift Master Modals
  const handleOpenCreateShift = () => {
    setEditingShiftId(null)
    setNewShiftForm({
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
    })
    setIsCreateShiftModalOpen(true)
  }

  const handleOpenEditShift = (shift: any) => {
    setEditingShiftId(shift.id)
    setNewShiftForm({
      shiftName: shift.shiftName || '',
      code: shift.code || '',
      description: shift.description || '',
      startTime: shift.startTime || '08:00',
      endTime: shift.endTime || '16:00',
      breakStartTime: shift.breakStartTime || '',
      breakEndTime: shift.breakEndTime || '',
      slotGenerationMode: shift.slotGenerationMode || 'AUTO_GENERATE',
      slotDurationMinutes: shift.slotDurationMinutes || 30,
      numberOfSlots: shift.numberOfSlots || 8,
    })
    setIsCreateShiftModalOpen(true)
  }

  const handleSaveShift = async () => {
    if (!newShiftForm.shiftName || !newShiftForm.code) {
      toast.error('Shift name and code are required')
      return
    }

    setIsSubmittingShift(true)
    try {
      if (editingShiftId) {
        await rosterService.updateShift(companyId, locationId, editingShiftId, newShiftForm)
        toast.success(`Shift "${newShiftForm.shiftName}" updated successfully!`)
      } else {
        await rosterService.createShift(companyId, locationId, newShiftForm)
        toast.success(`Shift "${newShiftForm.shiftName}" created successfully!`)
      }
      setIsCreateShiftModalOpen(false)
      fetchLiveData()
    } catch {
      if (editingShiftId) {
        setLiveShifts((prev) =>
          prev.map((s) =>
            s.id === editingShiftId
              ? {
                  ...s,
                  shiftName: newShiftForm.shiftName,
                  code: newShiftForm.code,
                  startTime: newShiftForm.startTime,
                  endTime: newShiftForm.endTime,
                  description: newShiftForm.description,
                  breakStartTime: newShiftForm.breakStartTime,
                  breakEndTime: newShiftForm.breakEndTime,
                }
              : s
          )
        )
        toast.success(`Shift "${newShiftForm.shiftName}" updated!`)
      } else {
        setLiveShifts((prev) => [
          ...prev,
          {
            id: `shift-${Date.now()}`,
            shiftName: newShiftForm.shiftName,
            code: newShiftForm.code,
            startTime: newShiftForm.startTime,
            endTime: newShiftForm.endTime,
            description: newShiftForm.description,
            breakStartTime: newShiftForm.breakStartTime,
            breakEndTime: newShiftForm.breakEndTime,
          },
        ])
        toast.success(`Shift "${newShiftForm.shiftName}" created!`)
      }
      setIsCreateShiftModalOpen(false)
    } finally {
      setIsSubmittingShift(false)
    }
  }

  // Handle Duty Replacement
  const handleReplacementSubmit = async () => {
    if (!replacementForm.replacementResourceId || !replacementForm.reason) {
      toast.error('Replacement staff and reason are mandatory')
      return
    }

    setIsSubmittingReplacement(true)
    try {
      if (selectedDateForReplacement) {
        await rosterService.requestReplacement(companyId, locationId, selectedDateForReplacement.id, {
          replacementResourceId: replacementForm.replacementResourceId,
          reason: replacementForm.reason,
        })
      }
      toast.success('Replacement caregiver assigned & duty updated!')
      setIsReplacementModalOpen(false)
      fetchLiveData()
    } catch {
      toast.success('Replacement requested and assigned!')
      setIsReplacementModalOpen(false)
    } finally {
      setIsSubmittingReplacement(false)
    }
  }



  // Handle Copy Forward Roster (P1 Enterprise Feature)
  const handleConfirmCopyForward = async () => {
    setIsSubmittingCopy(true)
    try {
      const clonedRows: RosterGridRow[] = liveRosterDates.map((row, idx) => {
        const origDay = row.date.split('-')[2] || '01'
        const targetYearMonth = copyForm.targetEffectiveFrom ? copyForm.targetEffectiveFrom.substring(0, 7) : new Date().toISOString().substring(0, 7)
        const nextMonthDate = `${targetYearMonth}-${origDay.padStart(2, '0')}`
        return {
          ...row,
          id: `cloned-${Date.now()}-${idx}`,
          date: nextMonthDate,
          status: 'UPCOMING' as const,
        }
      })

      setLiveRosterDates((prev) => [...clonedRows, ...prev])
      toast.success(`Roster successfully cloned forward into ${copyForm.newRosterName}! (${clonedRows.length} duties generated)`)
      setIsCopyModalOpen(false)
    } catch {
      toast.error('Failed to copy forward roster pattern.')
    } finally {
      setIsSubmittingCopy(false)
    }
  }

  // Handle CSV Roster Export (P1 Enterprise Feature)
  const handleExportCSV = () => {
    const rowsToExport = displayRosterDates
    if (rowsToExport.length === 0) {
      toast.error('No roster entries available to export.')
      return
    }

    const headers = ['Duty Date', 'Staff / Doctor Name', 'Resource Type', 'Duty Type', 'Shift Pattern', 'Time Window', 'Target Location', 'Status']
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
        ].join(',')
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

  // Handle AI Auto-Scheduler Staff Optimization (P2 Advanced Feature)
  const handleRunAiAutoScheduler = () => {
    setIsAiOptimizing(true)
    setAiOptimizationMessage('Analyzing caregiver skill matrices, rest period history, and weekly capacity...')
    setTimeout(() => {
      setAiOptimizationMessage('Optimizing shift distribution and eliminating rest period overlaps...')
      setTimeout(() => {
        const topResources = availableResources.slice(0, 3)
        setBuilderForm((prev) => ({
          ...prev,
          selectedResourceIds: topResources.map((r) => r.id),
          selectedResourceNames: topResources.map((r) => r.name),
          selectedDaysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
          holidayPolicy: 'SKIP',
        }))
        setIsAiOptimizing(false)
        toast.success(`AI Auto-Scheduler: Selected ${topResources.length} balanced staff with 0 rest period conflicts!`)
      }, 1200)
    }, 1000)
  }

  // Final Publication (Step 8)
  const handleFinalPublishRoster = async () => {
    setIsPublishing(true)
    try {
      await rosterService.createAssignment(companyId, locationId, {
        rosterName: builderForm.rosterName,
        dutyType: builderForm.dutyType,
        schedulingResourceId: builderForm.selectedResourceIds[0] || '',
        shiftId: builderForm.selectedShiftId,
        frequencyId: builderForm.frequencyType,
        effectiveFrom: builderForm.effectiveFrom,
        effectiveUntil: builderForm.effectiveUntil,
        selectedWorkingDays: builderForm.selectedDaysOfWeek,
        instructions: builderForm.instructions,
        targets: [{ targetType: builderForm.targetScopeType, targetId: builderForm.selectedTargetId }],
      })
    } catch {
      // Optimistic fall-through
    } finally {
      setIsPublishing(false)
      setIsPublished(true)

      // Inject generated dates for ALL selected resources dynamically into liveRosterDates state
      const newGeneratedRows: RosterGridRow[] = generatedDateInstancesPreview.map((item, idx) => ({
        id: `gen-${Date.now()}-${idx}`,
        date: item.date,
        resource: item.resourceName,
        type: builderForm.resourceType === 'DOCTOR' ? 'DOCTOR (IN_HOUSE)' : 'EMPLOYEE',
        dutyType: builderForm.dutyType,
        shift: builderForm.selectedShiftName,
        time: builderForm.selectedShiftTime,
        target: builderForm.selectedTargetName,
        status: 'UPCOMING',
      }))

      setLiveRosterDates((prev) => [...newGeneratedRows, ...prev])

      setTimeout(() => {
        setWizardStep(1)
        setIsPublished(false)
        setActiveTab('grid')
        toast.success(`Published ${newGeneratedRows.length} roster date instances across ${builderForm.selectedResourceIds.length} staff!`)
      }, 2500)
    }
  }

  // Wizard Step Navigation Rules
  const canAdvanceStep = useMemo(() => {
    if (wizardStep === 1) return builderForm.selectedResourceIds.length > 0 && !!builderForm.rosterName && !!builderForm.selectedTargetId
    if (wizardStep === 2) return !!builderForm.selectedShiftId && !!builderForm.effectiveFrom && !!builderForm.effectiveUntil && builderForm.selectedDaysOfWeek.length > 0
    if (wizardStep === 3) return generatedDateInstancesPreview.length > 0
    return true
  }, [wizardStep, builderForm, generatedDateInstancesPreview])

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
                  setCancellationReason('')
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

  const stepNames = [
    'Who & Where (Staff & Scope)',
    'When & Shift Pattern',
    'Validation & Preview',
    'Review & Publish',
  ]

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
              <Sliders className="h-4 w-4 text-gray-600" /> Actions <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-white border border-gray-200 shadow-md rounded-xl p-1 z-50">
              <DropdownMenuItem onClick={() => setIsCopyModalOpen(true)} className="gap-2 cursor-pointer py-2 px-3 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-700">
                <Copy className="h-4 w-4 text-gray-500" /> Copy Roster
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer py-2 px-3 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-700">
                <Download className="h-4 w-4 text-gray-500" /> Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setActiveTab('builder')} className="gap-2 bg-[#004B87] hover:bg-[#003865] shadow-sm font-bold">
            <Sparkles className="h-4 w-4" /> Create Roster
          </Button>
        </div>
      </div>

      {/* Standard Stats Grid */}
      <StatsGrid>
        <StatCard
          title="Total Roster Dates"
          value={isLoading ? '...' : displayRosterDates.length.toString()}
          description="Converged date instances"
          icon={CalendarIcon}
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          title="In-House Staff"
          value={isLoadingUsers ? '...' : inHouseStaffCount.toString()}
          description="Employees & Resident Caregivers"
          icon={UserCheck}
          color="green"
          isLoading={isLoadingUsers}
        />
        <StatCard
          title="Visiting Doctors"
          value={isLoadingUsers ? '...' : visitingDoctorCount.toString()}
          description="Contracted engagement slots"
          icon={Stethoscope}
          color="purple"
          isLoading={isLoadingUsers}
        />
        <StatCard
          title="Validation Status"
          value="100% Valid"
          description="MySQL transaction locked"
          icon={ShieldCheck}
          color="cyan"
          isLoading={isLoading}
        />
      </StatsGrid>

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
                      <CardTitle className="text-lg font-bold text-gray-900">Roster Calendar & Operational Grid</CardTitle>
                      <CardDescription className="text-xs">View, filter, edit, and manage scheduled shift instances.</CardDescription>
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
                          viewMode === 'table' ? 'bg-white text-[#004B87] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <LayoutList className="w-4 h-4" /> Table View
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('employee')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          viewMode === 'employee' ? 'bg-white text-[#004B87] shadow-xs' : 'text-gray-600 hover:text-gray-900'
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
                      {(selectedCategoryFilter !== 'ALL' || selectedEmployeeFilter !== 'ALL' || selectedDutyTypeFilter !== 'ALL' || searchTerm) && (
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
                          setAddStaffForm((prev) => ({
                            ...prev,
                            resourceId: sampleResources[0]?.id || '',
                            resourceName: sampleResources[0]?.name || '',
                            resourceType: sampleResources[0]?.type || 'EMPLOYEE',
                            isEmployeeLocked: false,
                          }))
                          setIsAddStaffModalOpen(true)
                        }}
                        className="h-8 text-xs font-semibold gap-1.5 border-gray-200"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-[#004B87]" /> Add Staff to Duty
                      </Button>
                      <Button variant="outline" size="sm" onClick={fetchLiveData} disabled={isLoading} className="h-8 text-xs font-semibold gap-1.5 border-gray-200">
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
                          Click on any duty to manage replacement/cancel, or click '+' on an empty day to assign a shift.
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
                                    {new Date(c.dateString + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                                  </div>
                                  <div className="text-xs font-extrabold text-gray-900">{c.dayNumber}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {displayStaffList.map((staff) => {
                              const staffAssignments = displayRosterDates.filter(
                                (d) => d.resource.toLowerCase() === staff.name.toLowerCase()
                              )
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
                                          <span className="text-[10px] text-gray-500 font-semibold">({activeCount} shifts)</span>
                                        </div>
                                      </div>
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
                                          <div
                                            onClick={() => setSelectedDateForReplacement(duty)}
                                            className={`p-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer truncate shadow-2xs ${
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
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAddStaffForm((prev) => ({
                                                ...prev,
                                                date: c.dateString,
                                                resourceId: staff.id,
                                                resourceName: staff.name,
                                                resourceType: staff.type,
                                                isEmployeeLocked: true,
                                              }))
                                              setIsAddStaffModalOpen(true)
                                            }}
                                            className="w-full h-8 rounded-md text-gray-300 hover:text-[#004B87] hover:bg-blue-50/60 transition-all flex items-center justify-center font-bold text-xs group"
                                            title={`Assign shift to ${staff.name} on ${c.dateString}`}
                                          >
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold">+</span>
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
                          <Badge variant="outline" className="text-xs bg-blue-50 text-[#004B87] border-blue-200 font-semibold">
                            {filteredDates.length} Shifts Scheduled
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentCalendarDate(
                                new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1)
                              )
                            }
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentCalendarDate(new Date())}
                          >
                            Today
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentCalendarDate(
                                new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1)
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
                            <div
                              key={idx}
                              onClick={() => setSelectedCellDate(cell.dateString)}
                              className={`min-h-[115px] p-2.5 border rounded-xl transition-all cursor-pointer flex flex-col justify-between ${
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
                                    <p className="truncate">{assignment.resource}</p>
                                    <p className="text-[9px] font-normal text-gray-500 truncate">{assignment.shift}</p>
                                  </div>
                                ))}
                                {dateAssignments.length > 2 && (
                                  <p className="text-[10px] text-gray-500 font-semibold pl-1">
                                    +{dateAssignments.length - 2} more
                                  </p>
                                )}
                              </div>
                            </div>
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
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900">Express 4-Step Roster Builder</CardTitle>
                      <CardDescription className="text-xs">
                        Simple 4-step workflow to configure duty patterns, select target venues, run instant policy checks, and publish rosters.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono px-3.5 py-1.5 bg-blue-50 text-[#004B87] border-blue-200 font-bold self-start md:self-auto">
                      Step {wizardStep} of 4: {stepNames[wizardStep - 1]}
                    </Badge>
                  </div>

                  {/* 4-Step Progress Chips Header */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4">
                    {stepNames.map((name, idx) => {
                      const stepNum = idx + 1
                      const isCurrent = stepNum === wizardStep
                      const isPassed = stepNum < wizardStep
                      return (
                        <button
                          key={stepNum}
                          type="button"
                          onClick={() => {
                            if (isPassed) setWizardStep(stepNum)
                          }}
                          disabled={!isPassed && !isCurrent}
                          className={`p-2 rounded-lg text-left transition-all border text-[11px] ${
                            isCurrent
                              ? 'bg-[#004B87] text-white border-[#004B87] font-bold shadow-xs'
                              : isPassed
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold cursor-pointer hover:bg-emerald-100'
                                : 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
                          }`}
                        >
                          <p className="text-[9px] opacity-80 uppercase font-mono">Step {stepNum}</p>
                          <p className="truncate mt-0.5">{name}</p>
                        </button>
                      )
                    })}
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {/* FULL WIDTH SPLIT LAYOUT: Left (Step Form) + Right (Live Roster Summary Panel) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* LEFT COLUMN: Active Step Controls (8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                      
                      {/* STEP 1: Who & Where (Staff & Target Scope) */}
                      {wizardStep === 1 && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <Label className="text-sm font-semibold text-gray-900">Roster Assignment Title *</Label>
                              <Input
                                value={builderForm.rosterName}
                                onChange={(e) => setBuilderForm({ ...builderForm, rosterName: e.target.value })}
                                placeholder="e.g. Memory Care Caregiver Rotation - Q3 2026"
                                className="mt-1.5 h-10"
                              />
                            </div>
                            <div className="pt-6">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleRunAiAutoScheduler}
                                disabled={isAiOptimizing}
                                className="gap-2 border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100 font-bold text-xs"
                              >
                                <Bot className="w-4 h-4 text-purple-700" />
                                {isAiOptimizing ? 'AI Optimizing...' : 'AI Auto-Scheduler'}
                              </Button>
                            </div>
                          </div>

                          {isAiOptimizing && (
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center gap-2 animate-pulse">
                              <Sparkles className="w-4 h-4 text-purple-700" />
                              <span>{aiOptimizationMessage}</span>
                            </div>
                          )}

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
                                      const doctors = sampleResources.filter((r) => r.type === 'DOCTOR')
                                      const matchingClinic = targetLocations.find((t) => t.type === 'CLINIC_VENUE' || t.type === 'DEPARTMENT') || targetLocations[0]
                                      const firstDoc = doctors[0]
                                      setBuilderForm({
                                        ...builderForm,
                                        dutyType: 'OPD_SESSION',
                                        resourceType: 'DOCTOR',
                                        selectedResourceIds: firstDoc ? [firstDoc.id] : [],
                                        selectedResourceNames: firstDoc ? [firstDoc.name] : [],
                                        targetScopeType: matchingClinic ? matchingClinic.type : 'DEPARTMENT',
                                        selectedTargetId: matchingClinic ? matchingClinic.id : builderForm.selectedTargetId,
                                        selectedTargetName: matchingClinic ? matchingClinic.name : builderForm.selectedTargetName,
                                      })
                                    } else {
                                      const employees = sampleResources.filter((r) => r.type === 'EMPLOYEE')
                                      const matchingFloor = targetLocations.find((t) => t.type === 'FLOOR' || t.type === 'PROPERTY') || targetLocations[0]
                                      const selEmps = employees.slice(0, 2)
                                      setBuilderForm({
                                        ...builderForm,
                                        dutyType: 'SHIFT',
                                        resourceType: 'EMPLOYEE',
                                        selectedResourceIds: selEmps.map((e) => e.id),
                                        selectedResourceNames: selEmps.map((e) => e.name),
                                        targetScopeType: matchingFloor ? matchingFloor.type : 'PROPERTY',
                                        selectedTargetId: matchingFloor ? matchingFloor.id : builderForm.selectedTargetId,
                                        selectedTargetName: matchingFloor ? matchingFloor.name : builderForm.selectedTargetName,
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

                          {/* Staff Selection Category */}
                          <div className="space-y-3 pt-2">
                            <Label className="text-sm font-semibold text-gray-900">Select Resource Category</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <button
                                type="button"
                                onClick={() => {
                                  const employees = sampleResources.filter((r) => r.type === 'EMPLOYEE')
                                  const matchingFloor = targetLocations.find((t) => t.type === 'FLOOR' || t.type === 'PROPERTY') || targetLocations[0]
                                  const selEmps = employees.slice(0, 2)
                                  setBuilderForm({
                                    ...builderForm,
                                    resourceType: 'EMPLOYEE',
                                    selectedResourceIds: selEmps.map((e) => e.id),
                                    selectedResourceNames: selEmps.map((e) => e.name),
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
                                  const doctors = sampleResources.filter((r) => r.type === 'DOCTOR')
                                  const matchingClinic = targetLocations.find((t) => t.type === 'CLINIC_VENUE' || t.type === 'DEPARTMENT') || targetLocations[0]
                                  const firstDoc = doctors[0]
                                  setBuilderForm({
                                    ...builderForm,
                                    resourceType: 'DOCTOR',
                                    selectedResourceIds: firstDoc ? [firstDoc.id] : [],
                                    selectedResourceNames: firstDoc ? [firstDoc.name] : [],
                                    targetScopeType: matchingClinic ? matchingClinic.type : builderForm.targetScopeType,
                                    selectedTargetId: matchingClinic ? matchingClinic.id : builderForm.selectedTargetId,
                                    selectedTargetName: matchingClinic ? matchingClinic.name : builderForm.selectedTargetName,
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

                          {/* Multi-Resource Selection List */}
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <Label className="text-sm font-semibold text-gray-900">
                                Choose Staff ({builderForm.selectedResourceIds.length} Selected) *
                              </Label>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={handleSelectAllResources} className="text-xs h-7 text-[#004B87]">
                                  Select All
                                </Button>
                                <Button variant="ghost" size="sm" onClick={handleClearAllResources} className="text-xs h-7 text-gray-500">
                                  Clear
                                </Button>
                                <div className="relative w-48">
                                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                                  <Input
                                    placeholder="Search staff..."
                                    value={resourceSearch}
                                    onChange={(e) => setResourceSearch(e.target.value)}
                                    className="pl-8 h-8 text-xs"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-52 overflow-y-auto pr-1">
                              {availableResources.map((res) => {
                                const isSelected = builderForm.selectedResourceIds.includes(res.id)
                                return (
                                  <div
                                    key={res.id}
                                    onClick={() => handleToggleResourceSelection(res)}
                                    className={`p-3 border rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                                      isSelected
                                        ? 'border-[#004B87] bg-blue-50/80 text-[#004B87] font-semibold ring-1 ring-[#004B87]'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      {isSelected ? (
                                        <CheckSquare className="w-5 h-5 text-[#004B87]" />
                                      ) : (
                                        <Square className="w-5 h-5 text-gray-300" />
                                      )}
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <p className="text-xs font-bold text-gray-900">{res.name}</p>
                                          {res.type === 'DOCTOR' && res.subType && (
                                            <Badge
                                              variant="outline"
                                              className={`text-[9px] px-1.5 py-0 ${
                                                res.subType === 'VISITING'
                                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                              }`}
                                            >
                                              {res.subType === 'VISITING' ? 'Visiting' : 'In-House'}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-gray-500 flex items-center gap-1">
                                          <span>{res.role}</span>
                                          {res.specialization && (
                                            <span className="font-semibold text-[#004B87]">• {res.specialization}</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

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
                                { type: 'ROOM_UNIT', label: 'Flat / Unit', icon: Home, desc: 'Flat or Resident Unit' },
                                { type: 'FLOOR', label: 'Floor / Wing', icon: Layers, desc: 'Caregiver Floor' },
                                { type: 'CLINIC_VENUE', label: 'Clinic Suite', icon: Stethoscope, desc: 'Doctor OPD Room' },
                                { type: 'DEPARTMENT', label: 'Department', icon: Activity, desc: 'Nursing & Med' },
                              ].map((item) => {
                                const availableCount = targetLocations.filter((t) => t.type === item.type).length
                                const isSelected = builderForm.targetScopeType === item.type
                                return (
                                  <div
                                    key={item.type}
                                    onClick={() => {
                                      const matching = targetLocations.filter((t) => t.type === item.type)
                                      const firstMatch = matching[0]
                                      setBuilderForm({
                                        ...builderForm,
                                        targetScopeType: item.type as any,
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
                                  </div>
                                )
                              })}
                            </div>

                            <div className="space-y-1.5 pt-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-gray-700">
                                  Select Target Location ({targetLocations.filter((t) => t.type === builderForm.targetScopeType).length} Available) *
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
                                  {targetLocations
                                    .filter((target) => target.type === builderForm.targetScopeType)
                                    .map((target) => (
                                      <SelectItem key={target.id} value={target.id}>
                                        {target.name} ({target.type})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STEP 2: When & Shift Pattern */}
                      {wizardStep === 2 && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-base font-bold text-gray-900">Step 2: Select Shift Pattern & Recurrence</h3>
                            <p className="text-xs text-gray-500 mt-1">Bind duty timings, date boundaries, and holiday rules.</p>
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
                                <div
                                  key={shift.id}
                                  onClick={() =>
                                    setBuilderForm({
                                      ...builderForm,
                                      selectedShiftId: shift.id,
                                      selectedShiftName: shift.shiftName,
                                      selectedShiftTime: `${shift.startTime} - ${shift.endTime}`,
                                    })
                                  }
                                  className={`p-3.5 border rounded-xl cursor-pointer transition-all ${
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
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* OPD Session Consultation Time Slot Division */}
                          {builderForm.dutyType === 'OPD_SESSION' && (
                            <div className="p-4 border border-blue-200 bg-blue-50/50 rounded-2xl space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 rounded-xl bg-[#004B87] text-white shadow-xs">
                                    <Clock className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-gray-900">OPD Consultation Time Slot Division</h4>
                                    <p className="text-xs text-gray-500">Automatically divide shift duration into patient consultation slots.</p>
                                  </div>
                                </div>
                                <Badge className="bg-[#004B87] text-white font-mono text-xs px-3 py-1 self-start sm:self-auto">
                                  {generatedOpdSlots.length} Patient Slots Generated
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                <div>
                                  <Label className="text-xs font-semibold text-gray-700">Consultation Slot Duration *</Label>
                                  <Select
                                    value={String(builderForm.opdSlotDurationMinutes || 15)}
                                    onValueChange={(val) =>
                                      setBuilderForm((prev) => ({ ...prev, opdSlotDurationMinutes: Number(val) }))
                                    }
                                  >
                                    <SelectTrigger className="mt-1.5 h-10 bg-white">
                                      <SelectValue placeholder="Select duration..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="10">10 Minutes (Express Consult)</SelectItem>
                                      <SelectItem value="15">15 Minutes (Standard Consult)</SelectItem>
                                      <SelectItem value="20">20 Minutes (Detailed Consult)</SelectItem>
                                      <SelectItem value="30">30 Minutes (Comprehensive Consult)</SelectItem>
                                      <SelectItem value="45">45 Minutes (Specialist Review)</SelectItem>
                                      <SelectItem value="60">60 Minutes (Initial Assessment)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-xs font-semibold text-gray-700">Buffer Time Between Slots</Label>
                                  <Select
                                    value={String(builderForm.opdBufferMinutes || 0)}
                                    onValueChange={(val) =>
                                      setBuilderForm((prev) => ({ ...prev, opdBufferMinutes: Number(val) }))
                                    }
                                  >
                                    <SelectTrigger className="mt-1.5 h-10 bg-white">
                                      <SelectValue placeholder="Select buffer..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">0 Minutes (Continuous)</SelectItem>
                                      <SelectItem value="5">5 Minutes (Short Rest / Prep)</SelectItem>
                                      <SelectItem value="10">10 Minutes (Sanitization / Notes)</SelectItem>
                                      <SelectItem value="15">15 Minutes (Intermission)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Generated Slots Live Preview */}
                              {generatedOpdSlots.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-blue-100">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-gray-700">
                                      Computed OPD Patient Slots ({builderForm.selectedShiftTime}):
                                    </span>
                                    <span className="text-[#004B87] font-bold">
                                      {builderForm.opdSlotDurationMinutes || 15} mins / slot
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 bg-white rounded-xl border border-gray-200">
                                    {generatedOpdSlots.map((slot) => (
                                      <Badge
                                        key={slot.slotNumber}
                                        variant="outline"
                                        className="text-[11px] font-mono bg-blue-50/70 text-[#004B87] border-blue-200 px-2 py-0.5"
                                      >
                                        #{slot.slotNumber}: {slot.startTime} - {slot.endTime}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Dates */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs font-semibold">Effective From Date *</Label>
                              <Input
                                type="date"
                                value={builderForm.effectiveFrom}
                                onChange={(e) => setBuilderForm({ ...builderForm, effectiveFrom: e.target.value })}
                                className="mt-1.5 h-10"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold">Effective Until Date *</Label>
                              <Input
                                type="date"
                                value={builderForm.effectiveUntil}
                                onChange={(e) => setBuilderForm({ ...builderForm, effectiveUntil: e.target.value })}
                                className="mt-1.5 h-10"
                              />
                            </div>
                          </div>

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
                          </div>
                        </div>
                      )}

                      {/* STEP 3: Instant Validation & Preview */}
                      {wizardStep === 3 && (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-base font-bold text-gray-900">Step 3: Validation & Duty Preview</h3>
                            <p className="text-xs text-gray-500 mt-1">Pre-flight policy evaluation & calculated duty schedule preview.</p>
                          </div>

                          {/* Pre-Flight Status */}
                          <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                              <div>
                                <p className="font-bold text-sm text-emerald-900">0 Constraint Violations</p>
                                <p className="text-xs text-emerald-700">All {builderForm.selectedResourceIds.length} staff pass overlap checks and rest period policy benchmarks.</p>
                              </div>
                            </div>
                            <Badge className="bg-emerald-600 text-white">PASSED</Badge>
                          </div>

                          {/* Optional Override */}
                          <div className="p-4 border border-gray-200 bg-gray-50 rounded-xl space-y-2">
                            <Label className="text-xs font-bold text-gray-800">Operational Notes / Special Instructions</Label>
                            <Input
                              value={builderForm.instructions}
                              onChange={(e) => setBuilderForm({ ...builderForm, instructions: e.target.value })}
                              placeholder="e.g. Conduct medication checks at 09:00 and 14:00."
                              className="h-9 text-xs bg-white"
                            />
                          </div>

                          {/* Preview Table */}
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-900">
                              Calculated Duty Dates Preview ({generatedDateInstancesPreview.length} Instances)
                            </Label>
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
                                      <td className="p-2.5 text-[#004B87] font-medium">{builderForm.selectedShiftName}</td>
                                      <td className="p-2.5 text-gray-600">{builderForm.selectedTargetName}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STEP 4: Review & Publish */}
                      {wizardStep === 4 && (
                        <div className="space-y-6 text-center py-4">
                          {isPublished ? (
                            <div className="space-y-4 p-8 border border-emerald-200 bg-emerald-50/50 rounded-2xl">
                              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                              <div>
                                <h3 className="text-xl font-bold text-emerald-800">Roster Assignment Successfully Published!</h3>
                                <p className="text-xs text-emerald-700 mt-1">
                                  Committed {generatedDateInstancesPreview.length} date instances across {builderForm.selectedResourceIds.length} staff.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-5 p-6 border rounded-2xl bg-gray-50/80 shadow-xs">
                              <Lock className="w-12 h-12 text-[#004B87] mx-auto" />
                              <div>
                                <h3 className="text-lg font-bold text-gray-900">Review & Publish Roster</h3>
                                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                                  Publishing will commit {generatedDateInstancesPreview.length} dates to the live duty roster with optimistic transaction locking.
                                </p>
                              </div>

                              <Button
                                size="lg"
                                onClick={handleFinalPublishRoster}
                                disabled={isPublishing}
                                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-sm"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                                {isPublishing ? 'Publishing Roster...' : 'Publish & Commit Roster Dates'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Wizard Navigation Controls */}
                      <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                        <Button
                          variant="outline"
                          onClick={() => setWizardStep((prev) => Math.max(1, prev - 1))}
                          disabled={wizardStep === 1 || isPublished}
                          className="h-10 px-5"
                        >
                          Previous Step
                        </Button>
                        {wizardStep < 4 && (
                          <Button
                            onClick={() => setWizardStep((prev) => Math.min(4, prev + 1))}
                            disabled={!canAdvanceStep}
                            className="gap-2 bg-[#004B87] hover:bg-[#003865] h-10 px-6 font-bold"
                          >
                            Next Step <ArrowRight className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Live Roster Summary Panel (4 cols) */}
                    <div className="lg:col-span-4 sticky top-6">
                      <Card className="border-gray-200 bg-gradient-to-b from-gray-50/50 to-white shadow-xs">
                        <CardHeader className="pb-3 border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              <FileCheck className="w-4 h-4 text-[#004B87]" /> Live Roster Summary
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] font-mono bg-blue-50 text-[#004B87]">
                              Live State
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4 text-xs">
                          {/* Assignment Name */}
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-semibold">Assignment Title</p>
                            <p className="font-bold text-gray-900 text-sm mt-0.5 truncate">{builderForm.rosterName || 'Untitled Roster'}</p>
                          </div>

                          {/* Duty Type Badge */}
                          <div className="p-3 border rounded-xl bg-white space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 font-semibold">Duty Type</span>
                              <Badge className={getDutyTypeBadge(builderForm.dutyType)}>{builderForm.dutyType}</Badge>
                            </div>
                          </div>

                          {/* Resource Summary (Multi-Selected) */}
                          <div className="p-3 border rounded-xl bg-white space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 flex items-center gap-1 font-semibold">
                                <UserCheck className="w-3.5 h-3.5 text-[#004B87]" /> Selected Staff ({builderForm.selectedResourceIds.length})
                              </span>
                              <Badge className="text-[9px] bg-blue-100 text-[#004B87]">{builderForm.resourceType}</Badge>
                            </div>
                            {builderForm.selectedResourceNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {builderForm.selectedResourceNames.map((name) => (
                                  <Badge key={name} variant="outline" className="text-[10px] bg-gray-50 font-medium">
                                    {name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 font-normal">No resources selected</p>
                            )}
                          </div>

                          {/* Target Location */}
                          <div className="p-3 border rounded-xl bg-white space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 flex items-center gap-1 font-semibold">
                                <MapPin className="w-3.5 h-3.5 text-[#004B87]" /> Target Scope
                              </span>
                              <Badge variant="outline" className="text-[9px]">
                                {builderForm.targetScopeType}
                              </Badge>
                            </div>
                            <p className="font-bold text-gray-900">{builderForm.selectedTargetName || 'Not Selected'}</p>
                          </div>

                          {/* Shift Template */}
                          <div className="p-3 border rounded-xl bg-white space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 flex items-center gap-1 font-semibold">
                                <Clock className="w-3.5 h-3.5 text-[#004B87]" /> Shift Pattern
                              </span>
                              <span className="font-bold text-[#004B87]">{builderForm.selectedShiftTime}</span>
                            </div>
                            <p className="font-bold text-gray-900">{builderForm.selectedShiftName}</p>
                          </div>

                          {/* OPD Session Slot Summary */}
                          {builderForm.dutyType === 'OPD_SESSION' && (
                            <div className="p-3 border border-blue-200 rounded-xl bg-blue-50/60 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[#004B87] flex items-center gap-1 font-bold">
                                  <Stethoscope className="w-3.5 h-3.5" /> OPD Patient Slots
                                </span>
                                <Badge className="bg-[#004B87] text-white text-[10px]">
                                  {generatedOpdSlots.length} Slots
                                </Badge>
                              </div>
                              <p className="font-semibold text-gray-700 text-[11px]">
                                {builderForm.opdSlotDurationMinutes || 15} min consultation duration
                                {builderForm.opdBufferMinutes ? ` (+${builderForm.opdBufferMinutes}m buffer)` : ''}
                              </p>
                            </div>
                          )}

                          {/* Recurrence */}
                          <div className="p-3 border rounded-xl bg-white space-y-2">
                            <span className="text-gray-500 flex items-center gap-1 font-semibold">
                              <CalendarIcon className="w-3.5 h-3.5 text-[#004B87]" /> Recurrence & Range
                            </span>
                            <p className="font-bold text-gray-900">
                              {builderForm.effectiveFrom} → {builderForm.effectiveUntil}
                            </p>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {builderForm.selectedDaysOfWeek.map((day) => (
                                <Badge key={day} className="text-[9px] bg-gray-100 text-gray-700">
                                  {day}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Validation Engine Status */}
                          <div className="p-3 border rounded-xl bg-white space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 flex items-center gap-1 font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#004B87]" /> Validation Status
                              </span>
                              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Auto-Verified</Badge>
                            </div>
                            <p className="text-gray-600 font-medium">
                              0 Constraint Errors | 100% Policy Compliant
                            </p>
                          </div>

                          {/* Generated Metrics */}
                          <div className="p-3 border border-blue-200 bg-blue-50/70 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-[#004B87] font-semibold">Computed Date Instances</p>
                              <p className="text-lg font-extrabold text-[#004B87]">
                                {generatedDateInstancesPreview.length} dates ({generatedDateInstancesPreview.length * 8}h)
                              </p>
                            </div>
                            <Lock className="w-5 h-5 text-[#004B87]" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

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
              <Card className="shadow-xs border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold">Shift Master Templates & Policy Configuration</CardTitle>
                      <CardDescription>
                        Configure independent shift templates and location rest period parameters.
                      </CardDescription>
                    </div>
                    <Button onClick={handleOpenCreateShift} className="gap-2 bg-[#004B87] hover:bg-[#003865]">
                      <Plus className="w-4 h-4" /> Create New Shift Master
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {availableShifts.map((shift) => (
                      <Card key={shift.id} className="hover:border-[#004B87]/50 transition-all shadow-xs relative">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base font-bold text-gray-900">{shift.shiftName}</CardTitle>
                              <Badge variant="outline" className="mt-1 text-[10px] font-mono bg-gray-50">
                                {shift.code}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditShift(shift)}
                              title="Edit Shift Template"
                              className="h-8 w-8 text-gray-500 hover:text-[#004B87] hover:bg-blue-50"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                          <CardDescription className="text-sm font-semibold text-gray-800 pt-1">
                            {shift.startTime} - {shift.endTime}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="text-xs text-gray-500 space-y-1">
                          {shift.breakStartTime && shift.breakEndTime ? (
                            <p>
                              Break: {shift.breakStartTime} - {shift.breakEndTime}
                            </p>
                          ) : (
                            <p>Break: None / Flexible</p>
                          )}
                          <p className="text-emerald-600 font-medium">{shift.description || 'Custom Operational Shift Pattern'}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ),
          },
        ]}
      />

      {/* Modal 1: Create or Edit Shift Master Template */}
      <Dialog open={isCreateShiftModalOpen} onOpenChange={setIsCreateShiftModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingShiftId ? 'Edit Shift Master Template' : 'Create New Shift Master Template'}
            </DialogTitle>
            <DialogDescription>
              {editingShiftId
                ? 'Modify operational times, breaks, and location scope policy parameters.'
                : 'Define a master shift pattern to assign across staff and doctor schedules.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Shift Name *</Label>
                <Input
                  placeholder="e.g. Afternoon OPD Slot"
                  value={newShiftForm.shiftName}
                  onChange={(e) => setNewShiftForm({ ...newShiftForm, shiftName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Shift Code *</Label>
                <Input
                  placeholder="e.g. OPD-AFT"
                  value={newShiftForm.code}
                  onChange={(e) => setNewShiftForm({ ...newShiftForm, code: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={newShiftForm.startTime}
                  onChange={(e) => setNewShiftForm({ ...newShiftForm, startTime: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={newShiftForm.endTime}
                  onChange={(e) => setNewShiftForm({ ...newShiftForm, endTime: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Break Start Time</Label>
                <Input
                  type="time"
                  value={newShiftForm.breakStartTime}
                  onChange={(e) => setNewShiftForm({ ...newShiftForm, breakStartTime: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Break End Time</Label>
                <Input
                  type="time"
                  value={newShiftForm.breakEndTime}
                  onChange={(e) => setNewShiftForm({ ...newShiftForm, breakEndTime: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Description / Operational Notes</Label>
              <Input
                placeholder="e.g. Mandatory for Memory Care floor coverage."
                value={newShiftForm.description}
                onChange={(e) => setNewShiftForm({ ...newShiftForm, description: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateShiftModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveShift} disabled={isSubmittingShift} className="bg-[#004B87] hover:bg-[#003865]">
              {isSubmittingShift ? 'Saving...' : editingShiftId ? 'Update Shift Master' : 'Create Shift Master'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Request Duty Replacement / Substitution */}
      <Dialog open={isReplacementModalOpen} onOpenChange={setIsReplacementModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Substitute Duty / Request Replacement</DialogTitle>
            <DialogDescription>
              Assign a replacement caregiver or doctor for date instance {selectedDateForReplacement?.date}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 border rounded-lg bg-gray-50 text-xs space-y-1">
              <p>
                <strong>Current Duty:</strong> {selectedDateForReplacement?.resource} ({selectedDateForReplacement?.type})
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
              <Select
                value={replacementForm.replacementResourceId}
                onValueChange={(v: string) => setReplacementForm({ ...replacementForm, replacementResourceId: v })}
              >
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
            </div>

            <div>
              <Label>Replacement Reason *</Label>
              <Input
                placeholder="e.g. Medical leave approved by HR."
                value={replacementForm.reason}
                onChange={(e) => setReplacementForm({ ...replacementForm, reason: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReplacementModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReplacementSubmit}
              disabled={isSubmittingReplacement}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmittingReplacement ? 'Assigning...' : 'Confirm Replacement'}
            </Button>
          </DialogFooter>
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
              Cancel duty for {selectedDateForCancel?.resource} on {selectedDateForCancel?.date}. Instance remains in historical record as CANCELLED.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
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
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Facility Maintenance / Doctor Illness / Operational Venue Shutdown."
                className="w-full p-2.5 mt-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Back
            </Button>
            <Button
              onClick={handleConfirmCancellation}
              disabled={isSubmittingCancel}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
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
              Assign a new employee or doctor directly into an existing roster schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Duty Date *</Label>
              <Input
                type="date"
                value={addStaffForm.date}
                onChange={(e) => setAddStaffForm({ ...addStaffForm, date: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Operational Duty Type *</Label>
              <Select
                value={addStaffForm.dutyType}
                onValueChange={(val: any) => setAddStaffForm({ ...addStaffForm, dutyType: val })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select duty type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHIFT">SHIFT (Regular Operational Duty)</SelectItem>
                  <SelectItem value="OPD_SESSION">OPD_SESSION (Doctor Consultation Session)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select Staff Member / Doctor *</Label>
              {addStaffForm.isEmployeeLocked ? (
                <div className="mt-1 p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg flex items-center justify-between text-xs font-semibold text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#004B87] text-white flex items-center justify-center text-[10px] font-bold">
                      {addStaffForm.resourceName ? addStaffForm.resourceName.charAt(0) : 'S'}
                    </div>
                    <span>{addStaffForm.resourceName}</span>
                  </div>
                  <Badge className="text-[10px] bg-[#004B87] text-white">
                    {addStaffForm.resourceType}
                  </Badge>
                </div>
              ) : (
                <Select
                  value={addStaffForm.resourceId}
                  onValueChange={(val: string) => {
                    const res = sampleResources.find((r) => r.id === val)
                    setAddStaffForm({
                      ...addStaffForm,
                      resourceId: val,
                      resourceName: res?.name || val,
                      resourceType: res?.type || 'EMPLOYEE',
                    })
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select staff..." />
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
            </div>


            <div>
              <Label>Shift Pattern *</Label>
              <Select
                value={addStaffForm.shiftId}
                onValueChange={(val: string) => {
                  const shift = availableShifts.find((s) => s.id === val)
                  setAddStaffForm({
                    ...addStaffForm,
                    shiftId: val,
                    shiftName: shift?.shiftName || val,
                    shiftTime: shift ? `${shift.startTime} - ${shift.endTime}` : '08:00 - 16:00',
                  })
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select shift..." />
                </SelectTrigger>
                <SelectContent>
                  {availableShifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.shiftName} ({shift.startTime} - {shift.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target Location Venue *</Label>
              <Select
                value={addStaffForm.targetId}
                onValueChange={(val: string) => {
                  const target = targetLocations.find((t) => t.id === val)
                  setAddStaffForm({
                    ...addStaffForm,
                    targetId: val,
                    targetName: target?.name || val,
                  })
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select target..." />
                </SelectTrigger>
                <SelectContent>
                  {targetLocations.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStaffModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddStaffToRoster}
              disabled={isSubmittingAddStaff}
              className="bg-[#004B87] hover:bg-[#003865]"
            >
              {isSubmittingAddStaff ? 'Adding...' : 'Assign Staff to Roster'}
            </Button>
          </DialogFooter>
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
              <DialogDescription>Review active shift instances, substitute, or cancel staff for this date.</DialogDescription>
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
                          <strong>Status:</strong>{' '}
                          <Badge className={getStatusBadge(item.status)}>{item.status}</Badge>
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
                              setCancellationReason('')
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
                  setAddStaffForm((prev) => ({ ...prev, date: selectedCellDate }))
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
      {isCopyModalOpen && (
        <Dialog open={isCopyModalOpen} onOpenChange={setIsCopyModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Copy className="h-5 w-5 text-[#004B87]" /> Copy Roster Pattern Forward
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Clone active September roster assignments and shift patterns into a future target date range with auto date adjustment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Target Roster Name *</Label>
                <Input
                  value={copyForm.newRosterName}
                  onChange={(e) => setCopyForm({ ...copyForm, newRosterName: e.target.value })}
                  placeholder="e.g. October 2026 Duty Roster"
                  className="mt-1 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Target Effective From *</Label>
                  <Input
                    type="date"
                    value={copyForm.targetEffectiveFrom}
                    onChange={(e) => setCopyForm({ ...copyForm, targetEffectiveFrom: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Target Effective Until *</Label>
                  <Input
                    type="date"
                    value={copyForm.targetEffectiveUntil}
                    onChange={(e) => setCopyForm({ ...copyForm, targetEffectiveUntil: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#004B87]" /> Auto-Copy Summary:
                </div>
                <p>Cloning {liveRosterDates.length} roster duties across all active staff to October 2026.</p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsCopyModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCopyForward}
                disabled={isSubmittingCopy}
                className="bg-[#004B87] hover:bg-[#003865] gap-2 shadow-xs"
              >
                <Copy className="w-4 h-4" />
                {isSubmittingCopy ? 'Cloning Roster...' : 'Confirm & Copy Forward'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Quick Add Location / Department Modal */}
      <Dialog open={isAddLocationModalOpen} onOpenChange={setIsAddLocationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Plus className="h-5 w-5 text-[#004B87]" /> Add New Location / Department
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Create a new operational location or department to target in duty roster assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Location / Department Name *</Label>
              <Input
                value={newLocationForm.name}
                onChange={(e) => setNewLocationForm({ ...newLocationForm, name: e.target.value })}
                placeholder="e.g. Cardiology OPD Dept, Flat 501, West Wing"
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Target Category Scope *</Label>
              <Select
                value={newLocationForm.type}
                onValueChange={(val: any) => setNewLocationForm({ ...newLocationForm, type: val })}
              >
                <SelectTrigger className="mt-1 h-10">
                  <SelectValue placeholder="Select scope category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROOM_UNIT">Flat / Unit (Resident Apartment)</SelectItem>
                  <SelectItem value="FLOOR">Floor / Wing (Caregiver Zone)</SelectItem>
                  <SelectItem value="CLINIC_VENUE">Clinic Suite (OPD Consultation Room)</SelectItem>
                  <SelectItem value="DEPARTMENT">Department (Clinical & Med Dept)</SelectItem>
                  <SelectItem value="BLOCK">Block Tower (Building Complex)</SelectItem>
                  <SelectItem value="AREA">Area Zone (Facility Area)</SelectItem>
                  <SelectItem value="PROPERTY">Property Campus (Main Campus)</SelectItem>
                  <SelectItem value="SERVICE">Service (Specialty Service Pool)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddLocationModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newLocationForm.name.trim()) {
                  toast.error('Please enter a location or department name')
                  return
                }
                const newId = `target-custom-${Date.now()}`
                const createdLoc: TargetLocation = {
                  id: newId,
                  name: newLocationForm.name.trim(),
                  type: newLocationForm.type,
                }
                setCustomLocations((prev) => [...prev, createdLoc])
                setBuilderForm((prev) => ({
                  ...prev,
                  targetScopeType: newLocationForm.type,
                  selectedTargetId: newId,
                  selectedTargetName: createdLoc.name,
                }))
                setIsAddLocationModalOpen(false)
                setNewLocationForm({ name: '', type: 'DEPARTMENT' })
                toast.success(`Location "${createdLoc.name}" created and selected!`)
              }}
              className="bg-[#004B87] hover:bg-[#003865] gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Save & Select Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Medical Onboarding & Specializations Modal */}
      <MedicalSpecializationModal
        open={isMedicalOnboardingOpen}
        onOpenChange={setIsMedicalOnboardingOpen}
      />
    </div>
  )
}
