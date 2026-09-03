import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createShiftFormSchema, type CreateShiftFormValues } from '../schemas/roster.schemas'
import { FieldErrorMessage } from '../utils/FieldErrorMessage'
import { notifyFormValidationErrors } from '../utils/rosterFormHelpers'

interface CreateCustomShiftModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  editingShiftId: string | null
  defaultValues: CreateShiftFormValues
  departments?: Array<{ id: string; name: string }>
  onSubmit: (values: CreateShiftFormValues) => Promise<void>
  isSubmitting: boolean
}

export function CreateCustomShiftModal({
  isOpen,
  onOpenChange,
  editingShiftId,
  defaultValues,
  departments = [],
  onSubmit,
  isSubmitting,
}: CreateCustomShiftModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateShiftFormValues>({
    resolver: zodResolver(createShiftFormSchema),
    defaultValues,
  })

  const shiftCategory = useWatch({ control, name: 'shiftCategory' }) || 'GENERAL'
  const departmentId = useWatch({ control, name: 'departmentId' })
  const slotGenerationMode = useWatch({ control, name: 'slotGenerationMode' })

  useEffect(() => {
    if (isOpen) reset(defaultValues)
  }, [isOpen, defaultValues, reset])

  const onInvalid = (fieldErrors: typeof errors) => {
    notifyFormValidationErrors(fieldErrors)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingShiftId ? 'Edit Shift Master Template' : 'Create New Shift Master Template'}
          </DialogTitle>
          <DialogDescription>
            Define shift times, category, and optional OPD slot generation settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Shift Name *</Label>
              <Input placeholder="e.g. Afternoon OPD Slot" className="mt-1" {...register('shiftName')} />
              <FieldErrorMessage message={errors.shiftName?.message} />
            </div>
            <div>
              <Label>Shift Code *</Label>
              <Input placeholder="e.g. OPD-AFT" className="mt-1" {...register('code')} />
              <FieldErrorMessage message={errors.code?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select
                value={shiftCategory}
                onValueChange={(v) => setValue('shiftCategory', v as CreateShiftFormValues['shiftCategory'])}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="DEPARTMENT">Department</SelectItem>
                  <SelectItem value="OPD">OPD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {shiftCategory === 'DEPARTMENT' && (
              <div>
                <Label>Department</Label>
                <Select value={String(departmentId || '')} onValueChange={(v: string) => setValue('departmentId', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time *</Label>
              <Input type="time" className="mt-1" {...register('startTime')} />
              <FieldErrorMessage message={errors.startTime?.message} />
            </div>
            <div>
              <Label>End Time *</Label>
              <Input type="time" className="mt-1" {...register('endTime')} />
              <FieldErrorMessage message={errors.endTime?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Break Start Time</Label>
              <Input type="time" className="mt-1" {...register('breakStartTime')} />
            </div>
            <div>
              <Label>Break End Time</Label>
              <Input type="time" className="mt-1" {...register('breakEndTime')} />
            </div>
          </div>

          {(shiftCategory === 'OPD' || shiftCategory === 'GENERAL') && (
            <div className="grid grid-cols-3 gap-3 border-t pt-3">
              <div>
                <Label>Slot Mode</Label>
                <Select
                  value={slotGenerationMode || 'AUTO_GENERATE'}
                  onValueChange={(v) => setValue('slotGenerationMode', v as 'AUTO_GENERATE' | 'MANUAL')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO_GENERATE">Auto Generate</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Slot Duration (min)</Label>
                <Input type="number" className="mt-1" {...register('slotDurationMinutes')} />
              </div>
              <div>
                <Label>Number of Slots</Label>
                <Input type="number" className="mt-1" {...register('numberOfSlots')} />
              </div>
            </div>
          )}

          <div>
            <Label>Description / Operational Notes</Label>
            <Input
              placeholder="e.g. Mandatory for Memory Care floor coverage."
              className="mt-1"
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#004B87] hover:bg-[#003865]">
              {isSubmitting ? 'Saving...' : editingShiftId ? 'Update Shift Master' : 'Create Shift Master'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
