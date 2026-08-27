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
  Stethoscope,
  User,
  Utensils,
  Wrench,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

export interface SidebarItemData {
  icon: React.ReactNode
  label: string
  href: string
  isActive?: boolean
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const SidebarItem: React.FC<{ item: SidebarItemData }> = ({ item }) => {
  return (
    <Link
      to={item.href}
      className="flex flex-col items-center gap-1 md:gap-2 py-2 md:py-3 transition-all duration-200 hover:scale-105"
    >
      <div
        className={cn(
          'flex items-center justify-center w-10 h-10 md:w-full md:h-12 lg:h-14 rounded-lg transition-all duration-200',
          item.isActive
            ? 'bg-white/30 backdrop-blur-sm shadow-lg'
            : 'bg-transparent hover:bg-white/10 backdrop-blur-sm',
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center',
            item.isActive ? 'text-slate-900 font-bold' : 'text-gray-500',
          )}
        >
          {item.icon}
        </div>
      </div>
      <span
        className={cn(
          'text-xs font-medium text-center hidden md:block leading-tight',
          item.isActive ? 'text-slate-900 font-semibold' : 'text-gray-500',
        )}
      >
        {item.label}
      </span>
    </Link>
  )
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation()
  const { isSuperAdmin } = useAuth()

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
    },
    {
      icon: <HandHeart className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Employee',
      href: '/admin/employees',
    },
    {
      icon: <CalendarClock className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Shift & Roster',
      href: '/admin/shift-roster-management',
    },
    {
      icon: <Wrench className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Tickets',
      href: '/admin/tickets',
    },
    {
      icon: <ShieldCheck className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Gate & Security',
      href: '/admin/visitor-history',
    },
    {
      icon: <Package className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Inventory',
      href: '/admin/inventory/home',
    },
    {
      icon: <Box className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Asset Mgmt',
      href: '/admin/asset-management',
    },
    {
      icon: <Stethoscope className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Medical',
      href: '/admin/medical',
    },
    {
      icon: <Utensils className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Food',
      href: '/admin/fnb-history',
    },
    {
      icon: <ReceiptIndianRupee className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Billing',
      href: '/admin/billing-management',
    },
    {
      icon: <CalendarCheck className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Events',
      href: '/admin/events',
    },
    {
      icon: <Settings className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />,
      label: 'Settings',
      href: '/global-settings',
    },
  ]

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
          'fixed left-0 top-16 z-50 md:top-0 md:z-10 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 w-fit',
          'h-[calc(100vh-4rem)]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-full flex flex-col p-1 md:p-2 lg:p-3 pr-0 md:pr-0 lg:pr-0">
          <div className="md:hidden absolute top-2 right-2 z-10">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/30 backdrop-blur-sm shadow-lg border border-white/40 hover:bg-white/40 transition-all duration-200"
            >
              <X className="h-4 w-4 text-gray-700" />
            </button>
          </div>

          <div className="flex-1 bg-white/20 backdrop-blur-md rounded-2xl shadow-xl border border-white/30 p-2 md:p-3 overflow-hidden">
            <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
              {sidebarItems
                .filter((item) => item.href !== '/global-settings' || isSuperAdmin)
                .map((item, index) => (
                  <SidebarItem
                    key={index}
                    item={{
                      ...item,
                      isActive:
                        location.pathname === item.href ||
                        (item.href !== '/dashboard' && location.pathname.startsWith(item.href)),
                    }}
                  />
                ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
