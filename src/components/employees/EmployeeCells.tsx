import { format, isValid, parseISO } from 'date-fns'
import { Mail, Phone } from 'lucide-react'
import type { UserItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Shared table cells for the global and property-wise employee directories. */

interface NamedRole {
  name?: string | null
  code?: string | null
}

export interface EmployeeRole {
  name: string
  code: string
}

/**
 * Every distinct role on a user. Roles can come from the user itself, userRoles or userLocations,
 * so all three are merged and de-duplicated by name.
 */
const getEmployeeRoles = (user: UserItem): EmployeeRole[] => {
  const byName = new Map<string, EmployeeRole>()
  const add = (role?: NamedRole | null, fallback?: Record<string, unknown>) => {
    const name = (role?.name || role?.code || (fallback?.name as string) || (fallback?.code as string) || '').trim()
    if (!name || typeof name !== 'string') return
    const code = (role?.code || (fallback?.code as string) || name).toUpperCase()
    if (!byName.has(name.toLowerCase())) byName.set(name.toLowerCase(), { name, code })
  }
  add((user as unknown as { role?: NamedRole }).role)
  user.userRoles?.forEach((ur) => add(ur.role, ur as unknown as Record<string, unknown>))
  user.userLocations?.forEach((ul) => add((ul as { role?: NamedRole }).role, ul as unknown as Record<string, unknown>))
  return Array.from(byName.values())
}

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: 'border-rose-200 bg-rose-50 text-rose-700',
  ADMIN: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  MANAGER: 'border-amber-200 bg-amber-50 text-amber-800',
  EMPLOYEE: 'border-sky-200 bg-sky-50 text-sky-700',
  DOCTOR: 'border-teal-200 bg-teal-50 text-teal-700',
  NURSE: 'border-pink-200 bg-pink-50 text-pink-700',
  CARETAKER: 'border-violet-200 bg-violet-50 text-violet-700',
  VENDOR: 'border-orange-200 bg-orange-50 text-orange-700',
}

const ROLE_DOTS: Record<string, string> = {
  SUPER_ADMIN: 'bg-rose-500',
  ADMIN: 'bg-indigo-500',
  MANAGER: 'bg-amber-500',
  EMPLOYEE: 'bg-sky-500',
  DOCTOR: 'bg-teal-500',
  NURSE: 'bg-pink-500',
  CARETAKER: 'bg-violet-500',
  VENDOR: 'bg-orange-500',
}

/** Custom roles get a stable colour from this palette, picked by their name. */
const FALLBACK_STYLES = [
  ['border-lime-200 bg-lime-50 text-lime-800', 'bg-lime-500'],
  ['border-cyan-200 bg-cyan-50 text-cyan-700', 'bg-cyan-500'],
  ['border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700', 'bg-fuchsia-500'],
  ['border-emerald-200 bg-emerald-50 text-emerald-700', 'bg-emerald-500'],
  ['border-slate-200 bg-slate-100 text-slate-700', 'bg-slate-500'],
] as const

const roleStyle = (role: EmployeeRole): [string, string] => {
  const known = ROLE_STYLES[role.code]
  if (known) return [known, ROLE_DOTS[role.code]!]
  const hash = Array.from(role.name).reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  const [chip, dot] = FALLBACK_STYLES[hash % FALLBACK_STYLES.length]!
  return [chip, dot]
}

export const RoleBadges = ({ user }: { user: UserItem }) => {
  const roles = getEmployeeRoles(user)
  if (roles.length === 0) return <span className="text-xs text-gray-400">No role</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((role) => {
        const [chip, dot] = roleStyle(role)
        return (
          <span
            key={role.name}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
              chip,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
            {role.name}
          </span>
        )
      })}
    </div>
  )
}

const AVATAR_TONES = [
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
]

const getEmployeeName = (u: UserItem) => {
  const first = u.profile?.firstName || u.profile?.first_name || ''
  const last = u.profile?.lastName || u.profile?.last_name || ''
  return `${first} ${last}`.trim() || u.username || 'System User'
}

/** Avatar, full name and employee code. */
export const EmployeeIdentity = ({ user }: { user: UserItem }) => {
  const name = getEmployeeName(user)
  const code = user.profile?.employeeCode || user.profile?.employee_code
  const initials = name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const tone = AVATAR_TONES[name.length % AVATAR_TONES.length]
  return (
    <div className="flex min-w-[200px] items-center gap-3">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold', tone)}>
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
        <p className="font-mono text-[11px] text-gray-400">{code || `@${user.username ?? ''}`}</p>
      </div>
    </div>
  )
}

export const EmployeeContact = ({ user }: { user: UserItem }) => {
  const phone = user.phone || user.profile?.phone
  if (!user.email && !phone) return <span className="text-xs text-gray-400">—</span>
  return (
    <div className="space-y-0.5 text-xs">
      {user.email && (
        <p className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
          <Mail className="h-3 w-3 shrink-0 text-gray-400" />
          {user.email}
        </p>
      )}
      {phone && (
        <p className="flex items-center gap-1.5 text-gray-500">
          <Phone className="h-3 w-3 shrink-0 text-gray-400" />
          {phone}
        </p>
      )}
    </div>
  )
}

export const DepartmentCell = ({
  pairs,
}: {
  pairs: Array<{ deptName?: string | undefined; catName?: string | undefined }>
}) => {
  if (pairs.length === 0) return <span className="text-xs text-gray-400">—</span>
  return (
    <div className="space-y-1.5">
      {pairs.map((p, i) => (
        <div key={i}>
          {p.deptName && <p className="text-xs font-semibold text-gray-900 dark:text-white">{p.deptName}</p>}
          {p.catName && <p className="text-[11px] text-gray-500">{p.catName}</p>}
        </div>
      ))}
    </div>
  )
}

export const JoinedDate = ({ user }: { user: UserItem }) => {
  const raw = user.profile?.dateOfJoining || user.profile?.date_of_joining
  if (!raw) return <span className="text-xs text-gray-400">—</span>
  const date = parseISO(raw)
  return (
    <span className="whitespace-nowrap text-xs font-medium text-gray-700 dark:text-gray-300">
      {isValid(date) ? format(date, 'dd MMM yyyy') : raw}
    </span>
  )
}

const isEmployeeActive = (user: UserItem) => user.isActive && user.status === 'ACTIVE'

export const EmployeeStatus = ({ user }: { user: UserItem }) => {
  const active = isEmployeeActive(user)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-100 text-gray-500',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-gray-400')} />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}
