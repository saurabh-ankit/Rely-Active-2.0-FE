import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

/**
 * Module key for a path: '/admin/inventory/home' → 'admin/inventory', '/dashboard' → 'dashboard'.
 * Keying on the module (not the full path) keeps tab/sub-route switches inside a module from re-animating.
 */
function moduleKey(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  return parts[0] === 'admin' ? parts.slice(0, 2).join('/') : (parts[0] ?? '')
}

/** Fades and lifts page content in when the user moves to a different module. Enter-only, so navigation is never delayed. */
export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  return (
    <motion.div
      key={moduleKey(pathname)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="flex w-full flex-1 flex-col"
    >
      {children}
    </motion.div>
  )
}
