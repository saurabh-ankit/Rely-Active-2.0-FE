import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() */
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { assignShiftFormDefaultValues, assignShiftFormSchema, type AssignShiftFormValues } from '@/utils/roster.utils'
import {
  doTimeWindowsOverlap,
  generateShiftSlots,
  generateSlotsByCount,
  getUserDisplayName,
  getUserRoleLabel,
  hasWindowStartPassedOnDate,
  isSlotWithinShift,
  parseLocalYmd,
  resolveAssignmentWindow,
  todayYmdLocal,
  WEEK_DAYS,
  weekdaysInDateRange,
} from '../../utils'
import {
  useBulkCreateEmployeeShifts,
  useListEmployeeShifts,
  useListAreas,
  useListShifts,
} from '@/hooks/react-query/roster'

interface AssignShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift?: ShiftV2 | null
}

const FULL_SHIFT_VALUE = '__full__'
const ENTIRE_BLOCK = '__entire_block__'
const ENTIRE_FLOOR = '__entire_floor__'

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

  const today = todayYmdLocal()

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AssignShiftFormValues>({
    resolver: zodResolver(assignShiftFormSchema),
    defaultValues: assignShiftFormDefaultValues,
    mode: 'onChange',
  })

  const departmentId = watch('departmentId')
  const employeeIds = watch('employeeIds')
  const shiftId = watch('shiftId')
  const slotValue = watch('slotValue')
  const startDate = watch('startDate')
  const endDate = watch('endDate')
  const targetType = watch('targetType')
  const areaId = watch('areaId')
  const blockId = watch('blockId')
  const floorSelection = watch('floorSelection')
  const flatSelection = watch('flatSelection')
  const workingDays = watch('workingDays')

  const blocks = useMemo(
    () =>
      (property?.blocks || []) as Array<{
        id: string
        block_name: string
        floors?: Array<{
          id: string
          floor_name?: string | null
          floor_number: number
          units?: Array<{ id: string; unit_number: string }>
        }>
      }>,
    [property],
  )
  const selectedBlock = blocks.find((b) => b.id === blockId)
  const floors = selectedBlock?.floors || []
  const selectedFloor =
    floorSelection && floorSelection !== ENTIRE_BLOCK ? floors.find((f) => f.id === floorSelection) : undefined
  const flats = selectedFloor?.units || []

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
    return list.filter((user) => {
      if (user.isActive === false || user.status === 'INACTIVE') return false
      return (user.userLocations || []).some((ul) => {
        const deptId = ul.departmentId || (ul as { department_id?: string }).department_id
        return deptId === departmentId
      })
    })
  }, [users, departmentId])

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
    setValue('employeeIds', [], { shouldValidate: true })
  }, [departmentId, setValue])

  useEffect(() => {
    setValue('slotValue', FULL_SHIFT_VALUE, { shouldValidate: true })
  }, [selectedShiftId, setValue])

  useEffect(() => {
    if (endDate && startDate && endDate < startDate) {
      setValue('endDate', startDate, { shouldValidate: true })
      return
    }
    if (!startDate || !endDate) return
    setValue('workingDays', weekdaysInDateRange(startDate, endDate), { shouldValidate: true })
  }, [startDate, endDate, setValue])

  const toggleDay = (day: WeekDay) => {
    if (!availableWorkingDays.includes(day)) return
    const next = workingDays.includes(day) ? workingDays.filter((d) => d !== day) : [...workingDays, day]
    setValue('workingDays', next, { shouldValidate: true })
  }

  const resolvedUnitId = flatSelection && flatSelection !== ENTIRE_FLOOR ? flatSelection : null

  const locationTargetValid =
    targetType === 'area'
      ? !!areaId
      : !!blockId &&
        !!floorSelection &&
        (floorSelection === ENTIRE_BLOCK || (!!flatSelection && (flatSelection === ENTIRE_FLOOR || !!resolvedUnitId)))

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
  }, [selectedShift, startDate, endDate, selectedSlotRange, today, workingDays, effectiveWindow])

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
    const floorId = values.floorSelection && values.floorSelection !== ENTIRE_BLOCK ? values.floorSelection : null
    const unitId = values.flatSelection && values.flatSelection !== ENTIRE_FLOOR ? values.flatSelection : null

    try {
      await createBulk.mutateAsync({
        employeeIds: values.employeeIds,
        shiftId: effectiveShiftId,
        startDate: values.startDate,
        endDate: values.endDate,
        notes: values.notes?.trim() || null,
        workingDays: values.workingDays,
        areaId: values.targetType === 'area' ? values.areaId || null : null,
        blockId: values.targetType === 'unit' ? values.blockId || null : null,
        floorId: values.targetType === 'unit' ? floorId : null,
        unitId: values.targetType === 'unit' ? unitId : null,
        slotTimeRange: slotRange,
      })
      onOpenChange(false)
    } catch {
      // toast handled by mutation
    }
  }

  const pending = createBulk.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Roster</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label>Department</Label>
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

          <div className="space-y-2">
            <Label>Employees</Label>
            <Controller
              name="employeeIds"
              control={control}
              render={({ field }) => {
                const selected = employeesInDepartment.filter((emp) => field.value.includes(emp.id))
                return (
                  <div className="space-y-1.5">
                    <Combobox
                      multiple
                      items={employeesInDepartment}
                      value={selected}
                      onValueChange={(vals: UserItem[]) => field.onChange(vals.map((emp) => emp.id))}
                      itemToStringLabel={(item) => getUserDisplayName(item)}
                      isItemEqualToValue={(a, b) => a.id === b.id}
                      disabled={!departmentId}
                    >
                      <ComboboxChips ref={employeeChipsAnchor} className="w-full min-h-9 rounded-md">
                        {selected.length === 0 && (
                          <span className="flex-1 text-sm text-muted-foreground">
                            {departmentId ? 'Select employees...' : 'Select a department first'}
                          </span>
                        )}
                        {selected.map((emp) => (
                          <ComboboxChip key={emp.id}>{getUserDisplayName(emp)}</ComboboxChip>
                        ))}
                        <ComboboxTrigger className="ml-auto shrink-0 self-center" disabled={!departmentId} />
                      </ComboboxChips>
                      <ComboboxContent
                        anchor={employeeChipsAnchor}
                        side="bottom"
                        align="start"
                        className="w-[var(--anchor-width)]"
                      >
                        <ComboboxInput
                          placeholder={departmentId ? 'Search employees...' : 'Select a department first'}
                          disabled={!departmentId}
                          showTrigger={false}
                          className="w-full"
                        />
                        <ComboboxList className="max-h-60">
                          {(emp: UserItem) => {
                            const roleLabel = getUserRoleLabel(emp)
                            return (
                              <ComboboxItem key={emp.id} value={emp} className="py-2">
                                <div className="flex flex-col gap-0.5 min-w-0 pr-6">
                                  <span className="font-semibold text-sm text-gray-900">{getUserDisplayName(emp)}</span>
                                  {roleLabel ? <span className="text-xs text-[#5b8ab8]">{roleLabel}</span> : null}
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
            {departmentId && employeesInDepartment.length === 0 && (
              <p className="text-xs text-gray-500">No employees found in this department.</p>
            )}
          </div>

          {!shift && (
            <div className="space-y-2">
              <Label>Shift</Label>
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
            <p className="text-sm text-gray-600">
              Shift: <span className="font-medium text-gray-900">{shift.name}</span>
            </p>
          )}

          <div className="space-y-2">
            <Label>Slot (optional)</Label>
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
            <p className="text-xs text-gray-500">
              Leave as full shift to assign the complete shift window. Pick a slot to assign only that time range.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date</Label>
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
              <Label>End date</Label>
              <Input type="date" min={startDate || today} {...register('endDate')} />
              {errors.endDate && <p className="text-sm text-red-600">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign to</Label>
            <Controller
              name="targetType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v as 'area' | 'unit')
                    setValue('areaId', '', { shouldValidate: true })
                    setValue('blockId', '', { shouldValidate: true })
                    setValue('floorSelection', '', { shouldValidate: true })
                    setValue('flatSelection', '', { shouldValidate: true })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="unit">Unit</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {targetType === 'area' ? (
            <div className="space-y-2">
              <Label>Area</Label>
              <Controller
                name="areaId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.areaName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.areaId && <p className="text-sm text-red-600">{errors.areaId.message}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Block</Label>
                <Controller
                  name="blockId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={(v) => {
                        field.onChange(v)
                        setValue('floorSelection', '', { shouldValidate: true })
                        setValue('flatSelection', '', { shouldValidate: true })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select block" />
                      </SelectTrigger>
                      <SelectContent>
                        {blocks.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.block_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.blockId && <p className="text-sm text-red-600">{errors.blockId.message}</p>}
              </div>

              {blockId && (
                <div className="space-y-2">
                  <Label>Floor</Label>
                  <Controller
                    name="floorSelection"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || ''}
                        onValueChange={(v) => {
                          field.onChange(v)
                          setValue('flatSelection', '', { shouldValidate: true })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select floor or entire block" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ENTIRE_BLOCK}>Entire block</SelectItem>
                          {floors.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.floor_name || `Floor ${f.floor_number}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              {blockId && floorSelection && floorSelection !== ENTIRE_BLOCK && (
                <div className="space-y-2">
                  <Label>Flat</Label>
                  <Controller
                    name="flatSelection"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select flat or entire floor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ENTIRE_FLOOR}>Entire floor</SelectItem>
                          {flats.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.unit_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              {floorSelection === ENTIRE_BLOCK && (
                <p className="text-xs text-gray-500">Roster will cover the complete selected block.</p>
              )}
              {flatSelection === ENTIRE_FLOOR && (
                <p className="text-xs text-gray-500">Roster will cover the complete selected floor.</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Working days</Label>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((day) => {
                const inRange = availableWorkingDays.includes(day)
                return (
                  <label
                    key={day}
                    className={`flex items-center gap-1.5 text-xs capitalize border rounded px-2 py-1 ${
                      inRange ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <Checkbox
                      checked={workingDays.includes(day)}
                      disabled={!inRange}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    {day.slice(0, 3)}
                  </label>
                )
              })}
            </div>
            {errors.workingDays && <p className="text-sm text-red-600">{errors.workingDays.message}</p>}
            <p className="text-xs text-gray-500">
              Days are based on the selected date range. You can uncheck days that should be skipped.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...register('notes')} rows={2} />
            {errors.notes && <p className="text-sm text-red-600">{errors.notes.message}</p>}
          </div>

          {(timeValidationError || overlapValidationError) && (
            <p className="text-sm text-red-600">{timeValidationError || overlapValidationError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                pending ||
                !selectedShiftId ||
                !departmentId ||
                employeeIds.length === 0 ||
                !locationTargetValid ||
                !!timeValidationError ||
                !!overlapValidationError
              }
              className="bg-[#2a517c] hover:bg-[#476587] text-white"
            >
              {pending ? 'Creating…' : 'Create Roster'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AssignShiftDialog
