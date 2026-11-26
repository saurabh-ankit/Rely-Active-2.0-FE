import {
  Armchair,
  Boxes,
  CalendarClock,
  Dumbbell,
  FileSpreadsheet,
  IdCard,
  LayoutDashboard,
  PartyPopper,
  ReceiptIndianRupee,
  Settings,
  ShieldCheck,
  Stethoscope,
  Ticket,
  User,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLocationContext } from '@/hooks/useLocation'
import { REPORT_ROLES } from '@/pages/Reports/roles'
import { getDepartmentManagerType } from '@/utils/departmentManager'

export interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  resourceKey?: string
  /** Extra words the command palette matches on (e.g. "F&B" finds Food). */
  keywords?: string[]
}

/** Every main module, in sidebar order. */
export const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', keywords: ['home', 'overview'] },
  { icon: User, label: 'Resident', href: '/admin/residents', resourceKey: 'RESIDENT', keywords: ['residents', 'flat'] },
  { icon: IdCard, label: 'Employee', href: '/admin/employees', resourceKey: 'EMPLOYEE', keywords: ['staff', 'users'] },
  {
    icon: CalendarClock,
    label: 'Shift & Roster',
    href: '/admin/shift-roster-management',
    resourceKey: 'ROSTER',
    keywords: ['shifts', 'schedule'],
  },
  {
    icon: Ticket,
    label: 'Tickets',
    href: '/admin/tickets',
    resourceKey: 'TICKETS',
    keywords: ['complaints', 'repair'],
  },
  {
    icon: ShieldCheck,
    label: 'Gate & Security',
    href: '/admin/visitor-history',
    resourceKey: 'GNS',
    keywords: ['visitors', 'gate pass'],
  },
  { icon: Boxes, label: 'Inventory', href: '/admin/inventory/home', resourceKey: 'INVENTORY', keywords: ['stock'] },
  { icon: Armchair, label: 'Asset Management', href: '/admin/asset-management', resourceKey: 'ASSET' },
  {
    icon: Stethoscope,
    label: 'Medical',
    href: '/admin/medical',
    resourceKey: 'MEDICAL',
    keywords: ['care', 'clinical'],
  },
  {
    icon: Utensils,
    label: 'Food',
    href: '/admin/fnb-history',
    resourceKey: 'FNB',
    keywords: ['f&b', 'meals', 'orders'],
  },
  {
    icon: ReceiptIndianRupee,
    label: 'Billing',
    href: '/admin/billing-management',
    resourceKey: 'BILLING',
    keywords: ['invoices', 'payments'],
  },
  { icon: PartyPopper, label: 'Events', href: '/admin/events', resourceKey: 'EVENTS', keywords: ['venues'] },
  { icon: Dumbbell, label: 'Amenities', href: '/admin/amenities', keywords: ['slots', 'booking'] },
  { icon: FileSpreadsheet, label: 'Reports', href: '/admin/reports', keywords: ['export', 'xlsx'] },
  { icon: Settings, label: 'Settings', href: '/admin/settings', keywords: ['preferences'] },
]

/** The modules this user may open: the single source for the sidebar and the command palette. */
export function useNavItems(): NavItem[] {
  const { user, isSuperAdmin, roles } = useAuth()
  const { hasResourcePermission } = useLocationContext()
  const managerType = getDepartmentManagerType(user)

  return NAV_ITEMS.filter((item) => {
    if (item.href === '/admin/reports') {
      return isSuperAdmin || roles.some((r) => REPORT_ROLES.includes(r))
    }
    // Department managers see only their department's module (not Amenities).
    if (managerType) {
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
}
