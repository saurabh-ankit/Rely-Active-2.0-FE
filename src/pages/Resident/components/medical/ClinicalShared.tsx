import React from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cn, formatDisplayDateTime } from '@/lib/utils'

interface ClinicalCardProps {
  icon: LucideIcon
  iconClassName?: string
  title: string
  count?: number
  action?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}

export const ClinicalCard: React.FC<ClinicalCardProps> = ({
  icon: Icon,
  iconClassName = 'text-rose-500',
  title,
  count,
  action,
  className,
  bodyClassName,
  children,
}) => (
  <div
    className={cn(
      'rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4 dark:border-gray-800 dark:bg-slate-900/80',
      className,
    )}
  >
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
      <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Icon className={`w-5 h-5 ${iconClassName}`} />
        {title}
      </h2>
      {(count !== undefined || action) && (
        <div className="flex items-center gap-3">
          {count !== undefined && (
            <span className="rounded-full border border-gray-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-gray-600 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-300">
              {count}
            </span>
          )}
          {action}
        </div>
      )}
    </div>
    <div className={cn(bodyClassName)}>{children}</div>
  </div>
)

interface ClinicalEmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export const ClinicalEmptyState: React.FC<ClinicalEmptyStateProps> = ({ icon: Icon, title, description }) => (
  <div className="py-12 text-center text-gray-400">
    <Icon className="mx-auto size-8 text-gray-300 dark:text-gray-600" />
    <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</p>
    {description && <p className="text-xs text-gray-400">{description}</p>}
  </div>
)

export const ClinicalLoadingState: React.FC<{ label: string }> = ({ label }) => (
  <div className="py-12 text-center text-gray-400">
    <Loader2 className="mx-auto size-6 animate-spin text-[#005390]" />
    <p className="mt-2 text-xs">{label}</p>
  </div>
)

interface ClinicalTableProps {
  columns: Array<{ label: string; className?: string }>
  isLoading: boolean
  loadingLabel: string
  isEmpty: boolean
  empty: ClinicalEmptyStateProps
  children: React.ReactNode
}

export const ClinicalTable: React.FC<ClinicalTableProps> = ({
  columns,
  isLoading,
  loadingLabel,
  isEmpty,
  empty,
  children,
}) => (
  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-slate-900">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
        <thead className="border-b border-gray-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-slate-800/40 dark:text-gray-400">
          <tr>
            {columns.map((col) => (
              <th key={col.label} className={`px-4 py-3.5 ${col.className || ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length}>
                <ClinicalLoadingState label={loadingLabel} />
              </td>
            </tr>
          ) : isEmpty ? (
            <tr>
              <td colSpan={columns.length}>
                <ClinicalEmptyState {...empty} />
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  </div>
)

export const ClinicalAddedByCell: React.FC<{ name: string | null; createdAt: string }> = ({ name, createdAt }) => (
  <td className="px-4 py-3.5 whitespace-nowrap">
    <div className="font-semibold text-gray-900 dark:text-white">{name || '-'}</div>
    <div className="text-[11px] text-gray-400">{formatDisplayDateTime(createdAt)}</div>
  </td>
)

export const ClinicalErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-xs font-bold text-rose-700">
    {message}
  </div>
)
