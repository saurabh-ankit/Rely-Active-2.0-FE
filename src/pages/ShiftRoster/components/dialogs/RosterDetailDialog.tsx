import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() */
import { zodResolver } from '@hookform/resolvers/zod'
import { format, isValid, parseISO } from 'date-fns'
import { ArrowLeftRight, Coffee, Lock, MapPin, Pencil, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SaveButton } from '@/components/common/SaveButton'
import { useSavedFlash } from '@/hooks/useSavedFlash'
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
import { cn } from '@/lib/utils'
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
import { ImagePreviewLightbox } from '@/pages/Resident/components/medical/ImagePreviewLightbox'
import { RosterPermission } from '../RosterPermission'
import EditRosterDialog from './EditRosterDialog'
import {
  formatExtraTimeLabel,
  formatShiftDuration,
  getShiftAccent,
  getUserDisplayName,
  getUserRoleCodes,
  isEmployeeAvailableForDateSlot,
  isSameRoleGroup,
  LEAVE_TYPES,
  resolveAssignmentWindow,
  resolveDisplayTimeRange,
  statusBadgeClass,
  statusLabelForEvent,
  todayYmdLocal,
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
  /** Housekeeping L3 task completion details (shown on completed cards). */
  taskStartedAt?: string | null
  taskCompletedAt?: string | null
  taskComment?: string | null
  taskPhotos?: Array<{ url: string; originalName?: string }> | null
  extraMinutes?: number | null
  extraTimeLabel?: string | null
}

const WEEK: WeekDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

/** "2026-10-08" → "Thu, 08 Oct 2026"; falls back to the raw value if it does not parse. */
const formatDay = (value?: string | null, pattern = 'EEE, dd MMM yyyy') => {
  if (!value) return ''
  const parsed = parseISO(value)
  return isValid(parsed) ? format(parsed, pattern) : value
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?'

/** Mon–Sun chips, highlighting the days this roster works (all days when none are set). */
const WorkingDayChips = ({ days }: { days?: WeekDay[] | null }) => {
  const active = new Set(days?.length ? days : WEEK)
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEK.map((d) => (
        <span
          key={d}
          className={cn(
            'flex h-8 w-10 items-center justify-center rounded-lg text-[11px] font-semibold',
            active.has(d) ? 'bg-[#1e3a5a] text-white' : 'bg-slate-100 text-slate-400',
          )}
        >
          {d.slice(0, 3).replace(/^./, (c) => c.toUpperCase())}
        </span>
      ))}
    </div>
  )
}

const parseTaskInstant = (value?: string | Date | null): Date | null => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const d = new Date(value)
  if (!Number.isNaN(d.getTime())) return d
  const asIso = parseISO(value)
  return isValid(asIso) ? asIso : null
}

const formatTaskParts = (value?: string | Date | null): { time: string; date: string } | null => {
  const d = parseTaskInstant(value)
  if (!d) return null
  return { time: format(d, 'h:mm a'), date: format(d, 'dd MMM yyyy') }
}

const formatDurationLabel = (slotTimeRange?: string | null, shiftTime?: string | null) => {
  const raw = formatShiftDuration(slotTimeRange, shiftTime)
  if (!raw) return null
  return raw.replace(/\b(\d+)\s*m\b/g, '$1 min').replace(/\b(\d+)\s*h\b/g, '$1 h')
}

const FieldLabel = ({ children }: { children: string }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{children}</p>
)

const resolveTaskPhotos = (
  attachments?: { photos?: Array<{ url?: string; originalName?: string }> } | string | null,
) => {
  let parsed = attachments
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as { photos?: Array<{ url?: string; originalName?: string }> }
    } catch {
      return [] as Array<{ url: string; originalName?: string }>
    }
  }
  return (parsed?.photos || [])
    .filter((p): p is { url: string; originalName?: string } => !!p?.url)
    .map((p) => ({ url: p.url, originalName: p.originalName }))
}

interface RosterDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: RosterCalendarEvent | null
  /** Open directly into an action dialog when the parent card triggers Swap/Cover/Day Off. */
  initialAction?: 'swap' | 'cover' | 'day_off' | null
}

type ActionMode = 'swap' | 'cover' | 'day_off' | null

const RosterDetailDialog = ({ open, onOpenChange, event, initialAction = null }: RosterDetailDialogProps) => {
  const locationId = useLocationStore((s) => s.selectedLocationId)
  const { data: users } = useUsersQuery()
  const { data: datesData, refetch: refetchDates } = useListShiftEmployeeDates(undefined, open)

  const markDayOff = useMarkDayOff()
  const unmarkDayOff = useUnmarkDayOff()
  const coverShift = useCoverShiftDate()
  const swapShifts = useSwapShiftDates()
  const createDate = useCreateShiftEmployeeDate()

  const [actionMode, setActionMode] = useState<ActionMode>(initialAction ?? null)
  const [editOpen, setEditOpen] = useState(false)
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; alt: string } | null>(null)
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
      void refetchDates()
    } else {
      setActionMode(null)
      openedViaInitialAction.current = false
      setPreviewPhoto(null)
    }
  }, [open, initialAction, event?.id, resetDayOff, resetCover, resetSwap, refetchDates])

  useEffect(() => {
    if (actionMode === 'day_off') resetDayOff(dayOffFormDefaultValues)
    if (actionMode === 'cover') resetCover(coverFormDefaultValues)
    if (actionMode === 'swap') resetSwap(swapFormDefaultValues)
  }, [actionMode, resetDayOff, resetCover, resetSwap])

  const allDates = useMemo(
    () => (Array.isArray(datesData?.data) ? datesData.data : []) as ShiftEmployeeDate[],
    [datesData],
  )

  /** Prefer live list row completion so Completed-tab details match Today. */
  const taskCompletion = useMemo(() => {
    if (!event) return null
    const liveRow = event.shiftEmployeeDateId ? allDates.find((d) => d.id === event.shiftEmployeeDateId) : undefined
    const live = liveRow?.housekeepingCompletion
    const startedAt = live?.startedAt || event.taskStartedAt || null
    const completedAt = live?.completedAt || event.taskCompletedAt || null
    const comment = live?.comment || event.taskComment || null
    const livePhotos = resolveTaskPhotos(live?.attachments)
    const photos = livePhotos.length > 0 ? livePhotos : event.taskPhotos || []
    const extraMinutes = live?.extraMinutes ?? event.extraMinutes ?? null
    const status = live?.status || null
    const hasDetails = !!(
      startedAt ||
      completedAt ||
      comment ||
      photos.length > 0 ||
      (extraMinutes != null && extraMinutes > 0)
    )
    if (!hasDetails && status !== 'COMPLETED') return null
    return {
      startedAt,
      completedAt,
      comment,
      photos,
      extraMinutes,
      extraTimeLabel: formatExtraTimeLabel(extraMinutes) || event.extraTimeLabel || null,
      status,
    }
  }, [allDates, event])

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

  const taskHasStarted = !!(taskCompletion?.startedAt || event?.taskStartedAt)
  const actionsLocked =
    !!event &&
    (event.status === 'completed' || event.status === 'overdue' || event.status === 'on_duty' || taskHasStarted)
  const actionsDisabled =
    !event ||
    actionsLocked ||
    markDayOff.isPending ||
    unmarkDayOff.isPending ||
    coverShift.isPending ||
    swapShifts.isPending ||
    createDate.isPending
  const { saved, flashSaved } = useSavedFlash()

  if (!event) return null

  // A roster can be edited until it starts (cover duty belongs to someone else's roster).
  const rosterStart = event.assignment?.startDate ? String(event.assignment.startDate).slice(0, 10) : null
  const canEditRoster = !!event.assignment && !event.isCoverDuty && !!rosterStart && rosterStart > todayYmdLocal()

  const accent = getShiftAccent(event.shiftName)
  const timeLabel = resolveDisplayTimeRange(event.slotTimeRange, event.shiftTime)
  const durationLabel = formatDurationLabel(event.slotTimeRange, event.shiftTime)
  const statusKey = event.isCoverDuty ? 'covered' : event.status
  const areaLabel = event.locationLabel || event.areaName || null
  const periodStart = formatDay(event.startDate, 'dd MMM yyyy')
  const periodEnd = formatDay(event.endDate, 'dd MMM yyyy')
  const rosterPeriodLabel = !periodStart
    ? null
    : periodStart === periodEnd || event.startDate === event.endDate
      ? `${periodStart} (one day)`
      : `${periodStart} – ${periodEnd}`
  const startedParts = formatTaskParts(taskCompletion?.startedAt)
  const completedParts = formatTaskParts(taskCompletion?.completedAt)

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

  const lockMessage =
    event.status === 'completed'
      ? "This shift is locked. Completed shifts can't be edited once the roster has started."
      : event.status === 'overdue'
        ? "This shift is locked. Overdue shifts can't be swapped, covered, or marked day off."
        : 'This shift is locked. Swap, cover, and day off are unavailable after the task has started.'

  return (
    <>
      <Dialog
        open={open && !actionMode && !editOpen}
        onOpenChange={(next) => {
          if (!next) closeAll()
          else onOpenChange(next)
        }}
      >
        <DialogContent className="gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-xl max-h-[90vh]">
          <div className="px-5 pt-5 pb-5">
            <DialogHeader className="mb-4 space-y-0 text-left">
              <DialogTitle className="text-lg font-bold tracking-tight text-slate-900">Roster details</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#005390]/10 text-sm font-bold text-[#005390]">
                {initials(event.employeeName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-slate-900">{event.employeeName}</p>
                <p className="truncate text-sm text-slate-500">{event.departmentName || event.role || 'Staff'}</p>
              </div>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  statusBadgeClass(statusKey),
                )}
              >
                {statusLabelForEvent(event)}
              </span>
            </div>

            {event.isCoverDuty && event.originalEmployeeName ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Covering for {event.originalEmployeeName}
              </p>
            ) : null}

            <div className={cn('mt-4 rounded-2xl px-4 py-3.5', accent.soft)}>
              <div className="flex items-center gap-2">
                <span className={cn('size-2 shrink-0 rounded-full', accent.dot)} aria-hidden />
                <p className="text-sm font-semibold">{event.shiftName} shift</p>
              </div>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-2xl font-bold tabular-nums tracking-tight">{timeLabel || '—'}</p>
                {durationLabel ? <p className="text-sm font-medium opacity-70">{durationLabel}</p> : null}
              </div>
              <p className="mt-1 text-sm font-medium opacity-80">{formatDay(event.date, 'EEE, d MMM yyyy')}</p>
            </div>

            <div className="mt-5 space-y-4">
              {areaLabel ? (
                <div>
                  <FieldLabel>Area</FieldLabel>
                  <div className="mt-1.5 flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#005390]" />
                    <p className="text-sm font-semibold text-slate-900">{areaLabel}</p>
                  </div>
                </div>
              ) : null}

              {rosterPeriodLabel ? (
                <div>
                  <FieldLabel>Roster period</FieldLabel>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">{rosterPeriodLabel}</p>
                </div>
              ) : null}

              <div>
                <FieldLabel>Working days</FieldLabel>
                <div className="mt-2">
                  <WorkingDayChips days={event.workingDays} />
                </div>
              </div>

              {event.notes ? (
                <div>
                  <FieldLabel>Notes</FieldLabel>
                  <p className="mt-1.5 text-sm font-medium text-slate-800">{event.notes}</p>
                </div>
              ) : null}

              {event.status === 'day_off' ? (
                <>
                  {(event.leaveType || event.leaveNote) && (
                    <div className="space-y-3 rounded-xl bg-violet-50 px-3.5 py-3">
                      {event.leaveType ? (
                        <div>
                          <FieldLabel>Leave type</FieldLabel>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {LEAVE_TYPES.find((t) => t.value === event.leaveType)?.label || event.leaveType}
                          </p>
                        </div>
                      ) : null}
                      {event.leaveNote ? (
                        <div>
                          <FieldLabel>Reason</FieldLabel>
                          <p className="mt-1 text-sm font-medium text-slate-800">{event.leaveNote}</p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {taskCompletion ? (
              <div className="mt-5 space-y-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-sm font-bold text-emerald-900">Task completion</p>

                {(startedParts || completedParts) && (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700/70">Started</p>
                      {startedParts ? (
                        <>
                          <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{startedParts.time}</p>
                          <p className="text-xs text-slate-500">{startedParts.date}</p>
                        </>
                      ) : (
                        <p className="mt-0.5 text-sm text-slate-400">—</p>
                      )}
                    </div>
                    <div className="h-px min-w-[2rem] flex-1 bg-emerald-300" aria-hidden />
                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700/70">Completed</p>
                      {completedParts ? (
                        <>
                          <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{completedParts.time}</p>
                          <p className="text-xs text-slate-500">{completedParts.date}</p>
                        </>
                      ) : (
                        <p className="mt-0.5 text-sm text-slate-400">—</p>
                      )}
                    </div>
                  </div>
                )}

                {taskCompletion.extraTimeLabel ? (
                  <div>
                    <FieldLabel>Extra time</FieldLabel>
                    <p className="mt-1 text-sm font-semibold text-amber-800">{taskCompletion.extraTimeLabel}</p>
                  </div>
                ) : null}

                {taskCompletion.comment ? (
                  <div>
                    <FieldLabel>Note</FieldLabel>
                    <p className="mt-1 text-sm font-medium text-slate-800">{taskCompletion.comment}</p>
                  </div>
                ) : null}

                {taskCompletion.photos.length > 0 ? (
                  <div>
                    <FieldLabel>Attachment</FieldLabel>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {taskCompletion.photos.map((photo, idx) => {
                        const alt = photo.originalName || `Photo ${idx + 1}`
                        return (
                          <button
                            key={`${photo.url}-${idx}`}
                            type="button"
                            className="block h-[72px] w-[72px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:ring-2 hover:ring-[#005390]/30"
                            title={alt}
                            onClick={() => setPreviewPhoto({ url: photo.url, alt })}
                          >
                            <img src={photo.url} alt={alt} className="h-full w-full object-cover" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {!(event.status === 'covered' && !event.isCoverDuty) && (
              <RosterPermission action="update">
                <div className="mt-5 space-y-3">
                  {canEditRoster ? (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-[#2a517c]/30 text-[#2a517c] hover:bg-[#2a517c]/5"
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Edit roster
                    </Button>
                  ) : null}

                  {event.status === 'day_off' ? (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
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
                  ) : actionsLocked ? (
                    <div className="flex items-start gap-2.5 rounded-xl bg-slate-100 px-3.5 py-3">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm leading-snug text-slate-600">{lockMessage}</p>
                        {event.status === 'completed' && (taskCompletion?.extraTimeLabel || event.extraTimeLabel) ? (
                          <p className="text-xs font-semibold text-amber-700">
                            Extra time: {taskCompletion?.extraTimeLabel || event.extraTimeLabel}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        disabled={actionsDisabled}
                        onClick={() => setActionMode('swap')}
                      >
                        <ArrowLeftRight className="mr-1.5 h-4 w-4" />
                        Swap
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        disabled={actionsDisabled}
                        onClick={() => setActionMode('cover')}
                      >
                        <UserCheck className="mr-1.5 h-4 w-4" />
                        Cover
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50"
                        disabled={actionsDisabled}
                        onClick={() => setActionMode('day_off')}
                      >
                        <Coffee className="mr-1.5 h-4 w-4" />
                        Day Off
                      </Button>
                    </div>
                  )}
                </div>
              </RosterPermission>
            )}
          </div>
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
              flashSaved(closeAll)
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
              <SaveButton
                type="submit"
                className="gap-2 bg-[#2a517c] hover:bg-[#476587] text-white"
                saving={markDayOff.isPending || createDate.isPending}
                saved={saved}
                savedLabel="Day off marked"
              >
                Mark as Day Off
              </SaveButton>
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
              flashSaved(closeAll)
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
              <SaveButton
                type="submit"
                className="gap-2 bg-[#2a517c] hover:bg-[#476587] text-white"
                saving={coverShift.isPending || createDate.isPending}
                saved={saved}
                savedLabel="Cover assigned"
                disabled={!coveredByEmployeeId}
              >
                Assign Cover
              </SaveButton>
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
              flashSaved(closeAll)
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
              <SaveButton
                type="submit"
                className="gap-2 bg-[#2a517c] hover:bg-[#476587] text-white"
                saving={swapShifts.isPending || createDate.isPending}
                saved={saved}
                savedLabel="Swapped"
                disabled={!targetDateId}
              >
                Confirm Swap
              </SaveButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {event.assignment && editOpen && (
        <EditRosterDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={closeAll}
          assignment={event.assignment}
          employeeName={event.employeeName}
          locationLabel={event.locationLabel || event.areaName}
        />
      )}

      <ImagePreviewLightbox
        url={previewPhoto?.url ?? null}
        alt={previewPhoto?.alt}
        onClose={() => setPreviewPhoto(null)}
      />
    </>
  )
}

export default RosterDetailDialog
