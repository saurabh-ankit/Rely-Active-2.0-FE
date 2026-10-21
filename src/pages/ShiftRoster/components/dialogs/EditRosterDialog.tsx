import { useMemo, useState } from 'react'
import { Info, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useListShifts, useUpdateEmployeeShift } from '@/hooks/react-query/roster'
import type { EmployeeShiftAssignment, ShiftV2, WeekDay } from '@/lib/services/rosterService'
import { WEEK_DAYS, generateShiftSlots, generateSlotsByCount, todayYmdLocal, weekdaysInDateRange } from '../../utils'

const FULL_SHIFT = '__full__'

const ymd = (value?: string | null) => (value ? String(value).slice(0, 10) : '')

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
 * Edit a roster (shift, slot, dates, working days, notes) before it starts.
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
  const { data: shiftsData } = useListShifts(open)
  const shifts: ShiftV2[] = useMemo(() => shiftsData?.data?.shifts || [], [shiftsData])
  const update = useUpdateEmployeeShift()

  const [shiftId, setShiftId] = useState(assignment.shiftId)
  const [slot, setSlot] = useState(assignment.slotTimeRange || FULL_SHIFT)
  const [startDate, setStartDate] = useState(ymd(assignment.startDate))
  const [endDate, setEndDate] = useState(ymd(assignment.endDate))
  const [workingDays, setWorkingDays] = useState<WeekDay[]>(assignment.workingDays || [])
  const [notes, setNotes] = useState(assignment.notes || '')

  const shift = shifts.find((s) => s.id === shiftId) || null
  const slots = useMemo(() => {
    if (!shift) return []
    if (shift.numberOfSlots && shift.numberOfSlots > 0) {
      return generateSlotsByCount(shift.startTime, shift.endTime, shift.numberOfSlots)
    }
    const duration = shift.slotDuration && shift.slotDuration > 0 ? shift.slotDuration : 60
    return generateShiftSlots(shift.startTime, shift.endTime, duration)
  }, [shift])

  const daysInRange = useMemo(() => weekdaysInDateRange(startDate, endDate), [startDate, endDate])
  const pickedDays = workingDays.filter((d) => daysInRange.includes(d))

  const error =
    !startDate || !endDate
      ? 'Pick both dates.'
      : startDate < today
        ? 'The start date cannot be in the past.'
        : endDate < startDate
          ? 'The end date must be on or after the start date.'
          : pickedDays.length === 0
            ? 'Pick at least one working day within the dates.'
            : null

  const toggleDay = (day: WeekDay) =>
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))

  const changeShift = (id: string) => {
    setShiftId(id)
    setSlot(FULL_SHIFT) // slots belong to a shift
  }

  const save = async () => {
    if (error) return
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
        },
      })
      onOpenChange(false)
      onSaved?.()
    } catch {
      // toast handled by the mutation
    }
  }

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
                const disabled = !daysInRange.includes(day)
                const checked = workingDays.includes(day) && !disabled
                return (
                  <Button
                    key={day}
                    type="button"
                    variant="ghost"
                    disabled={disabled}
                    aria-pressed={checked}
                    onClick={() => toggleDay(day)}
                    title={disabled ? 'Not within the selected dates' : undefined}
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
          </div>

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
