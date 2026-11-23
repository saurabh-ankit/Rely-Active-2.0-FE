import React, { useMemo, useState } from 'react'
import { History, Pill, Plus, Syringe, type LucideIcon } from 'lucide-react'
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
import MedicationHistoryModal from './MedicationHistoryModal'
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
  onHistory: () => void
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
  onHistory,
  onEdit,
  onDelete,
  onViewLog,
}) => {
  // Active courses stay in the panel; ended courses move to History.
  const active = useMemo(
    () => items.filter((item) => medicationDayStatus(item, kind, today, administrations) !== 'ENDED'),
    [items, kind, today, administrations],
  )

  return (
    <ClinicalCard
      icon={icon}
      iconClassName={iconClassName}
      title={title}
      count={isLoading ? undefined : active.length}
      action={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onHistory}
            className="h-8 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-slate-50 cursor-pointer shadow-2xs dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
            title="View History"
          >
            <History className="mr-1.5 size-3.5 text-slate-500" />
            History
          </Button>
          {canUpdate ? (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={onAdd}
              className="rounded-xl w-full sm:w-auto text-xs sm:text-sm"
            >
              {addLabel}
            </Button>
          ) : null}
        </>
      }
    >
      {isLoading ? (
        <ClinicalLoadingState label={`Loading ${title.toLowerCase()}...`} />
      ) : active.length === 0 ? (
        <ClinicalEmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
          {active.map((med) => (
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

function isEnded(
  item: ResidentMedicationItem,
  kind: MedicationAdministrationKind,
  today: string,
  administrations: TodayAdministrations,
): boolean {
  return medicationDayStatus(item, kind, today, administrations) === 'ENDED'
}

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
  const [historyKind, setHistoryKind] = useState<MedicationAdministrationKind | null>(null)
  const [today] = useState(todayDateInputValue)
  const { data: todayRows = [] } = useResidentMedicationAdministrationsQuery(residentId, { date: today })
  const todayAdministrations = useMemo<TodayAdministrations>(
    () => new Map(todayRows.map((row) => [administrationKey(row.kind, row.medicationId, row.timeOfDay), row])),
    [todayRows],
  )
  const deleteMedication = useDeleteResidentMedicationMutation(residentId)
  const deleteInsulin = useDeleteResidentInsulinMutation(residentId)
  const deleteMutation = deleting?.kind === 'insulin' ? deleteInsulin : deleteMedication

  const medicationHistory = useMemo(
    () => medications.filter((item) => isEnded(item, 'MEDICATION', today, todayAdministrations)),
    [medications, today, todayAdministrations],
  )
  const insulinHistory = useMemo(
    () => insulin.filter((item) => isEnded(item, 'INSULIN', today, todayAdministrations)),
    [insulin, today, todayAdministrations],
  )

  return (
    <div className="h-full min-h-0 flex flex-col flex-1 space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 flex-1 min-h-0">
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
          onHistory={() => setHistoryKind('MEDICATION')}
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
          onHistory={() => setHistoryKind('INSULIN')}
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

      {historyKind && (
        <MedicationHistoryModal
          open
          onOpenChange={(open) => !open && setHistoryKind(null)}
          kind={historyKind}
          items={historyKind === 'INSULIN' ? insulinHistory : medicationHistory}
          today={today}
          administrations={todayAdministrations}
          onViewLog={(item) => {
            setLogTarget({ kind: historyKind, item })
          }}
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
