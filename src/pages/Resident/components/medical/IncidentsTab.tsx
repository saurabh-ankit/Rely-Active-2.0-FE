import React, { useState } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { useDeleteResidentIncidentMutation } from '@/hooks/react-query/resident'
import type { ResidentIncidentItem } from '@/lib/types/resident'
import { ClinicalCard, ClinicalEmptyState, ClinicalLoadingState } from './ClinicalShared'
import IncidentCard from './IncidentCard'
import IncidentFormModal from './IncidentFormModal'

interface IncidentsTabProps {
  residentId: string
  canUpdateResident: boolean
  incidents: ResidentIncidentItem[]
  isLoading: boolean
}

export const IncidentsTab: React.FC<IncidentsTabProps> = ({ residentId, canUpdateResident, incidents, isLoading }) => {
  const [formTarget, setFormTarget] = useState<{ item: ResidentIncidentItem | null } | null>(null)
  const [deleting, setDeleting] = useState<ResidentIncidentItem | null>(null)
  const deleteMutation = useDeleteResidentIncidentMutation(residentId)

  return (
    <>
      <ClinicalCard
        icon={AlertTriangle}
        iconClassName="text-rose-500"
        title="Incidents"
        count={isLoading ? undefined : incidents.length}
        action={
          canUpdateResident ? (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setFormTarget({ item: null })}
              className="rounded-xl"
            >
              Add Incident
            </Button>
          ) : undefined
        }
      >
        {isLoading ? (
          <ClinicalLoadingState label="Loading incidents..." />
        ) : incidents.length === 0 ? (
          <ClinicalEmptyState
            icon={AlertTriangle}
            title="No incidents"
            description="Incident logs for this resident will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {incidents.map((item) => (
              <IncidentCard
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
        <IncidentFormModal
          open
          onOpenChange={(open) => !open && setFormTarget(null)}
          residentId={residentId}
          item={formTarget.item}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete incident?"
        description="This incident will be removed from the resident's medical records."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  )
}

export default IncidentsTab
