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
import { MedicalPermission } from '@/pages/Medical/components/MedicalPermission'
import { BookAppointmentDialog } from '@/pages/Medical/components/appointments/BookAppointmentDialog'
import {
  useAppointmentBookings,
  useAppointmentCapacity,
  useAppointmentShiftDate,
  useUpdateAppointmentStatus,
} from '@/hooks/react-query/appointments'
import type { AppointmentStatus, DoctorAppointment } from '@/lib/types/appointment'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { ArrowLeft, CheckCircle2, Mail, Phone, Plus, TrendingUp, UserX, Users, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatDisplayDate } from '@/lib/utils/dateUtils'

const AppointmentBookingsPage = () => {
  const navigate = useNavigate()
  const { shiftEmployeeDateId } = useParams<{ shiftEmployeeDateId: string }>()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all')
  const [selectedAppointment, setSelectedAppointment] = useState<DoctorAppointment | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<AppointmentStatus>('ATTENDED')
  const [statusNotes, setStatusNotes] = useState('')
  const [bookOpen, setBookOpen] = useState(false)

  const { data: shiftDateData } = useAppointmentShiftDate(shiftEmployeeDateId || '', !!shiftEmployeeDateId)
  const { data: capacityData } = useAppointmentCapacity(shiftEmployeeDateId || '', !!shiftEmployeeDateId)
  const { data: bookingsData } = useAppointmentBookings(
    shiftEmployeeDateId || '',
    {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    },
    !!shiftEmployeeDateId,
  )
  const updateStatusMutation = useUpdateAppointmentStatus()

  const shiftContext = shiftDateData?.data
  const capacity = capacityData?.data
  const bookings = Array.isArray(bookingsData?.data?.bookings) ? bookingsData.data.bookings : []

  const subtitle =
    shiftContext?.doctor?.fullName || capacity?.doctorName
      ? `${shiftContext?.doctor?.fullName || capacity?.doctorName} · ${shiftContext?.shift?.name || capacity?.shiftName || 'Shift'} · ${formatDisplayDate(shiftContext?.date || capacity?.date || '')}`
      : null

  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<
      AppointmentStatus,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }
    > = {
      PENDING: { variant: 'outline', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
      CONFIRMED: { variant: 'default', className: 'bg-green-50 text-green-700 border-green-200' },
      CANCELLED: { variant: 'destructive', className: 'bg-red-50 text-red-700 border-red-200' },
      ATTENDED: { variant: 'default', className: 'bg-blue-50 text-blue-700 border-blue-200' },
      NO_SHOW: { variant: 'destructive', className: 'bg-gray-50 text-gray-700 border-gray-200' },
    }
    const config = variants[status]
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const handleStatusUpdate = () => {
    if (!selectedAppointment) return
    updateStatusMutation.mutate(
      {
        appointmentId: selectedAppointment.id,
        data: {
          status: newStatus,
          notes: statusNotes || undefined,
        },
      },
      {
        onSuccess: () => {
          setIsStatusDialogOpen(false)
          setSelectedAppointment(null)
          setStatusNotes('')
        },
      },
    )
  }

  const openStatusDialog = (appointment: DoctorAppointment, status: AppointmentStatus) => {
    setSelectedAppointment(appointment)
    setNewStatus(status)
    setStatusNotes('')
    setIsStatusDialogOpen(true)
  }

  const columns: ColumnDef<DoctorAppointment>[] = [
    {
      accessorKey: 'patient',
      header: 'Resident',
      cell: ({ row }) => {
        const patient = row.original.patient || row.original.resident
        const familyMember = row.original.familyMember
        const displayName =
          patient?.displayLabel ||
          (familyMember
            ? `${familyMember.fullName}${familyMember.relation ? ` · ${familyMember.relation}` : ''}`
            : patient
              ? `${patient.fullName} (Self)`
              : null)
        const photo = familyMember?.profilePhoto || patient?.profilePhoto
        const email = familyMember?.contact_email || patient?.contact_email
        const phone = familyMember?.contact_phone || patient?.contact_phone
        if (!displayName) return <span className="text-gray-400">-</span>
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={photo} alt={displayName} />
              <AvatarFallback>
                {(familyMember?.firstName || patient?.firstName || '?')[0]}
                {(familyMember?.lastName || patient?.lastName || '?')[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-gray-900">{displayName}</div>
              <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                {email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {email}
                  </span>
                )}
                {phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {phone}
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
      accessorKey: 'slotTimeRange',
      header: 'Booked Slot',
      cell: ({ row }) => <div className="text-sm font-semibold text-gray-900">{row.original.slotTimeRange}</div>,
    },
    {
      accessorKey: 'appointmentDate',
      header: 'Appointment Date',
      cell: ({ row }) => (
        <div className="text-sm text-gray-900 font-medium">{formatDisplayDate(row.original.appointmentDate)}</div>
      ),
    },
    {
      accessorKey: 'bookedAt',
      header: 'Booked At',
      cell: ({ row }) => <div className="text-sm text-gray-900">{formatDisplayDate(row.original.bookedAt)}</div>,
    },
    {
      accessorKey: 'attendedAt',
      header: 'Attended At',
      cell: ({ row }) => {
        const attendedAt = row.original.attendedAt
        if (!attendedAt) return <span className="text-gray-400">-</span>
        return <div className="text-sm text-gray-900">{formatDisplayDate(attendedAt)}</div>
      },
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => <div className="max-w-xs truncate text-sm text-gray-600">{row.original.notes || '-'}</div>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const appointment = row.original
        return (
          <div className="flex items-center gap-2">
            <MedicalPermission action="update">
              {appointment.status !== 'ATTENDED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openStatusDialog(appointment, 'ATTENDED')}
                  className="h-8"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark Attended
                </Button>
              )}
              {appointment.status !== 'NO_SHOW' && appointment.status === 'CONFIRMED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openStatusDialog(appointment, 'NO_SHOW')}
                  className="h-8"
                >
                  <UserX className="h-4 w-4 mr-1" />
                  No Show
                </Button>
              )}
              {appointment.status !== 'CANCELLED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openStatusDialog(appointment, 'CANCELLED')}
                  className="h-8"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </MedicalPermission>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <div className="container mx-auto space-y-4">
        <Button variant="ghost" onClick={() => navigate('/admin/medical?section=appointments')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Appointments
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Appointment Bookings</h1>
            {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
          </div>
          <MedicalPermission action="create">
            <Button
              className="bg-[#005390] hover:bg-[#004070] text-white"
              onClick={() => setBookOpen(true)}
              disabled={!shiftEmployeeDateId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
          </MedicalPermission>
        </div>

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
                  <div className="text-sm text-blue-600 font-medium">Total Slots</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {capacity.totalSlots ?? capacity.totalCapacity}
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Available Slots</div>
                  <div className="text-2xl font-bold text-green-900 mt-1">
                    {capacity.availableSlots ?? capacity.availableSpots}
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Booked Slots</div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">
                    {capacity.bookedSlots ?? capacity.activeSeats}
                  </div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-sm text-orange-600 font-medium">Utilization Rate</div>
                  <div className="text-2xl font-bold text-orange-900 mt-1">
                    {(capacity.utilizationPercentage ?? 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Appointments by Status</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-[9px] md:text-xs text-gray-600">PENDING</div>
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
                    setStatusFilter(value as AppointmentStatus | 'all')
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

        <Card>
          <CardHeader>
            <CardTitle>Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={bookings} pageSize={pagination.pageSize} />
          </CardContent>
        </Card>

        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Appointment Status</DialogTitle>
              <DialogDescription>
                Update the status for{' '}
                {selectedAppointment?.patient?.fullName || selectedAppointment?.resident?.fullName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="appointment-new-status" className="text-sm font-medium">
                  New Status
                </Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as AppointmentStatus)}>
                  <SelectTrigger id="appointment-new-status" className="mt-2">
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
                <Label htmlFor="appointment-status-notes" className="text-sm font-medium">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="appointment-status-notes"
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
                  setSelectedAppointment(null)
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

        {shiftEmployeeDateId && (
          <BookAppointmentDialog
            open={bookOpen}
            onOpenChange={setBookOpen}
            shiftEmployeeDateId={shiftEmployeeDateId}
            slots={capacity?.slots || []}
          />
        )}
      </div>
    </div>
  )
}

export default AppointmentBookingsPage
