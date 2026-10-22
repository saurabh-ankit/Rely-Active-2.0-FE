import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { OpenAttendanceAccordion } from '@/pages/Events/components/OpenAttendanceAccordion'
import { ReservationAccordion } from '@/pages/Events/components/ReservationAccordion'
import {
  useGetEventById,
  useGetEventCapacity,
  useGetEventRegistrations,
  useUpdateRegistrationStatus,
} from '@/hooks/react-query/events'
import type { EventRegistration, RegistrationStatus } from '@/lib/services/eventService'
import type { PaginationState } from '@tanstack/react-table'
import { ArrowLeft, TrendingUp, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const EventRegistrationsPage = () => {
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId: string }>()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | 'all'>('all')
  const [selectedRegistration, setSelectedRegistration] = useState<EventRegistration | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<RegistrationStatus>('ATTENDED')
  const [statusNotes, setStatusNotes] = useState('')

  const { data: eventData } = useGetEventById(eventId || '', !!eventId)
  const loadedEvent = eventData?.data?.event || eventData?.data
  // No reservations: open to every residing resident; staff mark each person who came.
  const isOpen = !!loadedEvent && loadedEvent.allowReservation === false && !loadedEvent.fromResidentRequest
  const { data: capacityData } = useGetEventCapacity(eventId || '')
  const { data: registrationsData } = useGetEventRegistrations(eventId || '', {
    // Open events are grouped by flat, so load everyone who came at once.
    page: isOpen ? 1 : pagination.pageIndex + 1,
    limit: isOpen ? 1000 : pagination.pageSize,
    search: searchTerm || undefined,
    status: isOpen ? 'ATTENDED' : statusFilter !== 'all' ? statusFilter : undefined,
  })
  const updateStatusMutation = useUpdateRegistrationStatus()

  const event = loadedEvent
  const capacity = capacityData?.data
  const registrations = Array.isArray(registrationsData?.data?.registrations)
    ? registrationsData.data.registrations
    : []

  const getStatusBadge = (status: RegistrationStatus) => {
    const variants: Record<
      RegistrationStatus,
      {
        variant: 'default' | 'secondary' | 'destructive' | 'outline'
        className: string
      }
    > = {
      PENDING: {
        variant: 'outline',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      },
      CONFIRMED: {
        variant: 'default',
        className: 'bg-green-50 text-green-700 border-green-200',
      },
      CANCELLED: {
        variant: 'destructive',
        className: 'bg-red-50 text-red-700 border-red-200',
      },
      ATTENDED: {
        variant: 'default',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      NO_SHOW: {
        variant: 'destructive',
        className: 'bg-gray-50 text-gray-700 border-gray-200',
      },
    }
    const config = variants[status]
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const handleStatusUpdate = () => {
    if (!selectedRegistration || !eventId) return
    updateStatusMutation.mutate(
      {
        eventId: eventId,
        registrationId: selectedRegistration.id,
        data: {
          status: newStatus,
          notes: statusNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          setIsStatusDialogOpen(false)
          setSelectedRegistration(null)
          setStatusNotes('')
        },
      },
    )
  }

  const openStatusDialog = (registration: EventRegistration, status: RegistrationStatus) => {
    setSelectedRegistration(registration)
    setNewStatus(status)
    setStatusNotes('')
    setIsStatusDialogOpen(true)
  }

  return (
    <div>
      <div className="w-full space-y-4">
        {/* Header */}
        <Button variant="ghost" onClick={() => navigate('/admin/events/list')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">{isOpen ? 'Event Attendance' : 'Event Registrations'}</h1>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              {/* <h1 className="text-3xl font-bold text-gray-900">
              Event Registrations
            </h1> */}
              {(event?.title || capacity?.eventTitle) && (
                <p className="text-gray-600 mt-1">{event?.title || capacity?.eventTitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Attendance is marked by Attendance staff from the L3 app, and only for staff-created events. */}
        {event && (
          <p
            className={
              event.fromResidentRequest
                ? 'rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm text-purple-800'
                : 'rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800'
            }
          >
            {event.fromResidentRequest
              ? 'Requested by a resident – attendance is not marked for this event.'
              : isOpen
                ? 'No reservations: this event is open to every residing resident. Attendance staff mark each person who came (resident or family member) in the L3 app.'
                : 'Attendance is marked by Attendance staff in the L3 app. Attended and no-show residents appear here with who marked them.'}
          </p>
        )}

        {/* Open event: how many people came */}
        {isOpen && (
          <Card>
            <CardContent className="flex flex-wrap items-center gap-6 pt-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-600">People came</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {registrationsData?.data?.pagination?.totalCount ?? capacity?.attendedRegistrations ?? 0}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Each person (resident or family member) is listed with who marked them.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Capacity Dashboard */}
        {capacity && !isOpen && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Capacity Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total Capacity</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {capacity.totalCapacity ?? capacity.venueCapacity}
                  </div>
                  {capacity.maxCapacity != null && (
                    <div className="text-xs text-blue-700 mt-1">Event override (venue: {capacity.venueCapacity})</div>
                  )}
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Available Spots</div>
                  <div className="text-2xl font-bold text-green-900 mt-1">{capacity.availableSpots}</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Active Seats</div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">
                    {capacity.activeSeats ?? capacity.activeRegistrations}
                  </div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-sm text-orange-600 font-medium">Utilization Rate</div>
                  <div className="text-2xl font-bold text-orange-900 mt-1">
                    {capacity.utilizationPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              {capacity.reservationPerFlat != null && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                  Reservation limit per flat: <strong>{capacity.reservationPerFlat}</strong>
                </div>
              )}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Registrations by Status</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-[9px] md:text-xs text-gray-600 ">PENDING</div>
                    <div className="text-lg font-semibold text-gray-900">{capacity.pendingRegistrations}</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-[10px] md:text-xs text-gray-600">CONFIRMED</div>
                    <div className="text-lg font-semibold text-gray-900">{capacity.confirmedRegistrations}</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-[10px] md:text-xs text-gray-600">CANCELLED</div>
                    <div className="text-lg font-semibold text-gray-900">{capacity.cancelledRegistrations}</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-[10px] md:text-xs text-gray-600">ATTENDED</div>
                    <div className="text-lg font-semibold text-gray-900">{capacity.attendedRegistrations}</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-[10px] md:text-xs text-gray-600">NO_SHOW</div>
                    <div className="text-lg font-semibold text-gray-900">{capacity.noShowRegistrations}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by resident name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPagination({ ...pagination, pageIndex: 0 })
                  }}
                />
              </div>
              <div className={isOpen ? 'hidden' : 'w-full md:w-48'}>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as RegistrationStatus | 'all')
                    setPagination({ ...pagination, pageIndex: 0 })
                  }}
                >
                  <SelectTrigger className="w-[100%]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="ATTENDED">Attended</SelectItem>
                    <SelectItem value="NO_SHOW">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registrations Table */}
        <Card>
          <CardHeader>
            <CardTitle>{isOpen ? 'People who came, by flat' : 'Registrations'}</CardTitle>
          </CardHeader>
          <CardContent>
            {!isOpen ? (
              <ReservationAccordion
                registrations={registrations}
                statusBadge={getStatusBadge}
                onCancel={(reg) => openStatusDialog(reg, 'CANCELLED')}
                pageIndex={pagination.pageIndex}
                pageCount={registrationsData?.data?.pagination?.totalPages || 1}
                totalCount={registrationsData?.data?.pagination?.totalCount ?? registrations.length}
                onPageChange={(pageIndex) => setPagination((p) => ({ ...p, pageIndex }))}
              />
            ) : (
              <OpenAttendanceAccordion registrations={registrations} />
            )}
          </CardContent>
        </Card>

        {/* Status Update Dialog */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Registration Status</DialogTitle>
              <DialogDescription>Update the status for {selectedRegistration?.patient.fullName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="registration-new-status" className="text-sm font-medium">
                  New Status
                </Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as RegistrationStatus)}>
                  <SelectTrigger id="registration-new-status" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATTENDED">Attended</SelectItem>
                    <SelectItem value="NO_SHOW">No Show</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="registration-status-notes" className="text-sm font-medium">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="registration-status-notes"
                  className="mt-2"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add any notes about this status change..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsStatusDialogOpen(false)
                  setSelectedRegistration(null)
                  setStatusNotes('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleStatusUpdate} disabled={updateStatusMutation.isPending}>
                {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default EventRegistrationsPage
