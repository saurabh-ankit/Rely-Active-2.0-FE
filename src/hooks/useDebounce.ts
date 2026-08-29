import { useEffect, useState } from 'react'

/**
 * Custom hook to debounce a value
 * @param value The value to debounce
 * @param delay The debounce delay in milliseconds (default 400ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

export default useDebounce
