import { useEffect, useMemo } from 'react'
import {
  useGetShifts,
  useGetRosterDates,
  useGetSchedulingResources,
  useSyncSchedulingResources,
} from '@/hooks/react-query/rosterManagement'
import { extractApiList } from '../utils/apiHelpers'
import { getShiftQueryParams, type RosterShiftItem } from '../types'

interface UseRosterPageDataOptions {
  companyId: string | null
  locationId: string | null
  calendarMonth?: Date
  rosterDateParams?: Record<string, unknown>
  builderDutyType?: 'SHIFT' | 'OPD_SESSION'
  builderTargetScopeType?: string
  builderSelectedTargetId?: string
}

export function useRosterPageData({
  companyId,
  locationId,
  calendarMonth,
  rosterDateParams,
  builderDutyType,
  builderTargetScopeType,
  builderSelectedTargetId,
}: UseRosterPageDataOptions) {
  const syncMutation = useSyncSchedulingResources()
  const enabled = !!companyId && !!locationId

  useEffect(() => {
    if (enabled) {
      syncMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, locationId, enabled])

  const monthRange = useMemo(() => {
    if (!calendarMonth) return undefined
    const start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
    const end = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0)
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }, [calendarMonth])

  const dateQueryParams = useMemo(
    () => ({
      ...(monthRange || {}),
      ...(rosterDateParams || {}),
    }),
    [monthRange, rosterDateParams],
  )

  const shiftParams = useMemo(() => {
    if (builderDutyType && builderTargetScopeType !== undefined) {
      return getShiftQueryParams(builderDutyType, builderTargetScopeType, builderSelectedTargetId || '')
    }
    return undefined
  }, [builderDutyType, builderTargetScopeType, builderSelectedTargetId])

  const shiftsQuery = useGetShifts(shiftParams, { enabled })
  const rosterDatesQuery = useGetRosterDates(dateQueryParams, { enabled })
  const schedulingResourcesQuery = useGetSchedulingResources(undefined, { enabled })

  const shifts = extractApiList<RosterShiftItem>(shiftsQuery.data)
  const rosterDates = extractApiList<Record<string, unknown>>(rosterDatesQuery.data)
  const schedulingResources = extractApiList<Record<string, unknown>>(schedulingResourcesQuery.data)

  const refetch = async () => {
    await Promise.all([shiftsQuery.refetch(), rosterDatesQuery.refetch(), schedulingResourcesQuery.refetch()])
  }

  return {
    shifts,
    rosterDates,
    schedulingResources,
    isLoading: shiftsQuery.isLoading || rosterDatesQuery.isLoading || schedulingResourcesQuery.isLoading,
    isSyncing: syncMutation.isPending,
    refetch,
  }
}
