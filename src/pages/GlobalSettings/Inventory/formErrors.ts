import { isAxiosError } from 'axios'
import type { FieldValues, UseFormReturn, Path } from 'react-hook-form'
export function setInventoryFormError<T extends FieldValues>(form: UseFormReturn<T>, error: unknown) {
  const data = isAxiosError<{ message?: string; errors?: { field: string; message: string }[] }>(error)
    ? error.response?.data
    : undefined
  form.setError('root', { message: data?.message ?? 'Unable to save. Please try again.' })
  for (const issue of data?.errors ?? []) {
    const field = issue.field.replace(/^customFields\./, 'values.').replace(/(^|\.)enumValues$/, '$1options')
    form.setError(field as Path<T>, { message: issue.message })
  }
}
