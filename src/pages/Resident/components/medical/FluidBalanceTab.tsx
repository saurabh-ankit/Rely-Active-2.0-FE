import React, { useState } from 'react'
import { Calendar, Droplet, Droplets, History, Plus } from 'lucide-react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useDeleteResidentFluidBalanceMutation,
  useResidentFluidBalanceHistoryQuery,
  useResidentFluidBalanceSummaryQuery,
} from '@/hooks/react-query/resident'
import type { ResidentFluidBalanceItem } from '@/lib/types/resident'
import { cn } from '@/lib/utils'
import { ClinicalCard, ClinicalEmptyState, ClinicalLoadingState } from './ClinicalShared'
import FluidBalanceCard from './FluidBalanceCard'
import FluidBalanceFormModal from './FluidBalanceFormModal'
import FluidBalanceHistoryModal from './FluidBalanceHistoryModal'

function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatMl(value: number): string {
  return `${value > 0 ? '+' : ''}${Math.round(value * 100) / 100}`
}

function OverviewTile({
  label,
  value,
  iconClassName,
  valueClassName,
}: {
  label: string
  value: string
  iconClassName: string
  valueClassName: string
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-gray-200/80 bg-white/70 p-2.5 dark:border-gray-700 dark:bg-slate-950/40">
      <div className="flex items-center gap-1.5">
        <Droplet className={cn('h-4 w-4 shrink-0 fill-current', iconClassName)} />
        <span className="text-[10px] font-bold leading-tight text-foreground">{label}</span>
      </div>
      <div className={cn('rounded-lg py-1 text-center text-xs font-black', valueClassName)}>{value} ml</div>
    </div>
  )
}

interface FluidBalanceTabProps {
  residentId: string
  canUpdateResident: boolean
}

export const FluidBalanceTab: React.FC<FluidBalanceTabProps> = ({ residentId, canUpdateResident }) => {
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [formTarget, setFormTarget] = useState<{ item: ResidentFluidBalanceItem | null } | null>(null)
  const [deleting, setDeleting] = useState<ResidentFluidBalanceItem | null>(null)

  const summaryQuery = useResidentFluidBalanceSummaryQuery(residentId)
  const historyQuery = useResidentFluidBalanceHistoryQuery(residentId, selectedDate)
  const fluidBalances = historyQuery.data?.entries ?? []
  const isLoading = historyQuery.isLoading
  const deleteMutation = useDeleteResidentFluidBalanceMutation(residentId)
  const summary = summaryQuery.data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-stretch gap-4 lg:h-[calc(100vh-14rem)] lg:grid-cols-[minmax(160px,18%)_minmax(0,1fr)]">
        <div className="flex h-full flex-col space-y-3 rounded-3xl border border-sky-200/60 bg-gradient-to-br from-sky-50/40 via-white to-blue-50/30 p-3 shadow-sm dark:border-sky-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <div className="min-w-0 shrink-0">
            <h3 className="flex items-center gap-1.5 text-sm font-black text-foreground">
              <Droplets className="h-4 w-4 shrink-0 text-sky-500" />
              Fluids Overview
            </h3>
            <span className="text-[10px] font-semibold text-muted-foreground">Last 24 hours</span>
          </div>
          {summaryQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-14 animate-pulse rounded-2xl bg-sky-100/60 dark:bg-slate-800" />
              <div className="h-14 animate-pulse rounded-2xl bg-sky-100/60 dark:bg-slate-800" />
              <div className="h-14 animate-pulse rounded-2xl bg-sky-100/60 dark:bg-slate-800" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <OverviewTile
                label="Fluid Intake"
                value={String(summary?.intakeMl ?? 0)}
                iconClassName="text-blue-500"
                valueClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400"
              />
              <OverviewTile
                label="Fluid Output"
                value={String(summary?.outputMl ?? 0)}
                iconClassName="text-rose-500"
                valueClassName="bg-rose-500/10 text-rose-600 dark:text-rose-400"
              />
              <OverviewTile
                label="Fluid Balance"
                value={formatMl(summary?.netMl ?? 0)}
                iconClassName="text-emerald-500"
                valueClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              />
            </div>
          )}
        </div>

        <div className="min-h-0 min-w-0">
          <ClinicalCard
            icon={Droplets}
            iconClassName="text-sky-500"
            title="Fluid Balance"
            count={isLoading ? undefined : fluidBalances.length}
            className="flex h-full min-h-0 flex-col space-y-3 p-4"
            bodyClassName="min-h-0 flex-1 overflow-y-auto pr-1"
            action={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={selectedDate}
                    max={todayStr()}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    className="h-9 w-[155px] rounded-xl pl-8 text-xs font-semibold"
                    aria-label="Records date"
                  />
                </div>
                <Button
                  variant="outline"
                  icon={<History className="w-4 h-4" />}
                  onClick={() => setHistoryOpen(true)}
                  className="rounded-xl"
                >
                  View History
                </Button>
                {canUpdateResident && (
                  <Button
                    variant="primary"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setFormTarget({ item: null })}
                    className="rounded-xl"
                  >
                    Add Fluid Balance
                  </Button>
                )}
              </div>
            }
          >
            {isLoading ? (
              <ClinicalLoadingState label="Loading fluid balance..." />
            ) : historyQuery.isError ? (
              <ClinicalEmptyState
                icon={Droplets}
                title="Could not load fluid balance"
                description="Try another date or refresh the page."
              />
            ) : fluidBalances.length === 0 ? (
              <ClinicalEmptyState
                icon={Droplets}
                title="No fluid balance records"
                description="No intake, output or bowel entries for this date."
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {fluidBalances.map((item) => (
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
          </ClinicalCard>
        </div>
      </div>

      {formTarget && (
        <FluidBalanceFormModal
          open
          onOpenChange={(open) => !open && setFormTarget(null)}
          residentId={residentId}
          item={formTarget.item}
        />
      )}

      <FluidBalanceHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        residentId={residentId}
        initialDate={selectedDate}
      />

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
