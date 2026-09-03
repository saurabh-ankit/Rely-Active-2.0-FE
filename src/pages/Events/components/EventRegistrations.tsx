import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
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
import { EventsPermission } from '@/pages/Events/components/EventsPermission'
import {
  useGetEventById,
  useGetEventCapacity,
  useGetEventRegistrations,
  useUpdateRegistrationStatus,
} from '@/hooks/react-query/events'
import type { EventRegistration, RegistrationStatus } from '@/lib/services/eventService'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { ArrowLeft, CheckCircle2, Mail, Phone, TrendingUp, UserX, Users, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatDisplayDate } from '@/lib/utils/dateUtils'

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
  const { data: capacityData } = useGetEventCapacity(eventId || '')
  const { data: registrationsData } = useGetEventRegistrations(eventId || '', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })
  const updateStatusMutation = useUpdateRegistrationStatus()

  const event = eventData?.data?.event || eventData?.data
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

  const columns: ColumnDef<EventRegistration>[] = [
    {
      accessorKey: 'patient',
      header: 'Patient',
      cell: ({ row }) => {
        const patient = row.original.patient
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={patient.profilePhoto} alt={patient.fullName} />
              <AvatarFallback>
                {patient.firstName[0]}
                {patient.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-gray-900">{patient.fullName}</div>
              <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
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
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'attendingOn',
      header: 'Attending On',
      cell: ({ row }) => {
        const registration = row.original
        return (
          <div className="text-sm">
            <div className="text-gray-900 font-medium">
              {formatDisplayDate(
                registration.attendingOn || registration.event?.startDate || registration.registeredAt,
              )}
            </div>
            {registration.event?.startDate && (
              <div className="text-gray-500 text-xs mt-1">Event: {formatDisplayDate(registration.event.startDate)}</div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'registeredAt',
      header: 'Registered At',
      cell: ({ row }) => {
        return (
          <div className="text-sm">
            <div className="text-gray-900">{formatDisplayDate(row.original.registeredAt)}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'attendedAt',
      header: 'Attended At',
      cell: ({ row }) => {
        const attendedAt = row.original.attendedAt
        if (!attendedAt) return <span className="text-gray-400">-</span>
        return (
          <div className="text-sm">
            <div className="text-gray-900">{formatDisplayDate(attendedAt)}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => {
        const notes = row.original.notes
        return <div className="max-w-xs truncate text-sm text-gray-600">{notes || '-'}</div>
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const registration = row.original
        return (
          <div className="flex items-center gap-2">
            <EventsPermission action="update">
              {registration.status !== 'ATTENDED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openStatusDialog(registration, 'ATTENDED')}
                  className="h-8"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark Attended
                </Button>
              )}
              {registration.status !== 'NO_SHOW' && registration.status === 'CONFIRMED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openStatusDialog(registration, 'NO_SHOW')}
                  className="h-8"
                >
                  <UserX className="h-4 w-4 mr-1" />
                  No Show
                </Button>
              )}
              {registration.status !== 'CANCELLED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openStatusDialog(registration, 'CANCELLED')}
                  className="h-8"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </EventsPermission>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <div className="container mx-auto  space-y-4">
        {/* Header */}
        <Button variant="ghost" onClick={() => navigate('/admin/events/list')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Event Registrations</h1>
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

        {/* Capacity Dashboard */}
        {capacity && (
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
                  <div className="text-sm text-purple-600 font-medium">Active Registrations</div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">{capacity.activeRegistrations}</div>
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
              <div className="w-full md:w-48">
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
            <CardTitle>Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={registrations} pageSize={pagination.pageSize} />
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
