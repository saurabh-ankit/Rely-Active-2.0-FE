import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() */
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useUsersQuery } from '@/hooks/react-query/user'
import type { ShiftEmployeeDate } from '@/lib/services/rosterService'
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
  resolveLifecycleRosterStatus,
  useMedicalEmployees,
  usersShareDepartment,
} from '../../utils'
import { useLocationStore } from '@/lib/stores/locationStore'
import {
  useListEmployeeShifts,
  useCoverShiftDate,
  useGenerateShiftEmployeeDates,
  useListShiftEmployeeDates,
  useMarkDayOff,
  useSwapShiftDates,
  useUnmarkDayOff,
} from '@/hooks/react-query/roster'

const statusStyles: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800',
  on_duty: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-700',
  absent: 'bg-red-100 text-red-800',
  covered: 'bg-amber-100 text-amber-800',
  day_off: 'bg-purple-100 text-purple-800',
}

const DailyShiftManagement = () => {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const locationId = useLocationStore((s) => s.selectedLocationId)
  const { data: users } = useUsersQuery()
  const medicalEmployees = useMedicalEmployees(users)
  const employee = useMemo(() => (users || []).find((u) => u.id === employeeId), [users, employeeId])

  const now = new Date()
  const [fromDate, setFromDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10))

  const { data, isLoading, refetch } = useListShiftEmployeeDates(undefined, !!employeeId)
  const dates: ShiftEmployeeDate[] = useMemo(() => {
    const all = Array.isArray(data?.data) ? data.data : []
    return all
      .filter((d) => d.shiftAssignment?.employeeId === employeeId && d.date >= fromDate && d.date <= toDate)
      .map((d) => ({
        ...d,
        status: resolveLifecycleRosterStatus(
          d.status,
          d.date,
          d.shiftAssignment?.shift?.startTime,
          d.shiftAssignment?.shift?.endTime,
          d.shiftAssignment?.slotTimeRange,
        ) as ShiftEmployeeDate['status'],
      }))
  }, [data, employeeId, fromDate, toDate])

  const { data: assignmentsData } = useListEmployeeShifts(employeeId)
  const assignments = useMemo(
    () => (Array.isArray(assignmentsData?.data) ? assignmentsData.data : []),
    [assignmentsData],
  )

  const markDayOff = useMarkDayOff()
  const unmarkDayOff = useUnmarkDayOff()
  const coverShift = useCoverShiftDate()
  const swapShifts = useSwapShiftDates()
  const generateDates = useGenerateShiftEmployeeDates()

  const [dayOffTarget, setDayOffTarget] = useState<ShiftEmployeeDate | null>(null)
  const [coverTarget, setCoverTarget] = useState<ShiftEmployeeDate | null>(null)
  const [swapTarget, setSwapTarget] = useState<ShiftEmployeeDate | null>(null)

  const dayOffForm = useForm<DayOffFormValues>({
    resolver: zodResolver(dayOffFormSchema),
    defaultValues: { ...dayOffFormDefaultValues, leaveType: 'week_off' },
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
    if (dayOffTarget) resetDayOff({ ...dayOffFormDefaultValues, leaveType: 'week_off' })
  }, [dayOffTarget, resetDayOff])

  useEffect(() => {
    if (coverTarget) resetCover(coverFormDefaultValues)
  }, [coverTarget, resetCover])

  useEffect(() => {
    if (swapTarget) resetSwap(swapFormDefaultValues)
  }, [swapTarget, resetSwap])

  const allDates: ShiftEmployeeDate[] = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data])

  const busyCheckDates = useMemo(
    () =>
      allDates.map((d) => ({
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
      })),
    [allDates],
  )

  const availableCoverEmployees = useMemo(() => {
    if (!coverTarget) return []
    const window = resolveAssignmentWindow(
      coverTarget.shiftAssignment?.shift?.startTime,
      coverTarget.shiftAssignment?.shift?.endTime,
      coverTarget.shiftAssignment?.slotTimeRange,
    )
    if (!window) return medicalEmployees.filter((e) => e.id !== employeeId)

    const sourceUser = (users || []).find((u) => u.id === employeeId)
    return medicalEmployees.filter((e) => {
      if (e.id === employeeId) return false
      if (sourceUser && !usersShareDepartment(sourceUser, e, locationId)) return false
      const sourceRole = sourceUser ? getUserRoleCodes(sourceUser)[0] : undefined
      const peerRole = getUserRoleCodes(e)[0]
      if (!isSameRoleGroup(sourceRole, peerRole)) return false
      return isEmployeeAvailableForDateSlot(e.id, coverTarget.date, window, busyCheckDates, [coverTarget.id])
    })
  }, [coverTarget, medicalEmployees, employeeId, users, locationId, busyCheckDates])

  const availableSwapTargets = useMemo(() => {
    if (!swapTarget || !employeeId) return [] as ShiftEmployeeDate[]
    const sourceWindow = resolveAssignmentWindow(
      swapTarget.shiftAssignment?.shift?.startTime,
      swapTarget.shiftAssignment?.shift?.endTime,
      swapTarget.shiftAssignment?.slotTimeRange,
    )
    if (!sourceWindow) return allDates.filter((d) => d.id !== swapTarget.id)

    return allDates.filter((d) => {
      if (d.isDeleted || d.id === swapTarget.id) return false
      if (d.status === 'day_off' || d.status === 'completed') return false
      const empId = d.shiftAssignment?.employeeId
      if (!empId || empId === employeeId) return false

      const targetWindow = resolveAssignmentWindow(
        d.shiftAssignment?.shift?.startTime,
        d.shiftAssignment?.shift?.endTime,
        d.shiftAssignment?.slotTimeRange,
      )
      if (!targetWindow) return false

      const excludeIds = [d.id, swapTarget.id]
      if (!isEmployeeAvailableForDateSlot(empId, swapTarget.date, sourceWindow, busyCheckDates, excludeIds)) {
        return false
      }
      if (!isEmployeeAvailableForDateSlot(employeeId, d.date, targetWindow, busyCheckDates, excludeIds)) {
        return false
      }
      return true
    })
  }, [swapTarget, employeeId, allDates, busyCheckDates])

  const handleGenerate = async () => {
    if (assignments.length === 0) return
    for (const a of assignments) {
      await generateDates.mutateAsync({
        employeeShiftAssignmentId: a.id,
        fromDate,
        toDate,
      })
    }
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/admin/shift-roster-management/employees/${employeeId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Daily Shift Management</h2>
            <p className="text-sm text-gray-500">
              {employee ? getUserDisplayName(employee) : employeeId} · day-off, cover & swap
            </p>
          </div>
        </div>
        <RosterPermission action="create">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generateDates.isPending || assignments.length === 0}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate dates
          </Button>
        </RosterPermission>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shift dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : dates.length === 0 ? (
            <p className="text-sm text-gray-500">No dates in range. Use Generate dates after assigning a shift.</p>
          ) : (
            dates.map((d) => (
              <div
                key={d.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-lg p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{d.date}</span>
                    <Badge className={statusStyles[d.status] || ''} variant="secondary">
                      {d.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {d.shiftAssignment?.shift?.name || 'Shift'}
                    {d.leaveType ? ` · ${d.leaveType}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <RosterPermission action="update">
                    {d.status === 'completed' ? null : d.status === 'day_off' ? (
                      <Button size="sm" variant="outline" onClick={() => unmarkDayOff.mutate(d.id)}>
                        Unmark day off
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setDayOffTarget(d)}>
                        Day off
                      </Button>
                    )}
                    {d.status !== 'completed' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setCoverTarget(d)}>
                          Cover
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSwapTarget(d)}>
                          Swap
                        </Button>
                      </>
                    )}
                  </RosterPermission>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Day off dialog */}
      <Dialog open={!!dayOffTarget} onOpenChange={(o) => !o && setDayOffTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark day off — {dayOffTarget?.date}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={dayOffForm.handleSubmit(async (values) => {
              if (!dayOffTarget) return
              await markDayOff.mutateAsync({
                dateId: dayOffTarget.id,
                data: { leaveType: values.leaveType, leaveNote: values.leaveNote || null },
              })
              setDayOffTarget(null)
            })}
            noValidate
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Leave type</Label>
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
              <Label>Note</Label>
              <Textarea {...dayOffForm.register('leaveNote')} rows={2} />
              {dayOffForm.formState.errors.leaveNote && (
                <p className="text-sm text-red-600">{dayOffForm.formState.errors.leaveNote.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDayOffTarget(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2a517c] hover:bg-[#476587] text-white"
                disabled={markDayOff.isPending}
              >
                Confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cover dialog */}
      <Dialog
        open={!!coverTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCoverTarget(null)
            resetCover(coverFormDefaultValues)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cover shift — {coverTarget?.date}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={coverForm.handleSubmit(async (values) => {
              if (!coverTarget) return
              await coverShift.mutateAsync({
                dateId: coverTarget.id,
                data: {
                  coveredByEmployeeId: values.coveredByEmployeeId,
                  notes: values.notes?.trim() || null,
                },
              })
              setCoverTarget(null)
              resetCover(coverFormDefaultValues)
            })}
            noValidate
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Covering employee (available for this day & slot)</Label>
              <Controller
                name="coveredByEmployeeId"
                control={coverForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select available staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCoverEmployees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {getUserDisplayName(e)}
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
                <p className="text-xs text-gray-500">No available employees for this day and time slot.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea {...coverForm.register('notes')} rows={2} />
              {coverForm.formState.errors.notes && (
                <p className="text-sm text-red-600">{coverForm.formState.errors.notes.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCoverTarget(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2a517c] hover:bg-[#476587] text-white"
                disabled={!coveredByEmployeeId || coverShift.isPending}
              >
                Assign cover
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Swap dialog */}
      <Dialog
        open={!!swapTarget}
        onOpenChange={(o) => {
          if (!o) {
            setSwapTarget(null)
            resetSwap(swapFormDefaultValues)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Swap with available employee shift</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={swapForm.handleSubmit(async (values) => {
              if (!swapTarget) return
              await swapShifts.mutateAsync({
                dateId: swapTarget.id,
                data: {
                  targetDateId: values.targetDateId,
                  notes: values.notes?.trim() || null,
                },
              })
              setSwapTarget(null)
              resetSwap(swapFormDefaultValues)
            })}
            noValidate
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Available target shift</Label>
              <Controller
                name="targetDateId"
                control={swapForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select available target" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSwapTargets.map((d) => {
                        const name =
                          `${d.shiftAssignment?.employee?.profile?.firstName || ''} ${d.shiftAssignment?.employee?.profile?.lastName || ''}`.trim()
                        return (
                          <SelectItem key={d.id} value={d.id}>
                            {name || 'Employee'} · {d.date} · {d.shiftAssignment?.shift?.name || 'Shift'}
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
              {availableSwapTargets.length === 0 && (
                <p className="text-xs text-gray-500">No available swap targets for this day and time slot.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea {...swapForm.register('notes')} rows={2} />
              {swapForm.formState.errors.notes && (
                <p className="text-sm text-red-600">{swapForm.formState.errors.notes.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSwapTarget(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2a517c] hover:bg-[#476587] text-white"
                disabled={!targetDateId || swapShifts.isPending}
              >
                Swap
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DailyShiftManagement
