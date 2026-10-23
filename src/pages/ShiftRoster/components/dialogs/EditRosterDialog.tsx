import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Info, MapPin, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDepartmentsQuery } from '@/hooks/react-query/rbac'
import { useListAreas, useListShifts, useUpdateEmployeeShift } from '@/hooks/react-query/roster'
import { useUsersQuery } from '@/hooks/react-query/user'
import { getPropertyByIdAPI } from '@/lib/services/propertyService'
import type { EmployeeShiftAssignment, ShiftV2, WeekDay } from '@/lib/services/rosterService'
import { useLocationStore } from '@/lib/stores/locationStore'
import { floorLabel } from '@/utils/unitLabel'
import {
  generateShiftSlots,
  generateSlotsByCount,
  getUserDepartmentIds,
  getUserJobCategoryCodes,
  getUserRoleCodes,
  hasWindowStartPassedOnDate,
  isMedicalDepartment,
  isMedicalNoAssignRosterRole,
  isMedicalUnitOnlyRosterRole,
  isSlotWithinShift,
  resolveAssignmentWindow,
  todayYmdLocal,
  WEEK_DAYS,
  weekdaysInDateRange,
} from '../../utils'

const FULL_SHIFT = '__full__'
const NONE = '__none__'

const ymd = (value?: string | null) => (value ? String(value).slice(0, 10) : '')

type TargetType = 'area' | 'unit'

type BlockOption = {
  id: string
  block_name: string
  floors?: Array<{
    id: string
    floor_name?: string | null
    floor_number: number
    is_virtual?: boolean | null
    units?: Array<{ id: string; unit_number: string }>
  }>
}

/** Derive Medical roster role code used by assign/edit location rules. */
const resolveMedicalRosterRoleCode = (roleCodes: string[], jobCategoryCodes: string[]): string => {
  if (roleCodes.some((c) => c === 'NURSE' || c.includes('NURSE'))) return 'NURSE'
  if (roleCodes.some((c) => c === 'DOCTOR' || c.includes('DOCTOR'))) {
    if (jobCategoryCodes.includes('MED_VISITING')) return 'DOCTOR_VISITING'
    if (jobCategoryCodes.includes('MED_INHOUSE')) return 'DOCTOR_INHOUSE'
    return 'DOCTOR'
  }
  return ''
}

interface EditRosterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful save (the caller usually closes its own views). */
  onSaved?: () => void
  assignment: EmployeeShiftAssignment
  employeeName: string
  locationLabel?: string | null
}

/**
 * Edit a roster (shift, slot, dates, working days, location, notes) before it starts.
 * The whole roster is updated; its days are regenerated from the new values.
 */
const EditRosterDialog = ({
  open,
  onOpenChange,
  onSaved,
  assignment,
  employeeName,
  locationLabel,
}: EditRosterDialogProps) => {
  const today = todayYmdLocal()
  const locationId = useLocationStore((s) => s.selectedLocationId)
  const { data: shiftsData } = useListShifts(open)
  const { data: areasData } = useListAreas({ page: 1, limit: 100 }, open)
  const { data: users } = useUsersQuery()
  const { data: departments = [] } = useDepartmentsQuery()
  const update = useUpdateEmployeeShift()

  const shifts: ShiftV2[] = useMemo(() => shiftsData?.data?.shifts || [], [shiftsData])
  const areas = useMemo(() => {
    const raw = areasData?.data as { areas?: Array<{ id: string; areaName: string }> } | undefined
    return raw?.areas || []
  }, [areasData])

  const { data: property } = useQuery({
    queryKey: ['property', locationId],
    queryFn: () => getPropertyByIdAPI(locationId!),
    enabled: open && !!locationId,
  })
  const blocks = useMemo(() => (property?.blocks || []) as BlockOption[], [property])

  const employee = useMemo(
    () => (users || []).find((u) => u.id === assignment.employeeId) || null,
    [users, assignment.employeeId],
  )

  const employeeDept = useMemo(() => {
    if (!employee) return null
    const deptIds = getUserDepartmentIds(employee, locationId)
    return (
      departments.find((d) => deptIds.includes(d.id) && isMedicalDepartment(d)) ||
      departments.find((d) => deptIds.includes(d.id)) ||
      null
    )
  }, [employee, departments, locationId])

  const isMedicalDept = isMedicalDepartment(employeeDept)
  const medicalJobCatalog = useMemo(() => {
    const fromDept = employeeDept?.jobCategories || []
    if (fromDept.length > 0) return fromDept
    return departments.find((d) => isMedicalDepartment(d))?.jobCategories || []
  }, [employeeDept, departments])

  const medicalRoleCode = useMemo(() => {
    if (!employee || !isMedicalDept) return ''
    return resolveMedicalRosterRoleCode(
      getUserRoleCodes(employee),
      getUserJobCategoryCodes(employee, employeeDept?.id, medicalJobCatalog),
    )
  }, [employee, isMedicalDept, employeeDept?.id, medicalJobCatalog])

  const isMedicalUnitOnly = isMedicalDept && isMedicalUnitOnlyRosterRole(medicalRoleCode)
  const isMedicalNoAssign = isMedicalDept && isMedicalNoAssignRosterRole(medicalRoleCode)
  const showLocation = !isMedicalNoAssign

  const initialTargetType: TargetType =
    assignment.areaId || (!assignment.blockId && !assignment.unitId && !assignment.floorId) ? 'area' : 'unit'

  const [shiftId, setShiftId] = useState(assignment.shiftId)
  const [slot, setSlot] = useState(assignment.slotTimeRange || FULL_SHIFT)
  const [startDate, setStartDate] = useState(ymd(assignment.startDate))
  const [endDate, setEndDate] = useState(ymd(assignment.endDate))
  const [workingDays, setWorkingDays] = useState<WeekDay[]>(assignment.workingDays || [])
  const [notes, setNotes] = useState(assignment.notes || '')
  const [targetType, setTargetType] = useState<TargetType>(isMedicalUnitOnly ? 'unit' : initialTargetType)
  const [areaId, setAreaId] = useState(assignment.areaId || '')
  const [blockId, setBlockId] = useState(assignment.blockId || '')
  const [floorId, setFloorId] = useState(assignment.floorId || '')
  const [unitId, setUnitId] = useState(assignment.unitId || '')

  const availableFloors = useMemo(() => {
    const block = blocks.find((b) => b.id === blockId)
    return (block?.floors || []).map((f) => ({
      id: f.id,
      floor_name: f.floor_name,
      floor_number: f.floor_number,
      is_virtual: f.is_virtual,
      units: f.units,
    }))
  }, [blocks, blockId])

  const availableUnits = useMemo(() => {
    if (!floorId) return []
    const floor = availableFloors.find((f) => f.id === floorId)
    return floor?.units || []
  }, [availableFloors, floorId])

  const shift = shifts.find((s) => s.id === shiftId) || null
  const slots = useMemo(() => {
    if (!shift) return [] as Array<{ value: string; label: string }>
    if (shift.numberOfSlots && shift.numberOfSlots > 0) {
      return generateSlotsByCount(shift.startTime, shift.endTime, shift.numberOfSlots)
    }
    const duration = shift.slotDuration && shift.slotDuration > 0 ? shift.slotDuration : 60
    return generateShiftSlots(shift.startTime, shift.endTime, duration)
  }, [shift])

  const daysInRange = useMemo(() => weekdaysInDateRange(startDate, endDate), [startDate, endDate])

  const weekOffDays = useMemo(() => {
    const days = assignment.employee?.profile?.weekOffDays || assignment.employee?.profile?.week_off_days || []
    return new Set((days || []).map((d) => String(d).toLowerCase() as WeekDay))
  }, [assignment.employee])

  const pickedDays = workingDays.filter((d) => daysInRange.includes(d) && !weekOffDays.has(d))

  const selectedSlotRange = slot === FULL_SHIFT ? null : slot
  const effectiveWindow = useMemo(() => {
    if (!shift) return null
    return resolveAssignmentWindow(shift.startTime, shift.endTime, selectedSlotRange)
  }, [shift, selectedSlotRange])

  const locationError = useMemo(() => {
    if (!showLocation) return null
    if (isMedicalUnitOnly || targetType === 'unit') {
      if (!blockId) return 'Select a block for this roster location.'
      return null
    }
    if (!areaId) return 'Select an area for this roster location.'
    return null
  }, [showLocation, isMedicalUnitOnly, targetType, blockId, areaId])

  const error = useMemo(() => {
    if (!startDate || !endDate) return 'Pick both dates.'
    if (startDate < today) return 'The start date cannot be in the past.'
    if (endDate < startDate) return 'The end date must be on or after the start date.'
    if (pickedDays.length === 0) {
      return weekOffDays.size > 0
        ? 'Pick at least one working day within the dates (week-off days are unavailable).'
        : 'Pick at least one working day within the dates.'
    }
    const weekOffHit = workingDays.filter((d) => daysInRange.includes(d) && weekOffDays.has(d))
    if (weekOffHit.length > 0) {
      return `Employee is not available on: ${weekOffHit.map((d) => d.slice(0, 3)).join(', ')}`
    }
    if (shift && selectedSlotRange) {
      if (!isSlotWithinShift(selectedSlotRange, shift.startTime, shift.endTime)) {
        return 'Selected slot must fall within the shift time window'
      }
    }
    const effectiveStart = effectiveWindow?.start || shift?.startTime
    if (effectiveStart && hasWindowStartPassedOnDate(startDate, effectiveStart)) {
      return selectedSlotRange
        ? 'Selected slot start time has already passed for the start date'
        : 'Selected shift start time has already passed for the start date'
    }
    if (locationError) return locationError
    return null
  }, [
    startDate,
    endDate,
    today,
    pickedDays.length,
    weekOffDays,
    workingDays,
    daysInRange,
    shift,
    selectedSlotRange,
    effectiveWindow,
    locationError,
  ])

  const toggleDay = (day: WeekDay) => {
    if (weekOffDays.has(day)) return
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const changeShift = (id: string) => {
    setShiftId(id)
    setSlot(FULL_SHIFT)
  }

  const chooseTargetType = (next: TargetType) => {
    if (isMedicalUnitOnly && next === 'area') return
    if (next === targetType) return
    setTargetType(next)
    if (next === 'area') {
      setBlockId('')
      setFloorId('')
      setUnitId('')
    } else {
      setAreaId('')
    }
  }

  const changeBlock = (id: string) => {
    setBlockId(id === NONE ? '' : id)
    setFloorId('')
    setUnitId('')
  }

  const changeFloor = (id: string) => {
    setFloorId(id === NONE ? '' : id)
    setUnitId('')
  }

  const save = async () => {
    if (error) return

    let locationPayload: {
      areaId: string | null
      unitId: string | null
      blockId: string | null
      floorId: string | null
    }

    if (!showLocation) {
      locationPayload = { areaId: null, unitId: null, blockId: null, floorId: null }
    } else if (isMedicalUnitOnly || targetType === 'unit') {
      locationPayload = {
        areaId: null,
        blockId: blockId || null,
        floorId: floorId || null,
        unitId: unitId || null,
      }
    } else {
      locationPayload = {
        areaId: areaId || null,
        unitId: null,
        blockId: null,
        floorId: null,
      }
    }

    try {
      await update.mutateAsync({
        id: assignment.id,
        data: {
          shiftId,
          startDate,
          endDate,
          workingDays: pickedDays,
          slotTimeRange: slot === FULL_SHIFT ? null : slot,
          notes: notes.trim() || null,
          ...locationPayload,
        },
      })
      onOpenChange(false)
      onSaved?.()
    } catch {
      // toast handled by the mutation
    }
  }

  const effectiveTargetType: TargetType = isMedicalUnitOnly ? 'unit' : targetType

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-[#2a517c]" />
            Edit roster
          </DialogTitle>
          <p className="text-xs text-gray-500">
            {employeeName}
            {locationLabel ? ` · ${locationLabel}` : ''}
          </p>
        </DialogHeader>

        <p className="flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          Changes apply to every day of this roster. It can be edited until its start date.
        </p>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={shiftId} onValueChange={changeShift}>
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
            </div>
            <div className="space-y-2">
              <Label>Time slot</Label>
              <Select value={slot} onValueChange={setSlot} disabled={!shift}>
                <SelectTrigger>
                  <SelectValue placeholder="Full shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FULL_SHIFT}>
                    Full shift{shift ? ` (${shift.startTime} – ${shift.endTime})` : ''}
                  </SelectItem>
                  {slots.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => {
                  const next = e.target.value
                  setStartDate(next)
                  if (endDate && next && endDate < next) setEndDate(next)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Working days</Label>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK_DAYS.map((day) => {
                const outOfRange = !daysInRange.includes(day)
                const isWeekOff = weekOffDays.has(day)
                const disabled = outOfRange || isWeekOff
                const checked = workingDays.includes(day) && !disabled
                return (
                  <Button
                    key={day}
                    type="button"
                    variant="ghost"
                    disabled={disabled}
                    aria-pressed={checked}
                    onClick={() => toggleDay(day)}
                    title={outOfRange ? 'Not within the selected dates' : isWeekOff ? 'Employee week off' : undefined}
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
            {weekOffDays.size > 0 && (
              <p className="text-xs text-gray-500">Greyed-out days outside the dates or marked as week off.</p>
            )}
          </div>

          {showLocation && (
            <div className="space-y-3 rounded-xl border border-gray-200 p-3">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2a517c]" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Location</p>
                  <p className="text-xs text-gray-500">Common area, or a block / floor / flat.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assign to *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: 'area' as const, label: 'Common area', hint: 'e.g. lobby, gate, kitchen' },
                      { value: 'unit' as const, label: 'Flats & units', hint: 'Blocks, floors or flats' },
                    ] as const
                  ).map((o) => {
                    const disabled = isMedicalUnitOnly && o.value === 'area'
                    const active = effectiveTargetType === o.value
                    return (
                      <button
                        key={o.value}
                        type="button"
                        disabled={disabled}
                        aria-pressed={active}
                        onClick={() => chooseTargetType(o.value)}
                        className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                          disabled
                            ? 'cursor-not-allowed border-dashed border-gray-200 opacity-50'
                            : active
                              ? 'cursor-pointer border-[#2a517c] bg-[#2a517c]/5 ring-1 ring-[#2a517c]'
                              : 'cursor-pointer border-gray-200 hover:border-[#2a517c]/40'
                        }`}
                      >
                        <p className={`text-sm font-semibold ${active ? 'text-[#2a517c]' : 'text-gray-800'}`}>
                          {o.label}
                        </p>
                        <p className="text-[11px] text-gray-500">{o.hint}</p>
                      </button>
                    )
                  })}
                </div>
                {isMedicalUnitOnly && (
                  <p className="text-xs text-gray-500">For Nurse and In-house Doctor, assignment must be to a Unit.</p>
                )}
              </div>

              {effectiveTargetType === 'area' ? (
                <div className="space-y-2">
                  <Label>Area *</Label>
                  <Select value={areaId || NONE} onValueChange={(v) => setAreaId(v === NONE || !v ? '' : String(v))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Select area…</SelectItem>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.areaName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Block *</Label>
                    <Select value={blockId || NONE} onValueChange={changeBlock}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select block" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Select block…</SelectItem>
                        {blocks.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.block_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {blockId && (
                    <div className="space-y-2">
                      <Label>Floor (optional)</Label>
                      <Select value={floorId || NONE} onValueChange={changeFloor}>
                        <SelectTrigger>
                          <SelectValue placeholder="Entire block" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Entire block</SelectItem>
                          {availableFloors.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {floorLabel(f) ?? 'All units'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {blockId && floorId && (
                    <div className="space-y-2">
                      <Label>Flat (optional)</Label>
                      <Select
                        value={unitId || NONE}
                        onValueChange={(v) => setUnitId(v === NONE || !v ? '' : String(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Entire floor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Entire floor</SelectItem>
                          {availableUnits.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.unit_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={!!error || update.isPending}
            className="bg-[#2a517c] hover:bg-[#476587] text-white"
          >
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditRosterDialog
