import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EventsPermission } from '@/pages/Events/components/EventsPermission'
import type { EventRegistration } from '@/lib/services/eventService'
import { formatDisplayDate } from '@/lib/utils/dateUtils'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Mail, Phone, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

const dateTime = (value: string) =>
  new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

interface ReservationAccordionProps {
  registrations: EventRegistration[]
  statusBadge: (status: EventRegistration['status']) => ReactNode
  onCancel: (registration: EventRegistration) => void
  pageIndex: number
  pageCount: number
  totalCount: number
  onPageChange: (pageIndex: number) => void
}

/**
 * Reservations, one per row; opening a row shows everyone in the flat it covers with when each came
 * and who marked them, since people from the same flat may arrive at different times.
 */
export function ReservationAccordion({
  registrations,
  statusBadge,
  onCancel,
  pageIndex,
  pageCount,
  totalCount,
  onPageChange,
}: ReservationAccordionProps) {
  if (registrations.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-500">No registrations found.</p>
  }
  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,1.3fr)_minmax(0,1fr)_1.25rem] gap-4 rounded-xl bg-gray-50 px-4 py-3 text-xs font-semibold tracking-wide text-gray-600 uppercase md:grid">
        <span>Resident</span>
        <span>Status</span>
        <span>Seats</span>
        <span>Attendance</span>
        <span>Registered</span>
        <span />
      </div>
      <Accordion multiple className="gap-2">
        {registrations.map((reg) => {
          const patient = reg.patient
          const people = reg.people ?? []
          const came = people.filter((p) => p.attended).length
          const seats = reg.seatCount ?? 1
          return (
            <AccordionItem
              key={reg.id}
              value={reg.id}
              className="rounded-xl border border-gray-200 bg-white not-last:border-b"
            >
              <AccordionTrigger className="grid grid-cols-1 items-center gap-3 px-4 py-3 hover:no-underline md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,1.3fr)_minmax(0,1fr)_1.25rem] md:gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={patient.profilePhoto} alt={patient.fullName} />
                    <AvatarFallback>
                      {patient.firstName?.[0]}
                      {patient.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-medium text-gray-900">
                      {patient.fullName}
                      {reg.unitNumber && (
                        <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-xs font-semibold text-sky-700">
                          Flat {reg.unitNumber}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs font-normal text-gray-500">
                      {patient.contact_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {patient.contact_email}
                        </span>
                      )}
                      {patient.contact_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {patient.contact_phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div>{statusBadge(reg.status)}</div>
                <div className="text-sm font-semibold text-gray-900">{seats}</div>
                <div className="min-w-0">
                  <div className="text-sm font-normal text-gray-700">
                    <span className="font-semibold text-emerald-700">{came}</span> of {seats} came
                  </div>
                  <div className="mt-1 h-1.5 w-full max-w-36 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, (came / seats) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-normal text-gray-700">{formatDisplayDate(reg.registeredAt)}</div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="w-[40%] px-3 py-2 font-semibold">Person</th>
                        <th className="w-[20%] px-3 py-2 font-semibold">Attendance</th>
                        <th className="w-[20%] px-3 py-2 font-semibold">Came at</th>
                        <th className="w-[20%] px-3 py-2 font-semibold">Marked by</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {people.map((p) => (
                        <tr key={p.familyMemberId ?? 'resident'}>
                          <td className="px-3 py-2.5">
                            <span className="font-medium text-gray-900">{p.name}</span>{' '}
                            <span
                              className={
                                p.familyMemberId
                                  ? 'rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700'
                                  : 'rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700'
                              }
                            >
                              {p.familyMemberId ? p.relation || 'Family member' : 'Resident'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {p.attended ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <CheckCircle2 className="h-4 w-4" />
                                Came
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-gray-400">
                                <Clock className="h-4 w-4" />
                                Not yet
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-gray-700">{p.markedAt ? dateTime(p.markedAt) : '-'}</td>
                          <td className="px-3 py-2.5 text-gray-700">{p.markedBy || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                  <span>
                    Attending on {formatDisplayDate(reg.attendingOn || reg.event?.startDate || reg.registeredAt)}
                    {came >= seats && seats > 0 ? ' · All reserved seats are marked' : ''}
                    {reg.notes ? ` · ${reg.notes}` : ''}
                  </span>
                  {reg.status !== 'CANCELLED' && (
                    <EventsPermission action="update">
                      <Button size="sm" variant="outline" onClick={() => onCancel(reg)} className="h-8">
                        <XCircle className="mr-1 h-4 w-4" />
                        Cancel reservation
                      </Button>
                    </EventsPermission>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
      <div className="flex items-center justify-between pt-2 text-sm text-gray-600">
        <span>
          Total <strong>{totalCount}</strong> records · Page <strong>{pageIndex + 1}</strong> of{' '}
          <strong>{Math.max(1, pageCount)}</strong>
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={pageIndex <= 0} onClick={() => onPageChange(pageIndex - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
