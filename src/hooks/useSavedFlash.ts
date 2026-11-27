import { useCallback, useEffect, useRef, useState } from 'react'

/** How long "✓ Saved" stays on the button before the follow-up (usually closing the dialog) runs. */
const SAVED_FLASH_MS = 650

/**
 * Brief "saved" state for a submit button. Call `flashSaved(then)` on success: the button shows ✓ Saved,
 * then `then` runs (e.g. close the dialog). Under reduced motion the pause still happens, just without the pop.
 */
export function useSavedFlash() {
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const flashSaved = useCallback((then?: () => void) => {
    setSaved(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setSaved(false)
      then?.()
    }, SAVED_FLASH_MS)
  }, [])

  return { saved, flashSaved }
}
