import React, { useState } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { useDeleteResidentAllergyMutation } from '@/hooks/react-query/resident'
import type { ResidentAllergyItem } from '@/lib/types/resident'
import { formatDisplayDateTime } from '@/lib/utils'
import { ClinicalAddedByCell, ClinicalCard, ClinicalTable } from './ClinicalShared'
import { ClinicalRowActions } from './ClinicalRowActions'
import AllergyFormModal from './AllergyFormModal'

const COLUMNS = [{ label: 'Allergy' }, { label: 'Note' }, { label: 'Recorded At' }, { label: 'Added By' }]

interface AllergiesTabProps {
  residentId: string
  canUpdateResident: boolean
  allergies: ResidentAllergyItem[]
  isLoading: boolean
}

export const AllergiesTab: React.FC<AllergiesTabProps> = ({ residentId, canUpdateResident, allergies, isLoading }) => {
  const [formTarget, setFormTarget] = useState<{ item: ResidentAllergyItem | null } | null>(null)
  const [deleting, setDeleting] = useState<ResidentAllergyItem | null>(null)
  const deleteMutation = useDeleteResidentAllergyMutation(residentId)

  return (
    <>
      <ClinicalCard
        icon={AlertTriangle}
        iconClassName="text-amber-500"
        title="Allergies"
        count={isLoading ? undefined : allergies.length}
        action={
          canUpdateResident ? (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setFormTarget({ item: null })}
              className="rounded-xl"
            >
              Add Allergy
            </Button>
          ) : undefined
        }
      >
        <ClinicalTable
          columns={canUpdateResident ? [...COLUMNS, { label: 'Actions', className: 'text-right' }] : COLUMNS}
          isLoading={isLoading}
          loadingLabel="Loading allergies..."
          isEmpty={allergies.length === 0}
          empty={{ icon: AlertTriangle, title: 'No known allergies', description: 'No allergies have been recorded.' }}
        >
          {allergies.map((allergy) => (
            <TableRow key={allergy.id} className="align-top hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <TableCell className="px-4 py-3.5">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  {allergy.name}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3.5 max-w-md whitespace-pre-wrap">{allergy.note || '-'}</TableCell>
              <TableCell className="px-4 py-3.5 whitespace-nowrap">
                {formatDisplayDateTime(allergy.recordedAt)}
              </TableCell>
              <ClinicalAddedByCell name={allergy.createdByName} createdAt={allergy.createdAt} />
              {canUpdateResident && (
                <TableCell className="px-4 py-2.5">
                  <ClinicalRowActions
                    label="allergy"
                    onEdit={() => setFormTarget({ item: allergy })}
                    onDelete={() => setDeleting(allergy)}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </ClinicalTable>
      </ClinicalCard>

      {formTarget && (
        <AllergyFormModal
          open
          onOpenChange={(open) => !open && setFormTarget(null)}
          residentId={residentId}
          item={formTarget.item}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete allergy?"
        description={`"${deleting?.name ?? ''}" will be removed from this resident's medical records.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  )
}

export default AllergiesTab
