import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() */
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateShift, useUpdateShift } from '@/hooks/react-query/shifts'
import type { ShiftV2 } from '@/lib/services/shiftService'
import { createShiftFormDefaultValues, createShiftFormSchema, type CreateShiftFormValues } from '@/utils/roster.utils'

interface CreateShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift?: ShiftV2 | null
}

const CreateShiftDialog = ({ open, onOpenChange, shift }: CreateShiftDialogProps) => {
  const createShift = useCreateShift()
  const updateShift = useUpdateShift()
  const isEdit = !!shift

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateShiftFormValues>({
    resolver: zodResolver(createShiftFormSchema),
    defaultValues: createShiftFormDefaultValues,
    mode: 'onChange',
  })

  const name = watch('name')

  useEffect(() => {
    if (open) {
      reset({
        name: shift?.name || '',
        description: shift?.description || '',
        startTime: shift?.startTime || '08:00',
        endTime: shift?.endTime || '16:00',
      })
    }
  }, [open, shift, reset])

  const onSubmit = async (values: CreateShiftFormValues) => {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || '',
      startTime: values.startTime,
      endTime: values.endTime,
    }
    if (isEdit && shift) {
      await updateShift.mutateAsync({ id: shift.id, data: payload })
    } else {
      await createShift.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  const pending = createShift.isPending || updateShift.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Shift' : 'Create Shift'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shift-name">Name</Label>
            <Input id="shift-name" {...register('name')} placeholder="Morning Shift" />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="shift-desc">Description</Label>
            <Textarea id="shift-desc" {...register('description')} rows={2} placeholder="Optional notes" />
            {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start (HH:mm)</Label>
              <Input id="start-time" type="time" {...register('startTime')} />
              {errors.startTime && <p className="text-sm text-red-600">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End (HH:mm)</Label>
              <Input id="end-time" type="time" {...register('endTime')} />
              {errors.endTime && <p className="text-sm text-red-600">{errors.endTime.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || !name.trim()}
              className="bg-[#2a517c] hover:bg-[#476587] text-white"
            >
              {pending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateShiftDialog
