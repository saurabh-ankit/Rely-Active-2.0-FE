import { lazy, Suspense, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Calendar, Clock, MapPin, Plus, Trash2, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ResponsiveTabs } from '@/components/common/ResponsiveTabs'
import PageLoader from '@/components/shared/PageLoader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import StatCard from '@/pages/AssetManagement/components/StatCard'
import StatsGrid from '@/pages/AssetManagement/components/StatsGrid'
import { useListEmployeeShifts } from '@/hooks/react-query/employeeShifts'
import { useListShiftEmployeeDates } from '@/hooks/react-query/shiftEmployeeDates'
import { useListAreas } from '@/hooks/react-query/roster'
import { useDeleteShift, useListShifts } from '@/hooks/react-query/shifts'
import type { ShiftEmployeeDate } from '@/lib/services/shiftEmployeeDateService'
import type { ShiftV2 } from '@/lib/services/shiftService'
import { RosterPermission } from '../RosterPermission'
import CreateShiftDialog from '../dialogs/CreateShiftDialog'
import ManageSlotTimeDialog from '../dialogs/ManageSlotTimeDialog'

const RosterCalendar = lazy(() => import('../Roster/RosterCalendar'))
const EmployeesList = lazy(() => import('../Employees/EmployeesList'))
const AreaManagement = lazy(() => import('../Areas/AreaManagement'))

const TAB_VALUES = ['shifts', 'roster', 'employees', 'areas'] as const
type RosterTab = (typeof TAB_VALUES)[number]
const isValidTab = (t: string | null): t is RosterTab => !!t && TAB_VALUES.includes(t as RosterTab)

const ShiftsGrid = () => {
  const { data, isLoading } = useListShifts()
  const deleteShift = useDeleteShift()
  const shifts: ShiftV2[] = data?.data?.shifts || []
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ShiftV2 | null>(null)
  const [slotDialogOpen, setSlotDialogOpen] = useState(false)
  const [slotShift, setSlotShift] = useState<ShiftV2 | null>(null)

  const columns: ColumnDef<ShiftV2>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span>,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 line-clamp-2 max-w-[240px]">
            {row.original.description?.trim() || '—'}
          </span>
        ),
      },
      {
        id: 'time',
        header: 'Time',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-gray-800">
            {row.original.startTime} – {row.original.endTime}
          </span>
        ),
      },
      {
        id: 'slots',
        header: 'Slots',
        cell: ({ row }) => {
          const count = row.original.numberOfSlots
          const duration = row.original.slotDuration
          if (!count && !duration) {
            return <span className="text-sm text-gray-400">Not set</span>
          }
          return (
            <span className="whitespace-nowrap text-sm text-gray-800">
              {count ? `${count} slot${count === 1 ? '' : 's'}` : '—'}
              {duration ? ` · ${duration} min` : ''}
            </span>
          )
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge
            variant={row.original.isActive ? 'default' : 'secondary'}
            className={row.original.isActive ? 'bg-[#2a517c]' : ''}
          >
            {row.original.isActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <RosterPermission action="update">
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0"
                onClick={() => {
                  setSlotShift(row.original)
                  setSlotDialogOpen(true)
                }}
              >
                Manage SlotTime
              </Button>
            </RosterPermission>
            <RosterPermission action="update">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 shrink-0"
                onClick={() => {
                  setEditing(row.original)
                  setDialogOpen(true)
                }}
              >
                Edit
              </Button>
            </RosterPermission>
            <RosterPermission action="delete">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 shrink-0 text-red-600"
                disabled={(row.original.assignmentCount ?? 0) > 0}
                onClick={() => {
                  if (window.confirm(`Delete shift "${row.original.name}"?`)) {
                    deleteShift.mutate(row.original.id)
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </RosterPermission>
          </div>
        ),
      },
    ],
    [deleteShift],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          {shifts.length} shift{shifts.length === 1 ? '' : 's'}
        </p>
        <RosterPermission action="create">
          <Button
            size="sm"
            className="bg-[#2a517c] hover:bg-[#476587] text-white"
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
        </RosterPermission>
      </div>

      <DataTable
        columns={columns}
        data={shifts}
        isLoading={isLoading}
        filterKey="name"
        searchPlaceholder="Search shifts…"
      />

      <CreateShiftDialog open={dialogOpen} onOpenChange={setDialogOpen} shift={editing} />
      <ManageSlotTimeDialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen} shift={slotShift} />
    </div>
  )
}

const ShiftsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab: RosterTab = isValidTab(rawTab) ? rawTab : rawTab === 'area' ? 'areas' : 'shifts'

  const { data: shiftsData, isLoading: shiftsLoading } = useListShifts()
  const { data: assignmentsData, isLoading: assignLoading } = useListEmployeeShifts()
  const { data: datesData, isLoading: datesLoading } = useListShiftEmployeeDates()
  const { data: areasData, isLoading: areasLoading } = useListAreas({ page: 1, limit: 1 })

  const shifts = shiftsData?.data?.shifts || []
  const assignments = useMemo(
    () => (Array.isArray(assignmentsData?.data) ? assignmentsData.data : []),
    [assignmentsData],
  )
  const uniqueEmployees = useMemo(() => new Set(assignments.map((a) => a.employeeId)).size, [assignments])
  /** Rosters visible on the calendar (day entries, excluding auto week-off fillers). */
  const calendarRosterCount = useMemo(() => {
    const dates = (Array.isArray(datesData?.data) ? datesData.data : []) as ShiftEmployeeDate[]
    return dates.filter((d) => {
      if (d.isDeleted) return false
      // Auto-generated non-working weekdays are stored as day_off + week_off and hidden on calendar
      if (d.status === 'day_off' && (d.leaveType === 'week_off' || !d.leaveType)) {
        return false
      }
      return true
    }).length
  }, [datesData])
  const areasTotal =
    (areasData?.data as { pagination?: { total?: number }; areas?: unknown[] })?.pagination?.total ??
    (areasData?.data as { areas?: unknown[] })?.areas?.length ??
    0

  const setActiveTab = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (tab === 'shifts') next.delete('tab')
      else next.set('tab', tab)
      return next
    })
  }

  const statsLoading = shiftsLoading || assignLoading || datesLoading || areasLoading

  return (
    <div className="space-y-6">
      <StatsGrid>
        <StatCard
          title="Shifts"
          value={statsLoading ? '...' : String(shifts.length)}
          description="Shift definitions"
          icon={Clock}
          color="blue"
          isLoading={statsLoading}
        />
        <StatCard
          title="Rosters"
          value={statsLoading ? '...' : String(calendarRosterCount)}
          description="Rosters on calendar"
          icon={Calendar}
          color="purple"
          isLoading={statsLoading}
        />
        <StatCard
          title="Staff on roster"
          value={statsLoading ? '...' : String(uniqueEmployees)}
          description="Employees with shift coverage"
          icon={Users}
          color="green"
          isLoading={statsLoading}
        />
        <StatCard
          title="Areas"
          value={statsLoading ? '...' : String(areasTotal)}
          description="Roster areas"
          icon={MapPin}
          color="orange"
          isLoading={statsLoading}
        />
      </StatsGrid>

      <RosterPermission action="view">
        <ResponsiveTabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
          tabs={[
            {
              value: 'shifts',
              label: 'Shifts',
              shortLabel: 'Shifts',
              icon: Clock,
              content: <ShiftsGrid />,
            },
            {
              value: 'roster',
              label: 'Roster',
              shortLabel: 'Roster',
              icon: Calendar,
              content: (
                <Suspense fallback={<PageLoader />}>
                  <RosterCalendar />
                </Suspense>
              ),
            },
            {
              value: 'employees',
              label: 'Employees',
              shortLabel: 'Staff',
              icon: Users,
              content: (
                <Suspense fallback={<PageLoader />}>
                  <EmployeesList />
                </Suspense>
              ),
            },
            {
              value: 'areas',
              label: 'Area',
              shortLabel: 'Area',
              icon: MapPin,
              content: (
                <Suspense fallback={<PageLoader />}>
                  <AreaManagement />
                </Suspense>
              ),
            },
          ]}
        />
      </RosterPermission>
    </div>
  )
}

export default ShiftsPage
