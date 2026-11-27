import { cn } from '@/lib/utils'

/** Placeholder block with a soft light sweep (falls back to a static block under reduced motion). */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'relative overflow-hidden rounded-md bg-gray-200/70',
        'after:absolute after:inset-0 after:animate-shimmer after:bg-linear-to-r after:from-transparent after:via-white/60 after:to-transparent motion-reduce:after:animate-none',
        className,
      )}
      {...props}
    />
  )
}

/** Header bar + rows shaped like a data table, for list pages while data loads. */
function TableSkeleton({ rows = 6, columns = 5, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('overflow-hidden rounded-2xl border border-gray-200/80 bg-white', className)}
    >
      <div className="flex gap-4 border-b border-gray-200 bg-gray-50/90 px-4 py-3.5">
        {Array.from({ length: columns }, (_, c) => (
          <Skeleton key={c} className="h-3 flex-1 bg-gray-200/80" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-gray-100 px-4 py-4 last:border-b-0">
          {Array.from({ length: columns }, (_, c) => (
            // Vary widths so it reads as text, not a grid of bars.
            <div key={c} className="flex-1">
              <Skeleton className="h-3" style={{ width: `${55 + ((r * 7 + c * 13) % 40)}%` }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Skeleton `<tr>`s for tables that render their own header, shown in place of the body while loading. */
function TableRowsSkeleton({ rows = 5, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="border-b border-gray-100" aria-hidden>
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className="px-3 py-4">
              <Skeleton className="h-3" style={{ width: `${50 + ((r * 7 + c * 13) % 45)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/** Stacked card rows (avatar + two text lines), for list panes such as the ticket queue. */
function ListSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn('divide-y divide-gray-100', className)}>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3.5" style={{ width: `${60 + ((r * 11) % 30)}%` }} />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}

export { Skeleton, TableSkeleton, TableRowsSkeleton, ListSkeleton }
