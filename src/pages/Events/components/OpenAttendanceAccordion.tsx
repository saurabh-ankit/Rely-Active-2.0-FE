import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { EventRegistration } from '@/lib/services/eventService'
import { Home } from 'lucide-react'
import { useMemo } from 'react'

const dateTime = (value: string) =>
  new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

interface FlatGroup {
  flat: string
  /** People living in the flat, counted once per resident household. */
  living: number
  households: Set<string>
  people: {
    id: string
    name: string
    relation: string | null
    residentName: string
    isResident: boolean
    contact: string | null
    attendedAt: string | null
    markedBy: string | null
  }[]
}

/** People who came to an event without reservations, grouped by flat; each person has their own time. */
export function OpenAttendanceAccordion({ registrations }: { registrations: EventRegistration[] }) {
  const groups = useMemo(() => {
    const byFlat = new Map<string, FlatGroup>()
    for (const r of registrations) {
      const flat = r.unitNumber || 'No flat'
      const group = byFlat.get(flat) ?? { flat, living: 0, households: new Set<string>(), people: [] }
      if (!group.households.has(r.patient.id)) {
        group.households.add(r.patient.id)
        group.living += r.householdSize ?? 1
      }
      group.people.push({
        id: r.id,
        name: r.familyMember ? r.familyMember.name : r.patient.fullName,
        relation: r.familyMember ? r.familyMember.relation || 'Family member' : null,
        residentName: r.patient.fullName,
        isResident: !r.familyMember,
        contact: r.familyMember
          ? r.familyMember.phone || r.familyMember.email || null
          : r.patient.contact_phone || r.patient.contact_email || null,
        attendedAt: r.attendedAt ?? null,
        markedBy: r.attendanceMarkedBy ?? null,
      })
      byFlat.set(flat, group)
    }
    const list = [...byFlat.values()]
    for (const g of list) {
      g.people.sort((a, b) => (a.attendedAt ?? '').localeCompare(b.attendedAt ?? ''))
    }
    return list.sort((a, b) => a.flat.localeCompare(b.flat, undefined, { numeric: true }))
  }, [registrations])

  if (groups.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-500">Nobody has been marked yet.</p>
  }

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_1.25rem] gap-4 rounded-xl bg-gray-50 px-4 py-3 text-xs font-semibold tracking-wide text-gray-600 uppercase md:grid">
        <span>Flat</span>
        <span>Residents</span>
        <span>Attendance</span>
        <span>Last came at</span>
        <span />
      </div>
      <Accordion multiple className="gap-2">
        {groups.map((g) => {
          const residents = [...new Set(g.people.map((p) => p.residentName))]
          const last = g.people.reduce<string | null>(
            (m, p) => (p.attendedAt && (!m || p.attendedAt > m) ? p.attendedAt : m),
            null,
          )
          return (
            <AccordionItem
              key={g.flat}
              value={g.flat}
              className="rounded-xl border border-gray-200 bg-white not-last:border-b"
            >
              <AccordionTrigger className="grid grid-cols-1 items-center gap-3 px-4 py-3 hover:no-underline md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_1.25rem] md:gap-4">
                <span className="flex items-center gap-2 font-semibold text-gray-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                    <Home className="h-4 w-4" />
                  </span>
                  {g.flat === 'No flat' ? g.flat : `Flat ${g.flat}`}
                </span>
                <span className="truncate text-sm font-normal text-gray-700">{residents.join(', ')}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-normal text-gray-700">
                    <span className="font-semibold text-emerald-700">{g.people.length}</span> of{' '}
                    {Math.max(g.living, g.people.length)} came
                  </span>
                  <span className="mt-1 block h-1.5 w-full max-w-36 overflow-hidden rounded-full bg-gray-100">
                    <span
                      className="block h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, (g.people.length / Math.max(1, g.living)) * 100)}%` }}
                    />
                  </span>
                </span>
                <span className="text-sm font-normal text-gray-700">{last ? dateTime(last) : '-'}</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="overflow-hidden rounded-lg border border-gray-100">
                  <Table className="w-full table-fixed text-sm">
                    <TableHeader className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <TableRow>
                        <TableHead className="w-[40%] px-3 py-2 font-semibold">Person</TableHead>
                        <TableHead className="w-[20%] px-3 py-2 font-semibold">Contact</TableHead>
                        <TableHead className="w-[20%] px-3 py-2 font-semibold">Came at</TableHead>
                        <TableHead className="w-[20%] px-3 py-2 font-semibold">Marked by</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100">
                      {g.people.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="px-3 py-2.5">
                            <span className="font-medium text-gray-900">{p.name}</span>{' '}
                            <span
                              className={
                                p.isResident
                                  ? 'rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700'
                                  : 'rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700'
                              }
                            >
                              {p.isResident ? 'Resident' : p.relation}
                            </span>
                            {!p.isResident && <span className="ml-1 text-xs text-gray-500">of {p.residentName}</span>}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-gray-700">{p.contact || '-'}</TableCell>
                          <TableCell className="px-3 py-2.5 text-gray-700">
                            {p.attendedAt ? dateTime(p.attendedAt) : '-'}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-gray-700">{p.markedBy || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
      <p className="pt-1 text-sm text-gray-600">
        <strong>{groups.length}</strong> flat{groups.length === 1 ? '' : 's'} · <strong>{registrations.length}</strong>{' '}
        {registrations.length === 1 ? 'person' : 'people'} came
      </p>
    </div>
  )
}
