import React, { useState } from 'react'
import { Droplets, Plus } from 'lucide-react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { useDeleteResidentFluidBalanceMutation } from '@/hooks/react-query/resident'
import type { ResidentFluidBalanceItem } from '@/lib/types/resident'
import { ClinicalCard, ClinicalEmptyState, ClinicalLoadingState } from './ClinicalShared'
import FluidBalanceCard from './FluidBalanceCard'
import FluidBalanceFormModal from './FluidBalanceFormModal'

interface FluidBalanceTabProps {
  residentId: string
  canUpdateResident: boolean
  fluidBalances: ResidentFluidBalanceItem[]
  isLoading: boolean
}

export const FluidBalanceTab: React.FC<FluidBalanceTabProps> = ({
  residentId,
  canUpdateResident,
  fluidBalances,
  isLoading,
}) => {
  const [formTarget, setFormTarget] = useState<{ item: ResidentFluidBalanceItem | null } | null>(null)
  const [deleting, setDeleting] = useState<ResidentFluidBalanceItem | null>(null)
  const deleteMutation = useDeleteResidentFluidBalanceMutation(residentId)

  return (
    <>
      <ClinicalCard
        icon={Droplets}
        iconClassName="text-sky-500"
        title="Fluid Balance"
        count={isLoading ? undefined : fluidBalances.length}
        action={
          canUpdateResident ? (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setFormTarget({ item: null })}
              className="rounded-xl"
            >
              Add Fluid Balance
            </Button>
          ) : undefined
        }
      >
        {isLoading ? (
          <ClinicalLoadingState label="Loading fluid balance..." />
        ) : fluidBalances.length === 0 ? (
          <ClinicalEmptyState
            icon={Droplets}
            title="No fluid balance records"
            description="Intake, output and bowel entries will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
    </>
  )
}

export default FluidBalanceTab
