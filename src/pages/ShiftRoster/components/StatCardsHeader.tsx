import { useMemo } from 'react'
import { Calendar as CalendarIcon, UserCheck, Stethoscope, ShieldCheck } from 'lucide-react'
import StatCard from '../../AssetManagement/components/StatCard'
import StatsGrid from '../../AssetManagement/components/StatsGrid'
import type { RosterGridRow, SchedulableResource } from '../types'

interface StatCardsHeaderProps {
  displayRosterDates: RosterGridRow[]
  sampleResources: SchedulableResource[]
  isLoading: boolean
  isLoadingUsers: boolean
}

export function StatCardsHeader({
  displayRosterDates,
  sampleResources,
  isLoading,
  isLoadingUsers,
}: StatCardsHeaderProps) {
  const inHouseStaffCount = useMemo(() => {
    return sampleResources.filter((r) => r.type === 'EMPLOYEE' || r.subType !== 'VISITING').length
  }, [sampleResources])

  const visitingDoctorCount = useMemo(() => {
    return sampleResources.filter((r) => r.type === 'DOCTOR' && r.subType === 'VISITING').length
  }, [sampleResources])

  const totalRosterConflicts = useMemo(() => {
    const seenMap: Record<string, number> = {}
    let count = 0
    displayRosterDates.forEach((duty) => {
      if (duty.status === 'CANCELLED') return
      const resId =
        duty.schedulingResourceId || duty.resourceUserId || (duty.resource ? duty.resource.toLowerCase() : '')
      if (!resId || !duty.date) return
      const key = `${resId}_${duty.date}`
      seenMap[key] = (seenMap[key] || 0) + 1
      if (seenMap[key] === 2) {
        count += 1
      }
    })
    return count
  }, [displayRosterDates])

  return (
    <StatsGrid>
      <StatCard
        title="Total Roster Dates"
        value={isLoading ? '...' : displayRosterDates.length.toString()}
        description="Converged date instances"
        icon={CalendarIcon}
        color="blue"
        isLoading={isLoading}
      />
      <StatCard
        title="In-House Staff"
        value={isLoadingUsers ? '...' : inHouseStaffCount.toString()}
        description="Employees & Resident Caregivers"
        icon={UserCheck}
        color="green"
        isLoading={isLoadingUsers}
      />
      <StatCard
        title="Visiting Doctors"
        value={isLoadingUsers ? '...' : visitingDoctorCount.toString()}
        description="Contracted engagement slots"
        icon={Stethoscope}
        color="purple"
        isLoading={isLoadingUsers}
      />
      <StatCard
        title="Roster Conflict Status"
        value={
          totalRosterConflicts === 0
            ? '0 Conflicts'
            : `${totalRosterConflicts} Conflict${totalRosterConflicts > 1 ? 's' : ''}`
        }
        description={totalRosterConflicts === 0 ? '100% Policy Compliant' : 'Overlapping duties detected'}
        icon={ShieldCheck}
        color={totalRosterConflicts === 0 ? 'green' : 'yellow'}
        isLoading={isLoading}
      />
    </StatsGrid>
  )
}
