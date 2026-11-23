import {
  Armchair,
  Boxes,
  CalendarClock,
  Dumbbell,
  IdCard,
  type LucideIcon,
  MessageSquareText,
  PartyPopper,
  ReceiptIndianRupee,
  ShieldCheck,
  Stethoscope,
  Ticket,
  User,
  Utensils,
} from 'lucide-react'
import type { ReportKey } from '@/lib/types/report'

/** Icon and accent colour of each report card (titles and descriptions come from the API). */
export const REPORT_CARD_STYLE: Record<ReportKey, { icon: LucideIcon; tile: string }> = {
  residents: { icon: User, tile: 'bg-sky-50 text-sky-700' },
  employees: { icon: IdCard, tile: 'bg-indigo-50 text-indigo-700' },
  roster: { icon: CalendarClock, tile: 'bg-violet-50 text-violet-700' },
  tickets: { icon: Ticket, tile: 'bg-amber-50 text-amber-700' },
  visitors: { icon: ShieldCheck, tile: 'bg-emerald-50 text-emerald-700' },
  inventory: { icon: Boxes, tile: 'bg-orange-50 text-orange-700' },
  assets: { icon: Armchair, tile: 'bg-stone-100 text-stone-700' },
  medical: { icon: Stethoscope, tile: 'bg-rose-50 text-rose-700' },
  dining: { icon: Utensils, tile: 'bg-lime-50 text-lime-700' },
  billing: { icon: ReceiptIndianRupee, tile: 'bg-teal-50 text-teal-700' },
  events: { icon: PartyPopper, tile: 'bg-fuchsia-50 text-fuchsia-700' },
  amenities: { icon: Dumbbell, tile: 'bg-cyan-50 text-cyan-700' },
  feedback: { icon: MessageSquareText, tile: 'bg-pink-50 text-pink-700' },
}
