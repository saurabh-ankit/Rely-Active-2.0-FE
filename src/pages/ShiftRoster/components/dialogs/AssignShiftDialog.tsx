import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { CalendarPlus, Clock, MapPin, Users, type LucideIcon } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() */
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  useComboboxAnchor,
} from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDepartmentsQuery } from '@/hooks/react-query/rbac'
import { useUsersQuery } from '@/hooks/react-query/user'
import { getPropertyByIdAPI } from '@/lib/services/propertyService'
import type { EmployeeShiftAssignment, ShiftV2, WeekDay } from '@/lib/services/rosterService'
import type { UserItem } from '@/lib/types'
import { useLocationStore } from '@/lib/stores/locationStore'
import {
  assignShiftFormDefaultValues,
  assignShiftFormSchema,
  MEDICAL_ROSTER_ROLE_OPTIONS,
  type AssignShiftFormValues,
} from '@/utils/roster.utils'
import {
  doTimeWindowsOverlap,
  generateShiftSlots,
  generateSlotsByCount,
  getUserDisplayName,
  getUserJobCategoryLabel,
  getUserRoleLabel,
  getUserSpecializationLabel,
  hasWindowStartPassedOnDate,
  isMedicalDepartment,
  isMedicalNoAssignRosterRole,
  isMedicalRosterDoctorRole,
  isMedicalUnitOnlyRosterRole,
  isSlotWithinShift,
  medicalRosterRoleEmptyLabel,
  parseLocalYmd,
  resolveAssignmentWindow,
  todayYmdLocal,
  userMatchesMedicalRosterRole,
  WEEK_DAYS,
  weekdaysInDateRange,
} from '../../utils'
import {
  useBulkCreateEmployeeShifts,
  useListEmployeeShifts,
  useListAreas,
  useListShifts,
} from '@/hooks/react-query/roster'
import EmployeeAvailabilityDialog from './EmployeeAvailabilityDialog'
import { floorLabel } from '@/utils/unitLabel'

interface AssignShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift?: ShiftV2 | null
}

const FULL_SHIFT_VALUE = '__full__'

/** A numbered step of the form, so the dialog reads Who → When → Where. */
const FormSection = ({
  step,
  icon: Icon,
  title,
  hint,
  children,
}: {
  step: number
  icon: LucideIcon
  title: string
  hint: string
  children: React.ReactNode
}) => (
  <section className="rounded-xl border border-gray-200 bg-white">
    <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2a517c] text-[11px] font-bold text-white">
        {step}
      </span>
      <div className="min-w-0">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <Icon className="h-4 w-4 text-[#2a517c]" />
          {title}
        </h3>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
    </div>
    <div className="space-y-4 p-4">{children}</div>
  </section>
)

type AreaOption = { id: string; areaName: string }
type AmenityOption = { id: string; name: string }
type BlockOption = {
  id: string
  block_name: string
  floors?: Array<{
    id: string
    floor_name?: string | null
    floor_number: number
    units?: Array<{ id: string; unit_number: string }>
  }>
}
type FloorOption = {
  id: string
  floor_name?: string | null
  floor_number: number
  blockId: string
  blockName: string
  units?: Array<{ id: string; unit_number: string }>
}
type FlatOption = {
  id: string
  unit_number: string
  floorId: string
  floorLabel: string
}

const WEEKDAY_BY_INDEX: WeekDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const assignmentTouchesWorkingDays = (
  assignment: EmployeeShiftAssignment,
  startDate: string,
  endDate: string,
  workingDays: WeekDay[],
): boolean => {
  const aStart = assignment.startDate
  const aEnd = assignment.endDate
  if (!aStart || !aEnd || endDate < aStart || startDate > aEnd) return false

  const rangeStart = startDate > aStart ? startDate : aStart
  const rangeEnd = endDate < aEnd ? endDate : aEnd
  const start = parseLocalYmd(rangeStart)
  const end = parseLocalYmd(rangeEnd)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayName = WEEKDAY_BY_INDEX[d.getDay()]
    if (!dayName) continue

    const newWorks = workingDays.length === 0 || workingDays.includes(dayName)
    const existingWorks =
      !assignment.workingDays || assignment.workingDays.length === 0 || assignment.workingDays.includes(dayName)

    if (newWorks && existingWorks) return true
  }
  return false
}

const AssignShiftDialog = ({ open, onOpenChange, shift = null }: AssignShiftDialogProps) => {
  const locationId = useLocationStore((s) => s.selectedLocationId)
  const { data: users } = useUsersQuery()
  const { data: departments = [] } = useDepartmentsQuery()
  const { data: shiftsData } = useListShifts()
  const { data: areasData } = useListAreas({ page: 1, limit: 100 }, open)
  const { data: assignmentsData } = useListEmployeeShifts(undefined, open)
  const createBulk = useBulkCreateEmployeeShifts()
  const employeeChipsAnchor = useComboboxAnchor()
  const areaChipsAnchor = useComboboxAnchor()
  const amenityChipsAnchor = useComboboxAnchor()
  const blockChipsAnchor = useComboboxAnchor()
  const floorChipsAnchor = useComboboxAnchor()
  const flatChipsAnchor = useComboboxAnchor()

  const shifts = useMemo(() => shiftsData?.data?.shifts || [], [shiftsData])
  const existingAssignments = useMemo(
    () => (Array.isArray(assignmentsData?.data) ? assignmentsData.data : []) as EmployeeShiftAssignment[],
    [assignmentsData],
  )
  const areas = useMemo(() => {
    const raw = areasData?.data as { areas?: Array<{ id: string; areaName: string }> } | undefined
    return raw?.areas || []
  }, [areasData])

  const activeDepartments = useMemo(() => (departments || []).filter((d) => d.isActive !== false), [departments])

  const { data: property } = useQuery({
    queryKey: ['property', locationId],
    queryFn: () => getPropertyByIdAPI(locationId!),
    enabled: open && !!locationId,
  })

  // Same source as Amenities page: propertyAmenities, else legacy property.amenities names.
  const amenities = useMemo<AmenityOption[]>(() => {
    const linked = (property?.propertyAmenities || []).filter((a) => a.isActive !== false)
    if (linked.length > 0) {
      return linked.map((a) => ({ id: a.amenityId, name: a.name }))
    }
    return (property?.amenities || [])
      .map((name) => String(name || '').trim())
      .filter(Boolean)
      .map((name) => ({ id: name, name }))
  }, [property])

  const today = todayYmdLocal()

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<AssignShiftFormValues>({
    resolver: zodResolver(assignShiftFormSchema),
    defaultValues: assignShiftFormDefaultValues,
    mode: 'onChange',
  })

  const departmentId = watch('departmentId')
  const roleCode = watch('roleCode')
  const employeeIds = watch('employeeIds')
  const shiftId = watch('shiftId')
  const slotValue = watch('slotValue')
  const startDate = watch('startDate')
  const endDate = watch('endDate')
  const targetType = watch('targetType')
  const areaIds = watch('areaIds')
  const amenityIds = watch('amenityIds')
  const blockIds = watch('blockIds')
  const floorIds = watch('floorIds')
  const unitIds = watch('unitIds')
  const workingDays = watch('workingDays')

  const selectedDepartment = useMemo(
    () => activeDepartments.find((d) => d.id === departmentId) || null,
    [activeDepartments, departmentId],
  )
  const isMedicalDept = isMedicalDepartment(selectedDepartment)
  const canSelectEmployees = !!departmentId && (!isMedicalDept || !!roleCode)
  /** Medical Nurse / In-house Doctor: Assign to Unit only (no Area). */
  const isMedicalUnitOnly = isMedicalDept && isMedicalUnitOnlyRosterRole(roleCode || '')
  /** Medical Visiting Doctor: no Area/Unit assignment at all. */
  const isMedicalNoAssign = isMedicalDept && isMedicalNoAssignRosterRole(roleCode || '')
  const showAssignTo = !isMedicalNoAssign

  const medicalJobCategoryCatalog = useMemo(() => {
    const fromSelected = selectedDepartment?.jobCategories || []
    if (fromSelected.length > 0) return fromSelected
    const med = activeDepartments.find((d) => isMedicalDepartment(d))
    return med?.jobCategories || []
  }, [selectedDepartment, activeDepartments])

  const blocks = useMemo(() => (property?.blocks || []) as BlockOption[], [property])

  const availableFloors = useMemo(() => {
    const selectedBlocks = blocks.filter((b) => blockIds.includes(b.id))
    const floors: FloorOption[] = []
    for (const block of selectedBlocks) {
      for (const floor of block.floors || []) {
        floors.push({
          ...floor,
          blockId: block.id,
          blockName: block.block_name,
        })
      }
    }
    return floors
  }, [blocks, blockIds])

  const availableFlats = useMemo(() => {
    const selectedFloors = availableFloors.filter((f) => floorIds.includes(f.id))
    const flats: FlatOption[] = []
    for (const floor of selectedFloors) {
      const floorText = floorLabel(floor)
      for (const unit of floor.units || []) {
        flats.push({
          id: unit.id,
          unit_number: unit.unit_number,
          floorId: floor.id,
          floorLabel: [floor.blockName, floorText].filter(Boolean).join(' · '),
        })
      }
    }
    return flats
  }, [availableFloors, floorIds])

  useEffect(() => {
    const validFloorIds = new Set(availableFloors.map((f) => f.id))
    const nextFloorIds = floorIds.filter((id) => validFloorIds.has(id))
    if (nextFloorIds.length !== floorIds.length) {
      setValue('floorIds', nextFloorIds, { shouldValidate: true })
    }
  }, [availableFloors, floorIds, setValue])

  useEffect(() => {
    const validUnitIds = new Set(availableFlats.map((u) => u.id))
    const nextUnitIds = unitIds.filter((id) => validUnitIds.has(id))
    if (nextUnitIds.length !== unitIds.length) {
      setValue('unitIds', nextUnitIds, { shouldValidate: true })
    }
  }, [availableFlats, unitIds, setValue])

  const selectedShiftId = shift?.id || shiftId
  const selectedShift = useMemo(
    () => shift || shifts.find((s) => s.id === selectedShiftId) || null,
    [shift, shifts, selectedShiftId],
  )

  const slots = useMemo(() => {
    if (!selectedShift) return []
    if (selectedShift.numberOfSlots && selectedShift.numberOfSlots > 0) {
      return generateSlotsByCount(selectedShift.startTime, selectedShift.endTime, selectedShift.numberOfSlots)
    }
    const duration = selectedShift.slotDuration && selectedShift.slotDuration > 0 ? selectedShift.slotDuration : 60
    return generateShiftSlots(selectedShift.startTime, selectedShift.endTime, duration)
  }, [selectedShift])

  const availableWorkingDays = useMemo(() => weekdaysInDateRange(startDate, endDate), [startDate, endDate])

  const employeesInDepartment = useMemo(() => {
    const list = Array.isArray(users) ? users : []
    if (!departmentId) return []
    if (isMedicalDept && !roleCode) return []
    return list.filter((user) => {
      if (user.isActive === false || user.status === 'INACTIVE') return false
      const inDepartment = (user.userLocations || []).some((ul) => {
        const deptId = ul.departmentId || (ul as { department_id?: string }).department_id
        return deptId === departmentId
      })
      if (!inDepartment) return false
      if (isMedicalDept && roleCode) {
        return userMatchesMedicalRosterRole(user, roleCode, departmentId, medicalJobCategoryCatalog)
      }
      return true
    })
  }, [users, departmentId, isMedicalDept, roleCode, medicalJobCategoryCatalog])

  /** Days where every selected employee is on weekoff — only those are blocked. */
  const blockedWeekOffDays = useMemo(() => {
    const blocked = new Set<WeekDay>()
    if (employeeIds.length === 0) return blocked

    const weekOffSets: Set<string>[] = []
    for (const id of employeeIds) {
      const emp = employeesInDepartment.find((e) => e.id === id)
      const days = emp?.profile?.weekOffDays || emp?.profile?.week_off_days || []
      const set = new Set<string>()
      if (Array.isArray(days)) {
        for (const d of days) {
          if (WEEK_DAYS.includes(d as WeekDay)) set.add(d as WeekDay)
        }
      }
      weekOffSets.push(set)
    }

    for (const day of WEEK_DAYS) {
      if (weekOffSets.every((set) => set.has(day))) blocked.add(day)
    }
    return blocked
  }, [employeeIds, employeesInDepartment])

  const selectedEmployees = useMemo(
    () => employeesInDepartment.filter((e) => employeeIds.includes(e.id)),
    [employeesInDepartment, employeeIds],
  )

  const [availabilityOpen, setAvailabilityOpen] = useState(false)

  useEffect(() => {
    if (open) {
      reset({
        ...assignShiftFormDefaultValues,
        shiftId: shift?.id || '',
        slotValue: FULL_SHIFT_VALUE,
        startDate: today,
        endDate: today,
        workingDays: weekdaysInDateRange(today, today),
      })
    }
  }, [open, shift, today, reset])

  useEffect(() => {
    setValue('roleCode', '', { shouldValidate: true })
    setValue('employeeIds', [], { shouldValidate: true })
  }, [departmentId, setValue])

  useEffect(() => {
    setValue('employeeIds', [], { shouldValidate: true })
  }, [roleCode, setValue])

  // Medical role → location assignment rules (Medical only)
  useEffect(() => {
    if (!isMedicalDept) return

    if (isMedicalNoAssignRosterRole(roleCode || '')) {
      setValue('areaIds', [], { shouldValidate: true })
      setValue('amenityIds', [], { shouldValidate: true })
      setValue('blockIds', [], { shouldValidate: true })
      setValue('floorIds', [], { shouldValidate: true })
      setValue('unitIds', [], { shouldValidate: true })
      return
    }

    if (isMedicalUnitOnlyRosterRole(roleCode || '')) {
      setValue('targetType', 'unit', { shouldValidate: true })
      setValue('areaIds', [], { shouldValidate: true })
      setValue('amenityIds', [], { shouldValidate: true })
    }
  }, [isMedicalDept, roleCode, setValue])

  useEffect(() => {
    setValue('slotValue', FULL_SHIFT_VALUE, { shouldValidate: true })
  }, [selectedShiftId, setValue])

  useEffect(() => {
    if (endDate && startDate && endDate < startDate) {
      setValue('endDate', startDate, { shouldValidate: true })
      return
    }
    if (!startDate || !endDate) return
    const inRange = weekdaysInDateRange(startDate, endDate).filter((d) => !blockedWeekOffDays.has(d))
    setValue('workingDays', inRange, { shouldValidate: true })
  }, [startDate, endDate, blockedWeekOffDays, setValue])

  useEffect(() => {
    if (blockedWeekOffDays.size === 0) return
    const filtered = workingDays.filter((d) => !blockedWeekOffDays.has(d))
    if (filtered.length !== workingDays.length) {
      setValue('workingDays', filtered, { shouldValidate: true })
    }
  }, [blockedWeekOffDays, workingDays, setValue])

  const toggleDay = (day: WeekDay) => {
    if (!availableWorkingDays.includes(day) || blockedWeekOffDays.has(day)) return
    const next = workingDays.includes(day) ? workingDays.filter((d) => d !== day) : [...workingDays, day]
    setValue('workingDays', next, { shouldValidate: true })
  }

  const locationTargetValid = isMedicalNoAssign
    ? true
    : targetType === 'area'
      ? areaIds.length > 0
      : targetType === 'amenity'
        ? amenityIds.length > 0
        : blockIds.length > 0

  const selectedSlotRange = slotValue === FULL_SHIFT_VALUE ? null : slotValue

  const effectiveWindow = useMemo(() => {
    if (!selectedShift) return null
    return resolveAssignmentWindow(selectedShift.startTime, selectedShift.endTime, selectedSlotRange)
  }, [selectedShift, selectedSlotRange])

  const timeValidationError = useMemo(() => {
    if (!selectedShift || !startDate) return null
    if (startDate < today) return 'Start date cannot be in the past'
    if (endDate < startDate) return 'End date must be on or after start date'
    if (workingDays.length === 0) return 'Select at least one working day in the date range'
    const weekOffHit = workingDays.filter((d) => blockedWeekOffDays.has(d))
    if (weekOffHit.length > 0) {
      return `No selected employee is available on: ${weekOffHit.map((d) => d.slice(0, 3)).join(', ')}`
    }

    if (selectedSlotRange) {
      if (!isSlotWithinShift(selectedSlotRange, selectedShift.startTime, selectedShift.endTime)) {
        return 'Selected slot must fall within the shift time window'
      }
    }

    const effectiveStart = effectiveWindow?.start || selectedShift.startTime
    if (hasWindowStartPassedOnDate(startDate, effectiveStart)) {
      return selectedSlotRange
        ? 'Selected slot start time has already passed for the start date'
        : 'Selected shift start time has already passed for the start date'
    }
    return null
  }, [selectedShift, startDate, endDate, selectedSlotRange, today, workingDays, effectiveWindow, blockedWeekOffDays])

  const overlapValidationError = useMemo(() => {
    if (employeeIds.length === 0 || !effectiveWindow || !startDate || !endDate || workingDays.length === 0) {
      return null
    }

    const selectedIdSet = new Set(employeeIds)
    for (const assignment of existingAssignments) {
      if (!selectedIdSet.has(assignment.employeeId)) continue
      if (assignment.isDeleted) continue
      if (!assignmentTouchesWorkingDays(assignment, startDate, endDate, workingDays)) continue

      const existingWindow = resolveAssignmentWindow(
        assignment.shift?.startTime,
        assignment.shift?.endTime,
        assignment.slotTimeRange,
      )
      if (!existingWindow) continue

      if (!doTimeWindowsOverlap(effectiveWindow.start, effectiveWindow.end, existingWindow.start, existingWindow.end)) {
        continue
      }

      const timeLabel = `${existingWindow.start}–${existingWindow.end}`
      const shiftName = assignment.shift?.name || 'another roster'
      const employee = employeesInDepartment.find((emp) => emp.id === assignment.employeeId)
      const employeeName = employee ? getUserDisplayName(employee) : 'An employee'

      return `${employeeName} already has ${shiftName} (${timeLabel}) overlapping these dates. Choose a time before or after ${timeLabel}.`
    }

    return null
  }, [employeeIds, effectiveWindow, startDate, endDate, workingDays, existingAssignments, employeesInDepartment])

  const onSubmit = async (values: AssignShiftFormValues) => {
    const selectedDept = activeDepartments.find((d) => d.id === values.departmentId) || null
    if (isMedicalDepartment(selectedDept) && !values.roleCode) {
      setError('roleCode', { type: 'manual', message: 'Role is required for Medical department' })
      return
    }

    const effectiveShiftId = shift?.id || values.shiftId
    if (!effectiveShiftId || values.employeeIds.length === 0 || !locationTargetValid) return
    if (timeValidationError) {
      toast.error(timeValidationError)
      return
    }
    if (overlapValidationError) {
      toast.error(overlapValidationError)
      return
    }

    const slotRange = values.slotValue === FULL_SHIFT_VALUE ? null : values.slotValue
    const skipLocation = isMedicalDepartment(selectedDept) && isMedicalNoAssignRosterRole(values.roleCode || '')
    const forceUnit = isMedicalDepartment(selectedDept) && isMedicalUnitOnlyRosterRole(values.roleCode || '')
    const effectiveTargetType = skipLocation ? null : forceUnit ? 'unit' : values.targetType

    try {
      await createBulk.mutateAsync({
        employeeIds: values.employeeIds,
        shiftId: effectiveShiftId,
        startDate: values.startDate,
        endDate: values.endDate,
        notes: values.notes?.trim() || null,
        workingDays: values.workingDays,
        areaIds: effectiveTargetType === 'area' ? values.areaIds : undefined,
        amenityIds: effectiveTargetType === 'amenity' ? values.amenityIds : undefined,
        blockIds: effectiveTargetType === 'unit' ? values.blockIds : undefined,
        floorIds: effectiveTargetType === 'unit' && values.floorIds.length > 0 ? values.floorIds : undefined,
        unitIds: effectiveTargetType === 'unit' && values.unitIds.length > 0 ? values.unitIds : undefined,
        slotTimeRange: slotRange,
      })
      onOpenChange(false)
    } catch {
      // toast handled by mutation
    }
  }

  const pending = createBulk.isPending

  // Plain-language line above the buttons: what pressing Create will do.
  const rosterSummary = (() => {
    if (employeeIds.length === 0 || !selectedShift) return 'Choose employees and a shift to see the roster summary.'
    const who = `${employeeIds.length} employee${employeeIds.length === 1 ? '' : 's'}`
    const when =
      startDate && endDate ? (startDate === endDate ? `on ${startDate}` : `from ${startDate} to ${endDate}`) : ''
    const days = workingDays.length ? `, ${workingDays.length} day${workingDays.length === 1 ? '' : 's'} a week` : ''
    return `${who} on ${selectedShift.name} (${selectedShift.startTime}–${selectedShift.endTime}) ${when}${days}.`
  })()

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0">
          <DialogHeader className="border-b border-gray-100 px-6 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2a517c]/10 text-[#2a517c]">
                <CalendarPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Create Roster</DialogTitle>
                <p className="mt-0.5 text-xs text-gray-500">
                  Put employees on a shift for a range of dates, and say where they will work.
                </p>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-4 px-6 py-5">
              <FormSection step={1} icon={Users} title="Who" hint="Pick the department, then the employees to roster.">
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Controller
                    name="departmentId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeDepartments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                              {d.code ? ` (${d.code})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.departmentId && <p className="text-sm text-red-600">{errors.departmentId.message}</p>}
                </div>

                {isMedicalDept && (
                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Controller
                      name="roleCode"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {MEDICAL_ROSTER_ROLE_OPTIONS.map((role) => (
                              <SelectItem key={role.code} value={role.code}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.roleCode && <p className="text-sm text-red-600">{errors.roleCode.message}</p>}
                    <p className="text-xs text-gray-500">
                      Select Nurse, Visiting Doctor, or In-house Doctor before choosing employees.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Employees *</Label>
                  <Controller
                    name="employeeIds"
                    control={control}
                    render={({ field }) => {
                      const selected = employeesInDepartment.filter((emp) => field.value.includes(emp.id))
                      const employeePlaceholder = !departmentId
                        ? 'Select a department first'
                        : isMedicalDept && !roleCode
                          ? 'Select a role first'
                          : 'Select employees...'
                      const searchPlaceholder = !departmentId
                        ? 'Select a department first'
                        : isMedicalDept && !roleCode
                          ? 'Select a role first'
                          : 'Search employees...'
                      return (
                        <div className="space-y-1.5">
                          <Combobox
                            multiple
                            items={employeesInDepartment}
                            value={selected}
                            onValueChange={(vals: UserItem[]) => field.onChange(vals.map((emp) => emp.id))}
                            itemToStringLabel={(item) => getUserDisplayName(item)}
                            isItemEqualToValue={(a, b) => a.id === b.id}
                            disabled={!canSelectEmployees}
                          >
                            <ComboboxChips ref={employeeChipsAnchor} className="w-full min-h-9 rounded-md">
                              {selected.length === 0 && (
                                <span className="flex-1 text-sm text-muted-foreground">{employeePlaceholder}</span>
                              )}
                              {selected.map((emp) => (
                                <ComboboxChip key={emp.id}>{getUserDisplayName(emp)}</ComboboxChip>
                              ))}
                              <ComboboxTrigger
                                className="ml-auto shrink-0 self-center"
                                disabled={!canSelectEmployees}
                              />
                            </ComboboxChips>
                            <ComboboxContent
                              anchor={employeeChipsAnchor}
                              side="bottom"
                              align="start"
                              className="w-[var(--anchor-width)]"
                            >
                              <ComboboxInput
                                placeholder={searchPlaceholder}
                                disabled={!canSelectEmployees}
                                showTrigger={false}
                                className="w-full"
                              />
                              <ComboboxList className="max-h-60">
                                {(emp: UserItem) => {
                                  const specialization = isMedicalRosterDoctorRole(roleCode || '')
                                    ? getUserSpecializationLabel(emp)
                                    : ''
                                  const jobCatLabel = isMedicalRosterDoctorRole(roleCode || '')
                                    ? getUserJobCategoryLabel(emp, departmentId, medicalJobCategoryCatalog)
                                    : ''
                                  const roleLabel = !isMedicalRosterDoctorRole(roleCode || '')
                                    ? getUserRoleLabel(emp)
                                    : ''
                                  const subLabel = [jobCatLabel, specialization || roleLabel]
                                    .filter(Boolean)
                                    .join(' · ')
                                  return (
                                    <ComboboxItem key={emp.id} value={emp} className="py-2">
                                      <div className="flex flex-col gap-0.5 min-w-0 pr-6">
                                        <span className="font-semibold text-sm text-gray-900">
                                          {getUserDisplayName(emp)}
                                        </span>
                                        {subLabel ? <span className="text-xs text-[#5b8ab8]">{subLabel}</span> : null}
                                      </div>
                                    </ComboboxItem>
                                  )
                                }}
                              </ComboboxList>
                              <ComboboxEmpty className="text-xs text-gray-500 py-2">No employees found</ComboboxEmpty>
                            </ComboboxContent>
                          </Combobox>
                          {selected.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {selected.length} employee{selected.length === 1 ? '' : 's'} selected
                            </p>
                          )}
                        </div>
                      )
                    }}
                  />
                  {errors.employeeIds && <p className="text-sm text-red-600">{errors.employeeIds.message}</p>}
                  {canSelectEmployees && employeesInDepartment.length === 0 && (
                    <p className="text-xs text-gray-500">
                      {isMedicalDept
                        ? `No ${medicalRosterRoleEmptyLabel(roleCode || '')} found in this department.`
                        : 'No employees found in this department.'}
                    </p>
                  )}
                </div>
              </FormSection>

              <FormSection
                step={2}
                icon={Clock}
                title="When"
                hint="The shift, the dates it runs between, and the days of the week."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {!shift && (
                    <div className="space-y-2">
                      <Label>Shift *</Label>
                      <Controller
                        name="shiftId"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select shift" />
                            </SelectTrigger>
                            <SelectContent>
                              {shifts.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name} ({s.startTime} – {s.endTime})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.shiftId && <p className="text-sm text-red-600">{errors.shiftId.message}</p>}
                    </div>
                  )}

                  {shift && (
                    <div className="space-y-2">
                      <Label>Shift</Label>
                      <p className="flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-900">
                        {shift.name}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Time slot</Label>
                    <Controller
                      name="slotValue"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={!selectedShift}>
                          <SelectTrigger>
                            <SelectValue placeholder="Full shift" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={FULL_SHIFT_VALUE}>
                              Full shift
                              {selectedShift ? ` (${selectedShift.startTime} – ${selectedShift.endTime})` : ''}
                            </SelectItem>
                            {slots.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <p className="text-xs text-gray-500">Full shift, or only part of it.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>From *</Label>
                    <Input
                      type="date"
                      min={today}
                      {...register('startDate', {
                        onChange: (e) => {
                          const next = e.target.value
                          if (endDate && next && endDate < next) {
                            setValue('endDate', next, { shouldValidate: true })
                          }
                        },
                      })}
                    />
                    {errors.startDate && <p className="text-sm text-red-600">{errors.startDate.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>To *</Label>
                    <Input type="date" min={startDate || today} {...register('endDate')} />
                    {errors.endDate && <p className="text-sm text-red-600">{errors.endDate.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Working days *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-[#2a517c] hover:bg-[#2a517c]/5"
                      disabled={employeeIds.length === 0}
                      onClick={() => setAvailabilityOpen(true)}
                    >
                      See who's off
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {WEEK_DAYS.map((day) => {
                      const inRange = availableWorkingDays.includes(day)
                      const isWeekOff = blockedWeekOffDays.has(day)
                      const disabled = !inRange || isWeekOff
                      const checked = workingDays.includes(day)
                      return (
                        <Button
                          key={day}
                          type="button"
                          variant="ghost"
                          disabled={disabled}
                          aria-pressed={checked}
                          onClick={() => toggleDay(day)}
                          title={
                            isWeekOff
                              ? 'None of the selected employees work this day'
                              : !inRange
                                ? 'Not within the selected dates'
                                : undefined
                          }
                          className={`h-9 rounded-lg border text-xs font-semibold capitalize transition-colors ${
                            disabled
                              ? 'cursor-not-allowed border-dashed border-gray-200 text-gray-300 hover:bg-transparent'
                              : checked
                                ? 'cursor-pointer border-[#2a517c] bg-[#2a517c] text-white hover:bg-[#2a517c] hover:text-white'
                                : 'cursor-pointer border-gray-200 bg-white text-gray-600 hover:border-[#2a517c]/40 hover:bg-transparent'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </Button>
                      )
                    })}
                  </div>
                  {errors.workingDays && <p className="text-sm text-red-600">{errors.workingDays.message}</p>}
                  <p className="text-xs text-gray-500">
                    Greyed-out days are outside the dates or a day off for every selected employee.
                  </p>
                </div>
              </FormSection>

              {showAssignTo && (
                <FormSection
                  step={3}
                  icon={MapPin}
                  title="Where"
                  hint="A common area, amenities, or specific blocks, floors and flats."
                >
                  {showAssignTo && (
                    <div className="space-y-2">
                      <Label>Assign to *</Label>
                      <Controller
                        name="targetType"
                        control={control}
                        render={({ field }) => {
                          const current = isMedicalUnitOnly ? 'unit' : field.value
                          const choose = (v: 'area' | 'unit' | 'amenity') => {
                            if (v === current) return
                            field.onChange(v)
                            setValue('areaIds', [], { shouldValidate: true })
                            setValue('amenityIds', [], { shouldValidate: true })
                            setValue('blockIds', [], { shouldValidate: true })
                            setValue('floorIds', [], { shouldValidate: true })
                            setValue('unitIds', [], { shouldValidate: true })
                          }
                          const options: Array<{ value: 'area' | 'unit' | 'amenity'; label: string; hint: string }> = [
                            { value: 'area', label: 'Common area', hint: 'e.g. lobby, gate, kitchen' },
                            { value: 'amenity', label: 'Amenities', hint: 'e.g. gym, pool, clubhouse' },
                            { value: 'unit', label: 'Flats & units', hint: 'Blocks, floors or specific flats' },
                          ]
                          return (
                            <div className="grid grid-cols-3 gap-2">
                              {options.map((o) => {
                                const disabled = isMedicalUnitOnly && o.value !== 'unit'
                                const active = current === o.value
                                return (
                                  <Button
                                    key={o.value}
                                    type="button"
                                    variant="ghost"
                                    disabled={disabled}
                                    aria-pressed={active}
                                    onClick={() => choose(o.value)}
                                    className={`h-auto flex flex-col items-stretch rounded-lg border px-3 py-2 text-left transition-colors whitespace-normal font-normal hover:bg-transparent ${
                                      disabled
                                        ? 'cursor-not-allowed border-dashed border-gray-200 opacity-50'
                                        : active
                                          ? 'cursor-pointer border-[#2a517c] bg-[#2a517c]/5 ring-1 ring-[#2a517c]'
                                          : 'cursor-pointer border-gray-200 hover:border-[#2a517c]/40'
                                    }`}
                                  >
                                    <p
                                      className={`text-sm font-semibold ${active ? 'text-[#2a517c]' : 'text-gray-800'}`}
                                    >
                                      {o.label}
                                    </p>
                                    <p className="text-[11px] text-gray-500">{o.hint}</p>
                                  </Button>
                                )
                              })}
                            </div>
                          )
                        }}
                      />
                      {errors.targetType && <p className="text-sm text-red-600">{errors.targetType.message}</p>}
                      {isMedicalUnitOnly && (
                        <p className="text-xs text-gray-500">
                          For Nurse and In-house Doctor, assignment must be to a Unit.
                        </p>
                      )}
                    </div>
                  )}

                  {showAssignTo && targetType === 'area' && !isMedicalUnitOnly ? (
                    <div className="space-y-2">
                      <Label>Area</Label>
                      <Controller
                        name="areaIds"
                        control={control}
                        render={({ field }) => {
                          const selected = areas.filter((a) => field.value.includes(a.id))
                          return (
                            <div className="space-y-1.5">
                              <Combobox
                                multiple
                                items={areas}
                                value={selected}
                                onValueChange={(vals: AreaOption[]) => field.onChange(vals.map((a) => a.id))}
                                itemToStringLabel={(item) => item.areaName}
                                isItemEqualToValue={(a, b) => a.id === b.id}
                              >
                                <ComboboxChips ref={areaChipsAnchor} className="w-full min-h-9 rounded-md">
                                  {selected.length === 0 && (
                                    <span className="flex-1 text-sm text-muted-foreground">Select areas...</span>
                                  )}
                                  {selected.map((a) => (
                                    <ComboboxChip key={a.id}>{a.areaName}</ComboboxChip>
                                  ))}
                                  <ComboboxTrigger className="ml-auto shrink-0 self-center" />
                                </ComboboxChips>
                                <ComboboxContent
                                  anchor={areaChipsAnchor}
                                  side="bottom"
                                  align="start"
                                  className="w-[var(--anchor-width)]"
                                >
                                  <ComboboxInput placeholder="Search areas..." showTrigger={false} className="w-full" />
                                  <ComboboxList className="max-h-60">
                                    {(a: AreaOption) => (
                                      <ComboboxItem key={a.id} value={a}>
                                        {a.areaName}
                                      </ComboboxItem>
                                    )}
                                  </ComboboxList>
                                  <ComboboxEmpty className="text-xs text-gray-500 py-2">No areas found</ComboboxEmpty>
                                </ComboboxContent>
                              </Combobox>
                              {selected.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {selected.length} area{selected.length === 1 ? '' : 's'} selected
                                </p>
                              )}
                            </div>
                          )
                        }}
                      />
                      {errors.areaIds && <p className="text-sm text-red-600">{errors.areaIds.message}</p>}
                    </div>
                  ) : showAssignTo && targetType === 'amenity' && !isMedicalUnitOnly ? (
                    <div className="space-y-2">
                      <Label>Amenity</Label>
                      <Controller
                        name="amenityIds"
                        control={control}
                        render={({ field }) => {
                          const selected = amenities.filter((a) => field.value.includes(a.id))
                          return (
                            <div className="space-y-1.5">
                              <Combobox
                                multiple
                                items={amenities}
                                value={selected}
                                onValueChange={(vals: AmenityOption[]) => field.onChange(vals.map((a) => a.id))}
                                itemToStringLabel={(item) => item.name}
                                isItemEqualToValue={(a, b) => a.id === b.id}
                              >
                                <ComboboxChips ref={amenityChipsAnchor} className="w-full min-h-9 rounded-md">
                                  {selected.length === 0 && (
                                    <span className="flex-1 text-sm text-muted-foreground">Select amenities...</span>
                                  )}
                                  {selected.map((a) => (
                                    <ComboboxChip key={a.id}>{a.name}</ComboboxChip>
                                  ))}
                                  <ComboboxTrigger className="ml-auto shrink-0 self-center" />
                                </ComboboxChips>
                                <ComboboxContent
                                  anchor={amenityChipsAnchor}
                                  side="bottom"
                                  align="start"
                                  className="w-[var(--anchor-width)]"
                                >
                                  <ComboboxInput
                                    placeholder="Search amenities..."
                                    showTrigger={false}
                                    className="w-full"
                                  />
                                  <ComboboxList className="max-h-60">
                                    {(a: AmenityOption) => (
                                      <ComboboxItem key={a.id} value={a}>
                                        {a.name}
                                      </ComboboxItem>
                                    )}
                                  </ComboboxList>
                                  <ComboboxEmpty className="text-xs text-gray-500 py-2">
                                    No amenities found
                                  </ComboboxEmpty>
                                </ComboboxContent>
                              </Combobox>
                              {selected.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {selected.length} amenit{selected.length === 1 ? 'y' : 'ies'} selected
                                </p>
                              )}
                            </div>
                          )
                        }}
                      />
                      {errors.amenityIds && <p className="text-sm text-red-600">{errors.amenityIds.message}</p>}
                    </div>
                  ) : showAssignTo && (targetType === 'unit' || isMedicalUnitOnly) ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Block{isMedicalUnitOnly ? ' *' : ''}</Label>
                        <Controller
                          name="blockIds"
                          control={control}
                          render={({ field }) => {
                            const selected = blocks.filter((b) => field.value.includes(b.id))
                            return (
                              <div className="space-y-1.5">
                                <Combobox
                                  multiple
                                  items={blocks}
                                  value={selected}
                                  onValueChange={(vals: BlockOption[]) => {
                                    field.onChange(vals.map((b) => b.id))
                                  }}
                                  itemToStringLabel={(item) => item.block_name}
                                  isItemEqualToValue={(a, b) => a.id === b.id}
                                >
                                  <ComboboxChips ref={blockChipsAnchor} className="w-full min-h-9 rounded-md">
                                    {selected.length === 0 && (
                                      <span className="flex-1 text-sm text-muted-foreground">Select blocks...</span>
                                    )}
                                    {selected.map((b) => (
                                      <ComboboxChip key={b.id}>{b.block_name}</ComboboxChip>
                                    ))}
                                    <ComboboxTrigger className="ml-auto shrink-0 self-center" />
                                  </ComboboxChips>
                                  <ComboboxContent
                                    anchor={blockChipsAnchor}
                                    side="bottom"
                                    align="start"
                                    className="w-[var(--anchor-width)]"
                                  >
                                    <ComboboxInput
                                      placeholder="Search blocks..."
                                      showTrigger={false}
                                      className="w-full"
                                    />
                                    <ComboboxList className="max-h-60">
                                      {(b: BlockOption) => (
                                        <ComboboxItem key={b.id} value={b}>
                                          {b.block_name}
                                        </ComboboxItem>
                                      )}
                                    </ComboboxList>
                                    <ComboboxEmpty className="text-xs text-gray-500 py-2">
                                      No blocks found
                                    </ComboboxEmpty>
                                  </ComboboxContent>
                                </Combobox>
                                {selected.length > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {selected.length} block{selected.length === 1 ? '' : 's'} selected
                                  </p>
                                )}
                              </div>
                            )
                          }}
                        />
                        {errors.blockIds && <p className="text-sm text-red-600">{errors.blockIds.message}</p>}
                      </div>

                      {blockIds.length > 0 && (
                        <div className="space-y-2">
                          <Label>Floor (optional)</Label>
                          <Controller
                            name="floorIds"
                            control={control}
                            render={({ field }) => {
                              const selected = availableFloors.filter((f) => field.value.includes(f.id))
                              return (
                                <div className="space-y-1.5">
                                  <Combobox
                                    multiple
                                    items={availableFloors}
                                    value={selected}
                                    onValueChange={(vals: FloorOption[]) => field.onChange(vals.map((f) => f.id))}
                                    itemToStringLabel={(item) =>
                                      `${item.blockName} · ${floorLabel(item) ?? 'All units'}`
                                    }
                                    isItemEqualToValue={(a, b) => a.id === b.id}
                                  >
                                    <ComboboxChips ref={floorChipsAnchor} className="w-full min-h-9 rounded-md">
                                      {selected.length === 0 && (
                                        <span className="flex-1 text-sm text-muted-foreground">
                                          Entire selected block(s)...
                                        </span>
                                      )}
                                      {selected.map((f) => (
                                        <ComboboxChip key={f.id}>
                                          {f.blockName} · {floorLabel(f) ?? 'All units'}
                                        </ComboboxChip>
                                      ))}
                                      <ComboboxTrigger className="ml-auto shrink-0 self-center" />
                                    </ComboboxChips>
                                    <ComboboxContent
                                      anchor={floorChipsAnchor}
                                      side="bottom"
                                      align="start"
                                      className="w-[var(--anchor-width)]"
                                    >
                                      <ComboboxInput
                                        placeholder="Search floors..."
                                        showTrigger={false}
                                        className="w-full"
                                      />
                                      <ComboboxList className="max-h-60">
                                        {(f: FloorOption) => (
                                          <ComboboxItem key={f.id} value={f}>
                                            {f.blockName} · {floorLabel(f) ?? 'All units'}
                                          </ComboboxItem>
                                        )}
                                      </ComboboxList>
                                      <ComboboxEmpty className="text-xs text-gray-500 py-2">
                                        No floors found
                                      </ComboboxEmpty>
                                    </ComboboxContent>
                                  </Combobox>
                                  {selected.length > 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      {selected.length} floor{selected.length === 1 ? '' : 's'} selected
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-500">
                                      Leave empty to cover the complete selected block(s).
                                    </p>
                                  )}
                                </div>
                              )
                            }}
                          />
                        </div>
                      )}

                      {blockIds.length > 0 && floorIds.length > 0 && (
                        <div className="space-y-2">
                          <Label>Flat (optional)</Label>
                          <Controller
                            name="unitIds"
                            control={control}
                            render={({ field }) => {
                              const selected = availableFlats.filter((u) => field.value.includes(u.id))
                              return (
                                <div className="space-y-1.5">
                                  <Combobox
                                    multiple
                                    items={availableFlats}
                                    value={selected}
                                    onValueChange={(vals: FlatOption[]) => field.onChange(vals.map((u) => u.id))}
                                    itemToStringLabel={(item) => `${item.floorLabel} · ${item.unit_number}`}
                                    isItemEqualToValue={(a, b) => a.id === b.id}
                                  >
                                    <ComboboxChips ref={flatChipsAnchor} className="w-full min-h-9 rounded-md">
                                      {selected.length === 0 && (
                                        <span className="flex-1 text-sm text-muted-foreground">
                                          Entire selected floor(s)...
                                        </span>
                                      )}
                                      {selected.map((u) => (
                                        <ComboboxChip key={u.id}>
                                          {u.floorLabel} · {u.unit_number}
                                        </ComboboxChip>
                                      ))}
                                      <ComboboxTrigger className="ml-auto shrink-0 self-center" />
                                    </ComboboxChips>
                                    <ComboboxContent
                                      anchor={flatChipsAnchor}
                                      side="bottom"
                                      align="start"
                                      className="w-[var(--anchor-width)]"
                                    >
                                      <ComboboxInput
                                        placeholder="Search flats..."
                                        showTrigger={false}
                                        className="w-full"
                                      />
                                      <ComboboxList className="max-h-60">
                                        {(u: FlatOption) => (
                                          <ComboboxItem key={u.id} value={u}>
                                            {u.floorLabel} · {u.unit_number}
                                          </ComboboxItem>
                                        )}
                                      </ComboboxList>
                                      <ComboboxEmpty className="text-xs text-gray-500 py-2">
                                        No flats found
                                      </ComboboxEmpty>
                                    </ComboboxContent>
                                  </Combobox>
                                  {selected.length > 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      {selected.length} flat{selected.length === 1 ? '' : 's'} selected
                                    </p>
                                  ) : (
                                    <p className="text-xs text-gray-500">
                                      Leave empty to cover the complete selected floor(s).
                                    </p>
                                  )}
                                </div>
                              )
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : null}
                </FormSection>
              )}

              <div className="space-y-2">
                <Label>
                  Notes <span className="font-normal text-gray-400">(optional)</span>
                </Label>
                <Textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Anything the team should know about this roster"
                />
                {errors.notes && <p className="text-sm text-red-600">{errors.notes.message}</p>}
              </div>

              {(timeValidationError || overlapValidationError) && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {timeValidationError || overlapValidationError}
                </p>
              )}
            </div>

            <DialogFooter className="sticky bottom-0 flex-col gap-3 border-t border-gray-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">{rosterSummary}</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    pending ||
                    !selectedShiftId ||
                    !departmentId ||
                    (isMedicalDept && !roleCode) ||
                    employeeIds.length === 0 ||
                    !locationTargetValid ||
                    !!timeValidationError ||
                    !!overlapValidationError
                  }
                  className="bg-[#2a517c] hover:bg-[#476587] text-white"
                >
                  {pending ? 'Creating…' : 'Create Roster'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <EmployeeAvailabilityDialog
        open={availabilityOpen}
        onOpenChange={setAvailabilityOpen}
        employees={selectedEmployees}
        days={availableWorkingDays}
        selectedDays={workingDays}
      />
    </>
  )
}

export default AssignShiftDialog
