import { useState } from 'react'
import { Check, ChevronsUpDown, Loader2, Search, UserRound, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useUsersQuery } from '@/hooks/react-query/user'
import { useDebounce } from '@/hooks/useDebounce'
import type { UserItem } from '@/lib/types/user'
import { cn } from '@/lib/utils'

export interface StaffOption {
  id: string
  name: string
  detail: string | null
}

const toOption = (u: UserItem): StaffOption => ({
  id: u.id,
  name:
    `${u.profile?.firstName ?? u.profile?.first_name ?? ''} ${u.profile?.lastName ?? u.profile?.last_name ?? ''}`.trim() ||
    u.username ||
    u.email ||
    'User',
  detail: u.email || u.phone || null,
})

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

interface StaffSearchSelectProps {
  value: StaffOption | null
  onChange: (staff: StaffOption | null) => void
  placeholder?: string
}

/** Staff picker that searches users on the server as you type (debounced). */
export function StaffSearchSelect({ value, onChange, placeholder = 'Search staff by name' }: StaffSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search.trim(), 400)
  const { data, isFetching } = useUsersQuery(debounced || undefined)
  const options = (data ?? []).filter((u) => u.isActive !== false).map(toOption)
  const typing = search.trim() !== debounced

  const pick = (staff: StaffOption | null) => {
    onChange(staff)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm shadow-2xs transition-colors hover:border-gray-300',
            open && 'border-[#2b4f7e] ring-2 ring-[#2b4f7e]/15',
          )}
        >
          {value ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2b4f7e]/10 text-[10px] font-semibold text-[#2b4f7e]">
                {initials(value.name)}
              </span>
              <span className="truncate text-gray-900">{value.name}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-gray-500">
              <UserRound className="h-4 w-4" />
              Not specified
            </span>
          )}
          {!value && <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />}
        </PopoverTrigger>
        {value && (
          <button
            type="button"
            aria-label="Clear staff member"
            onClick={() => onChange(null)}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-72 gap-0 p-0">
        <div className="flex items-center gap-2 border-b border-gray-100 px-3">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          {(typing || isFetching) && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />}
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {options.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500">
              {typing || isFetching
                ? 'Searching…'
                : search.trim()
                  ? `No staff found for “${search.trim()}”`
                  : 'No staff found'}
            </p>
          ) : (
            options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => pick(o)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-100',
                  value?.id === o.id && 'bg-[#2b4f7e]/5',
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600">
                  {initials(o.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-gray-900">{o.name}</span>
                  {o.detail && <span className="block truncate text-xs text-gray-500">{o.detail}</span>}
                </span>
                {value?.id === o.id && <Check className="h-4 w-4 shrink-0 text-[#2b4f7e]" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
