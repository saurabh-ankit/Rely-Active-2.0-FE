import type { ReactNode } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Field, FieldLabel, FieldError, FieldSet, FieldLegend } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function FormInput({
  name,
  label,
  type = 'text',
  children,
}: {
  name: string
  label: string
  type?: string
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
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      {children ? (
        <NativeSelect {...props}>{children}</NativeSelect>
      ) : type === 'textarea' ? (
        <Textarea {...props} />
      ) : (
        <Input {...props} type={type} />
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
            checked={!!field.value}
            onCheckedChange={field.onChange}
            aria-invalid={!!fieldState.error}
          />
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
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
    <div className="flex justify-end gap-2">
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
