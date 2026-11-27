import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: ReactNode
  /** A primary next step, e.g. "Create ticket". Omit when the user can't act (no permission, filtered view). */
  action?: { label: string; onClick: () => void; icon?: LucideIcon }
  /** 'danger' for load errors; 'default' otherwise. */
  tone?: 'default' | 'danger'
  /** 'sm' for table cells and narrow panes. */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Shared empty / nothing-here state: an icon in a soft halo that bobs gently, a title, a hint and an optional action.
 * Fades in on mount; the float stops under reduced motion.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'default',
  size = 'md',
  className,
}: EmptyStateProps) {
  const ActionIcon = action?.icon
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300 motion-reduce:animate-none',
        size === 'md' ? 'gap-3 px-6 py-12' : 'gap-2 px-4 py-8',
        className,
      )}
    >
      <div className="relative animate-float motion-reduce:animate-none">
        {/* Soft halo behind the icon */}
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 -m-2 rounded-full blur-md',
            tone === 'danger' ? 'bg-rose-100/70' : 'bg-[#005390]/8',
          )}
        />
        <span
          className={cn(
            'relative flex items-center justify-center rounded-2xl border shadow-xs',
            size === 'md' ? 'size-14' : 'size-11',
            tone === 'danger'
              ? 'border-rose-100 bg-rose-50 text-rose-500'
              : 'border-[#005390]/10 bg-linear-to-b from-white to-[#005390]/5 text-[#005390]/70',
          )}
        >
          <Icon className={size === 'md' ? 'size-6' : 'size-5'} strokeWidth={1.75} />
        </span>
      </div>
      <div className="max-w-sm space-y-1">
        <p className={cn('font-bold text-gray-800', size === 'md' ? 'text-sm' : 'text-[13px]')}>{title}</p>
        {description && <div className="text-xs leading-relaxed text-gray-500">{description}</div>}
      </div>
      {action && (
        <Button
          type="button"
          onClick={action.onClick}
          className="mt-1 h-auto cursor-pointer gap-1.5 rounded-xl bg-[#005390] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#004170]"
        >
          {ActionIcon && <ActionIcon className="size-3.5" />}
          {action.label}
        </Button>
      )}
    </div>
  )
}
