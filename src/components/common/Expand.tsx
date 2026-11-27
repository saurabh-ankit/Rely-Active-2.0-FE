import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Animated replacement for `{open && <div>…</div>}`: slides the content open (height + fade) and closed again.
 * Under reduced motion, MotionConfig makes it instant.
 */
export function Expand({
  open,
  children,
  className,
  appear = false,
}: {
  open: boolean
  children: ReactNode
  className?: string
  /** Also animate when first mounted open, e.g. inside a table row that is itself rendered conditionally. */
  appear?: boolean
}) {
  return (
    <AnimatePresence initial={appear}>
      {open && (
        <motion.div
          key="expand"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1, transition: { duration: 0.28, ease: EASE } }}
          exit={{ height: 0, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
          className={cn('overflow-hidden', className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Chevron for expandable rows: points right/down and turns smoothly between the two. */
export function ExpandChevron({
  open,
  className,
  from = 'right',
}: {
  open: boolean
  className?: string
  /** 'right' turns → to ↓ (tree rows); 'down' turns ↓ to ↑ (panels). */
  from?: 'right' | 'down'
}) {
  return (
    <ChevronDown
      aria-hidden
      className={cn(
        'shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none',
        from === 'right' ? (open ? 'rotate-0' : '-rotate-90') : open ? 'rotate-180' : 'rotate-0',
        className,
      )}
    />
  )
}
