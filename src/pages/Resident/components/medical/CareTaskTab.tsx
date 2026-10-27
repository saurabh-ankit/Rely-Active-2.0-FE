import React from 'react'
import { HeartPulse, Users } from 'lucide-react'
import type { ResidentItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
      <Card className="gap-0 rounded-3xl border border-dashed border-gray-200 bg-slate-50/80 p-10 text-center shadow-xs">
        <HeartPulse className="w-8 h-8 text-rose-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-600">
          Clinical care and care-team assignment are available only for physically residing residents.
        </p>
      </Card>
    )
  }

  return (
    <div className="h-full min-h-0 flex flex-col flex-1 min-w-0">
      <ClinicalCard icon={HeartPulse} title="Assigned Care Tasks & Clinical Care">
        <AssignedTasksTab
          forcedResidentId={resident.id}
          forcedPropertyId={propertyId}
          isCompact={true}
          actionSlot={
            canUpdateResident ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">
                <Button
                  type="button"
                  onClick={onAssignCareTeam}
                  className="rounded-xl border border-[#005390] bg-white px-3.5 sm:px-4 py-2 text-xs font-bold text-[#005390] hover:bg-sky-50 cursor-pointer shadow-2xs"
                >
                  <Users className="mr-1.5 size-4 text-[#005390]" />
                  Assign Care Team & View
                </Button>
                <Button
                  type="button"
                  onClick={onAssignCareTask}
                  className="rounded-xl bg-[#005390] px-3.5 sm:px-4 py-2 text-xs font-bold text-white hover:bg-[#004375] cursor-pointer shadow-xs"
                >
                  <HeartPulse className="mr-1.5 size-4 text-white" />
                  Assign Care Task
                </Button>
              </div>
            ) : null
          }
        />
      </ClinicalCard>
    </div>
  )
}

export default CareTaskTab
