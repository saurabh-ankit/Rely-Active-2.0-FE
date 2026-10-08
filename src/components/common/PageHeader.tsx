import type React from 'react'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: LucideIcon
  /** Buttons or badges shown on the right. */
  actions?: React.ReactNode
  /** Shows a back arrow before the title. */
  onBack?: () => void
  className?: string
}

/** The standard page header card: icon + title, a one-line description, and actions on the right. */
export function PageHeader({ title, description, icon: Icon, actions, onBack, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-2xs',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        {onBack && (
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className="-ml-1 mt-0.5 rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 cursor-pointer dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
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
}

export default PageHeader
