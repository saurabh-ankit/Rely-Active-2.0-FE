import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateResidentInsulinMutation,
  useCreateResidentMedicationMutation,
  useResidentMedicinesQuery,
  useUpdateResidentInsulinMutation,
  useUpdateResidentMedicationMutation,
} from '@/hooks/react-query/resident'
import { useDebounce } from '@/hooks/useDebounce'
import { MedicationMealTiming, MedicationRoute } from '@/lib/constants/medication'
import type {
  LocationMedicineOption,
  MedicationTimeOfDay,
  ResidentMedicationItem,
  ResidentMedicationPayload,
} from '@/lib/types/resident'
import { cn } from '@/lib/utils'
import { MEAL_TIMING_OPTIONS, ROUTE_LABELS, TIME_OF_DAY_DEFAULT_TIMES, TIME_OF_DAY_LABELS } from './clinicalConstants'
import { isValidDateInput, toDateInputValue, todayDateInputValue } from './clinicalFormUtils'

export type MedicationKind = 'medication' | 'insulin'

const TIMES_OF_DAY = Object.keys(TIME_OF_DAY_LABELS) as MedicationTimeOfDay[]
const ROUTES = Object.values(MedicationRoute)

const timingSchema = z.object({
  timeOfDay: z.enum(TIMES_OF_DAY as [MedicationTimeOfDay, ...MedicationTimeOfDay[]]),
  selected: z.boolean(),
  time: z.string(),
  dose: z.string(),
  route: z.enum(MedicationRoute),
  mealTiming: z.enum(MedicationMealTiming),
})

const medicationSchema = z
  .object({
    inventoryItemId: z.string().min(1, 'Select a medicine'),
    startDate: z.string().min(1, 'Start date is required').refine(isValidDateInput, 'Enter a valid start date'),
    isUntilDischarge: z.boolean(),
    endDate: z.string().refine((value) => !value || isValidDateInput(value), 'Enter a valid end date'),
    timings: z.array(timingSchema),
    note: z.string().trim().max(5000, 'Note must be 5000 characters or fewer'),
  })
  .superRefine((data, ctx) => {
    if (!data.isUntilDischarge) {
      if (!data.endDate) {
        ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date is required' })
      } else if (isValidDateInput(data.startDate) && data.endDate < data.startDate) {
        ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date must be on or after start date' })
      }
    }
    if (!data.timings.some((t) => t.selected)) {
      ctx.addIssue({ code: 'custom', path: ['timings'], message: 'Select at least one intake time' })
    }
    data.timings.forEach((t, index) => {
      if (!t.selected) return
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)) {
        ctx.addIssue({ code: 'custom', path: ['timings', index, 'time'], message: 'Enter a valid time' })
      }
      const dose = Number(t.dose)
      if (t.dose.trim() === '' || !Number.isFinite(dose) || dose < 0) {
        ctx.addIssue({ code: 'custom', path: ['timings', index, 'dose'], message: 'Enter a valid dose' })
      }
    })
  })

type MedicationFormValues = z.infer<typeof medicationSchema>

const buildDefaultTimings = (item?: ResidentMedicationItem | null): MedicationFormValues['timings'] =>
  TIMES_OF_DAY.map((timeOfDay) => {
    const existing = item?.timings.find((t) => t.timeOfDay === timeOfDay)
    return {
      timeOfDay,
      selected: existing?.selected ?? false,
      time: existing?.time ?? TIME_OF_DAY_DEFAULT_TIMES[timeOfDay],
      dose: existing ? String(existing.dose) : '1',
      route: existing?.route ?? MedicationRoute.ORAL,
      mealTiming: existing?.mealTiming ?? MedicationMealTiming.NONE,
    }
  })

const currentMedicineOption = (item: ResidentMedicationItem): LocationMedicineOption => ({
  id: item.inventoryItemId,
  name: item.medicineName,
  packType: null,
  packQuantity: null,
  packUnit: null,
  quantity: 0,
  stockDisplay: '',
})

interface MedicationFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  kind: MedicationKind
  item?: ResidentMedicationItem | null
}

const MedicationFormModal = ({ open, onOpenChange, residentId, kind, item }: MedicationFormModalProps) => {
  const isInsulin = kind === 'insulin'
  const label = isInsulin ? 'Insulin' : 'Medication'

  const [selectedMedicine, setSelectedMedicine] = useState<LocationMedicineOption | null>(() =>
    item ? currentMedicineOption(item) : null,
  )
  const [medicineSearch, setMedicineSearch] = useState('')
  const debouncedSearch = useDebounce(medicineSearch.trim(), 300)
  // The input shows the selected name once picked; don't narrow the list to just that item.
  const search = debouncedSearch && debouncedSearch !== selectedMedicine?.name ? debouncedSearch : undefined
  const medicinesQuery = useResidentMedicinesQuery(
    residentId,
    isInsulin ? { packType: 'vial', search } : { excludePackType: 'vial', search },
    open,
  )
  const createMedication = useCreateResidentMedicationMutation(residentId)
  const updateMedication = useUpdateResidentMedicationMutation(residentId)
  const createInsulin = useCreateResidentInsulinMutation(residentId)
  const updateInsulin = useUpdateResidentInsulinMutation(residentId)
  const createMutation = isInsulin ? createInsulin : createMedication
  const updateMutation = isInsulin ? updateInsulin : updateMedication
  const isPending = createMutation.isPending || updateMutation.isPending
  const isEdit = !!item

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationSchema),
    mode: 'onTouched',
    defaultValues: {
      inventoryItemId: item?.inventoryItemId ?? '',
      startDate: item ? toDateInputValue(item.startDate) : todayDateInputValue(),
      isUntilDischarge: item?.isUntilDischarge ?? false,
      endDate: toDateInputValue(item?.endDate),
      timings: buildDefaultTimings(item),
      note: item?.note ?? '',
    },
  })

  const isUntilDischarge = useWatch({ control, name: 'isUntilDischarge' })
  const timings = useWatch({ control, name: 'timings' })
  const startDate = useWatch({ control, name: 'startDate' })
  const endDate = useWatch({ control, name: 'endDate' })

  // The start/end ordering error lives on endDate, so re-check it whenever either date changes.
  useEffect(() => {
    if (!isUntilDischarge && getValues('endDate')) void trigger('endDate')
  }, [startDate, endDate, isUntilDischarge, getValues, trigger])

  const medicines = medicinesQuery.data ?? []
  const medicineOptions =
    selectedMedicine && !medicines.some((m) => m.id === selectedMedicine.id)
      ? [selectedMedicine, ...medicines]
      : medicines
  const selectedStock =
    medicines.find((m) => m.id === selectedMedicine?.id)?.stockDisplay || selectedMedicine?.stockDisplay

  const onSubmit = (values: MedicationFormValues) => {
    const payload: ResidentMedicationPayload = {
      inventoryItemId: values.inventoryItemId,
      startDate: values.startDate,
      endDate: values.isUntilDischarge ? null : values.endDate,
      isUntilDischarge: values.isUntilDischarge,
      timings: values.timings.map((t) => {
        const dose = Number(t.dose)
        return { ...t, dose: Number.isFinite(dose) && dose >= 0 ? dose : 0 }
      }),
      note: values.note || null,
    }
    const onSuccess = () => onOpenChange(false)
    if (item) updateMutation.mutate({ id: item.id, payload }, { onSuccess })
    else createMutation.mutate(payload, { onSuccess })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${label}` : `Add ${label}`}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update this ${label.toLowerCase()} prescription.`
              : `Prescribe ${isInsulin ? 'insulin' : 'a medication'} for this resident.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label>
              {isInsulin ? 'Insulin' : 'Medicine'} <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="inventoryItemId"
              control={control}
              render={({ field }) => (
                <Combobox
                  items={medicineOptions}
                  value={selectedMedicine}
                  onValueChange={(value: LocationMedicineOption | null) => {
                    setSelectedMedicine(value)
                    field.onChange(value?.id ?? '')
                  }}
                  onInputValueChange={(value: string) => setMedicineSearch(value)}
                  itemToStringLabel={(medicine: LocationMedicineOption) => medicine.name}
                  isItemEqualToValue={(a: LocationMedicineOption, b: LocationMedicineOption) => a.id === b.id}
                >
                  <ComboboxInput
                    id="medication-medicine"
                    className="w-full"
                    placeholder={`Search ${isInsulin ? 'insulin' : 'medicines'}...`}
                    showClear
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>
                      {medicinesQuery.isFetching ? 'Searching...' : `No ${label.toLowerCase()} found at this location.`}
                    </ComboboxEmpty>
                    <ComboboxList>
                      {(medicine: LocationMedicineOption) => (
                        <ComboboxItem key={medicine.id} value={medicine}>
                          <span className="flex-1 truncate">{medicine.name}</span>
                          {medicine.stockDisplay && (
                            <span className="shrink-0 text-xs text-gray-400">{medicine.stockDisplay}</span>
                          )}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            />
            {selectedStock && (
              <p className="text-[11px] font-semibold text-[#005390] dark:text-sky-400">Stock: {selectedStock}</p>
            )}
            {errors.inventoryItemId && <p className="text-xs text-red-500">{errors.inventoryItemId.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="medication-start-date">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input id="medication-start-date" type="date" {...register('startDate')} />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="medication-end-date">
                End Date {!isUntilDischarge && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="medication-end-date"
                type="date"
                min={isValidDateInput(startDate) ? startDate : undefined}
                readOnly={isUntilDischarge}
                className={cn(isUntilDischarge && 'opacity-50')}
                {...register('endDate')}
              />
              {errors.endDate && <p className="text-xs text-red-500">{errors.endDate.message}</p>}
            </div>
          </div>

          <Controller
            name="isUntilDischarge"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="medication-until-discharge"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked === true)
                    if (checked === true) {
                      setValue('endDate', '')
                      clearErrors('endDate')
                    }
                  }}
                />
                <Label htmlFor="medication-until-discharge" className="font-normal text-gray-700 dark:text-gray-300">
                  Until discharge
                </Label>
              </div>
            )}
          />

          <div className="space-y-2">
            <Label>
              Timings & Dosage <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-2">
              {TIMES_OF_DAY.map((timeOfDay, index) => {
                const selected = timings?.[index]?.selected ?? false
                const rowErrors = errors.timings?.[index]
                return (
                  <div
                    key={timeOfDay}
                    className={cn(
                      'rounded-xl border p-3 transition-colors',
                      selected
                        ? 'border-sky-200 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/20'
                        : 'border-gray-200 dark:border-gray-800',
                    )}
                  >
                    <div className="grid grid-cols-2 items-center gap-3 sm:grid-cols-[120px_1fr_1fr_1fr_1fr]">
                      <Controller
                        name={`timings.${index}.selected`}
                        control={control}
                        render={({ field }) => (
                          <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                            <Checkbox
                              id={`medication-timing-${timeOfDay}`}
                              checked={field.value}
                              onCheckedChange={(checked) => field.onChange(checked === true)}
                            />
                            <Label
                              htmlFor={`medication-timing-${timeOfDay}`}
                              className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                            >
                              {TIME_OF_DAY_LABELS[timeOfDay]}
                            </Label>
                          </div>
                        )}
                      />
                      <Input
                        type="time"
                        aria-label={`${TIME_OF_DAY_LABELS[timeOfDay]} time`}
                        readOnly={!selected}
                        className={cn(!selected && 'opacity-50')}
                        {...register(`timings.${index}.time`)}
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        placeholder="Dose"
                        aria-label={`${TIME_OF_DAY_LABELS[timeOfDay]} dose`}
                        readOnly={!selected}
                        className={cn(!selected && 'opacity-50')}
                        {...register(`timings.${index}.dose`)}
                      />
                      <Controller
                        name={`timings.${index}.route`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(value) => value && field.onChange(value)}
                            disabled={!selected}
                          >
                            <SelectTrigger className="w-full" aria-label={`${TIME_OF_DAY_LABELS[timeOfDay]} route`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROUTES.map((route) => (
                                <SelectItem key={route} value={route}>
                                  {ROUTE_LABELS[route]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Controller
                        name={`timings.${index}.mealTiming`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(value) => value && field.onChange(value)}
                            disabled={!selected}
                          >
                            <SelectTrigger
                              className="w-full"
                              aria-label={`${TIME_OF_DAY_LABELS[timeOfDay]} meal timing`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MEAL_TIMING_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    {(rowErrors?.time || rowErrors?.dose) && (
                      <p className="mt-1 text-xs text-red-500">
                        {rowErrors?.time?.message || rowErrors?.dose?.message}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
            {errors.timings?.root?.message && <p className="text-xs text-red-500">{errors.timings.root.message}</p>}
            {errors.timings?.message && <p className="text-xs text-red-500">{errors.timings.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="medication-note">Note</Label>
            <Textarea id="medication-note" rows={3} placeholder="Add a note (optional)" {...register('note')} />
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

export default MedicationFormModal
