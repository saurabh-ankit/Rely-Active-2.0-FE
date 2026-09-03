import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, CheckSquare, Square, RefreshCw, UserPlus } from 'lucide-react'
import { useGetSchedulingResources, useSyncSchedulingResources } from '@/hooks/react-query/rosterManagement'
import { getStaffResourceParams, isStaffAvailableForBuilderSchedule, mapSchedulingResourceToStaff } from '../types'
import { extractApiList } from '../utils/apiHelpers'
import type { RosterBuilderState, RosterGridRow, SchedulableResource } from '../types'

interface StaffPickerPanelProps {
  builderForm: RosterBuilderState
  rosterDates: RosterGridRow[]
  scheduleDates: string[]
  onToggleResource: (resource: SchedulableResource) => void
  onSelectAll: (resources: SchedulableResource[]) => void
  onClearAll: () => void
  onOnboardDoctor?: () => void
}

export function StaffPickerPanel({
  builderForm,
  rosterDates,
  scheduleDates,
  onToggleResource,
  onSelectAll,
  onClearAll,
  onOnboardDoctor,
}: StaffPickerPanelProps) {
  const [search, setSearch] = useState('')
  const syncMutation = useSyncSchedulingResources()

  const resourceParams = getStaffResourceParams(
    builderForm.dutyType,
    builderForm.targetScopeType,
    builderForm.selectedTargetId,
    builderForm.resourceType,
  )

  const { data: resourcesResponse, isLoading } = useGetSchedulingResources(resourceParams)
  const rawResources = extractApiList<{
    id: string
    name?: string
    email?: string
    resourceType: 'EMPLOYEE' | 'DOCTOR'
    departmentId?: string
  }>(resourcesResponse)

  const allResources = useMemo(() => rawResources.map(mapSchedulingResourceToStaff), [rawResources])

  const filteredResources = useMemo(() => {
    const term = search.toLowerCase()
    return allResources.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.role.toLowerCase().includes(term) ||
        (r.specialization || '').toLowerCase().includes(term),
    )
  }, [allResources, search])

  const availableResources = useMemo(
    () =>
      filteredResources.filter((staff) =>
        isStaffAvailableForBuilderSchedule(staff, scheduleDates, builderForm.selectedShiftTime, rosterDates),
      ),
    [filteredResources, scheduleDates, builderForm.selectedShiftTime, rosterDates],
  )

  const selectedSet = new Set(builderForm.selectedResourceIds)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
        </Button>
        {builderForm.dutyType === 'OPD_SESSION' && onOnboardDoctor && (
          <Button type="button" variant="outline" size="sm" onClick={onOnboardDoctor} className="gap-1">
            <UserPlus className="w-4 h-4" /> Onboard Doctor
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => onSelectAll(availableResources)}>
          Select All Available
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClearAll}>
          Clear
        </Button>
        <Badge variant="outline">{builderForm.selectedResourceIds.length} selected</Badge>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading scheduling resources...</p>
      ) : filteredResources.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          No scheduling resources found. Sync resources or onboard a doctor.
          {builderForm.dutyType === 'OPD_SESSION' && onOnboardDoctor && (
            <Button type="button" variant="link" onClick={onOnboardDoctor} className="block mx-auto mt-2">
              Onboard Visiting Doctor
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-2 max-h-64 overflow-y-auto border rounded-md p-2">
          {filteredResources.map((staff) => {
            const isSelected = selectedSet.has(staff.id)
            const isAvailable = availableResources.some((a) => a.id === staff.id)
            return (
              <button
                key={staff.id}
                type="button"
                onClick={() => onToggleResource(staff)}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  <div>
                    <p className="font-medium">{staff.name}</p>
                    <p className="text-xs text-muted-foreground">{staff.role}</p>
                  </div>
                </div>
                <Badge variant={isAvailable ? 'secondary' : 'destructive'} className="text-[10px]">
                  {isAvailable ? 'Available' : 'Conflict'}
                </Badge>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
