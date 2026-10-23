import type { ReactNode } from 'react'
import { Mail, MapPin, Phone, UserRound, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/** Table building blocks shared by the global and property inventory lists. */

/** Name column: an image or icon tile, the name (optionally a link/button), and a subtitle. */
export function EntityCell({
  icon: Icon,
  image,
  title,
  subtitle,
  tone = 'blue',
}: {
  icon: LucideIcon
  image?: string | null
  title: ReactNode
  subtitle?: ReactNode
  tone?: 'blue' | 'amber'
}) {
  return (
    <div className="flex min-w-[220px] items-center gap-3">
      {image ? (
        <img src={image} alt="" className="size-10 shrink-0 rounded-xl object-cover ring-1 ring-gray-200" />
      ) : (
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-[#005390]/10 text-[#005390]',
          )}
        >
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-gray-900">{title}</div>
        {subtitle && <div className="max-w-xs truncate text-xs text-gray-500">{subtitle}</div>}
      </div>
    </div>
  )
}

/** Contact column: person, email and phone, each on its own line with an icon. */
export function ContactCell({
  person,
  email,
  phone,
}: {
  person?: string | null
  email?: string | null
  phone?: string | null
}) {
  if (!person && !email && !phone) return <span className="text-xs text-gray-400">—</span>
  const line = (Icon: LucideIcon, value: string, mono = false) => (
    <span className="flex items-center gap-1.5 text-xs text-gray-600">
      <Icon className="size-3.5 shrink-0 text-gray-400" />
      <span className={cn('truncate', mono && 'tabular-nums')}>{value}</span>
    </span>
  )
  return (
    <div className="flex min-w-[180px] flex-col gap-0.5">
      {person && line(UserRound, person)}
      {email && line(Mail, email)}
      {phone && line(Phone, phone, true)}
    </div>
  )
}

/** Location names as chips, the first few shown and the rest summarised as "+N more". */
export function LocationChips({
  names,
  max = 3,
  empty = 'No locations',
  icon: Icon = MapPin,
  iconClass = 'text-[#005390]',
}: {
  names: string[]
  max?: number
  empty?: string
  /** Chip icon; defaults to a map pin (e.g. pass Truck for vendors). */
  icon?: LucideIcon
  iconClass?: string
}) {
  if (!names.length) return <span className="text-xs text-gray-400">{empty}</span>
  const shown = names.slice(0, max)
  const rest = names.length - shown.length
  return (
    <div className="flex max-w-[320px] flex-wrap items-center gap-1" title={names.join(', ')}>
      {shown.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700"
        >
          <Icon className={cn('size-3', iconClass)} />
          {name}
        </span>
      ))}
      {rest > 0 && <span className="text-[11px] font-semibold text-gray-500">+{rest} more</span>}
    </div>
  )
}

/** A count with its noun, e.g. "11 items". */
export function CountBadge({ count, noun }: { count: number; noun: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
        count > 0 ? 'bg-[#005390]/10 text-[#005390]' : 'bg-gray-100 text-gray-500',
      )}
    >
      {count} {noun}
      {count === 1 ? '' : 's'}
    </span>
  )
}

/** A form label whose trailing "*" (required) is shown in red. */
export function RequiredLabel({ text }: { text: string }) {
  const required = text.trimEnd().endsWith('*')
  if (!required) return <>{text}</>
  return (
    <>
      {text.trimEnd().slice(0, -1).trimEnd()} <span className="text-red-500">*</span>
    </>
  )
}

export interface RowAction {
  label: string
  icon: LucideIcon
  onClick: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}

/** Table row actions as small labelled buttons (instead of bare text links or a hidden menu). */
export function RowActionButtons({ actions }: { actions: RowAction[] }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {actions.map((a) => (
        <Button
          key={a.label}
          type="button"
          variant="outline"
          disabled={a.disabled}
          onClick={a.onClick}
          title={a.label}
          className={cn(
            'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            a.tone === 'danger'
              ? 'border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-600'
              : 'border-gray-200 bg-white text-gray-700 hover:border-[#005390]/40 hover:bg-[#005390]/5 hover:text-[#005390]',
          )}
        >
          <a.icon className="size-3.5" />
          {a.label}
        </Button>
      ))}
    </div>
  )
}
