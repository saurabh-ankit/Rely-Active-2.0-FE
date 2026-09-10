import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() */
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftRight, Coffee, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useUsersQuery } from '@/hooks/react-query/user'
import type {
  EmployeeShiftAssignment,
  LeaveType,
  ShiftEmployeeDate,
  ShiftEmployeeDateStatus,
  WeekDay,
} from '@/lib/services/rosterService'
import { useLocationStore } from '@/lib/stores/locationStore'
import type { UserItem } from '@/lib/types'
import {
  coverFormDefaultValues,
  coverFormSchema,
  dayOffFormDefaultValues,
  dayOffFormSchema,
  swapFormDefaultValues,
  swapFormSchema,
  type CoverFormValues,
  type DayOffFormValues,
  type SwapFormValues,
} from '@/utils/roster.utils'
import { RosterPermission } from '../RosterPermission'
import {
  getUserDisplayName,
  getUserRoleCodes,
  isEmployeeAvailableForDateSlot,
  isSameRoleGroup,
  LEAVE_TYPES,
  resolveAssignmentWindow,
  usersShareDepartment,
} from '../../utils'
import {
  useCoverShiftDate,
  useCreateShiftEmployeeDate,
  useListShiftEmployeeDates,
  useMarkDayOff,
  useSwapShiftDates,
  useUnmarkDayOff,
} from '@/hooks/react-query/roster'

export interface RosterCalendarEvent {
  id: string
  assignmentId: string
  shiftEmployeeDateId?: string
  date: string
  employeeId?: string
  employeeName: string
  role: string
  /** Department name for the displayed employee (preferred over role on cards). */
  departmentName?: string | null
  shiftName: string
  shiftTime: string
  slotTimeRange?: string | null
  status: ShiftEmployeeDateStatus | string
  startDate: string
  endDate: string
  workingDays?: WeekDay[] | null
  notes?: string | null
  leaveType?: LeaveType | null
  leaveNote?: string | null
  areaName?: string | null
  locationLabel?: string | null
  assignment?: EmployeeShiftAssignment | null
  /** True when this card is shown on the covering employee's roster list. */
  isCoverDuty?: boolean
  coveredByEmployeeId?: string | null
  originalEmployeeName?: string | null
}

const statusColor: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800',
  on_duty: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  absent: 'bg-red-100 text-red-800',
  covered: 'bg-amber-100 text-amber-800',
  day_off: 'bg-purple-100 text-purple-800',
}

const formatWorkingDays = (days?: WeekDay[] | null) => {
  if (!days?.length) return 'All days'
  return days.map((d) => d.slice(0, 3).toUpperCase()).join(', ')
}

const formatStatus = (status: string) =>
  status
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')

interface RosterDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: RosterCalendarEvent | null
  /** Open directly into an action dialog when the parent card triggers Swap/Cover/Day Off. */
  initialAction?: 'swap' | 'cover' | 'day_off' | null
}

type ActionMode = 'swap' | 'cover' | 'day_off' | null

const DetailRow = ({ label, value }: { label: string; value: ReactNode }) => {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium break-words">{value}</span>
    </div>
  )
}

const RosterDetailDialog = ({ open, onOpenChange, event, initialAction = null }: RosterDetailDialogProps) => {
  const locationId = useLocationStore((s) => s.selectedLocationId)
  const { data: users } = useUsersQuery()
  const { data: datesData } = useListShiftEmployeeDates(undefined, open)

  const markDayOff = useMarkDayOff()
  const unmarkDayOff = useUnmarkDayOff()
  const coverShift = useCoverShiftDate()
  const swapShifts = useSwapShiftDates()
  const createDate = useCreateShiftEmployeeDate()

  const [actionMode, setActionMode] = useState<ActionMode>(initialAction ?? null)
  /** True when Swap/Cover/Day Off was opened directly from a roster card (not from details). */
  const openedViaInitialAction = useRef(false)

  const dayOffForm = useForm<DayOffFormValues>({
    resolver: zodResolver(dayOffFormSchema),
    defaultValues: dayOffFormDefaultValues,
    mode: 'onChange',
  })
  const coverForm = useForm<CoverFormValues>({
    resolver: zodResolver(coverFormSchema),
    defaultValues: coverFormDefaultValues,
    mode: 'onChange',
  })
  const swapForm = useForm<SwapFormValues>({
    resolver: zodResolver(swapFormSchema),
    defaultValues: swapFormDefaultValues,
    mode: 'onChange',
  })

  const { reset: resetDayOff } = dayOffForm
  const { reset: resetCover } = coverForm
  const { reset: resetSwap } = swapForm

  const coveredByEmployeeId = coverForm.watch('coveredByEmployeeId')
  const targetDateId = swapForm.watch('targetDateId')

  useEffect(() => {
    if (open) {
      setActionMode(initialAction ?? null)
      openedViaInitialAction.current = !!initialAction
      resetDayOff(dayOffFormDefaultValues)
      resetCover(coverFormDefaultValues)
      resetSwap(swapFormDefaultValues)
    } else {
      setActionMode(null)
      openedViaInitialAction.current = false
    }
  }, [open, initialAction, event?.id, resetDayOff, resetCover, resetSwap])

  useEffect(() => {
    if (actionMode === 'day_off') resetDayOff(dayOffFormDefaultValues)
    if (actionMode === 'cover') resetCover(coverFormDefaultValues)
    if (actionMode === 'swap') resetSwap(swapFormDefaultValues)
  }, [actionMode, resetDayOff, resetCover, resetSwap])

  const allDates = useMemo(
    () => (Array.isArray(datesData?.data) ? datesData.data : []) as ShiftEmployeeDate[],
    [datesData],
  )

  const sourceUser = useMemo(
    () => (users || []).find((u) => u.id === event?.employeeId) || null,
    [users, event?.employeeId],
  )

  const eventWindow = useMemo(() => {
    if (!event) return null
    const fromShiftTime = event.shiftTime.split(/\s*-\s*/)
    return resolveAssignmentWindow(
      event.assignment?.shift?.startTime || fromShiftTime[0]?.trim(),
      event.assignment?.shift?.endTime || fromShiftTime[1]?.trim(),
      event.slotTimeRange,
    )
  }, [event])

  const busyCheckDates = useMemo(() => {
    return allDates.map((d) => ({
      id: d.id,
      date: d.date,
      status: d.status,
      isDeleted: d.isDeleted,
      coveredByEmployeeId: d.coveredByEmployeeId,
      shiftAssignment: {
        employeeId: d.shiftAssignment?.employeeId,
        slotTimeRange: d.shiftAssignment?.slotTimeRange,
        shift: d.shiftAssignment?.shift,
      },
    }))
  }, [allDates])

  const departmentPeers = useMemo(() => {
    if (!event?.employeeId || !sourceUser) return [] as UserItem[]
    return (users || []).filter((u) => {
      if (u.id === event.employeeId) return false
      if (u.isActive === false || u.status === 'INACTIVE') return false
      if (!usersShareDepartment(sourceUser, u, locationId)) return false
      const sourceRole = getUserRoleCodes(sourceUser)[0]
      const peerRole = getUserRoleCodes(u)[0]
      return isSameRoleGroup(sourceRole, peerRole)
    })
  }, [users, event?.employeeId, sourceUser, locationId])

  const availableCoverEmployees = useMemo(() => {
    if (!event || !eventWindow) return [] as UserItem[]
    const exclude = event.shiftEmployeeDateId ? [event.shiftEmployeeDateId] : []
    return departmentPeers.filter((u) =>
      isEmployeeAvailableForDateSlot(u.id, event.date, eventWindow, busyCheckDates, exclude),
    )
  }, [departmentPeers, event, eventWindow, busyCheckDates])

  const swapTargets = useMemo(() => {
    if (!event?.employeeId || !eventWindow) return [] as ShiftEmployeeDate[]
    const peerIds = new Set(departmentPeers.map((u) => u.id))
    return allDates.filter((d) => {
      if (d.isDeleted) return false
      if (d.status === 'day_off' || d.status === 'completed') return false
      const empId = d.shiftAssignment?.employeeId
      if (!empId || empId === event.employeeId) return false
      if (!peerIds.has(empId)) return false
      if (d.id === event.shiftEmployeeDateId) return false

      const targetWindow = resolveAssignmentWindow(
        d.shiftAssignment?.shift?.startTime,
        d.shiftAssignment?.shift?.endTime,
        d.shiftAssignment?.slotTimeRange,
      )
      if (!targetWindow) return false

      const excludeIds = [d.id, event.shiftEmployeeDateId].filter(Boolean) as string[]

      // Target employee must be free for this roster's day/slot
      if (!isEmployeeAvailableForDateSlot(empId, event.date, eventWindow, busyCheckDates, excludeIds)) {
        return false
      }

      // Source employee must be free for the target day/slot
      if (!isEmployeeAvailableForDateSlot(event.employeeId!, d.date, targetWindow, busyCheckDates, excludeIds)) {
        return false
      }

      return true
    })
  }, [allDates, departmentPeers, event, eventWindow, busyCheckDates])

  const resetActionState = () => {
    setActionMode(null)
    resetDayOff(dayOffFormDefaultValues)
    resetCover(coverFormDefaultValues)
    resetSwap(swapFormDefaultValues)
  }

  const ensureDateId = async (): Promise<string | null> => {
    if (!event) return null
    if (event.shiftEmployeeDateId) return event.shiftEmployeeDateId
    const created = await createDate.mutateAsync({
      employeeShiftAssignmentId: event.assignmentId,
      date: event.date,
      status: 'upcoming',
    })
    const id = (created?.data as ShiftEmployeeDate | undefined)?.id
    return id || null
  }

  const actionsDisabled =
    !event ||
    event.status === 'completed' ||
    markDayOff.isPending ||
    unmarkDayOff.isPending ||
    coverShift.isPending ||
    swapShifts.isPending ||
    createDate.isPending

  if (!event) return null

  const closeAll = () => {
    resetActionState()
    openedViaInitialAction.current = false
    onOpenChange(false)
  }

  /** Closing an action opened from a card should not fall back to Roster Details. */
  const dismissAction = () => {
    if (openedViaInitialAction.current) closeAll()
    else resetActionState()
  }

  return (
    <>
      <Dialog
        open={open && !actionMode}
        onOpenChange={(next) => {
          if (!next) closeAll()
          else onOpenChange(next)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Roster Details</DialogTitle>
          </DialogHeader>

          <div className="rounded-md overflow-hidden border border-gray-200">
            <div className="bg-[#2a517c] px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white truncate uppercase tracking-wide">{event.shiftName}</span>
              <span className="text-[11px] text-white/90 font-semibold shrink-0">
                {event.slotTimeRange || event.shiftTime}
              </span>
            </div>
            <div className="bg-gray-50 px-3 py-2.5 flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-[#1e3a5a]">{event.employeeName}</div>
                {event.departmentName && (
                  <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mt-0.5">
                    {event.departmentName}
                  </div>
                )}
              </div>
              <Badge variant="secondary" className={statusColor[event.status] || 'bg-gray-100 text-gray-700'}>
                {formatStatus(event.status)}
              </Badge>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <DetailRow label="Date" value={event.date} />
            <DetailRow label="Period" value={`${event.startDate} → ${event.endDate}`} />
            <DetailRow label="Working days" value={formatWorkingDays(event.workingDays)} />
            <DetailRow label="Area" value={event.areaName} />
            <DetailRow label="Location" value={event.locationLabel} />
            <DetailRow label="Slot" value={event.slotTimeRange} />
            <DetailRow label="Notes" value={event.notes} />
            {event.status === 'day_off' && (
              <>
                <DetailRow
                  label="Leave type"
                  value={LEAVE_TYPES.find((t) => t.value === event.leaveType)?.label || event.leaveType}
                />
                <DetailRow label="Reason" value={event.leaveNote} />
              </>
            )}
          </div>

          {!(event.status === 'covered' && !event.isCoverDuty) && (
            <RosterPermission action="update">
              <div className="grid grid-cols-2 gap-2 pt-2">
                {event.status === 'day_off' ? (
                  <Button
                    variant="outline"
                    className="col-span-2"
                    disabled={actionsDisabled}
                    onClick={async () => {
                      const dateId = await ensureDateId()
                      if (!dateId) return
                      await unmarkDayOff.mutateAsync(dateId)
                      closeAll()
                    }}
                  >
                    Restore day off
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" disabled={actionsDisabled} onClick={() => setActionMode('swap')}>
                      <ArrowLeftRight className="h-4 w-4 mr-1.5" />
                      Swap
                    </Button>
                    <Button variant="outline" disabled={actionsDisabled} onClick={() => setActionMode('cover')}>
                      <UserCheck className="h-4 w-4 mr-1.5" />
                      Cover
                    </Button>
                    <Button
                      variant="outline"
                      className="col-span-2 border-[#2a517c]/40 text-[#2a517c]"
                      disabled={actionsDisabled}
                      onClick={() => setActionMode('day_off')}
                    >
                      <Coffee className="h-4 w-4 mr-1.5" />
                      Day Off
                    </Button>
                  </>
                )}
              </div>
            </RosterPermission>
          )}
        </DialogContent>
      </Dialog>

      {/* Day Off */}
      <Dialog
        open={actionMode === 'day_off'}
        onOpenChange={(next) => {
          if (!next) dismissAction()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coffee className="h-4 w-4 text-[#2a517c]" />
              Mark Day Off
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={dayOffForm.handleSubmit(async (values) => {
              const dateId = await ensureDateId()
              if (!dateId) return
              await markDayOff.mutateAsync({
                dateId,
                data: { leaveType: values.leaveType, leaveNote: values.leaveNote?.trim() || null },
              })
              closeAll()
            })}
            noValidate
          >
            <div className="rounded-md border border-[#2a517c]/25 bg-[#2a517c]/5 px-3 py-2 text-sm">
              <p className="font-semibold text-[#2a517c]">Marking day off for:</p>
              <p className="text-[#2a517c]/90">
                {event.employeeName} — {event.shiftName}
              </p>
            </div>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Controller
                  name="leaveType"
                  control={dayOffForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAVE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {dayOffForm.formState.errors.leaveType && (
                  <p className="text-sm text-red-600">{dayOffForm.formState.errors.leaveType.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Reason / Note (optional)</Label>
                <Textarea
                  {...dayOffForm.register('leaveNote')}
                  placeholder="e.g. Annual leave approved by manager"
                  rows={3}
                />
                {dayOffForm.formState.errors.leaveNote && (
                  <p className="text-sm text-red-600">{dayOffForm.formState.errors.leaveNote.message}</p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={dismissAction}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2a517c] hover:bg-[#476587] text-white"
                disabled={markDayOff.isPending || createDate.isPending}
              >
                Mark as Day Off
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cover */}
      <Dialog
        open={actionMode === 'cover'}
        onOpenChange={(next) => {
          if (!next) dismissAction()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[#2a517c]" />
              Cover Shift
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={coverForm.handleSubmit(async (values) => {
              const dateId = await ensureDateId()
              if (!dateId) return
              await coverShift.mutateAsync({
                dateId,
                data: {
                  coveredByEmployeeId: values.coveredByEmployeeId,
                  notes: values.notes?.trim() || null,
                },
              })
              closeAll()
            })}
            noValidate
          >
            <div className="rounded-md border border-[#2a517c]/25 bg-[#2a517c]/5 px-3 py-2 text-sm">
              <p className="font-semibold text-[#2a517c]">Covering shift of:</p>
              <p className="text-[#2a517c]/90">
                {event.employeeName} — {event.shiftName} ({event.slotTimeRange || event.shiftTime})
              </p>
            </div>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Cover with (available for this day & slot)</Label>
                <Controller
                  name="coveredByEmployeeId"
                  control={coverForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select available employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCoverEmployees.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {getUserDisplayName(u)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {coverForm.formState.errors.coveredByEmployeeId && (
                  <p className="text-sm text-red-600">{coverForm.formState.errors.coveredByEmployeeId.message}</p>
                )}
                {availableCoverEmployees.length === 0 && (
                  <p className="text-xs text-gray-500">
                    No available employees in the same department for this day and time slot.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Textarea {...coverForm.register('notes')} placeholder="Optional note" rows={2} />
                {coverForm.formState.errors.notes && (
                  <p className="text-sm text-red-600">{coverForm.formState.errors.notes.message}</p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={dismissAction}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2a517c] hover:bg-[#476587] text-white"
                disabled={!coveredByEmployeeId || coverShift.isPending || createDate.isPending}
              >
                Assign Cover
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Swap */}
      <Dialog
        open={actionMode === 'swap'}
        onOpenChange={(next) => {
          if (!next) dismissAction()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-[#2a517c]" />
              Swap Shifts
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={swapForm.handleSubmit(async (values) => {
              const dateId = await ensureDateId()
              if (!dateId) return
              await swapShifts.mutateAsync({
                dateId,
                data: {
                  targetDateId: values.targetDateId,
                  notes: values.notes?.trim() || null,
                },
              })
              closeAll()
            })}
            noValidate
          >
            <div className="rounded-md border border-[#2a517c]/25 bg-[#2a517c]/5 px-3 py-2 text-sm">
              <p className="font-semibold text-[#2a517c]">Swapping shift of:</p>
              <p className="text-[#2a517c]/90">
                {event.employeeName} — {event.shiftName} ({event.slotTimeRange || event.shiftTime})
              </p>
            </div>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Swap with (available employee shift)</Label>
                <Controller
                  name="targetDateId"
                  control={swapForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select available employee shift..." />
                      </SelectTrigger>
                      <SelectContent>
                        {swapTargets.map((d) => {
                          const name =
                            `${d.shiftAssignment?.employee?.profile?.firstName || ''} ${d.shiftAssignment?.employee?.profile?.lastName || ''}`.trim()
                          const shiftName = d.shiftAssignment?.shift?.name || 'Shift'
                          const time = d.shiftAssignment?.shift
                            ? `${d.shiftAssignment.shift.startTime} - ${d.shiftAssignment.shift.endTime}`
                            : ''
                          return (
                            <SelectItem key={d.id} value={d.id}>
                              {name || 'Employee'} · {d.date} · {shiftName}
                              {time ? ` (${time})` : ''}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                {swapForm.formState.errors.targetDateId && (
                  <p className="text-sm text-red-600">{swapForm.formState.errors.targetDateId.message}</p>
                )}
                {swapTargets.length === 0 && (
                  <p className="text-xs text-gray-500">No available swap targets for this day and time slot.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Textarea {...swapForm.register('notes')} placeholder="Optional note" rows={2} />
                {swapForm.formState.errors.notes && (
                  <p className="text-sm text-red-600">{swapForm.formState.errors.notes.message}</p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={dismissAction}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2a517c] hover:bg-[#476587] text-white"
                disabled={!targetDateId || swapShifts.isPending || createDate.isPending}
              >
                Confirm Swap
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default RosterDetailDialog
