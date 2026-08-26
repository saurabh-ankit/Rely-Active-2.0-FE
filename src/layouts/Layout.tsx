import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import SetupStatusGuard from '@/components/common/SetupStatusGuard'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#DEDDE1] font-sans text-slate-800">
      <Header onMenuClick={toggleSidebar} showMenuButton={true} />

      <div className="flex overflow-hidden flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        <main className="h-[calc(100vh-4rem)] flex-1 bg-white/30 rounded-lg shadow-[2px_3px_6px_0px_rgba(0,0,0,0.06),inset_1px_1px_2px_0px_#FFFFFF] backdrop-blur-[10px] overflow-x-hidden overflow-y-auto m-1 md:m-2 lg:m-3">
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
