import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { ReportPreview } from '@/lib/types/report'
import { cn } from '@/lib/utils'
import { formatCell, isNumeric } from '../formatCell'

/**
 * The report's rows exactly as the Excel file has them. The header row and first column stay in view while
 * scrolling; the totals row covers every row in the range, not just this page.
 */
export function ReportTable({
  preview,
  isFetching,
  onPageChange,
  onLimitChange,
}: {
  preview: ReportPreview
  isFetching: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}) {
  const { columns, rows, totals, total, page, limit, pageSizes } = preview
  const pages = Math.max(1, Math.ceil(total / limit))
  const first = total === 0 ? 0 : (page - 1) * limit + 1
  const last = Math.min(total, page * limit)
  const hasTotals = columns.some((c) => c.total) && total > 0

  const stickyFirst = (i: number) => i === 0 && 'sticky left-0 border-r border-gray-200 dark:border-slate-700'

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-900">
      <div className={cn('relative max-h-[calc(100vh-22rem)] overflow-auto', isFetching && 'opacity-60')}>
        <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'sticky top-0 z-10 whitespace-nowrap border-b border-[#003a66] bg-[#005390] px-3 py-2.5 font-semibold text-white',
                    isNumeric(c.type) ? 'text-right' : 'text-left',
                    stickyFirst(i),
                    i === 0 && 'z-20 border-r-[#003a66]',
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-12">
                  <div className="sticky left-0 flex w-[min(100%,calc(100vw-20rem))] flex-col items-center gap-2 text-gray-400">
                    <Inbox className="h-8 w-8" />
                    <span className="text-sm font-semibold text-gray-500">No records in this date range</span>
                    <span>Try a wider date range or a different filter.</span>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, r) => (
                <tr key={(page - 1) * limit + r} className="group">
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      title={typeof row[c.key] === 'string' ? String(row[c.key]) : undefined}
                      className={cn(
                        'max-w-[22rem] truncate whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-slate-800 dark:text-slate-300',
                        r % 2 ? 'bg-slate-50 dark:bg-slate-800/60' : 'bg-white dark:bg-slate-900',
                        'group-hover:bg-sky-50 dark:group-hover:bg-slate-800',
                        isNumeric(c.type) && 'text-right tabular-nums',
                        row[c.key] === null && 'text-gray-300 dark:text-slate-600',
                        stickyFirst(i),
                        i === 0 && 'font-semibold text-gray-900 dark:text-white',
                      )}
                    >
                      {formatCell(c.type, row[c.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {hasTotals && (
            <tfoot>
              <tr>
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={cn(
                      'sticky bottom-0 whitespace-nowrap border-t-2 border-[#005390] bg-[#e5eef6] px-3 py-2.5 font-bold text-gray-900 dark:bg-slate-800 dark:text-white',
                      isNumeric(c.type) && 'text-right tabular-nums',
                      stickyFirst(i),
                      i === 0 && 'z-10',
                    )}
                  >
                    {c.total
                      ? formatCell(c.type, totals[c.key] ?? 0)
                      : i === 0
                        ? total === 1
                          ? 'Total (1 row)'
                          : `Total (all ${total.toLocaleString('en-IN')} rows)`
                        : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {total > 0 && (
        <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="report-page-size">Rows per page</label>
            <NativeSelect
              id="report-page-size"
              size="sm"
              value={String(limit)}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              {pageSizes.map((n) => (
                <NativeSelectOption key={n} value={String(n)}>
                  {n}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span>
              Showing{' '}
              <span className="font-semibold text-gray-700 dark:text-slate-200">{first.toLocaleString('en-IN')}</span>–
              <span className="font-semibold text-gray-700 dark:text-slate-200">{last.toLocaleString('en-IN')}</span> of{' '}
              <span className="font-semibold text-gray-700 dark:text-slate-200">{total.toLocaleString('en-IN')}</span>
            </span>
            <div className="flex items-center gap-1">
              {(
                [
                  { label: 'First page', icon: ChevronsLeft, to: 1, disabled: page <= 1 },
                  { label: 'Previous page', icon: ChevronLeft, to: page - 1, disabled: page <= 1 },
                  { label: 'Next page', icon: ChevronRight, to: page + 1, disabled: page >= pages },
                  { label: 'Last page', icon: ChevronsRight, to: pages, disabled: page >= pages },
                ] as const
              ).map(({ label, icon: Icon, to, disabled }, i) => (
                <span key={label} className="contents">
                  {i === 2 && (
                    <span className="px-2 font-semibold text-gray-700 dark:text-slate-200">
                      Page {page} of {pages}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={label}
                    disabled={disabled || isFetching}
                    onClick={() => onPageChange(to)}
                    className="h-7 w-7 rounded-lg"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
