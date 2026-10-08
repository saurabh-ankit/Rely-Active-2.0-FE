import { lazy, Suspense, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Calendar, Clock, MapPin, Pencil, Plus, Timer, Trash2, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ResponsiveTabs } from '@/components/common/ResponsiveTabs'
import PageLoader from '@/components/shared/PageLoader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import StatCard from '@/pages/AssetManagement/components/StatCard'
import StatsGrid from '@/pages/AssetManagement/components/StatsGrid'
import type { ShiftEmployeeDate, ShiftV2 } from '@/lib/services/rosterService'
import { RosterPermission } from '../RosterPermission'
import CreateShiftDialog from '../dialogs/CreateShiftDialog'
import ManageSlotTimeDialog from '../dialogs/ManageSlotTimeDialog'
import {
  useListEmployeeShifts,
  useListShiftEmployeeDates,
  useListAreas,
  useDeleteShift,
  useListShifts,
} from '@/hooks/react-query/roster'

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
        header: 'Shift',
        cell: ({ row }) => (
          <div className="flex min-w-[180px] items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#005390]/10 text-[#005390]">
              <Clock className="h-4 w-4" />
            </div>
            <span className="font-semibold text-gray-900">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="block min-w-[220px] max-w-md text-sm text-gray-600 line-clamp-2">
            {row.original.description?.trim() || <span className="text-gray-400">—</span>}
          </span>
        ),
      },
      {
        id: 'time',
        header: 'Timing',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
            {row.original.startTime}
            <span className="text-slate-400">→</span>
            {row.original.endTime}
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
            <div className="whitespace-nowrap leading-tight">
              <p className="text-sm font-semibold text-gray-900">
                {count ? `${count} slot${count === 1 ? '' : 's'}` : '—'}
              </p>
              {duration ? <p className="text-xs text-gray-500">{duration} min each</p> : null}
            </div>
          )
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge className="border border-green-200 bg-green-50 text-green-700">Active</Badge>
          ) : (
            <Badge className="border border-gray-200 bg-gray-100 text-gray-600">Inactive</Badge>
          ),
      },
      {
        id: 'actions',
        header: () => <span className="block text-right">Actions</span>,
        cell: ({ row }) => {
          const inUse = (row.original.assignmentCount ?? 0) > 0
          return (
            <div className="flex items-center justify-end gap-1 whitespace-nowrap">
              <RosterPermission action="update">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 gap-1.5 text-xs"
                  onClick={() => {
                    setSlotShift(row.original)
                    setSlotDialogOpen(true)
                  }}
                >
                  <Timer className="h-3.5 w-3.5" />
                  Manage Slots
                </Button>
              </RosterPermission>
              <RosterPermission action="update">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Edit ${row.original.name}`}
                  title="Edit shift"
                  className="h-8 w-8 shrink-0 p-0"
                  onClick={() => {
                    setEditing(row.original)
                    setDialogOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </RosterPermission>
              <RosterPermission action="delete">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${row.original.name}`}
                  title={inUse ? 'Shift is assigned to employees and cannot be deleted' : 'Delete shift'}
                  className="h-8 w-8 shrink-0 p-0 text-red-600 hover:text-red-700"
                  disabled={inUse}
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
          )
        },
      },
    ],
    [deleteShift],
  )

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={shifts}
        isLoading={isLoading}
        filterKey="name"
        searchPlaceholder="Search shifts by name or description…"
        filterActions={
          <RosterPermission action="create">
            <Button
              size="sm"
              className="bg-[#005390] hover:bg-[#004170] text-white rounded-xl h-9 text-xs font-bold px-4"
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Shift
            </Button>
          </RosterPermission>
        }
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
