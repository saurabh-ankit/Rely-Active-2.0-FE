import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
/* eslint-disable react-hooks/incompatible-library -- react-hook-form watch() */
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { RosterArea } from '@/lib/services/rosterService'
import { areaFormDefaultValues, areaFormSchema, type AreaFormValues } from '@/utils/roster.utils'
import { AREA_TYPES } from '../../utils'
import { useCreateArea, useUpdateArea } from '@/hooks/react-query/roster'

interface AddAreaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  area?: RosterArea | null
}

const AddAreaDialog = ({ open, onOpenChange, area }: AddAreaDialogProps) => {
  const createArea = useCreateArea()
  const updateArea = useUpdateArea()
  const isEdit = !!area

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: areaFormDefaultValues,
    mode: 'onChange',
  })

  const areaName = watch('areaName')
  const location = watch('location')

  useEffect(() => {
    if (open) {
      reset({
        areaName: area?.areaName || '',
        areaType: area?.areaType || 'Lobby Area',
        location: area?.location || '',
        status: area?.status || 'Active',
        description: area?.description || '',
      })
    }
  }, [open, area, reset])

  const onSubmit = async (values: AreaFormValues) => {
    const payload = {
      areaName: values.areaName.trim(),
      areaType: values.areaType,
      location: values.location.trim(),
      status: values.status || 'Active',
      capacity: null,
      description: values.description?.toString().trim() || null,
    }
    if (isEdit && area) {
      await updateArea.mutateAsync({ id: area.id, data: payload })
    } else {
      await createArea.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  const pending = createArea.isPending || updateArea.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Area' : 'Add Area'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
          <div className="space-y-1">
            <Label>Area name</Label>
            <Input {...register('areaName')} />
            {errors.areaName && <p className="text-sm text-red-600">{errors.areaName.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Controller
              name="areaType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.areaType && <p className="text-sm text-red-600">{errors.areaType.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Location / wing</Label>
            <Input {...register('location')} placeholder="e.g. Block A Ground" />
            {errors.location && <p className="text-sm text-red-600">{errors.location.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea {...register('description')} rows={2} />
            {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || !areaName.trim() || !location.trim()}
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

export default AddAreaDialog
