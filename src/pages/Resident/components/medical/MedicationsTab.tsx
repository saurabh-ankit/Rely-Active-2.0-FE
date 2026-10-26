import React, { useMemo, useState } from 'react'
import { Pill, Plus, Syringe, type LucideIcon } from 'lucide-react'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  useDeleteResidentInsulinMutation,
  useDeleteResidentMedicationMutation,
  useResidentMedicationAdministrationsQuery,
} from '@/hooks/react-query/resident'
import type { MedicationAdministrationKind, ResidentMedicationItem } from '@/lib/types/resident'
import { ClinicalCard, ClinicalEmptyState, ClinicalLoadingState } from './ClinicalShared'
import { todayDateInputValue } from './clinicalFormUtils'
import MedicationAdministrationLogModal from './MedicationAdministrationLogModal'
import MedicationCard from './MedicationCard'
import MedicationFormModal, { type MedicationKind } from './MedicationFormModal'
import { administrationKey, medicationDayStatus, type TodayAdministrations } from './medicationSchedule'

interface MedicationColumnProps {
  icon: LucideIcon
  iconClassName: string
  title: string
  items: ResidentMedicationItem[]
  kind: MedicationAdministrationKind
  isLoading: boolean
  canUpdate: boolean
  addLabel: string
  emptyTitle: string
  emptyDescription: string
  today: string
  administrations: TodayAdministrations
  onAdd: () => void
  onEdit: (item: ResidentMedicationItem) => void
  onDelete: (item: ResidentMedicationItem) => void
  onViewLog: (item: ResidentMedicationItem) => void
}

const MedicationColumn: React.FC<MedicationColumnProps> = ({
  icon,
  iconClassName,
  title,
  items,
  kind,
  isLoading,
  canUpdate,
  addLabel,
  emptyTitle,
  emptyDescription,
  today,
  administrations,
  onAdd,
  onEdit,
  onDelete,
  onViewLog,
}) => {
  // Ended courses sink to the bottom; the rest keep their prescribed order.
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          Number(medicationDayStatus(a, kind, today, administrations) === 'ENDED') -
          Number(medicationDayStatus(b, kind, today, administrations) === 'ENDED'),
      ),
    [items, kind, today, administrations],
  )

  return (
    <ClinicalCard
      icon={icon}
      iconClassName={iconClassName}
      title={title}
      count={isLoading ? undefined : items.length}
      action={
        canUpdate ? (
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onAdd} className="rounded-xl">
            {addLabel}
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <ClinicalLoadingState label={`Loading ${title.toLowerCase()}...`} />
      ) : sorted.length === 0 ? (
        <ClinicalEmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
          {sorted.map((med) => (
            <MedicationCard
              key={med.id}
              med={med}
              kind={kind}
              today={today}
              administrations={administrations}
              canUpdate={canUpdate}
              onEdit={() => onEdit(med)}
              onDelete={() => onDelete(med)}
              onViewLog={() => onViewLog(med)}
            />
          ))}
        </div>
      )}
    </ClinicalCard>
  )
}

interface MedicationsTabProps {
  residentId: string
  canUpdateResident: boolean
  medications: ResidentMedicationItem[]
  insulin: ResidentMedicationItem[]
  isLoading: boolean
}

type MedicationTarget = { kind: MedicationKind; item: ResidentMedicationItem | null }

export const MedicationsTab: React.FC<MedicationsTabProps> = ({
  residentId,
  canUpdateResident,
  medications,
  insulin,
  isLoading,
}) => {
  const [formTarget, setFormTarget] = useState<MedicationTarget | null>(null)
  const [deleting, setDeleting] = useState<{ kind: MedicationKind; item: ResidentMedicationItem } | null>(null)
  const [logTarget, setLogTarget] = useState<{
    kind: MedicationAdministrationKind
    item: ResidentMedicationItem
  } | null>(null)
  const [today] = useState(todayDateInputValue)
  const { data: todayRows = [] } = useResidentMedicationAdministrationsQuery(residentId, { date: today })
  const todayAdministrations = useMemo<TodayAdministrations>(
    () => new Map(todayRows.map((row) => [administrationKey(row.kind, row.medicationId, row.timeOfDay), row])),
    [todayRows],
  )
  const deleteMedication = useDeleteResidentMedicationMutation(residentId)
  const deleteInsulin = useDeleteResidentInsulinMutation(residentId)
  const deleteMutation = deleting?.kind === 'insulin' ? deleteInsulin : deleteMedication

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MedicationColumn
          icon={Pill}
          iconClassName="text-indigo-500"
          title="Medications"
          items={medications}
          kind="MEDICATION"
          isLoading={isLoading}
          canUpdate={canUpdateResident}
          addLabel="Add Medication"
          emptyTitle="No medications"
          emptyDescription="No medications have been prescribed yet."
          today={today}
          administrations={todayAdministrations}
          onAdd={() => setFormTarget({ kind: 'medication', item: null })}
          onEdit={(item) => setFormTarget({ kind: 'medication', item })}
          onDelete={(item) => setDeleting({ kind: 'medication', item })}
          onViewLog={(item) => setLogTarget({ kind: 'MEDICATION', item })}
        />
        <MedicationColumn
          icon={Syringe}
          iconClassName="text-rose-500"
          title="Insulin"
          items={insulin}
          kind="INSULIN"
          isLoading={isLoading}
          canUpdate={canUpdateResident}
          addLabel="Add Insulin"
          emptyTitle="No insulin prescribed"
          emptyDescription="Insulin records for this resident will appear here."
          today={today}
          administrations={todayAdministrations}
          onAdd={() => setFormTarget({ kind: 'insulin', item: null })}
          onEdit={(item) => setFormTarget({ kind: 'insulin', item })}
          onDelete={(item) => setDeleting({ kind: 'insulin', item })}
          onViewLog={(item) => setLogTarget({ kind: 'INSULIN', item })}
        />
      </div>

      {formTarget && (
        <MedicationFormModal
          open
          onOpenChange={(open) => !open && setFormTarget(null)}
          residentId={residentId}
          kind={formTarget.kind}
          item={formTarget.item}
        />
      )}

      {logTarget && (
        <MedicationAdministrationLogModal
          open
          onOpenChange={(open) => !open && setLogTarget(null)}
          residentId={residentId}
          kind={logTarget.kind}
          medication={logTarget.item}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting?.kind === 'insulin' ? 'Delete insulin?' : 'Delete medication?'}
        description={`"${deleting?.item.medicineName ?? ''}" will be removed from this resident's medical records.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.item.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}

export default MedicationsTab
