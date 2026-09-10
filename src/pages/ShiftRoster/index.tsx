import { lazy, Suspense, useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import PageLoader from '@/components/shared/PageLoader'
import { RosterPermission } from './components/RosterPermission'

const ShiftsPage = lazy(() => import('./components/Shifts'))
const EmployeeDetail = lazy(() => import('./components/Employees/EmployeeDetail'))
const ResidentAssignment = lazy(() => import('./components/Employees/ResidentAssignment'))
const DailyShiftManagement = lazy(() => import('./components/Employees/DailyShiftManagement'))

const ShiftRosterPage = () => {
  const params = useParams<{ employeeId?: string; sub?: string }>()
  const location = useLocation()

  const pathInfo = useMemo(() => {
    const base = '/admin/shift-roster-management'
    const rest = location.pathname.replace(base, '').replace(/^\//, '')
    const parts = rest.split('/').filter(Boolean)

    let employeeId: string | undefined
    let sub: string | undefined

    // /employees/:id[/sub] or legacy /medical/employees/:id[/sub]
    if (parts[0] === 'employees' && parts[1]) {
      employeeId = parts[1]
      sub = parts[2]
    } else if (parts[0] === 'medical' && parts[1] === 'employees' && parts[2]) {
      employeeId = parts[2]
      sub = parts[3]
    }

    if (params.employeeId) {
      employeeId = params.employeeId
      sub = params.sub
    }

    return { employeeId, sub }
  }, [location.pathname, params.employeeId, params.sub])

  const renderNested = () => {
    if (!pathInfo.employeeId) return null
    if (pathInfo.sub === 'residents' || pathInfo.sub === 'patients') {
      return (
        <Suspense fallback={<PageLoader />}>
          <ResidentAssignment />
        </Suspense>
      )
    }
    if (pathInfo.sub === 'daily' || pathInfo.sub === 'attendance') {
      return (
        <Suspense fallback={<PageLoader />}>
          <DailyShiftManagement />
        </Suspense>
      )
    }
    return (
      <Suspense fallback={<PageLoader />}>
        <EmployeeDetail />
      </Suspense>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Shift & Roster Management</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">Schedule staff shifts, roster coverage, and areas</p>
      </div>

      <RosterPermission
        action="view"
        fallback={
          <p className="text-sm text-gray-500 py-12 text-center">
            You do not have permission to view the roster module.
          </p>
        }
      >
        {pathInfo.employeeId ? (
          renderNested()
        ) : (
          <Suspense fallback={<PageLoader />}>
            <ShiftsPage />
          </Suspense>
        )}
      </RosterPermission>
    </div>
  )
}

export default ShiftRosterPage
