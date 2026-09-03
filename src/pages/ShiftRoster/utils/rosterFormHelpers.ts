import type { FieldErrors, FieldValues } from 'react-hook-form'
import { notifyError } from '@/utils/toast'

export function collectFieldErrorMessages<T extends FieldValues>(
  errors: FieldErrors<T>,
  messages: string[] = [],
): string[] {
  Object.values(errors).forEach((error) => {
    if (!error) return
    if (typeof error === 'object' && 'message' in error && error.message) {
      messages.push(String(error.message))
      return
    }
    if (typeof error === 'object') {
      collectFieldErrorMessages(error as FieldErrors<T>, messages)
    }
  })
  return messages
}

export function notifyFormValidationErrors<T extends FieldValues>(
  errors: FieldErrors<T>,
  title = 'Validation Error',
  fallbackMessage = 'Please fill in all required fields marked with *.',
) {
  const messages = collectFieldErrorMessages(errors)
  notifyError(title, messages[0] || fallbackMessage)
}

export function notifyZodValidationError(message: string, title = 'Validation Error') {
  notifyError(title, message)
}
