import React from 'react'
import { HeartPulse, Users } from 'lucide-react'
import type { ResidentItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { AssignedTasksTab } from '@/pages/Medical/components/AssignedTasksTab'
import { ClinicalCard } from './ClinicalShared'

interface CareTaskTabProps {
  resident: ResidentItem
  propertyId: string | null
  canUpdateResident: boolean
  onAssignCareTeam: () => void
  onAssignCareTask: () => void
}

export const CareTaskTab: React.FC<CareTaskTabProps> = ({
  resident,
  propertyId,
  canUpdateResident,
  onAssignCareTeam,
  onAssignCareTask,
}) => {
  if (!resident.isResiding) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-slate-50/80 p-10 text-center shadow-xs">
        <HeartPulse className="w-8 h-8 text-rose-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-600">
          Clinical care and care-team assignment are available only for physically residing residents.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {canUpdateResident && (
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <Button
            variant="secondary"
            icon={<Users className="w-4 h-4 text-rose-500" />}
            onClick={onAssignCareTeam}
            className="rounded-xl"
          >
            Assign Care Team
          </Button>
          <Button
            variant="secondary"
            icon={<HeartPulse className="w-4 h-4 text-rose-500" />}
            onClick={onAssignCareTask}
            className="rounded-xl"
          >
            Assign Care Task
          </Button>
        </div>
      )}

      <ClinicalCard icon={HeartPulse} title="Assigned Care Tasks & Clinical Care">
        <AssignedTasksTab forcedResidentId={resident.id} forcedPropertyId={propertyId} isCompact={true} />
      </ClinicalCard>
    </div>
  )
}

export default CareTaskTab
