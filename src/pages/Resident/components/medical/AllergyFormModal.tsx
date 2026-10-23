import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateResidentAllergyMutation, useUpdateResidentAllergyMutation } from '@/hooks/react-query/resident'
import type { ResidentAllergyItem, ResidentAllergyPayload } from '@/lib/types/resident'
import {
  fromDateTimeInputValue,
  isNotFutureDateTimeInput,
  isValidDateTimeInput,
  toDateTimeInputValue,
} from './clinicalFormUtils'

const allergySchema = z.object({
  name: z.string().trim().min(1, 'Allergy name is required').max(200, 'Allergy name must be 200 characters or fewer'),
  recordedAt: z
    .string()
    .refine(isValidDateTimeInput, 'Recorded at is required')
    .refine(isNotFutureDateTimeInput, 'Recorded at cannot be in the future'),
  note: z.string().trim().max(5000, 'Note must be 5000 characters or fewer'),
})

type AllergyFormValues = z.infer<typeof allergySchema>

interface AllergyFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  item?: ResidentAllergyItem | null
}

const AllergyFormModal = ({ open, onOpenChange, residentId, item }: AllergyFormModalProps) => {
  const createMutation = useCreateResidentAllergyMutation(residentId)
  const updateMutation = useUpdateResidentAllergyMutation(residentId)
  const isPending = createMutation.isPending || updateMutation.isPending
  const isEdit = !!item

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AllergyFormValues>({
    resolver: zodResolver(allergySchema),
    defaultValues: {
      name: item?.name ?? '',
      recordedAt: toDateTimeInputValue(item?.recordedAt),
      note: item?.note ?? '',
    },
  })

  const onSubmit = (values: AllergyFormValues) => {
    const payload: ResidentAllergyPayload = {
      name: values.name,
      note: values.note || null,
      recordedAt: fromDateTimeInputValue(values.recordedAt),
    }
    const onSuccess = () => onOpenChange(false)
    if (item) updateMutation.mutate({ id: item.id, payload }, { onSuccess })
    else createMutation.mutate(payload, { onSuccess })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Allergy' : 'Add Allergy'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this allergy record.' : 'Record a known allergy for this resident.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="allergy-name">
              Allergy <span className="text-red-500">*</span>
            </Label>
            <Input id="allergy-name" placeholder="e.g. Penicillin" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergy-recorded-at">
              Recorded At <span className="text-red-500">*</span>
            </Label>
            <Input
              id="allergy-recorded-at"
              type="datetime-local"
              max={toDateTimeInputValue()}
              {...register('recordedAt')}
            />
            {errors.recordedAt && <p className="text-xs text-red-500">{errors.recordedAt.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergy-note">Note</Label>
            <Textarea id="allergy-note" rows={3} placeholder="Add a note (optional)" {...register('note')} />
            {errors.note && <p className="text-xs text-red-500">{errors.note.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#005390] hover:bg-[#004a80] text-white">
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AllergyFormModal
