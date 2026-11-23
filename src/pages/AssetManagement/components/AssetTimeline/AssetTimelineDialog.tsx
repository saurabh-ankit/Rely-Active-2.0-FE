import React, { useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Package,
  PackageCheck,
  QrCode,
  RotateCcw,
  Trash2,
  UserMinus,
  UserPlus,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAssetTimelineQuery } from '@/hooks/react-query/assetManagement'
import type { Asset, AssetTimelineEvent, AssetTimelineEventType } from '@/lib/types'
import { cn } from '@/lib/utils'

const TYPE_STYLES: Record<
  AssetTimelineEventType,
  { label: string; icon: LucideIcon; dot: string; badge: string }
> = {
  created: {
    label: 'Created',
    icon: Package,
    dot: 'bg-slate-600',
    badge: 'border-slate-200 bg-slate-50 text-slate-700',
  },
  assigned: {
    label: 'Assigned',
    icon: UserPlus,
    dot: 'bg-blue-600',
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  returned: {
    label: 'Returned',
    icon: UserMinus,
    dot: 'bg-sky-600',
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  external_use: {
    label: 'External use',
    icon: RotateCcw,
    dot: 'bg-violet-600',
    badge: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  repair: {
    label: 'Repair',
    icon: Wrench,
    dot: 'bg-amber-600',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  scrap: {
    label: 'Scrap',
    icon: Trash2,
    dot: 'bg-red-600',
    badge: 'border-red-200 bg-red-50 text-red-700',
  },
  qr_generated: {
    label: 'QR generated',
    icon: QrCode,
    dot: 'bg-indigo-600',
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  },
  made_available: {
    label: 'Available',
    icon: PackageCheck,
    dot: 'bg-emerald-600',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
}

const TYPE_FILTERS: Array<{ value: AssetTimelineEventType; label: string }> = [
  { value: 'created', label: 'Created' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'returned', label: 'Returned' },
  { value: 'external_use', label: 'External use' },
  { value: 'repair', label: 'Repair' },
  { value: 'scrap', label: 'Scrap' },
  { value: 'qr_generated', label: 'QR generated' },
  { value: 'made_available', label: 'Made available' },
]

const PAGE_SIZE = 25

const panelClass = 'rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-slate-900'
const filterLabelClass = 'text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400'

const getAssetOptionLabel = (asset: Asset) =>
  [asset.item?.name, asset.serialNumber, asset.assetTag].filter((value) => value && String(value).trim()).join(' - ') ||
  'Asset'

const TimelineEntry: React.FC<{ event: AssetTimelineEvent; isLast: boolean }> = ({ event, isLast }) => {
  const style = TYPE_STYLES[event.type] ?? TYPE_STYLES.created
  const Icon = style.icon
  const at = new Date(event.at)
  const hasTime = !Number.isNaN(at.getTime())

  return (
    <li className="relative flex gap-4 pb-5">
      {!isLast && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />}
      <div
        className={cn(
          'relative z-10 mt-3 flex size-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-4 ring-white dark:ring-slate-900',
          style.dot,
        )}
      >
        <Icon className="size-4" />
      </div>
      <Card className="gap-0 min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-slate-900">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{event.title}</h3>
            <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', style.badge)}>
              {style.label}
            </span>
          </div>
          {hasTime && (
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-medium text-gray-500">
              <Clock className="size-3.5" />
              {format(at, 'hh:mm a')} • {format(at, 'dd MMM yyyy')}
            </span>
          )}
        </div>
        {event.description && (
          <p className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-600 dark:text-gray-300">
            {event.description}
          </p>
        )}
        {(event.createdBy?.name ||
          (typeof event.meta?.decidedByName === 'string' && event.meta.decidedByName)) && (
          <div className="mt-3 flex flex-col gap-1 border-t border-gray-100 pt-2 dark:border-gray-800">
            {event.createdBy?.name && (
              <span className="text-[11px] text-gray-500">
                <span className="font-semibold text-gray-600 dark:text-gray-300">Recorded by:</span>{' '}
                {event.createdBy.name}
              </span>
            )}
            {typeof event.meta?.decidedByName === 'string' && event.meta.decidedByName && (
              <span className="text-[11px] text-gray-500">
                <span className="font-semibold text-gray-600 dark:text-gray-300">
                  {event.meta.status === 'declined' ? 'Declined by:' : 'Approved by:'}
                </span>{' '}
                {event.meta.decidedByName}
              </span>
            )}
          </div>
        )}
      </Card>
    </li>
  )
}

interface AssetTimelineDialogProps {
  asset: Asset | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AssetTimelineDialog: React.FC<AssetTimelineDialogProps> = ({ asset, open, onOpenChange }) => {
  const [types, setTypes] = useState<AssetTimelineEventType[]>([])
  const [page, setPage] = useState(1)

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      types: types.length ? types.join(',') : undefined,
    }),
    [page, types],
  )

  const { data, isLoading, isError, isFetching } = useAssetTimelineQuery(asset?.id, params, open && !!asset?.id)

  const events = data?.events ?? []
  const pagination = data?.pagination
  const total = pagination?.total ?? 0
  const totalPages = pagination?.totalPages ?? 1
  const title = asset ? getAssetOptionLabel(asset) : 'Asset history'

  const toggleType = (value: AssetTimelineEventType, checked: boolean) => {
    setTypes((prev) => (checked ? [...prev, value] : prev.filter((t) => t !== value)))
    setPage(1)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTypes([])
      setPage(1)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-[#005390]" />
            Asset history
          </DialogTitle>
          <DialogDescription>
            Complete lifecycle log for <span className="font-semibold text-gray-700">{title}</span>
            {!isLoading ? ` · ${total} event${total === 1 ? '' : 's'}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden pt-1 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className={cn(panelClass, 'overflow-y-auto')}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
              <span className={filterLabelClass}>Filter by event type</span>
              {types.length > 0 && (
                <Button
                  variant="link"
                  type="button"
                  onClick={() => {
                    setTypes([])
                    setPage(1)
                  }}
                  className="h-auto p-0 text-[11px] font-bold text-[#005390] hover:bg-transparent hover:underline"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="mt-3 space-y-2.5">
              {TYPE_FILTERS.map((option) => (
                <Label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  <Checkbox
                    checked={types.includes(option.value)}
                    onCheckedChange={(checked) => toggleType(option.value, Boolean(checked))}
                  />
                  {option.label}
                </Label>
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col">
            {isError && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                Failed to load the timeline for this asset.
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-1 items-center justify-center py-16 text-sm text-gray-500">
                Loading timeline...
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
                <History className="h-8 w-8 text-gray-300" />
                <p className="text-sm font-semibold text-gray-800">No timeline entries</p>
                <p className="text-xs text-gray-500">No lifecycle activity recorded for this asset yet.</p>
              </div>
            ) : (
              <ol
                className={cn(
                  'max-h-[55vh] flex-1 overflow-y-auto px-1 pt-2 pb-1 transition-opacity',
                  isFetching && 'opacity-60',
                )}
              >
                {events.map((event, index) => (
                  <TimelineEntry key={event.id} event={event} isLast={index === events.length - 1} />
                ))}
              </ol>
            )}

            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                <span className="text-[11px] font-medium text-gray-500">
                  Page {pagination?.page ?? page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination?.hasPrevious || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination?.hasNext || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AssetTimelineDialog
