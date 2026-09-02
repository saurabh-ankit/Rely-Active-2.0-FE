import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import SetupStatusGuard from '@/components/common/SetupStatusGuard'
import { useAuth } from '@/hooks/useAuth'
import { useLocationContext } from '@/hooks/useLocation'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isSuperAdmin, logout } = useAuth()
  const { selectedLocationId, locationPermissions, isLoadingLocations, isLoadingPermissions, setShowLocationModal } =
    useLocationContext()

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  const { user } = useAuth()
  const isAdminRole =
    isSuperAdmin ||
    user?.roles?.includes('ADMIN') ||
    user?.roles?.includes('SUPER_ADMIN') ||
    (user as unknown as Record<string, unknown>)?.role === 'ADMIN'

  // If user is regular employee/staff with a selected location, but permissions array is empty (no modules assigned), show full white screen
  const hasNoModulesAssigned =
    !isAdminRole &&
    selectedLocationId &&
    !isLoadingLocations &&
    !isLoadingPermissions &&
    locationPermissions.length === 0

  if (hasNoModulesAssigned) {
    return (
      <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-gray-900 mb-2">No Modules Assigned</h1>
        <p className="text-xs font-semibold text-gray-500 max-w-sm mb-6 leading-relaxed">
          There is NO module assigned to you. Please contact Super Admin.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowLocationModal(true)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 shadow-xs cursor-pointer"
          >
            Switch Location
          </button>
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-200 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#DEDDE1] font-sans text-slate-800">
      <Header onMenuClick={toggleSidebar} showMenuButton={true} />

      <div className="flex overflow-hidden flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        <main
          data-scroll-container
          className="h-[calc(100vh-4rem)] flex-1 bg-white/30 rounded-lg shadow-[2px_3px_6px_0px_rgba(0,0,0,0.06),inset_1px_1px_2px_0px_#FFFFFF] backdrop-blur-[10px] overflow-x-hidden overflow-y-auto m-1 md:m-2 lg:m-3"
        >
          <div className="w-full h-full flex flex-col p-2 md:p-3 lg:p-6">
            <SetupStatusGuard>
              <Outlet />
            </SetupStatusGuard>
          </div>
        </main>
      </div>
    </div>
  )
}
