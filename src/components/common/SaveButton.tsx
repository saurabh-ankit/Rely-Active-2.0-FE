import { useEffect, useRef, type ComponentProps, type MouseEvent, type ReactNode } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SaveButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & {
  saving?: boolean
  saved?: boolean
  savedLabel?: string
  children: ReactNode
}

/** Signs that a form is showing validation errors (react-hook-form, shadcn fields, inline red messages). */
const INVALID_SELECTOR = [
  '[aria-invalid="true"]',
  '[data-slot="field-error"]',
  'p[class*="text-red-"]:not(.tabular-nums)',
  'p[class*="text-rose-"]:not(.tabular-nums)',
].join(',')

/**
 * Submit button with three looks: normal, spinner while saving, then a green ✓ that pops in once saved.
 * If a click doesn't start a save because the form shows validation errors, the button gives a short shake.
 */
export function SaveButton({
  saving = false,
  saved = false,
  savedLabel = 'Saved',
  disabled,
  className,
  children,
  onClick,
  ...props
}: SaveButtonProps) {
  // Latest state, read a moment after the click (validation runs asynchronously)
  const busyRef = useRef(false)
  useEffect(() => {
    busyRef.current = saving || saved
  }, [saving, saved])

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event as Parameters<NonNullable<typeof onClick>>[0])
    const button = event.currentTarget
    const form = button.form ?? button.closest('form')
    if (!form) return
    window.setTimeout(() => {
      if (busyRef.current || !form.querySelector(INVALID_SELECTOR)) return
      // Restart the animation even on repeated clicks
      button.classList.remove('shake-x')
      void button.offsetWidth
      button.classList.add('shake-x')
      button.addEventListener('animationend', () => button.classList.remove('shake-x'), { once: true })
    }, 160)
  }

  return (
    <Button
      {...props}
      onClick={handleClick}
      disabled={disabled || saving || saved}
      aria-live="polite"
      className={cn(
        className,
        'transition-colors duration-300',
        // Keep full opacity while showing the success state, even though the button is disabled.
        saved && 'bg-emerald-600 text-white hover:bg-emerald-600 disabled:opacity-100',
      )}
    >
      {saved ? (
        <span key="saved" className="inline-flex items-center gap-1.5">
          <Check
            className="size-4 animate-in zoom-in-0 spin-in-[-90deg] animation-duration-300 motion-reduce:animate-none"
            strokeWidth={3}
          />
          {savedLabel}
        </span>
      ) : (
        <>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {children}
        </>
      )}
    </Button>
  )
}
