import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() */
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUpdateShift } from '@/hooks/react-query/shifts'
import type { ShiftV2 } from '@/lib/services/shiftService'
import {
  manageSlotTimeFormDefaultValues,
  manageSlotTimeFormSchema,
  type ManageSlotTimeFormValues,
} from '@/utils/roster.utils'
import {
  calcSlotCountFromDuration,
  calcSlotDurationFromCount,
  generateSlotsByCount,
  getShiftDurationMinutes,
} from '../../utils'

type SlotMode = ManageSlotTimeFormValues['mode']

interface ManageSlotTimeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift: ShiftV2 | null
}

const parsePositiveInt = (raw: string): number | null => {
  if (raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.floor(n)
}

const ManageSlotTimeDialog = ({ open, onOpenChange, shift }: ManageSlotTimeDialogProps) => {
  const updateShift = useUpdateShift()

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ManageSlotTimeFormValues>({
    resolver: zodResolver(manageSlotTimeFormSchema),
    defaultValues: manageSlotTimeFormDefaultValues,
    mode: 'onChange',
  })

  const mode = watch('mode')
  const numberOfSlotsInput = watch('numberOfSlotsInput')
  const slotDurationInput = watch('slotDurationInput')

  const shiftMinutes = useMemo(() => (shift ? getShiftDurationMinutes(shift.startTime, shift.endTime) : null), [shift])

  const numberOfSlots = parsePositiveInt(numberOfSlotsInput)
  const slotDuration = parsePositiveInt(slotDurationInput)

  useEffect(() => {
    if (!open || !shift) return
    const nextMode = (shift.slotGenerationMode as SlotMode) || 'Auto Generate'
    const total = getShiftDurationMinutes(shift.startTime, shift.endTime) ?? 0

    if (nextMode === 'Auto Generate') {
      const count =
        shift.numberOfSlots && shift.numberOfSlots > 0
          ? shift.numberOfSlots
          : Math.max(1, Math.floor(total / (shift.slotDuration || 60)) || 1)
      const duration = calcSlotDurationFromCount(shift.startTime, shift.endTime, count) ?? 60
      reset({
        mode: nextMode,
        numberOfSlotsInput: String(count),
        slotDurationInput: String(duration),
      })
    } else {
      const duration = shift.slotDuration && shift.slotDuration > 0 ? shift.slotDuration : 60
      const count = calcSlotCountFromDuration(shift.startTime, shift.endTime, duration) ?? shift.numberOfSlots ?? 1
      reset({
        mode: nextMode,
        numberOfSlotsInput: String(Math.max(1, count)),
        slotDurationInput: String(duration),
      })
    }
  }, [open, shift, reset])

  const handleModeChange = (next: SlotMode) => {
    setValue('mode', next, { shouldValidate: true })
    if (!shift) return
    const count = parsePositiveInt(numberOfSlotsInput) ?? 1
    const duration = parsePositiveInt(slotDurationInput) ?? 60
    if (next === 'Auto Generate') {
      const nextDuration = calcSlotDurationFromCount(shift.startTime, shift.endTime, count) ?? duration
      setValue('slotDurationInput', String(nextDuration), { shouldValidate: true })
    } else {
      const nextCount = calcSlotCountFromDuration(shift.startTime, shift.endTime, duration) ?? count
      setValue('numberOfSlotsInput', String(Math.max(1, nextCount)), { shouldValidate: true })
    }
  }

  const handleNumberOfSlotsChange = (raw: string) => {
    if (raw !== '' && !/^\d+$/.test(raw)) return
    setValue('numberOfSlotsInput', raw, { shouldValidate: true })
    if (!shift || mode !== 'Auto Generate') return
    const count = parsePositiveInt(raw)
    if (count === null) return
    const duration = calcSlotDurationFromCount(shift.startTime, shift.endTime, count)
    if (duration !== null) setValue('slotDurationInput', String(duration), { shouldValidate: true })
  }

  const handleSlotDurationChange = (raw: string) => {
    if (raw !== '' && !/^\d+$/.test(raw)) return
    setValue('slotDurationInput', raw, { shouldValidate: true })
    if (!shift || mode !== 'Manual') return
    const duration = parsePositiveInt(raw)
    if (duration === null) return
    const count = calcSlotCountFromDuration(shift.startTime, shift.endTime, duration)
    if (count !== null) {
      setValue('numberOfSlotsInput', String(Math.max(1, count)), { shouldValidate: true })
    }
  }

  const previewSlots = useMemo(() => {
    if (!shift || numberOfSlots === null) return []
    return generateSlotsByCount(shift.startTime, shift.endTime, numberOfSlots)
  }, [shift, numberOfSlots])

  const canSave =
    !!shift &&
    numberOfSlots !== null &&
    slotDuration !== null &&
    shiftMinutes !== null &&
    previewSlots.length === numberOfSlots

  const onSubmit = async (values: ManageSlotTimeFormValues) => {
    if (!shift || !canSave) return
    const slots = parsePositiveInt(values.numberOfSlotsInput)
    const duration = parsePositiveInt(values.slotDurationInput)
    if (slots === null || duration === null) return
    await updateShift.mutateAsync({
      id: shift.id,
      data: {
        slotGenerationMode: values.mode,
        numberOfSlots: slots,
        slotDuration: duration,
      },
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage SlotTime — {shift?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <p className="text-sm text-gray-600">
            Shift window:{' '}
            <span className="font-medium text-gray-900">
              {shift?.startTime} – {shift?.endTime}
            </span>
            {shiftMinutes != null ? <span className="text-gray-500"> ({shiftMinutes} min)</span> : null}
          </p>

          <div className="space-y-2">
            <Label>Slot generate</Label>
            <Controller
              name="mode"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => handleModeChange(v as SlotMode)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Auto Generate">Auto fills</SelectItem>
                    <SelectItem value="Manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.mode && <p className="text-sm text-red-600">{errors.mode.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="no-of-slots">No. of slots</Label>
              <Input
                id="no-of-slots"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={numberOfSlotsInput}
                onChange={(e) => handleNumberOfSlotsChange(e.target.value)}
                readOnly={mode === 'Manual'}
                className={mode === 'Manual' ? 'bg-gray-50' : undefined}
              />
              {errors.numberOfSlotsInput && <p className="text-sm text-red-600">{errors.numberOfSlotsInput.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-time">SlotTime (min)</Label>
              <Input
                id="slot-time"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={slotDurationInput}
                onChange={(e) => handleSlotDurationChange(e.target.value)}
                readOnly={mode === 'Auto Generate'}
                className={mode === 'Auto Generate' ? 'bg-gray-50' : undefined}
              />
              {errors.slotDurationInput && <p className="text-sm text-red-600">{errors.slotDurationInput.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Slot preview</Label>
            {previewSlots.length > 0 ? (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                {previewSlots.map((s) => `(${s.start}-${s.end})`).join(', ')}
              </div>
            ) : (
              <p className="text-sm text-amber-700">
                {numberOfSlots === null
                  ? 'Enter a valid number of slots.'
                  : `Unable to split this shift into ${numberOfSlots} slot${
                      numberOfSlots === 1 ? '' : 's'
                    }. Adjust the values.`}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSave || updateShift.isPending}
              className="bg-[#2a517c] hover:bg-[#476587] text-white"
            >
              {updateShift.isPending ? 'Saving…' : 'Save SlotTime'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ManageSlotTimeDialog
