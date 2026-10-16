import { format, isValid, parseISO, startOfYear, subDays } from 'date-fns'
import { HeartPulse, LogIn, Stethoscope, Truck, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { EmployeeActivityKind } from '@/lib/types/employeeActivity'

/** Non-component helpers for the employee activity tabs. */

export interface DateRange {
  from: string
  to: string
}

const DAY = 'yyyy-MM-dd'

export const RANGE_PRESETS = [
  {
    key: '7d',
    label: '7 days',
    range: () => ({ from: format(subDays(new Date(), 7), DAY), to: format(new Date(), DAY) }),
  },
  {
    key: '30d',
    label: '30 days',
    range: () => ({ from: format(subDays(new Date(), 30), DAY), to: format(new Date(), DAY) }),
  },
  {
    key: '90d',
    label: '90 days',
    range: () => ({ from: format(subDays(new Date(), 90), DAY), to: format(new Date(), DAY) }),
  },
  {
    key: 'ytd',
    label: 'This year',
    range: () => ({ from: format(startOfYear(new Date()), DAY), to: format(new Date(), DAY) }),
  },
] as const

export const defaultRange = (): DateRange => RANGE_PRESETS[1].range()

/** "17 Sep 2026, 2:05 PM" (or a custom pattern); "—" when missing. */
export const formatWhen = (value?: string | null, pattern = 'dd MMM yyyy, h:mm a') => {
  if (!value) return '—'
  const date = parseISO(value)
  return isValid(date) ? format(date, pattern) : '—'
}

export const humanize = (value?: string | null) =>
  value
    ? value
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase())
    : '—'

/** A span of hours as people say it: "under a minute", "36 min", "3.5 hrs", "2 days". */
export const formatDuration = (hours?: number | null) => {
  if (hours == null) return '—'
  const minutes = Math.round(hours * 60)
  if (minutes < 1) return 'under a minute'
  if (minutes < 60) return `${minutes} min`
  if (hours < 24) return `${Math.round(hours * 10) / 10} hrs`
  const days = Math.round((hours / 24) * 10) / 10
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

/** Status values the server sends, mapped to the words used on screen. */
export const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Assigned',
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  ON_HOLD: 'On hold',
  // Ticket wording from the admin Tickets page: staff finish → Completed, admin verifies → Verified & Closed.
  RESOLVED: 'Completed',
  COMPLETED: 'Completed',
  CLOSED: 'Verified & Closed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
  PendingApproval: 'Pending approval',
}

export const statusLabel = (value?: string | null) => (value ? (STATUS_LABELS[value] ?? humanize(value)) : '—')

export type ActiveKind = Exclude<EmployeeActivityKind, 'none'>

/** Tab label, icon, record noun and status filter for each department view. */
export const ACTIVITY_META: Record<
  ActiveKind,
  {
    label: string
    shortLabel: string
    icon: LucideIcon
    noun: string
    /** Status filters offered next to "All", as [value, label]. */
    statuses: Array<[string, string]>
  }
> = {
  tickets: {
    label: 'Tickets',
    shortLabel: 'Tickets',
    icon: Wrench,
    noun: 'tickets',
    // Same tabs as the admin Tickets page.
    statuses: [
      ['in_progress', 'In progress'],
      ['completed', 'Completed'],
      ['closed', 'Closed'],
    ],
  },
  gate: {
    label: 'Gate passes',
    shortLabel: 'Gate',
    icon: LogIn,
    noun: 'gate passes',
    statuses: [
      ['PendingApproval', 'Awaiting approval'],
      ['Inside', 'Inside'],
      ['Completed', 'Checked out'],
      ['Rejected', 'Rejected'],
    ],
  },
  fnb: {
    label: 'Deliveries',
    shortLabel: 'Deliveries',
    icon: Truck,
    noun: 'deliveries',
    statuses: [
      ['delivered', 'Delivered'],
      ['delivering', 'Out for delivery'],
      ['assigned', 'Assigned'],
      ['failed', 'Failed'],
    ],
  },
  'medical-care': {
    label: 'Care activities',
    shortLabel: 'Care',
    icon: HeartPulse,
    noun: 'care activities',
    statuses: [
      ['COMPLETED', 'Completed'],
      ['CANCELLED', 'Cancelled'],
    ],
  },
  'medical-doctor': {
    label: 'Clinical activities',
    shortLabel: 'Clinical',
    icon: Stethoscope,
    noun: 'appointments',
    statuses: [
      ['ATTENDED', 'Attended'],
      ['CONFIRMED', 'Confirmed'],
      ['PENDING', 'Pending'],
      ['CANCELLED', 'Cancelled'],
      ['NO_SHOW', 'No show'],
    ],
  },
}
