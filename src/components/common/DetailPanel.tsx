import type React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Building blocks for profile/detail pages: titled panels and label/value lists. */

export const NotAdded = () => <span className="font-normal text-gray-400">Not added</span>

/** A white card with an icon title. */
export const Panel = ({
  icon: Icon,
  title,
  action,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) => (
  <section
    className={cn(
      'rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs dark:border-gray-800 dark:bg-slate-900',
      className,
    )}
  >
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
        <Icon className="h-4 w-4 text-[#005390]" />
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
)

/** Label on the left, value on the right; rows are separated by thin lines. */
export const InfoList = ({ rows }: { rows: Array<[string, React.ReactNode]> }) => (
  <dl className="divide-y divide-gray-100 dark:divide-gray-800">
    {rows.map(([label, value]) => (
      <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 py-2.5 text-sm">
        <dt className="text-gray-500">{label}</dt>
        <dd className="min-w-0 break-words font-medium text-gray-900 dark:text-white">{value ?? <NotAdded />}</dd>
      </div>
    ))}
  </dl>
)

export const HeroFact = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) => (
  <div className="flex min-w-0 items-start gap-2.5">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#005390]/10 text-[#005390]">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  </div>
)
