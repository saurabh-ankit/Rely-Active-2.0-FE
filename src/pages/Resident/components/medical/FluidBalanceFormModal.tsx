import { useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateResidentFluidBalanceMutation,
  useUpdateResidentFluidBalanceMutation,
} from '@/hooks/react-query/resident'
import {
  BOWEL_COMFORT_OPTIONS,
  BowelComfortLevel,
  FLUID_INTAKE_TYPE_OPTIONS,
  FLUID_OUTPUT_TYPE_OPTIONS,
  FLUID_UNIT_OPTIONS,
  FluidBalanceCategory,
  FluidIntakeType,
  FluidOutputType,
  FluidUnit,
  IV_FLUID_TYPE_OPTIONS,
  IvFluidType,
  STOOL_TYPE_OPTIONS,
  StoolType,
} from '@/lib/constants/fluidBalance'
import type {
  ResidentFluidBalanceItem,
  ResidentFluidBalancePayload,
  ResidentFluidBalanceUpdatePayload,
} from '@/lib/types/resident'
import {
  fromDateTimeInputValue,
  isNotFutureDateTimeInput,
  isValidDateTimeInput,
  toDateTimeInputValue,
} from './clinicalFormUtils'

const intakeSchema = z.object({
  type: z.enum([FluidIntakeType.ORAL_NG, FluidIntakeType.NASAL_FEED, FluidIntakeType.IV_FLUIDS]),
  ivFluidType: z
    .enum([
      IvFluidType.NS,
      IvFluidType.NS_WITH_INJECTION,
      IvFluidType.DNS,
      IvFluidType.RL,
      IvFluidType.D5,
      IvFluidType.D25,
    ])
    .nullable()
    .optional(),
  description: z.string().trim().max(150),
  quantity: z.string().trim().min(1, 'Quantity is required'),
  unit: z.enum([FluidUnit.ML, FluidUnit.L]),
})

const outputSchema = z.object({
  type: z.enum([FluidOutputType.URINE, FluidOutputType.VOMIT_DRAIN]),
  quantity: z.string().trim().min(1, 'Quantity is required'),
  unit: z.enum([FluidUnit.ML, FluidUnit.L]),
  collectedBy: z.string().trim().max(150),
})

const createSchema = z
  .object({
    recordedAt: z
      .string()
      .refine(isValidDateTimeInput, 'Recorded at is required')
      .refine(isNotFutureDateTimeInput, 'Recorded at cannot be in the future'),
    intakes: z.array(intakeSchema),
    outputs: z.array(outputSchema),
    includeBowel: z.boolean(),
    stoolType: z.enum([StoolType.HARD, StoolType.NORMAL, StoolType.LOOSE]),
    comfortLevel: z.enum([BowelComfortLevel.EASY, BowelComfortLevel.STRAINED, BowelComfortLevel.PAINFUL]),
    bowelNote: z.string().trim().max(5000),
  })
  .superRefine((data, ctx) => {
    if (data.intakes.length + data.outputs.length === 0 && !data.includeBowel) {
      ctx.addIssue({ code: 'custom', message: 'Add at least one intake, output or bowel movement', path: ['intakes'] })
    }
    data.intakes.forEach((row, index) => {
      const qty = Number(row.quantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid quantity', path: ['intakes', index, 'quantity'] })
      }
      if (row.type === FluidIntakeType.IV_FLUIDS && !row.ivFluidType) {
        ctx.addIssue({ code: 'custom', message: 'Select IV fluid type', path: ['intakes', index, 'ivFluidType'] })
      }
    })
    data.outputs.forEach((row, index) => {
      const qty = Number(row.quantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid quantity', path: ['outputs', index, 'quantity'] })
      }
    })
  })

const editSchema = z.object({
  recordedAt: z
    .string()
    .refine(isValidDateTimeInput, 'Recorded at is required')
    .refine(isNotFutureDateTimeInput, 'Recorded at cannot be in the future'),
  type: z.string().optional(),
  ivFluidType: z.string().nullable().optional(),
  description: z.string().trim().max(150).optional(),
  quantity: z.string().trim().optional(),
  unit: z.enum([FluidUnit.ML, FluidUnit.L]).optional(),
  collectedBy: z.string().trim().max(150).optional(),
  stoolType: z.enum([StoolType.HARD, StoolType.NORMAL, StoolType.LOOSE]).optional(),
  comfortLevel: z.enum([BowelComfortLevel.EASY, BowelComfortLevel.STRAINED, BowelComfortLevel.PAINFUL]).optional(),
  note: z.string().trim().max(5000).optional(),
})

type CreateFormValues = z.infer<typeof createSchema>
type EditFormValues = z.infer<typeof editSchema>

interface FluidBalanceFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  item?: ResidentFluidBalanceItem | null
}

const emptyIntake = (): CreateFormValues['intakes'][number] => ({
  type: FluidIntakeType.ORAL_NG,
  ivFluidType: null,
  description: '',
  quantity: '',
  unit: FluidUnit.ML,
})

const emptyOutput = (): CreateFormValues['outputs'][number] => ({
  type: FluidOutputType.URINE,
  quantity: '',
  unit: FluidUnit.ML,
  collectedBy: '',
})

const FluidBalanceFormModal = ({ open, onOpenChange, residentId, item }: FluidBalanceFormModalProps) => {
  const createMutation = useCreateResidentFluidBalanceMutation(residentId)
  const updateMutation = useUpdateResidentFluidBalanceMutation(residentId)
  const isPending = createMutation.isPending || updateMutation.isPending
  const isEdit = !!item

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      recordedAt: toDateTimeInputValue(),
      intakes: [emptyIntake()],
      outputs: [],
      includeBowel: false,
      stoolType: StoolType.NORMAL,
      comfortLevel: BowelComfortLevel.EASY,
      bowelNote: '',
    },
  })

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      recordedAt: toDateTimeInputValue(item?.recordedAt),
      type: item?.fluidType ?? undefined,
      ivFluidType: item?.ivFluidType ?? null,
      description: item?.description ?? '',
      quantity: item?.quantity != null ? String(item.quantity) : '',
      unit: item?.unit ?? FluidUnit.ML,
      collectedBy: item?.collectedBy ?? '',
      stoolType: item?.stoolType ?? StoolType.NORMAL,
      comfortLevel: item?.comfortLevel ?? BowelComfortLevel.EASY,
      note: item?.note ?? '',
    },
  })

  const intakeArray = useFieldArray({ control: createForm.control, name: 'intakes' })
  const outputArray = useFieldArray({ control: createForm.control, name: 'outputs' })
  const includeBowel = useWatch({ control: createForm.control, name: 'includeBowel' })
  const watchedIntakes = useWatch({ control: createForm.control, name: 'intakes' })
  const editType = useWatch({ control: editForm.control, name: 'type' })
  const [formError, setFormError] = useState<string | null>(null)

  const editCategory = useMemo(() => item?.category, [item])

  const onCreate = (values: CreateFormValues) => {
    setFormError(null)
    const payload: ResidentFluidBalancePayload = {
      recordedAt: fromDateTimeInputValue(values.recordedAt),
      intakes: values.intakes.map((row) => ({
        type: row.type,
        ivFluidType: row.type === FluidIntakeType.IV_FLUIDS ? (row.ivFluidType ?? null) : null,
        description: row.type === FluidIntakeType.ORAL_NG ? row.description || null : null,
        quantity: Number(row.quantity),
        unit: row.unit,
      })),
      outputs: values.outputs.map((row) => ({
        type: row.type,
        quantity: Number(row.quantity),
        unit: row.unit,
        collectedBy: row.collectedBy || null,
      })),
      bowel: values.includeBowel
        ? {
            stoolType: values.stoolType,
            comfortLevel: values.comfortLevel,
            note: values.bowelNote || null,
          }
        : null,
    }
    createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) })
  }

  const onEdit = (values: EditFormValues) => {
    if (!item) return
    setFormError(null)
    const payload: ResidentFluidBalanceUpdatePayload = {
      recordedAt: fromDateTimeInputValue(values.recordedAt),
    }
    if (item.category === FluidBalanceCategory.INTAKE || item.category === FluidBalanceCategory.OUTPUT) {
      const qty = Number(values.quantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        setFormError('Enter a valid quantity')
        return
      }
      payload.type = values.type || item.fluidType
      payload.quantity = qty
      payload.unit = values.unit || item.unit || FluidUnit.ML
      if (item.category === FluidBalanceCategory.INTAKE) {
        payload.ivFluidType = (values.ivFluidType as IvFluidType | null | undefined) ?? null
        payload.description = values.description || null
      } else {
        payload.collectedBy = values.collectedBy || null
      }
    } else {
      payload.stoolType = values.stoolType
      payload.comfortLevel = values.comfortLevel
      payload.note = values.note || null
    }
    updateMutation.mutate({ id: item.id, payload }, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Fluid Balance' : 'Add Fluid Balance'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this fluid balance entry.'
              : 'Record intake, output and/or bowel movement for this resident.'}
          </DialogDescription>
        </DialogHeader>

        {isEdit && item ? (
          <form onSubmit={editForm.handleSubmit(onEdit)} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label>Recorded At</Label>
              <Input type="datetime-local" max={toDateTimeInputValue()} {...editForm.register('recordedAt')} />
              {editForm.formState.errors.recordedAt && (
                <p className="text-xs text-red-500">{editForm.formState.errors.recordedAt.message}</p>
              )}
            </div>

            {(editCategory === FluidBalanceCategory.INTAKE || editCategory === FluidBalanceCategory.OUTPUT) && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Controller
                      control={editForm.control}
                      name="type"
                      render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {(editCategory === FluidBalanceCategory.INTAKE
                              ? FLUID_INTAKE_TYPE_OPTIONS
                              : FLUID_OUTPUT_TYPE_OPTIONS
                            ).map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <div className="flex gap-2">
                      <Input type="number" step="any" min="0" {...editForm.register('quantity')} />
                      <Controller
                        control={editForm.control}
                        name="unit"
                        render={({ field }) => (
                          <Select value={field.value || FluidUnit.ML} onValueChange={field.onChange}>
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FLUID_UNIT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                </div>
                {editCategory === FluidBalanceCategory.INTAKE && editType === FluidIntakeType.IV_FLUIDS && (
                  <div className="space-y-2">
                    <Label>IV Fluid Type</Label>
                    <Controller
                      control={editForm.control}
                      name="ivFluidType"
                      render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select IV type" />
                          </SelectTrigger>
                          <SelectContent>
                            {IV_FLUID_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
                {editCategory === FluidBalanceCategory.INTAKE && editType === FluidIntakeType.ORAL_NG && (
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input placeholder="e.g. Water, Juice" {...editForm.register('description')} />
                  </div>
                )}
                {editCategory === FluidBalanceCategory.OUTPUT && (
                  <div className="space-y-2">
                    <Label>Collected By</Label>
                    <Input {...editForm.register('collectedBy')} />
                  </div>
                )}
              </>
            )}

            {editCategory === FluidBalanceCategory.BOWEL && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Stool Type</Label>
                    <Controller
                      control={editForm.control}
                      name="stoolType"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STOOL_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Comfort</Label>
                    <Controller
                      control={editForm.control}
                      name="comfortLevel"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BOWEL_COMFORT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea rows={3} {...editForm.register('note')} />
                </div>
              </>
            )}

            {formError && <p className="text-xs text-red-500">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-[#005390] hover:bg-[#004a80] text-white">
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit(onCreate)} noValidate className="space-y-5">
            <div className="space-y-2">
              <Label>Recorded At</Label>
              <Input type="datetime-local" max={toDateTimeInputValue()} {...createForm.register('recordedAt')} />
              {createForm.formState.errors.recordedAt && (
                <p className="text-xs text-red-500">{createForm.formState.errors.recordedAt.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Intake</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => intakeArray.append(emptyIntake())}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              {intakeArray.fields.map((field, index) => {
                const type = watchedIntakes?.[index]?.type
                return (
                  <div key={field.id} className="rounded-xl border p-3 space-y-3">
                    <div className="flex justify-between gap-2">
                      <Controller
                        control={createForm.control}
                        name={`intakes.${index}.type`}
                        render={({ field: typeField }) => (
                          <Select value={typeField.value} onValueChange={typeField.onChange}>
                            <SelectTrigger className="max-w-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FLUID_INTAKE_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => intakeArray.remove(index)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                    {type === FluidIntakeType.IV_FLUIDS && (
                      <Controller
                        control={createForm.control}
                        name={`intakes.${index}.ivFluidType`}
                        render={({ field: ivField }) => (
                          <Select value={ivField.value || ''} onValueChange={ivField.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="IV fluid type" />
                            </SelectTrigger>
                            <SelectContent>
                              {IV_FLUID_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                    {type === FluidIntakeType.ORAL_NG && (
                      <Input
                        placeholder="Description (e.g. Water)"
                        {...createForm.register(`intakes.${index}.description`)}
                      />
                    )}
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Quantity"
                        {...createForm.register(`intakes.${index}.quantity`)}
                      />
                      <Controller
                        control={createForm.control}
                        name={`intakes.${index}.unit`}
                        render={({ field: unitField }) => (
                          <Select value={unitField.value} onValueChange={unitField.onChange}>
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FLUID_UNIT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                )
              })}
              {createForm.formState.errors.intakes?.root && (
                <p className="text-xs text-red-500">{createForm.formState.errors.intakes.root.message}</p>
              )}
              {typeof createForm.formState.errors.intakes?.message === 'string' && (
                <p className="text-xs text-red-500">{createForm.formState.errors.intakes.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Output</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => outputArray.append(emptyOutput())}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              {outputArray.fields.map((field, index) => (
                <div key={field.id} className="rounded-xl border p-3 space-y-3">
                  <div className="flex justify-between gap-2">
                    <Controller
                      control={createForm.control}
                      name={`outputs.${index}.type`}
                      render={({ field: typeField }) => (
                        <Select value={typeField.value} onValueChange={typeField.onChange}>
                          <SelectTrigger className="max-w-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FLUID_OUTPUT_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => outputArray.remove(index)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Quantity"
                      {...createForm.register(`outputs.${index}.quantity`)}
                    />
                    <Controller
                      control={createForm.control}
                      name={`outputs.${index}.unit`}
                      render={({ field: unitField }) => (
                        <Select value={unitField.value} onValueChange={unitField.onChange}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FLUID_UNIT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <Input
                    placeholder="Collected by (optional)"
                    {...createForm.register(`outputs.${index}.collectedBy`)}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-xl border p-3">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" {...createForm.register('includeBowel')} className="rounded border-gray-300" />
                Include bowel movement
              </label>
              {includeBowel && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Controller
                    control={createForm.control}
                    name="stoolType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Stool type" />
                        </SelectTrigger>
                        <SelectContent>
                          {STOOL_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Controller
                    control={createForm.control}
                    name="comfortLevel"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Comfort" />
                        </SelectTrigger>
                        <SelectContent>
                          {BOWEL_COMFORT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <div className="sm:col-span-2">
                    <Textarea rows={2} placeholder="Note (optional)" {...createForm.register('bowelNote')} />
                  </div>
                </div>
              )}
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
        )}
      </DialogContent>
    </Dialog>
  )
}

export default FluidBalanceFormModal
