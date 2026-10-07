import type { UserAuthData } from '@/lib/types/auth'

export type DepartmentManagerType = 'RNM' | 'CON' | 'FNB' | 'EVENTS' | 'GNS' | 'HOUSEKEEPING' | null

export const getUserDepartmentCode = (user: UserAuthData | null | undefined): string => {
  if (!user) return ''

  if (user.department?.code) return user.department.code.toUpperCase()

  const firstLoc = user.userLocations?.[0]
  if (firstLoc?.department?.code) return firstLoc.department.code.toUpperCase()

  const firstScope = user.scopes?.[0]
  if (firstScope?.departmentCode) return firstScope.departmentCode.toUpperCase()

  return ''
}

export const getUserDepartmentName = (user: UserAuthData | null | undefined): string => {
  if (!user) return ''

  if (user.department?.name) return user.department.name
  const firstLoc = user.userLocations?.[0]
  if (firstLoc?.department?.name) return firstLoc.department.name
  const firstScope = user.scopes?.[0]
  if (firstScope?.departmentName) return firstScope.departmentName

  return ''
}

export const getDepartmentManagerType = (user: UserAuthData | null | undefined): DepartmentManagerType => {
  if (!user || user.isSuperAdmin || user.roles?.includes('SUPER_ADMIN') || user.username === 'superadmin') {
    return null
  }

  const code = getUserDepartmentCode(user)
  const name = getUserDepartmentName(user).toUpperCase()

  // 1. Repair & Maintenance
  if (code === 'RNM' || name.includes('REPAIR') || name.includes('MAINTENANCE') || name.includes('R&M')) {
    return 'RNM'
  }

  // 2. Concierge
  if (code === 'CON' || name.includes('CONCIERGE')) {
    return 'CON'
  }

  // 3. Food & Beverage
  if (code === 'FNB' || name.includes('FOOD') || name.includes('BEVERAGE') || name.includes('F&B')) {
    return 'FNB'
  }

  // 4. Event Manager
  if (code === 'EVENTS' || code === 'EVENT' || name.includes('EVENT')) {
    return 'EVENTS'
  }

  // 5. Gate & Security Manager
  if (code === 'GNS' || code === 'SECURITY' || name.includes('GATE') || name.includes('SECURITY')) {
    return 'GNS'
  }

  // 6. Housekeeping Manager
  if (
    code === 'HOUSEKEEPING' ||
    code === 'HK' ||
    code === 'ROSTER' ||
    name.includes('HOUSEKEEPING') ||
    name.includes('ROSTER')
  ) {
    return 'HOUSEKEEPING'
  }

  return null
}

export const getDepartmentManagerDefaultRoute = (managerType: DepartmentManagerType): string => {
  switch (managerType) {
    case 'RNM':
    case 'CON':
      return '/admin/tickets'
    case 'FNB':
      return '/admin/fnb-history'
    case 'EVENTS':
      return '/admin/events'
    case 'GNS':
      return '/admin/visitor-history'
    case 'HOUSEKEEPING':
      return '/admin/shift-roster-management'
    default:
      return '/dashboard'
  }
}

export const isDepartmentManagerAllowedRoute = (user: UserAuthData | null | undefined, pathname: string): boolean => {
  const managerType = getDepartmentManagerType(user)
  if (!managerType) return true // SuperAdmin or un-restricted users have access to all routes

  // Common allowed paths for all users
  if (pathname === '/profile' || pathname.startsWith('/profile') || pathname.startsWith('/settings')) {
    return true
  }

  switch (managerType) {
    case 'RNM':
    case 'CON':
      return pathname.startsWith('/admin/tickets')
    case 'FNB':
      return pathname.startsWith('/admin/fnb')
    case 'EVENTS':
      return pathname.startsWith('/admin/events')
    case 'GNS':
      return (
        pathname.startsWith('/admin/visitor-history') ||
        pathname.startsWith('/admin/gate-security') ||
        pathname.startsWith('/admin/gns')
      )
    case 'HOUSEKEEPING':
      return pathname.startsWith('/admin/shift-roster-management')
    default:
      return true
  }
}
