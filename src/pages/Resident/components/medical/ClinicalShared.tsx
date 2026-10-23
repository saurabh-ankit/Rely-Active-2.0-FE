import React from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDisplayDateTime } from '@/lib/utils'

interface ClinicalCardProps {
  icon: LucideIcon
  iconClassName?: string
  title: string
  count?: number
  action?: React.ReactNode
  children: React.ReactNode
}

export const ClinicalCard: React.FC<ClinicalCardProps> = ({
  icon: Icon,
  iconClassName = 'text-rose-500',
  title,
  count,
  action,
  children,
}) => (
  <Card className="gap-0 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-gray-800 dark:bg-slate-900/80">
    <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 p-0 pb-3">
      <CardTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <Icon className={`w-5 h-5 ${iconClassName}`} />
        {title}
      </CardTitle>
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
    </CardHeader>
    <CardContent className="p-0 pt-4">{children}</CardContent>
  </Card>
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
  <div className="py-12 text-center text-muted-foreground">
    <Loader2 className="mx-auto size-6 animate-spin text-primary" />
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
    <Table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
      <TableHeader className="border-b border-gray-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-slate-800/40 dark:text-gray-400">
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.label} className={`px-4 py-3.5 ${col.className || ''}`}>
              {col.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={columns.length}>
              <ClinicalLoadingState label={loadingLabel} />
            </TableCell>
          </TableRow>
        ) : isEmpty ? (
          <TableRow>
            <TableCell colSpan={columns.length}>
              <ClinicalEmptyState {...empty} />
            </TableCell>
          </TableRow>
        ) : (
          children
        )}
      </TableBody>
    </Table>
  </div>
)

export const ClinicalAddedByCell: React.FC<{ name: string | null; createdAt: string }> = ({ name, createdAt }) => (
  <TableCell className="px-4 py-3.5 whitespace-nowrap">
    <div className="font-semibold text-gray-900 dark:text-white">{name || '-'}</div>
    <div className="text-[11px] text-gray-400">{formatDisplayDateTime(createdAt)}</div>
  </TableCell>
)

export const ClinicalErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-xs font-bold text-rose-700">
    {message}
  </div>
)
