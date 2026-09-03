export function FieldErrorMessage({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-rose-600 mt-1 font-medium">{message}</p>
}
