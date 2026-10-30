import React from 'react'
import { History, Pill, Syringe } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { MedicationAdministrationKind, ResidentMedicationItem } from '@/lib/types/resident'
import { ClinicalEmptyState } from './ClinicalShared'
import MedicationCard from './MedicationCard'
import type { TodayAdministrations } from './medicationSchedule'

interface MedicationHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: MedicationAdministrationKind
  items: ResidentMedicationItem[]
  today: string
  administrations: TodayAdministrations
  onViewLog: (item: ResidentMedicationItem) => void
}

export const MedicationHistoryModal: React.FC<MedicationHistoryModalProps> = ({
  open,
  onOpenChange,
  kind,
  items,
  today,
  administrations,
  onViewLog,
}) => {
  const isInsulin = kind === 'INSULIN'
  const title = isInsulin ? 'Insulin History' : 'Medication History'
  const EmptyIcon = isInsulin ? Syringe : Pill

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-500" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Past {isInsulin ? 'insulin' : 'medication'} prescriptions that are no longer active for this resident.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <ClinicalEmptyState
              icon={EmptyIcon}
              title={isInsulin ? 'No past insulin' : 'No past medications'}
              description={`Ended ${isInsulin ? 'insulin' : 'medication'} courses will appear here.`}
            />
          ) : (
            <div className="space-y-3 pb-1">
              {items.map((med) => (
                <MedicationCard
                  key={med.id}
                  med={med}
                  kind={kind}
                  today={today}
                  administrations={administrations}
                  canUpdate={false}
                  onEdit={() => undefined}
                  onDelete={() => undefined}
                  onViewLog={() => onViewLog(med)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MedicationHistoryModal
