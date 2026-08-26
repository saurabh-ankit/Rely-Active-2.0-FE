import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Box,
  Building2,
  CalendarCheck,
  CalendarClock,
  DoorClosed,
  LayoutDashboard,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  Stethoscope,
  UserCheck,
  Users,
  Utensils,
  X,
} from 'lucide-react'

export interface NavChildItem {
  label: string
  href: string
}

export interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
  children?: NavChildItem[]
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const location = useLocation()
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)

  const navItems: NavItem[] = [
    {
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: 'Dashboard',
      href: '/dashboard',
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: 'Resident',
      href: '/admin/residents',
    },
    {
      icon: <UserCheck className="h-5 w-5" />,
      label: 'Employees',
      href: '/admin/employees',
    },
    {
      icon: <Stethoscope className="h-5 w-5" />,
      label: 'Medical',
      href: '/admin/medical',
      children: [
        { label: 'Dashboard', href: '/admin/medical/Home' },
        { label: 'Doctors', href: '/admin/medical/doctors' },
        { label: 'Nurses', href: '/admin/medical/nurses' },
        { label: 'House Visits', href: '/admin/medical/house-visits' },
        { label: 'Shifts', href: '/admin/medical/shifts' },
        { label: 'Care Tasks', href: '/admin/medical/care-tasks' },
        { label: 'Appointments', href: '/admin/medical/schedule' },
        { label: 'Residents', href: '/admin/medical/residents' },
        { label: 'Room Management', href: '/admin/medical/rooms' },
        { label: 'Care Management', href: '/admin/medical/care-features' },
      ],
    },
    {
      icon: <DoorClosed className="h-5 w-5" />,
      label: 'Rooms',
      href: '/admin/medical/rooms',
    },
    {
      icon: <Receipt className="h-5 w-5" />,
      label: 'Billing',
      href: '/admin/billing-management',
      children: [
        { label: 'Dashboard', href: '/admin/billing-management/dashboard' },
        { label: 'Residents & Services', href: '/admin/billing-management/residents' },
        { label: 'Invoices', href: '/admin/billing-management/invoices' },
        { label: 'Payments', href: '/admin/billing-management/payments' },
        { label: 'Services', href: '/admin/billing-management/services' },
        { label: 'Reports', href: '/admin/billing-management/reports' },
      ],
    },
    {
      icon: <CalendarClock className="h-5 w-5" />,
      label: 'Shift & Roster',
      href: '/admin/shift-roster-management',
    },
    {
      icon: <UserCheck className="h-5 w-5" />,
      label: 'Visitors',
      href: '/admin/visitor-history',
    },
    {
      icon: <CalendarCheck className="h-5 w-5" />,
      label: 'Events',
      href: '/admin/events',
    },
    {
      icon: <Utensils className="h-5 w-5" />,
      label: 'F&B',
      href: '/admin/fnb-history',
    },
    {
      icon: <Package className="h-5 w-5" />,
      label: 'Inventory',
      href: '/admin/inventory/home',
    },
    {
      icon: <Box className="h-5 w-5" />,
      label: 'Assets',
      href: '/admin/asset-management',
    },
    {
      icon: <Building2 className="h-5 w-5" />,
      label: 'Company',
      href: '/company',
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: 'Feedback',
      href: '/admin/feedback-and-training',
    },
    {
      icon: <Settings className="h-5 w-5" />,
      label: 'Settings',
      href: '/global-settings',
    },
  ]

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          role="button"
          tabIndex={0}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden cursor-pointer"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              onClose?.()
            }
          }}
        />
      )}

      {/* Vertical Icon-First Sidebar Container */}
      <aside
        className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-24 border-r border-white/40 bg-[#dce0e4]/90 p-2 shadow-xl backdrop-blur-xl transition-all duration-300 md:relative md:top-0 md:translate-x-0 rounded-r-3xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Mobile Close */}
          <div className="mb-2 flex items-center justify-between md:hidden">
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items - Vertical Icon Stack */}
          <div className="flex-1 space-y-2 overflow-y-auto pr-0.5 no-scrollbar py-2">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href)) ||
                (item.children && item.children.some((c) => location.pathname === c.href))

              const hasChildren = item.children && item.children.length > 0

              return (
                <div key={item.label} className="relative group flex flex-col items-center">
                  <Link
                    to={item.href}
                    onClick={() => {
                      if (hasChildren) {
                        setActiveSubmenu(activeSubmenu === item.label ? null : item.label)
                      } else {
                        setActiveSubmenu(null)
                        onClose?.()
                      }
                    }}
                    className={`flex flex-col items-center justify-center w-full py-2.5 px-1.5 rounded-2xl transition-all duration-200 ${
                      isActive
                        ? 'bg-[#2d4366] text-white shadow-lg'
                        : 'text-[#5c6370] hover:bg-white/60 hover:text-slate-900'
                    }`}
                  >
                    <div className="mb-1">{item.icon}</div>
                    <span className="text-[10px] font-medium tracking-tight text-center truncate w-full px-1">
                      {item.label}
                    </span>
                  </Link>

                  {/* Submenu Popover on Hover/Click */}
                  {hasChildren && activeSubmenu === item.label && (
                    <div className="absolute left-24 top-0 z-50 min-w-[160px] rounded-2xl border border-white/60 bg-white/95 p-2 shadow-2xl backdrop-blur-xl">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 border-b border-gray-100 mb-1">
                        {item.label}
                      </div>
                      <div className="space-y-1">
                        {item.children!.map((child) => {
                          const isChildActive = location.pathname === child.href
                          return (
                            <Link
                              key={child.href}
                              to={child.href}
                              onClick={() => {
                                setActiveSubmenu(null)
                                onClose?.()
                              }}
                              className={`block rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                isChildActive ? 'bg-[#2d4366] text-white' : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {child.label}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </aside>
    </>
  )
}
