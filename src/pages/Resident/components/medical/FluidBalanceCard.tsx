import React from 'react'
import { Droplets } from 'lucide-react'
import {
  BOWEL_COMFORT_OPTIONS,
  FLUID_CATEGORY_LABELS,
  FLUID_INTAKE_TYPE_OPTIONS,
  FLUID_OUTPUT_TYPE_OPTIONS,
  FluidBalanceCategory,
  IV_FLUID_TYPE_OPTIONS,
  STOOL_TYPE_OPTIONS,
} from '@/lib/constants/fluidBalance'
import type { ResidentFluidBalanceItem } from '@/lib/types/resident'
import { cn, formatDisplayDateTime } from '@/lib/utils'
import { ClinicalRowActions } from './ClinicalRowActions'

const labelFor = <T extends string>(options: { value: T; label: string }[], value: string | null | undefined) =>
  options.find((o) => o.value === value)?.label ?? value ?? '-'

interface FluidBalanceCardProps {
  item: ResidentFluidBalanceItem
  canUpdate: boolean
  onEdit: () => void
  onDelete: () => void
}

export const FluidBalanceCard: React.FC<FluidBalanceCardProps> = ({ item, canUpdate, onEdit, onDelete }) => {
  const categoryLabel = FLUID_CATEGORY_LABELS[item.category] ?? item.category
  const title =
    item.category === FluidBalanceCategory.BOWEL
      ? 'Bowel Movement'
      : item.category === FluidBalanceCategory.INTAKE
        ? labelFor(FLUID_INTAKE_TYPE_OPTIONS, item.fluidType)
        : labelFor(FLUID_OUTPUT_TYPE_OPTIONS, item.fluidType)

  return (
    <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-3.5 shadow-sm space-y-2.5 dark:border-gray-800 dark:from-slate-900 dark:to-slate-900/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-[160px] flex-1 items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300">
            <Droplets className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <h4 className="truncate text-sm font-bold text-gray-900 dark:text-white">{title}</h4>
            <p className="text-[11px] text-gray-500">
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                  item.category === FluidBalanceCategory.INTAKE &&
                    'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300',
                  item.category === FluidBalanceCategory.OUTPUT &&
                    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
                  item.category === FluidBalanceCategory.BOWEL &&
                    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300',
                )}
              >
                {categoryLabel}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1 text-[12px] text-gray-600 dark:text-gray-300">
        {item.category !== FluidBalanceCategory.BOWEL && (
          <p>
            Quantity:{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {item.quantity ?? '-'} {item.unit ?? ''}
              {item.quantityMl != null ? ` (${item.quantityMl} ml)` : ''}
            </span>
          </p>
        )}
        {item.category === FluidBalanceCategory.INTAKE && item.ivFluidType && (
          <p>
            IV type: <span className="font-semibold">{labelFor(IV_FLUID_TYPE_OPTIONS, item.ivFluidType)}</span>
          </p>
        )}
        {item.category === FluidBalanceCategory.INTAKE && item.description && (
          <p>
            Description: <span className="font-semibold">{item.description}</span>
          </p>
        )}
        {item.category === FluidBalanceCategory.OUTPUT && item.collectedBy && (
          <p>
            Collected by: <span className="font-semibold">{item.collectedBy}</span>
          </p>
        )}
        {item.category === FluidBalanceCategory.BOWEL && (
          <>
            <p>
              Stool: <span className="font-semibold">{labelFor(STOOL_TYPE_OPTIONS, item.stoolType)}</span>
            </p>
            <p>
              Comfort: <span className="font-semibold">{labelFor(BOWEL_COMFORT_OPTIONS, item.comfortLevel)}</span>
            </p>
            {item.note && (
              <p className="whitespace-pre-wrap">
                Note: <span className="font-semibold">{item.note}</span>
              </p>
            )}
          </>
        )}
        <p>
          Recorded: <span className="font-semibold">{formatDisplayDateTime(item.recordedAt)}</span>
        </p>
        {item.createdByName && (
          <p>
            Added by: <span className="font-semibold">{item.createdByName}</span>
          </p>
        )}
      </div>

      {canUpdate && <ClinicalRowActions label="fluid balance entry" onEdit={onEdit} onDelete={onDelete} />}
    </div>
  )
}

export default FluidBalanceCard
