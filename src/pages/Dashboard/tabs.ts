import {
  Boxes,
  CalendarDays,
  IndianRupee,
  LayoutDashboard,
  MessageSquareText,
  Package,
  ShieldCheck,
  Stethoscope,
  Ticket,
  Users,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import type { DashboardTabKey } from '@/lib/types/dashboard'

/** Every dashboard tab, in display order. Which ones show is a company-wide setting. */
export const DASHBOARD_TABS: { value: DashboardTabKey; label: string; icon: LucideIcon; description: string }[] = [
  {
    value: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview of residents, tickets, visitors, staff and activity. Always shown.',
  },
  {
    value: 'occupancy',
    label: 'Occupancy',
    icon: Users,
    description: 'Flats occupied, by block and type, move-ins and move-outs.',
  },
  {
    value: 'billing',
    label: 'Billing',
    icon: IndianRupee,
    description: 'Billed vs collected, outstanding dues and payment methods.',
  },
  {
    value: 'inventory',
    label: 'Inventory',
    icon: Package,
    description: 'Stock levels, low stock and purchase orders.',
  },
  {
    value: 'tickets',
    label: 'Tickets',
    icon: Ticket,
    description: 'Categories, departments, resolution time, deadlines met and staff workload.',
  },
  {
    value: 'visitors',
    label: 'Visitors',
    icon: ShieldCheck,
    description: 'Daily visitors, busiest hours, walk-in vs pre-approved and most visited flats.',
  },
  {
    value: 'dining',
    label: 'Food & Beverage',
    icon: UtensilsCrossed,
    description: 'Orders, revenue, meal attendance, top dishes and food packages.',
  },
  {
    value: 'events',
    label: 'Events',
    icon: CalendarDays,
    description: 'Events, bookings, attendance rate, resident requests and amenity use.',
  },
  {
    value: 'medical',
    label: 'Medical',
    icon: Stethoscope,
    description: 'Appointments, medication given, care tasks, vitals and incidents.',
  },
  {
    value: 'staff',
    label: 'Staff & Roster',
    icon: UsersRound,
    description: 'Who is on duty, absences, cover and staff by department and role.',
  },
  {
    value: 'assets',
    label: 'Assets',
    icon: Boxes,
    description: 'Asset value, condition, maintenance cost, and services, warranties and certificates due.',
  },
  {
    value: 'feedback',
    label: 'Feedback',
    icon: MessageSquareText,
    description: 'Forms sent, response rates and ratings.',
  },
]
