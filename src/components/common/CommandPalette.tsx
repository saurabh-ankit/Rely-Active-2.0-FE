import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Ticket as TicketIcon, User, UserPlus } from 'lucide-react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { useLocationContext } from '@/hooks/useLocation'
import { useAuth } from '@/hooks/useAuth'
import apiClient from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { getResidentsAPI } from '@/lib/services/residentService'
import type { Ticket } from '@/lib/types/ticket'
import { useNavItems } from '@/layouts/useNavItems'

/** Waits until typing pauses before searching, so each keystroke doesn't hit the API. */
function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

/**
 * Ctrl/⌘+K command palette: jump to any module the user may open, start common actions, and find residents
 * and tickets by name or number. Opened only via the keyboard shortcut (no header trigger).
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const navItems = useNavItems()
  const { isSuperAdmin } = useAuth()
  const { selectedLocationId, hasResourcePermission } = useLocationContext()

  const canSeeResidents = navItems.some((i) => i.href === '/admin/residents')
  const canSeeTickets = navItems.some((i) => i.href === '/admin/tickets')
  const canCreateResident = canSeeResidents && (isSuperAdmin || hasResourcePermission('RESIDENT', 'create'))

  // Ctrl+K / ⌘K anywhere toggles the palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const term = useDebounced(query.trim(), 250)
  const searching = open && term.length >= 2 && !!selectedLocationId

  const residents = useQuery({
    queryKey: ['command-palette', 'residents', selectedLocationId, term],
    queryFn: () => getResidentsAPI({ locId: selectedLocationId!, search: term }),
    enabled: searching && canSeeResidents,
    staleTime: 30_000,
  })
  const tickets = useQuery({
    queryKey: ['command-palette', 'tickets', selectedLocationId, term],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.tickets.list(selectedLocationId), {
        params: { tab: 'ALL', search: term, limit: 6 },
      })
      return (res.data?.data ?? []) as Ticket[]
    },
    enabled: searching && canSeeTickets,
    staleTime: 30_000,
  })

  // Modules match on their label or keywords; remote results are already filtered by the API.
  const q = query.trim().toLowerCase()
  const modules = useMemo(
    () =>
      navItems.filter(
        (i) => !q || i.label.toLowerCase().includes(q) || i.keywords?.some((k) => k.toLowerCase().includes(q)),
      ),
    [navItems, q],
  )
  const residentHits = (residents.data ?? []).slice(0, 6)
  const ticketHits = (tickets.data ?? []).slice(0, 6)
  const loading = searching && (residents.isFetching || tickets.isFetching)

  const go = (href: string) => {
    setOpen(false)
    setQuery('')
    navigate(href)
  }

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setQuery('')
        }}
        title="Search and jump"
        description="Find a module, resident or ticket"
        className="sm:max-w-xl"
      >
        <Command shouldFilter={false} className="animate-in fade-in zoom-in-95 duration-200">
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search modules, residents, tickets…" />
          <CommandList className="max-h-[60vh]">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Searching…
              </div>
            )}
            <CommandEmpty>
              {term.length >= 2 && loading ? 'Searching…' : 'No matches. Try a resident name, flat or ticket number.'}
            </CommandEmpty>

            {modules.length > 0 && (
              <CommandGroup heading="Go to">
                {modules.map(({ icon: Icon, label, href }) => (
                  <CommandItem key={href} value={`nav:${href}`} onSelect={() => go(href)}>
                    <Icon className="text-[#005390]" />
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {canCreateResident && (!q || 'add new resident onboard'.includes(q)) && (
              <CommandGroup heading="Actions">
                <CommandItem value="action:create-resident" onSelect={() => go('/admin/residents/create')}>
                  <UserPlus className="text-[#005390]" />
                  Add a new resident
                </CommandItem>
              </CommandGroup>
            )}

            {residentHits.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Residents">
                  {residentHits.map((r) => (
                    <CommandItem
                      key={r.id}
                      value={`resident:${r.id}`}
                      onSelect={() => go(`/admin/residents/details/${r.id}`)}
                    >
                      <User className="text-emerald-600" />
                      <span className="truncate">{`${r.firstName} ${r.lastName ?? ''}`.trim()}</span>
                      {r.unit?.unit_number && <CommandShortcut>Flat {r.unit.unit_number}</CommandShortcut>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {ticketHits.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Tickets">
                  {ticketHits.map((t) => (
                    <CommandItem
                      key={t.id}
                      value={`ticket:${t.id}`}
                      onSelect={() => go(`/admin/tickets?ticketId=${t.id}`)}
                    >
                      <TicketIcon className="text-amber-600" />
                      <span className="shrink-0 font-mono text-xs font-bold">{t.ticketNumber}</span>
                      <span className="truncate text-muted-foreground">{t.title}</span>
                      <CommandShortcut>{t.status.replace('_', ' ').toLowerCase()}</CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
          <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move · <Kbd>↵</Kbd> to open
            </span>
            <span>
              <Kbd>Esc</Kbd> to close
            </span>
          </div>
        </Command>
      </CommandDialog>
    </>
  )
}
