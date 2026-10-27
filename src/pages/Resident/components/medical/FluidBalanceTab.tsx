import React, { useMemo, useState } from 'react'
import { format, isValid } from 'date-fns'
import { Clock, Droplets, History, Plus, RotateCcw } from 'lucide-react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { useDeleteResidentFluidBalanceMutation } from '@/hooks/react-query/resident'
import { FluidBalanceCategory } from '@/lib/constants/fluidBalance'
import type { ResidentFluidBalanceItem } from '@/lib/types/resident'
import { cn } from '@/lib/utils'
import { ClinicalCard, ClinicalEmptyState, ClinicalLoadingState } from './ClinicalShared'
import FluidBalanceCard from './FluidBalanceCard'
import FluidBalanceFormModal from './FluidBalanceFormModal'

interface FluidBalanceTabProps {
  residentId: string
  canUpdateResident: boolean
  fluidBalances: ResidentFluidBalanceItem[]
  isLoading: boolean
}

type CategoryFilter = 'ALL' | 'INTAKE' | 'OUTPUT' | 'BOWEL'

const getItemDateStr = (item: ResidentFluidBalanceItem): string => {
  const raw = item.recordedAt || item.createdAt
  if (!raw) return ''
  if (raw.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10)
  }
  try {
    const d = new Date(raw)
    if (isValid(d)) {
      return format(d, 'yyyy-MM-dd')
    }
  } catch {
    // fallback
  }
  return ''
}

const getItemQuantityMl = (item: ResidentFluidBalanceItem): number => {
  if (item.quantityMl != null && !isNaN(Number(item.quantityMl))) {
    return Number(item.quantityMl)
  }
  if (item.quantity != null && !isNaN(Number(item.quantity))) {
    const qty = Number(item.quantity)
    if (item.unit?.toLowerCase() === 'l') {
      return qty * 1000
    }
    return qty
  }
  return 0
}

export const FluidBalanceTab: React.FC<FluidBalanceTabProps> = ({
  residentId,
  canUpdateResident,
  fluidBalances,
  isLoading,
}) => {
  const [formTarget, setFormTarget] = useState<{ item: ResidentFluidBalanceItem | null } | null>(null)
  const [deleting, setDeleting] = useState<ResidentFluidBalanceItem | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')

  const deleteMutation = useDeleteResidentFluidBalanceMutation(residentId)

  // Filter by date first
  const dateFilteredBalances = useMemo(() => {
    if (!selectedDate) return fluidBalances
    return fluidBalances.filter((item) => getItemDateStr(item) === selectedDate)
  }, [fluidBalances, selectedDate])

  // Compute dynamic metrics for the Overview Cards
  const { totalIntakeMl, totalOutputMl, netBalanceMl, intakeCount, outputCount, bowelCount } = useMemo(() => {
    const intakeRecords = dateFilteredBalances.filter((item) => item.category === FluidBalanceCategory.INTAKE)
    const outputRecords = dateFilteredBalances.filter((item) => item.category === FluidBalanceCategory.OUTPUT)
    const bowelRecords = dateFilteredBalances.filter((item) => item.category === FluidBalanceCategory.BOWEL)

    const totalIntake = intakeRecords.reduce((sum, item) => sum + getItemQuantityMl(item), 0)
    const totalOutput = outputRecords.reduce((sum, item) => sum + getItemQuantityMl(item), 0)
    const netBalance = totalIntake - totalOutput

    return {
      totalIntakeMl: totalIntake,
      totalOutputMl: totalOutput,
      netBalanceMl: netBalance,
      intakeCount: intakeRecords.length,
      outputCount: outputRecords.length,
      bowelCount: bowelRecords.length,
    }
  }, [dateFilteredBalances])

  // Filter by category for displayed cards
  const displayedBalances = useMemo(() => {
    if (categoryFilter === 'ALL') return dateFilteredBalances
    return dateFilteredBalances.filter((item) => item.category === categoryFilter)
  }, [dateFilteredBalances, categoryFilter])

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="h-full min-h-0 flex flex-col flex-1">
      <ClinicalCard
        icon={Droplets}
        iconClassName="text-sky-500"
        title="Fluid Balance"
        count={isLoading ? undefined : dateFilteredBalances.length}
        action={
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Date filter with clear button */}
            <DatePicker
              value={selectedDate}
              onChange={(val) => setSelectedDate(val || '')}
              placeholder="Pick date"
              formatStr="dd-MM-yyyy"
              clearable
              className="h-8 w-36 text-xs rounded-xl shrink-0"
            />

            {/* Today button (shown when not on today) */}
            {!isToday && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                className="h-8 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-slate-50 cursor-pointer shadow-2xs dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
                title="Filter to today"
              >
                <Clock className="mr-1 size-3.5 text-slate-500" />
                Today
              </Button>
            )}

            {/* View History button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (selectedDate) {
                  setSelectedDate('')
                } else {
                  setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
                }
              }}
              className="h-8 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-slate-50 cursor-pointer shadow-2xs dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
              title={selectedDate ? 'Show all dates history' : 'Filter to today'}
            >
              <History className="mr-1.5 size-3.5 text-slate-500" />
              {selectedDate ? 'View History' : 'All History'}
            </Button>

            {/* Add Fluid Balance Button */}
            {canUpdateResident && (
              <Button
                type="button"
                onClick={() => setFormTarget({ item: null })}
                className="h-8 rounded-xl bg-[#005390] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#004375] cursor-pointer shadow-xs ml-auto sm:ml-0"
              >
                <Plus className="mr-1.5 size-3.5 text-white" />
                Add Fluid Balance
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          {/* ── Fluids Overview Cards (At Top of Content) ────────────────────── */}
          <div className="rounded-3xl border border-gray-100/90 bg-gradient-to-b from-slate-50/70 to-slate-100/40 p-4 shadow-inner dark:border-gray-800 dark:from-slate-900/60 dark:to-slate-900/30">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200/60 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300">
                  <Droplets className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold tracking-tight text-gray-900 dark:text-white uppercase">
                    Fluids Overview
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {selectedDate
                      ? isToday
                        ? 'Today (Last 24 Hours)'
                        : `Date: ${format(new Date(selectedDate), 'dd MMM yyyy')}`
                      : 'All-time fluid statistics'}
                  </p>
                </div>
              </div>

              {selectedDate && !isToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#005390] hover:underline cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  Back to Today
                </button>
              )}
            </div>

            {/* 3 Overview Metrics Cards */}
            <div className="grid grid-cols-1 gap-3.5 pt-3 sm:grid-cols-3">
              {/* Card 1: Fluid Intake */}
              <div className="rounded-2xl border border-white/80 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-2 rounded-full bg-sky-500 shadow-xs" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Fluid Intake</span>
                  </div>
                  <span className="text-[11px] font-medium text-gray-400">
                    {intakeCount} {intakeCount === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
                <div className="flex items-center justify-center rounded-xl bg-sky-50/90 py-2.5 px-3 border border-sky-100 dark:bg-sky-950/50 dark:border-sky-900/60">
                  <span className="text-base sm:text-lg font-extrabold text-[#005390] dark:text-sky-300">
                    {totalIntakeMl.toLocaleString()} ml
                  </span>
                </div>
              </div>

              {/* Card 2: Fluid Output */}
              <div className="rounded-2xl border border-white/80 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-2 rounded-full bg-rose-500 shadow-xs" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Fluid Output</span>
                  </div>
                  <span className="text-[11px] font-medium text-gray-400">
                    {outputCount} {outputCount === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
                <div className="flex items-center justify-center rounded-xl bg-rose-50/90 py-2.5 px-3 border border-rose-100 dark:bg-rose-950/50 dark:border-rose-900/60">
                  <span className="text-base sm:text-lg font-extrabold text-rose-600 dark:text-rose-300">
                    {totalOutputMl.toLocaleString()} ml
                  </span>
                </div>
              </div>

              {/* Card 3: Fluid Balance (Net) */}
              <div className="rounded-2xl border border-white/80 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex size-2 rounded-full shadow-xs',
                        netBalanceMl >= 0 ? 'bg-emerald-500' : 'bg-amber-500',
                      )}
                    />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Fluid Balance</span>
                  </div>
                  <span className="text-[11px] font-medium text-gray-400">Net (Intake - Output)</span>
                </div>
                <div
                  className={cn(
                    'flex items-center justify-center rounded-xl py-2.5 px-3 border',
                    netBalanceMl >= 0
                      ? 'bg-emerald-50/90 border-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-900/60 dark:text-emerald-300'
                      : 'bg-amber-50/90 border-amber-100 text-amber-700 dark:bg-amber-950/50 dark:border-amber-900/60 dark:text-amber-300',
                  )}
                >
                  <span className="text-base sm:text-lg font-extrabold">
                    {netBalanceMl > 0 ? `+${netBalanceMl.toLocaleString()}` : netBalanceMl.toLocaleString()} ml
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Category Filter Pills ────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
                  categoryFilter === 'ALL'
                    ? 'bg-[#005390] text-white shadow-xs'
                    : 'bg-slate-100 text-gray-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700',
                )}
              >
                All Entries ({dateFilteredBalances.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('INTAKE')}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
                  categoryFilter === 'INTAKE'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-gray-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700',
                )}
              >
                Intake ({intakeCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('OUTPUT')}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
                  categoryFilter === 'OUTPUT'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-gray-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700',
                )}
              >
                Output ({outputCount})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('BOWEL')}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
                  categoryFilter === 'BOWEL'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-slate-100 text-gray-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700',
                )}
              >
                Bowel ({bowelCount})
              </button>
            </div>

            <div className="text-xs text-gray-500 font-medium">
              Showing {displayedBalances.length} of {fluidBalances.length} total records
            </div>
          </div>

          {/* ── Fluid Balance Cards Grid ────────────────────────────────────── */}
          {isLoading ? (
            <ClinicalLoadingState label="Loading fluid balance records..." />
          ) : displayedBalances.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <ClinicalEmptyState
                icon={Droplets}
                title="No fluid balance records"
                description={
                  selectedDate
                    ? `No intake, output or bowel entries for ${format(new Date(selectedDate), 'dd MMM yyyy')}.`
                    : 'No intake, output or bowel entries found.'
                }
              />
              {selectedDate && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedDate('')}
                  className="rounded-xl border-gray-200 text-xs font-semibold"
                >
                  <History className="mr-1.5 size-3.5 text-slate-500" />
                  View All Dates History
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {displayedBalances.map((item) => (
                <FluidBalanceCard
                  key={item.id}
                  item={item}
                  canUpdate={canUpdateResident}
                  onEdit={() => setFormTarget({ item })}
                  onDelete={() => setDeleting(item)}
                />
              ))}
            </div>
          )}
        </div>
      </ClinicalCard>

      {/* Modal Dialogs */}
      {formTarget && (
        <FluidBalanceFormModal
          open
          onOpenChange={(open) => !open && setFormTarget(null)}
          residentId={residentId}
          item={formTarget.item}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete fluid balance entry?"
        description="This entry will be removed from the resident's medical records."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}

export default FluidBalanceTab
