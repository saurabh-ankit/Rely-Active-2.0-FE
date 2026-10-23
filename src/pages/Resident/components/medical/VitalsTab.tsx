import React, { useState } from 'react'
import { Activity, Plus } from 'lucide-react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { useDeleteResidentVitalMutation } from '@/hooks/react-query/resident'
import type { ResidentVitalItem } from '@/lib/types/resident'
import { formatDisplayDateTime } from '@/lib/utils'
import { ClinicalAddedByCell, ClinicalCard, ClinicalTable } from './ClinicalShared'
import { ClinicalRowActions } from './ClinicalRowActions'
import VitalFormModal from './VitalFormModal'

const COLUMNS = [
  { label: 'Vital' },
  { label: 'Reading' },
  { label: 'Recorded At' },
  { label: 'Note' },
  { label: 'Added By' },
]

interface VitalsTabProps {
  residentId: string
  canUpdateResident: boolean
  vitals: ResidentVitalItem[]
  isLoading: boolean
}

export const VitalsTab: React.FC<VitalsTabProps> = ({ residentId, canUpdateResident, vitals, isLoading }) => {
  const [formTarget, setFormTarget] = useState<{ item: ResidentVitalItem | null } | null>(null)
  const [deleting, setDeleting] = useState<ResidentVitalItem | null>(null)
  const deleteMutation = useDeleteResidentVitalMutation(residentId)

  return (
    <>
      <ClinicalCard
        icon={Activity}
        title="Vitals"
        count={isLoading ? undefined : vitals.length}
        action={
          canUpdateResident ? (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setFormTarget({ item: null })}
              className="rounded-xl"
            >
              Add Vital
            </Button>
          ) : undefined
        }
      >
        <ClinicalTable
          columns={canUpdateResident ? [...COLUMNS, { label: 'Actions', className: 'text-right' }] : COLUMNS}
          isLoading={isLoading}
          loadingLabel="Loading vitals..."
          isEmpty={vitals.length === 0}
          empty={{
            icon: Activity,
            title: 'No vitals recorded',
            description: 'Vitals captured during visits appear here.',
          }}
        >
          {vitals.map((vital) => (
            <TableRow key={vital.id} className="align-top hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <TableCell className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">{vital.name}</TableCell>
              <TableCell className="px-4 py-3.5 whitespace-nowrap">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{vital.value || '-'}</span>
                {vital.value && vital.unit && <span className="ml-1 text-[11px] text-gray-400">{vital.unit}</span>}
              </TableCell>
              <TableCell className="px-4 py-3.5 whitespace-nowrap">{formatDisplayDateTime(vital.recordedAt)}</TableCell>
              <TableCell className="px-4 py-3.5 max-w-xs whitespace-pre-wrap">{vital.note || '-'}</TableCell>
              <ClinicalAddedByCell name={vital.createdByName} createdAt={vital.createdAt} />
              {canUpdateResident && (
                <TableCell className="px-4 py-2.5">
                  <ClinicalRowActions
                    label="vital"
                    onEdit={() => setFormTarget({ item: vital })}
                    onDelete={() => setDeleting(vital)}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </ClinicalTable>
      </ClinicalCard>

      {formTarget && (
        <VitalFormModal
          open
          onOpenChange={(open) => !open && setFormTarget(null)}
          residentId={residentId}
          item={formTarget.item}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete vital?"
        description={`The ${deleting?.name ?? ''} reading will be removed from this resident's medical records.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  )
}

export default VitalsTab
