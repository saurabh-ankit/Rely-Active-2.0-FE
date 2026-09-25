import React from 'react'
import { HeartPulse, Users } from 'lucide-react'
import type { ResidentItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { AssignedTasksTab } from '@/pages/Medical/components/AssignedTasksTab'

export interface ResidentMedicalTabProps {
  resident: ResidentItem
  canUpdateResident: boolean
  onAssignCareTeam: () => void
  onAssignCareTask: () => void
}

export const ResidentMedicalTab: React.FC<ResidentMedicalTabProps> = ({
  resident,
  canUpdateResident,
  onAssignCareTeam,
  onAssignCareTask,
}) => {
  const propertyId = resident.locId || (resident as unknown as Record<string, string>).loc_id || null

  return (
    <div className="space-y-6">
      {canUpdateResident && resident.isResiding && (
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

      {resident.isResiding ? (
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-rose-500" />
              Assigned Care Tasks & Clinical Care
            </h2>
          </div>

          <AssignedTasksTab forcedResidentId={resident.id} forcedPropertyId={propertyId} isCompact={true} />
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-slate-50/80 p-10 text-center shadow-xs">
          <HeartPulse className="w-8 h-8 text-rose-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">
            Clinical care and care-team assignment are available only for physically residing residents.
          </p>
        </div>
      )}
    </div>
  )
}

export default ResidentMedicalTab
