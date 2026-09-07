import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar as DateCalendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTabs } from '@/components/common/ResponsiveTabs'
import { EventsPermission } from '@/pages/Events/components/EventsPermission'
import {
  useBulkDeleteEvents,
  useCancelEventRequest,
  useConfirmEventRequest,
  useDeleteEvent,
  useListEventRequests,
  useListEvents,
  useScheduleEventRequestMeeting,
} from '@/hooks/react-query/events'
import type { Event, EventRequest } from '@/lib/services/eventService'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { ArrowLeft, Calendar, List, MapPin, Plus, Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDisplayDate } from '@/lib/utils/dateUtils'
import CreateEventModal from './CreateEventModal'

interface EventsListPageProps {
  embedded?: boolean
  enabled?: boolean
}

type ListSubTab = 'resident' | 'list'

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return value
  }
}

const formatAmount = (value?: number | null) => {
  return `${Number(value || 0).toLocaleString('en-IN')}/-`
}

const statusLabel = (status: string) => {
  switch (status) {
    case 'OPEN':
      return 'Open'
    case 'IN_PROGRESS':
      return 'In-Progress'
    case 'CLOSED':
      return 'Closed'
    case 'REJECTED':
      return 'Rejected'
    case 'CANCELLED':
      return 'Canceled'
    default:
      return status
  }
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'CLOSED':
      return 'bg-green-100 text-green-800'
    case 'REJECTED':
    case 'CANCELLED':
      return 'bg-red-100 text-red-800'
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800'
    case 'OPEN':
    default:
      return 'bg-amber-100 text-amber-800'
  }
}

const startOfDay = (date: Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const EventsListPage = ({ embedded = false, enabled = true }: EventsListPageProps) => {
  const navigate = useNavigate()
  const [listSubTab, setListSubTab] = useState<ListSubTab>('list')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [requestPagination, setRequestPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [requestSearch, setRequestSearch] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [editEventId, setEditEventId] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<EventRequest | null>(null)
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false)
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(undefined)
  const [meetingTime, setMeetingTime] = useState('10:00')
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancellationReasonError, setCancellationReasonError] = useState('')

  const deleteEventMutation = useDeleteEvent()
  const bulkDeleteEventsMutation = useBulkDeleteEvents()
  const scheduleMeetingMutation = useScheduleEventRequestMeeting()
  const confirmRequestMutation = useConfirmEventRequest()
  const cancelRequestMutation = useCancelEventRequest()

  const { data: eventsData, isLoading } = useListEvents({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: searchTerm || undefined,
    eventType: eventTypeFilter !== 'all' ? (eventTypeFilter as Event['eventType']) : undefined,
  })

  const { data: requestsData, isLoading: isLoadingRequests } = useListEventRequests(
    {
      page: requestPagination.pageIndex + 1,
      limit: requestPagination.pageSize,
      search: requestSearch || undefined,
    },
    enabled && listSubTab === 'resident',
  )

  // Ensure events is always an array
  const events: Event[] = Array.isArray(eventsData?.data?.events)
    ? eventsData.data.events
    : Array.isArray(eventsData?.data?.records)
      ? eventsData.data.records
      : Array.isArray(eventsData?.data)
        ? eventsData.data
        : []

  const eventRequests: EventRequest[] = useMemo(() => {
    if (Array.isArray(requestsData?.data?.requests)) return requestsData.data.requests
    if (Array.isArray(requestsData?.data?.records)) return requestsData.data.records
    if (Array.isArray(requestsData?.data)) return requestsData.data
    return []
  }, [requestsData])

  const handleSingleDelete = () => {
    if (!eventToDelete) return
    deleteEventMutation.mutate(eventToDelete.id, {
      onSuccess: () => {
        setSelectedIds((prev) => prev.filter((id) => id !== eventToDelete.id))
        setEventToDelete(null)
      },
    })
  }

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return
    bulkDeleteEventsMutation.mutate(selectedIds, {
      onSuccess: () => {
        setSelectedIds([])
        setIsBulkDeleteOpen(false)
      },
    })
  }

  const columns: ColumnDef<Event>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={events.length > 0 && selectedIds.length === events.length}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedIds(events.map((e) => e.id))
            } else {
              setSelectedIds([])
            }
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.includes(row.original.id)}
          onCheckedChange={(checked) => {
            const id = row.original.id
            if (checked) {
              setSelectedIds((prev) => [...prev, id])
            } else {
              setSelectedIds((prev) => prev.filter((item) => item !== id))
            }
          }}
          aria-label={`Select ${row.original.title}`}
        />
      ),
    },
    {
      accessorKey: 'poster',
      header: 'Poster',
      cell: ({ row }) => {
        const event = row.original
        const isResidentConfirmed =
          typeof event.description === 'string' && event.description.startsWith('Confirmed from resident request')
        const poster = event.poster || (isResidentConfirmed ? event.venue?.coverPhoto : undefined) || ''
        return (
          <div className="w-24 h-16 rounded-lg overflow-hidden">
            {poster ? (
              <img
                src={poster}
                alt={event.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = 'https://via.placeholder.com/96x64?text=No+Image'
                }}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                No Image
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'title',
      header: 'Event Title',
      cell: ({ row }) => {
        const event = row.original
        return (
          <div>
            <div className="font-semibold text-gray-900">{event.title}</div>
            {event.description && <div className="text-sm text-gray-500 mt-1 line-clamp-2">{event.description}</div>}
          </div>
        )
      },
    },
    {
      accessorKey: 'eventType',
      header: 'Type',
      cell: ({ row }) => {
        const eventType = row.getValue('eventType') as string
        const label = eventType === 'regular' ? 'Regular' : 'Special'
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
            {label}
          </span>
        )
      },
    },
    {
      accessorKey: 'venue',
      header: 'Venue',
      cell: ({ row }) => {
        const venue = row.original.venue
        return (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">{venue?.name || 'Unknown Venue'}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'startDate',
      header: 'Date & Time',
      cell: ({ row }) => {
        const event = row.original
        const startDate = new Date(event.startDate)
        const endDate = new Date(event.endDate)
        return (
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
            <div className="text-sm">
              <div className="text-gray-900">{formatDisplayDate(event.startDate)}</div>
              <div className="text-gray-500">
                {startDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                -{' '}
                {endDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'frequencyType',
      header: 'Frequency',
      cell: ({ row }) => {
        const frequency = row.getValue('frequencyType') as string
        if (!frequency || frequency === 'once') {
          return <span className="text-gray-400 text-sm">One-time</span>
        }
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium capitalize">
            {frequency}
          </span>
        )
      },
    },
    {
      accessorKey: 'entryFee',
      header: 'Entry Fee',
      cell: ({ row }) => {
        const entryFee = row.getValue('entryFee')
        if (entryFee === undefined || entryFee === null) {
          return <span className="text-gray-400 text-sm">Free</span>
        }
        const numericFee = typeof entryFee === 'string' ? parseFloat(entryFee) : Number(entryFee)
        if (isNaN(numericFee)) {
          return <span className="text-gray-400 text-sm">Free</span>
        }
        return <span className="text-gray-900 font-medium">₹{numericFee.toFixed(2)}</span>
      },
    },
    {
      accessorKey: 'allowReservation',
      header: 'Reservations',
      cell: ({ row }) => {
        const allowReservation = row.getValue('allowReservation') as boolean
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              allowReservation ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {allowReservation ? 'Enabled' : 'Disabled'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <EventsPermission action="update">
            <Button variant="outline" size="sm" onClick={() => setEditEventId(row.original.id)}>
              Edit
            </Button>
          </EventsPermission>
          {row.original.allowReservation && (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate(`/admin/events/${row.original.id}/registrations`)}
            >
              Registrations
            </Button>
          )}
          <EventsPermission action="delete">
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setEventToDelete(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </EventsPermission>
        </div>
      ),
    },
  ]

  const requestColumns: ColumnDef<EventRequest>[] = [
    {
      accessorKey: 'requestNumber',
      header: 'Request ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-gray-800">{row.original.requestNumber || '—'}</span>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Event Title',
      cell: ({ row }) => (
        <button
          type="button"
          className="text-left font-semibold text-gray-900 hover:text-[#2a517c] cursor-pointer"
          onClick={() => setSelectedRequest(row.original)}
        >
          {row.original.title}
        </button>
      ),
    },
    {
      id: 'resident',
      header: 'Resident',
      cell: ({ row }) => row.original.resident?.fullName || '—',
    },
    {
      id: 'venue',
      header: 'Venue',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span>{row.original.venue?.name || '—'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'startDate',
      header: 'Schedule',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{formatDateTime(row.original.startDate)}</div>
          <div className="text-gray-500">to {formatDateTime(row.original.endDate)}</div>
        </div>
      ),
    },
    {
      accessorKey: 'occupancy',
      header: 'People',
      cell: ({ row }) => row.original.occupancy,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={`${statusBadgeClass(row.original.status)} border-none`}>
          {statusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Submitted',
      cell: ({ row }) => formatDisplayDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => setSelectedRequest(row.original)}>
          View
        </Button>
      ),
    },
  ]

  const eventDayStart = selectedRequest ? startOfDay(new Date(selectedRequest.startDate)) : null
  const todayStart = startOfDay(new Date())
  const canActOnRequest = selectedRequest?.status === 'OPEN' || selectedRequest?.status === 'IN_PROGRESS'
  const showConfirmButton = canActOnRequest
  const showScheduleButton = selectedRequest?.status === 'OPEN'
  const showCancelButton = canActOnRequest
  const isRequestActionPending =
    scheduleMeetingMutation.isPending || confirmRequestMutation.isPending || cancelRequestMutation.isPending

  const openMeetingDialog = () => {
    setMeetingDate(undefined)
    setMeetingTime('10:00')
    setIsMeetingDialogOpen(true)
  }

  const handleScheduleMeeting = () => {
    if (!selectedRequest || !meetingDate) return
    const [hours, minutes] = meetingTime.split(':').map((part) => parseInt(part, 10))
    const scheduled = new Date(meetingDate)
    scheduled.setHours(hours || 0, minutes || 0, 0, 0)

    scheduleMeetingMutation.mutate(
      {
        requestId: selectedRequest.id,
        meetingScheduledAt: scheduled.toISOString(),
      },
      {
        onSuccess: (data) => {
          const updated = data?.data as EventRequest | undefined
          if (updated?.id) {
            setSelectedRequest(updated)
          } else {
            setSelectedRequest({
              ...selectedRequest,
              status: 'IN_PROGRESS',
              meetingScheduledAt: scheduled.toISOString(),
            })
          }
          setIsMeetingDialogOpen(false)
        },
      },
    )
  }

  const handleConfirmBooking = () => {
    if (!selectedRequest) return
    confirmRequestMutation.mutate(selectedRequest.id, {
      onSuccess: (data) => {
        const updated = (data?.data?.request || data?.data) as EventRequest | undefined
        if (updated?.id) {
          setSelectedRequest(updated)
        } else {
          setSelectedRequest({ ...selectedRequest, status: 'CLOSED' })
        }
      },
    })
  }

  const openCancelDialog = () => {
    setCancellationReason('')
    setCancellationReasonError('')
    setIsCancelDialogOpen(true)
  }

  const handleCancelRequest = () => {
    if (!selectedRequest) return
    const reason = cancellationReason.trim()
    if (!reason) {
      setCancellationReasonError('Reason for cancellation is required')
      return
    }

    cancelRequestMutation.mutate(
      {
        requestId: selectedRequest.id,
        cancellationReason: reason,
      },
      {
        onSuccess: (data) => {
          const updated = data?.data as EventRequest | undefined
          if (updated?.id) {
            setSelectedRequest(updated)
          } else {
            setSelectedRequest({
              ...selectedRequest,
              status: 'CANCELLED',
              cancellationReason: reason,
            })
          }
          setIsCancelDialogOpen(false)
          setCancellationReason('')
          setCancellationReasonError('')
        },
      },
    )
  }

  if (!enabled) return null

  return (
    <div>
      {!embedded && (
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/events')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calendar
          </Button>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Events List</h1>
              <p className="text-gray-600 mt-2">View and manage all events</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <EventsPermission action="delete">
                  <Button
                    variant="destructive"
                    onClick={() => setIsBulkDeleteOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedIds.length})
                  </Button>
                </EventsPermission>
              )}
              <EventsPermission action="create">
                <Button
                  onClick={() => setIsCreateEventOpen(true)}
                  className="border-[#2a517c] text-white hover:bg-[#2a517c] hover:text-white cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </EventsPermission>
            </div>
          </div>
        </div>
      )}

      {embedded && selectedIds.length > 0 && listSubTab === 'list' && (
        <div className="mb-4 flex justify-end">
          <EventsPermission action="delete">
            <Button
              variant="destructive"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedIds.length})
            </Button>
          </EventsPermission>
        </div>
      )}

      <ResponsiveTabs
        value={listSubTab}
        onValueChange={(value) => setListSubTab(value as ListSubTab)}
        className="w-full"
        tabs={[
          {
            value: 'resident',
            label: 'Resident Request',
            shortLabel: 'Request',
            icon: Users,
            content: (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle>Resident Requests</CardTitle>
                    <Input
                      placeholder="Search requests..."
                      value={requestSearch}
                      onChange={(e) => {
                        setRequestSearch(e.target.value)
                        setRequestPagination({ ...requestPagination, pageIndex: 0 })
                      }}
                      className="w-full sm:w-64"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {!isLoadingRequests && eventRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mb-3 opacity-40" />
                      <p className="text-sm font-semibold text-foreground">No resident event requests</p>
                      <p className="text-xs mt-1 max-w-sm">
                        Event requests submitted by residents through the app will appear here.
                      </p>
                    </div>
                  ) : (
                    <DataTable
                      columns={requestColumns}
                      data={eventRequests}
                      isLoading={isLoadingRequests}
                      pageSize={requestPagination.pageSize}
                    />
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'list',
            label: 'List',
            shortLabel: 'List',
            icon: List,
            content: (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <CardTitle>All Events</CardTitle>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 gap-responsive">
                      <Select
                        value={eventTypeFilter}
                        onValueChange={(value) => {
                          setEventTypeFilter(value as string)
                          setSelectedIds([])
                          setPagination({ ...pagination, pageIndex: 0 })
                        }}
                      >
                        <SelectTrigger className="w-[100%] !h-10">
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="regular">Regular Event</SelectItem>
                          <SelectItem value="special">Special Event</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="w-[100%]">
                        <Input
                          placeholder="Search events..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setSelectedIds([])
                            setPagination({ ...pagination, pageIndex: 0 })
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable columns={columns} data={events} isLoading={isLoading} pageSize={pagination.pageSize} />
                </CardContent>
              </Card>
            ),
          },
        ]}
      />

      {/* Delete Single Event Modal */}
      <Dialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{eventToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEventToDelete(null)} disabled={deleteEventMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSingleDelete} disabled={deleteEventMutation.isPending}>
              {deleteEventMutation.isPending ? 'Deleting...' : 'Delete Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Multiple Events Modal */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={(open) => !open && setIsBulkDeleteOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Multiple Events</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.length} selected event(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteOpen(false)}
              disabled={bulkDeleteEventsMutation.isPending}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleteEventsMutation.isPending}>
              {bulkDeleteEventsMutation.isPending ? 'Deleting...' : `Delete ${selectedIds.length} Events`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!embedded && <CreateEventModal open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen} />}

      <CreateEventModal
        open={!!editEventId}
        eventId={editEventId || undefined}
        onOpenChange={(open) => {
          if (!open) setEditEventId(null)
        }}
      />

      <Dialog
        open={!!selectedRequest}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null)
            setIsMeetingDialogOpen(false)
            setIsCancelDialogOpen(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resident Event Request</DialogTitle>
            <DialogDescription>Details submitted from the resident app booking flow.</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Event Title</p>
                  <p className="font-semibold text-base text-gray-900">{selectedRequest.title}</p>
                  {selectedRequest.requestNumber && (
                    <p className="text-xs font-mono text-gray-600 mt-1">ID: {selectedRequest.requestNumber}</p>
                  )}
                </div>
                <Badge className={`${statusBadgeClass(selectedRequest.status)} border-none`}>
                  {statusLabel(selectedRequest.status)}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Resident</p>
                  <p className="font-medium">{selectedRequest.resident?.fullName || '—'}</p>
                  <p className="text-xs text-gray-500">Flat: {selectedRequest.resident?.flatNumber || '—'}</p>
                  <p className="text-xs text-gray-500">Tower: {selectedRequest.resident?.tower || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Venue</p>
                  <p className="font-medium">{selectedRequest.venue?.name || '—'}</p>
                  {selectedRequest.venue?.occupancy != null && (
                    <p className="text-xs text-gray-500">Capacity: {selectedRequest.venue.occupancy}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Start</p>
                  <p className="font-medium">{formatDateTime(selectedRequest.startDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End</p>
                  <p className="font-medium">{formatDateTime(selectedRequest.endDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected People</p>
                  <p className="font-medium">{selectedRequest.occupancy}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium">{formatDateTime(selectedRequest.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="font-medium">{formatAmount(selectedRequest.totalCost)}</p>
                </div>
              </div>
              {selectedRequest.status === 'IN_PROGRESS' && selectedRequest.meetingScheduledAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Scheduled Meeting</p>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <p className="font-medium text-blue-900">{formatDateTime(selectedRequest.meetingScheduledAt)}</p>
                  </div>
                </div>
              )}
              {selectedRequest.status === 'CANCELLED' && selectedRequest.cancellationReason?.trim() && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Reason for Cancellation</p>
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <p className="font-medium text-red-900 whitespace-pre-wrap">{selectedRequest.cancellationReason}</p>
                  </div>
                </div>
              )}
              {Array.isArray(selectedRequest.schedule) && selectedRequest.schedule.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Detailed Schedule</p>
                  <div className="space-y-2">
                    {selectedRequest.schedule.map((slot) => (
                      <div
                        key={`${slot.startDate}-${slot.endDate}`}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <p className="font-medium text-gray-900">
                          {new Date(slot.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Start:{' '}
                          {new Date(slot.startDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                          {' · '}
                          End:{' '}
                          {new Date(slot.endDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(selectedRequest.selectedServices) && selectedRequest.selectedServices.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Selected Services</p>
                  <div className="space-y-2">
                    {selectedRequest.selectedServices.map((service) => (
                      <div
                        key={service.globalServiceId || service.name}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{service.name}</p>
                          {service.keyFeatures && (
                            <p className="text-xs text-gray-500 truncate">{service.keyFeatures}</p>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-gray-700 shrink-0">
                          Qty: {service.quantity ?? 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Custom Request</p>
                <p className="rounded-lg bg-gray-50 border p-3 text-gray-700 whitespace-pre-wrap">
                  {selectedRequest.customRequest?.trim() || 'No custom request provided'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row sm:justify-end">
            {showCancelButton && (
              <Button variant="destructive" onClick={openCancelDialog} disabled={isRequestActionPending}>
                Cancel Request
              </Button>
            )}
            {showScheduleButton && (
              <Button variant="outline" onClick={openMeetingDialog} disabled={isRequestActionPending}>
                Schedule Meeting
              </Button>
            )}
            {showConfirmButton && (
              <Button
                onClick={handleConfirmBooking}
                disabled={isRequestActionPending}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {confirmRequestMutation.isPending ? 'Confirming...' : 'Confirm Booking Request'}
              </Button>
            )}
            {!showConfirmButton && !showScheduleButton && !showCancelButton && (
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMeetingDialogOpen} onOpenChange={setIsMeetingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>
              Pick a date and time before the event day. Event day and later dates are blocked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <DateCalendar
              mode="single"
              selected={meetingDate}
              onSelect={setMeetingDate}
              disabled={(date) => {
                const day = startOfDay(date)
                if (day < todayStart) return true
                if (eventDayStart && day >= eventDayStart) return true
                return false
              }}
            />
            <div className="space-y-2">
              <Label htmlFor="meeting-time">Meeting time</Label>
              <Input
                id="meeting-time"
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsMeetingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleMeeting} disabled={!meetingDate || scheduleMeetingMutation.isPending}>
              {scheduleMeetingMutation.isPending ? 'Scheduling...' : 'Save Meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCancelDialogOpen}
        onOpenChange={(open) => {
          setIsCancelDialogOpen(open)
          if (!open) {
            setCancellationReason('')
            setCancellationReasonError('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Request</DialogTitle>
            <DialogDescription>
              Provide a reason for canceling this resident event request. This will be visible in the resident app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancellation-reason">
              Reason for cancellation <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cancellation-reason"
              value={cancellationReason}
              onChange={(e) => {
                setCancellationReason(e.target.value)
                if (cancellationReasonError && e.target.value.trim()) {
                  setCancellationReasonError('')
                }
              }}
              placeholder="Enter reason for cancellation"
              rows={4}
            />
            {cancellationReasonError && <p className="text-xs text-red-600">{cancellationReasonError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={cancelRequestMutation.isPending}
            >
              Back
            </Button>
            <Button variant="destructive" onClick={handleCancelRequest} disabled={cancelRequestMutation.isPending}>
              {cancelRequestMutation.isPending ? 'Canceling...' : 'Confirm Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EventsListPage
