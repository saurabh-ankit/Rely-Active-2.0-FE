import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Box,
  CalendarCheck,
  CalendarClock,
  HandHeart,
  LayoutDashboard,
  Package,
  ReceiptIndianRupee,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  Utensils,
  Wrench,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLocationContext } from '@/hooks/useLocation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

import { getDepartmentManagerType } from '@/utils/departmentManager'

export interface SidebarItemData {
  icon: React.ReactNode
  label: string
  href: string
  resourceKey?: string
  isActive?: boolean
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const SidebarItem: React.FC<{ item: SidebarItemData; onClick?: () => void }> = ({ item, onClick }) => {
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className="flex flex-col items-center gap-1 md:gap-2 py-1.5 md:py-3 transition-all duration-200 hover:scale-105"
    >
      <div
        className={cn(
          'flex items-center justify-center w-10 h-10 md:w-full md:h-12 lg:h-14 rounded-xl transition-all duration-200',
          item.isActive
            ? 'bg-[#005390] text-white shadow-md shadow-[#005390]/20'
            : 'bg-transparent hover:bg-[#005390]/10 text-gray-500 hover:text-[#005390]',
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center transition-colors',
            item.isActive ? 'text-white font-bold' : 'text-gray-500',
          )}
        >
          {item.icon}
        </div>
      </div>
      <span
        className={cn(
          'text-xs font-medium text-center hidden md:block leading-tight transition-colors',
          item.isActive ? 'text-[#005390] font-bold' : 'text-gray-500',
        )}
      >
        {item.label}
      </span>
    </Link>
  )
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation()
  const { user, isSuperAdmin } = useAuth()
  const { hasResourcePermission, isLoadingLocations } = useLocationContext()

  const managerType = getDepartmentManagerType(user)

  const sidebarItems: SidebarItemData[] = [
    {
      icon: <LayoutDashboard className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Dashboard',
      href: '/dashboard',
    },
    {
      icon: <User className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Resident',
      href: '/admin/residents',
      resourceKey: 'RESIDENT',
    },
    {
      icon: <HandHeart className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Employee',
      href: '/admin/employees',
      resourceKey: 'EMPLOYEE',
    },
    {
      icon: <CalendarClock className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Shift & Roster',
      href: '/admin/shift-roster-management',
      resourceKey: 'ROSTER',
    },
    {
      icon: <Wrench className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Tickets',
      href: '/admin/tickets',
      resourceKey: 'TICKETS',
    },
    {
      icon: <ShieldCheck className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Gate & Security',
      href: '/admin/visitor-history',
      resourceKey: 'GNS',
    },
    {
      icon: <Package className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Inventory',
      href: '/admin/inventory/home',
      resourceKey: 'INVENTORY',
    },
    {
      icon: <Box className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Asset Management',
      href: '/admin/asset-management',
      resourceKey: 'ASSET',
    },
    {
      icon: <Stethoscope className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Medical',
      href: '/admin/medical',
      resourceKey: 'MEDICAL',
    },
    {
      icon: <Utensils className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Food',
      href: '/admin/fnb-history',
      resourceKey: 'FNB',
    },
    {
      icon: <ReceiptIndianRupee className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Billing',
      href: '/admin/billing-management',
      resourceKey: 'BILLING',
    },
    {
      icon: <CalendarCheck className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Events',
      href: '/admin/events',
      resourceKey: 'EVENTS',
    },
    {
      icon: <Sparkles className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Amenities',
      href: '/admin/amenities',
    },
    {
      icon: <Settings className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Settings',
      href: '/admin/settings',
    },
  ]

  const filteredItems = sidebarItems.filter((item) => {
    if (managerType) {
      if (item.href === '/admin/amenities') return true
      switch (managerType) {
        case 'RNM':
        case 'CON':
          return item.href === '/admin/tickets'
        case 'FNB':
          return item.href.startsWith('/admin/fnb')
        case 'EVENTS':
          return item.href === '/admin/events'
        case 'GNS':
          return item.href === '/admin/visitor-history'
        case 'HOUSEKEEPING':
          return item.href === '/admin/shift-roster-management'
      }
    }
    if (item.href === '/global-settings') {
      return isSuperAdmin
    }
    if (item.href === '/admin/settings' || item.href === '/settings') {
      return true
    }
    if (item.href === '/dashboard') {
      return true
    }
    if (isSuperAdmin) {
      return true
    }
    if (item.resourceKey) {
      return hasResourcePermission(item.resourceKey, 'view')
    }
    return true
  })

  return (
    <>
      {isOpen && (
        <div
          role="button"
          tabIndex={0}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-md md:hidden cursor-pointer"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              onClose?.()
            }
          }}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-16 z-50 md:top-0 md:z-10 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 w-[64px] md:w-[120px] shrink-0',
          'h-[calc(100vh-4rem)]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-full flex flex-col p-1.5 md:p-2 lg:p-3 pr-0 md:pr-0 lg:pr-0">
          <div className="flex-1 bg-white/20 backdrop-blur-md rounded-2xl shadow-xl border border-white/30 p-1.5 md:p-3 overflow-hidden flex flex-col">
            <div className="flex flex-col h-full overflow-y-auto no-scrollbar gap-1">
              {/* Mobile close button at the top of the column */}
              <div className="md:hidden flex items-center justify-center pt-0.5 pb-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={onClose}
                  aria-label="Close sidebar"
                  className="w-10 h-10 rounded-xl bg-white/40 hover:bg-white/60 text-gray-700 border border-white/40 shadow-sm transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isLoadingLocations ? (
                <div className="p-2 text-[10px] text-gray-400 text-center">Loading modules...</div>
              ) : (
                filteredItems.map((item, index) => (
                  <SidebarItem
                    key={index}
                    item={{
                      ...item,
                      isActive:
                        location.pathname === item.href ||
                        (item.href !== '/dashboard' && location.pathname.startsWith(item.href)),
                    }}
                    onClick={onClose}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
