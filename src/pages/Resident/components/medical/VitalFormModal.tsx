import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useActiveVitalSettingsQuery,
  useCreateResidentVitalMutation,
  useUpdateResidentVitalMutation,
} from '@/hooks/react-query/resident'
import type { ResidentVitalItem, ResidentVitalPayload } from '@/lib/types/resident'
import {
  fromDateTimeInputValue,
  isNotFutureDateTimeInput,
  isValidDateTimeInput,
  toDateTimeInputValue,
} from './clinicalFormUtils'

const vitalSchema = z.object({
  vitalSettingId: z.string().min(1, 'Select a vital type'),
  value: z.string().trim().min(1, 'Value is required').max(100, 'Value must be 100 characters or fewer'),
  recordedAt: z
    .string()
    .refine(isValidDateTimeInput, 'Recorded at is required')
    .refine(isNotFutureDateTimeInput, 'Recorded at cannot be in the future'),
  note: z.string().trim().max(5000, 'Note must be 5000 characters or fewer'),
})

type VitalFormValues = z.infer<typeof vitalSchema>

interface VitalFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  item?: ResidentVitalItem | null
}

const VitalFormModal = ({ open, onOpenChange, residentId, item }: VitalFormModalProps) => {
  const settingsQuery = useActiveVitalSettingsQuery(open)
  const createMutation = useCreateResidentVitalMutation(residentId)
  const updateMutation = useUpdateResidentVitalMutation(residentId)
  const isPending = createMutation.isPending || updateMutation.isPending
  const isEdit = !!item

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VitalFormValues>({
    resolver: zodResolver(vitalSchema),
    defaultValues: {
      vitalSettingId: item?.vitalSettingId ?? '',
      value: item?.value ?? '',
      recordedAt: toDateTimeInputValue(item?.recordedAt),
      note: item?.note ?? '',
    },
  })

  const vitalSettingId = useWatch({ control, name: 'vitalSettingId' })
  const settings = settingsQuery.data ?? []
  const selectedSetting = settings.find((s) => s.id === vitalSettingId)
  const showCurrentOption = !!item?.vitalSettingId && !settings.some((s) => s.id === item.vitalSettingId)

  const onSubmit = (values: VitalFormValues) => {
    const payload: ResidentVitalPayload = {
      vitalSettingId: values.vitalSettingId,
      value: values.value,
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
          <DialogTitle>{isEdit ? 'Edit Vital' : 'Add Vital'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this vital reading.' : 'Record a vital reading for this resident.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label>
              Vital Type <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="vitalSettingId"
              control={control}
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={(value) => field.onChange(value ?? '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={settingsQuery.isLoading ? 'Loading vitals...' : 'Select vital type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {showCurrentOption && item && <SelectItem value={item.vitalSettingId}>{item.name}</SelectItem>}
                    {settings.map((setting) => (
                      <SelectItem key={setting.id} value={setting.id} label={setting.name}>
                        {setting.name}
                        {setting.unit ? <span className="text-xs text-gray-400">({setting.unit})</span> : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.vitalSettingId && <p className="text-xs text-red-500">{errors.vitalSettingId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vital-value">
              Reading <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="vital-value"
                placeholder={selectedSetting?.inputType === 'composite' ? 'e.g. 120/80' : 'e.g. 98.6'}
                {...register('value')}
              />
              {(selectedSetting?.unit || item?.unit) && (
                <span className="shrink-0 text-xs text-gray-500">{selectedSetting?.unit || item?.unit}</span>
              )}
            </div>
            {errors.value && <p className="text-xs text-red-500">{errors.value.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vital-recorded-at">
              Recorded At <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vital-recorded-at"
              type="datetime-local"
              max={toDateTimeInputValue()}
              {...register('recordedAt')}
            />
            {errors.recordedAt && <p className="text-xs text-red-500">{errors.recordedAt.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vital-note">Note</Label>
            <Textarea id="vital-note" rows={3} placeholder="Add a note (optional)" {...register('note')} />
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

export default VitalFormModal
