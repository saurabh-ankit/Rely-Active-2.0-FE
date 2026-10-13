import type { ReactNode } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Field, FieldLabel, FieldError, FieldSet, FieldLegend } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RequiredLabel } from '@/components/inventory/InventoryCells'
import { brandCheckbox } from '@/components/inventory/brand'

export function FormInput({
  name,
  label,
  type = 'text',
  min,
  step,
  children,
}: {
  name: string
  label: string
  type?: string
  min?: number
  step?: number
  children?: ReactNode
}) {
  const { register, getFieldState, formState } = useFormContext()
  const error = getFieldState(name, formState).error
  const props = {
    id: name,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${name}-error` : undefined,
    ...register(name, { valueAsNumber: type === 'number' }),
  }
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={name}>
        <RequiredLabel text={label} />
      </FieldLabel>
      {children ? (
        <NativeSelect {...props}>{children}</NativeSelect>
      ) : type === 'textarea' ? (
        <Textarea {...props} />
      ) : (
        <Input {...props} type={type} min={min} step={step} />
      )}
      <FieldError id={`${name}-error`} errors={[error]} />
    </Field>
  )
}
export function FormCheck({ name, label }: { name: string; label: string }) {
  const { control } = useFormContext()
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field orientation="horizontal" data-invalid={!!fieldState.error}>
          <Checkbox
            id={name}
            className={brandCheckbox}
            checked={!!field.value}
            onCheckedChange={field.onChange}
            aria-invalid={!!fieldState.error}
          />
          <FieldLabel htmlFor={name}>
            <RequiredLabel text={label} />
          </FieldLabel>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
export function LocationChecks({ options }: { options: { id: string; name: string; disabled?: boolean }[] }) {
  const { control } = useFormContext()
  return (
    <FieldSet>
      <FieldLegend>Assigned locations</FieldLegend>
      <Controller
        name="locationIds"
        control={control}
        render={({ field, fieldState }) => (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {options.map((option) => (
                <Field key={option.id} orientation="horizontal">
                  <Checkbox
                    id={`location-${option.id}`}
                    className={brandCheckbox}
                    checked={(field.value as string[]).includes(option.id)}
                    disabled={option.disabled && !(field.value as string[]).includes(option.id)}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked
                          ? [...field.value, option.id]
                          : (field.value as string[]).filter((x) => x !== option.id),
                      )
                    }
                  />
                  <FieldLabel htmlFor={`location-${option.id}`}>{option.name}</FieldLabel>
                </Field>
              ))}
            </div>
            {!options.length && (
              <p className="text-sm text-muted-foreground">
                No eligible locations. Assign locations to the category first.
              </p>
            )}
            <FieldError errors={[fieldState.error]} />
          </>
        )}
      />
    </FieldSet>
  )
}
export function FormActions({
  onClose,
  pending,
  disabled = false,
}: {
  onClose: () => void
  pending: boolean
  disabled?: boolean
}) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" disabled={pending || disabled}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
    </div>
  )
}
export function RootError() {
  const { formState } = useFormContext()
  return formState.errors.root?.message ? (
    <Alert variant="destructive">
      <AlertDescription>{String(formState.errors.root.message)}</AlertDescription>
    </Alert>
  ) : null
}
export function SelectOptions({
  values,
  placeholder = 'Select an option',
}: {
  values: string[]
  placeholder?: string
}) {
  return (
    <>
      <NativeSelectOption value="">{placeholder}</NativeSelectOption>
      {values.map((value) => (
        <NativeSelectOption key={value} value={value}>
          {value}
        </NativeSelectOption>
      ))}
    </>
  )
}
