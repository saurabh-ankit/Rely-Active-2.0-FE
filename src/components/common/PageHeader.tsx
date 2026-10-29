import type React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BackButton } from '@/components/common/BackButton'

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: LucideIcon
  /** Buttons or badges shown on the right. */
  actions?: React.ReactNode
  /** Shows a back arrow before the title. */
  onBack?: () => void
  backLabel?: string
  className?: string
}

/** The standard page header card: icon + title, a one-line description, and actions on the right. */
export function PageHeader({ title, description, icon: Icon, actions, onBack, backLabel, className }: PageHeaderProps) {
  const headerCard = (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-2xs',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 dark:text-white">
            {Icon && <Icon className="w-5 h-5 shrink-0 text-[#005390]" />}
            <span className="truncate">{title}</span>
          </h2>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )

  if (onBack) {
    return (
      <div className="space-y-4">
        <div>
          <BackButton onClick={onBack}>{backLabel || 'Back'}</BackButton>
        </div>
        {headerCard}
      </div>
    )
  }

  return headerCard
}

export default PageHeader
