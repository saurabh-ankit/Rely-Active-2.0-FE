import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import PaginatedDataTable from '@/components/ui/paginated-data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EventsPermission } from '@/pages/Events/components/EventsPermission'
import { useBulkDeleteEvents, useDeleteEvent, useListEvents } from '@/hooks/react-query/events'
import type { Event } from '@/lib/services/eventService'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import { ArrowLeft, Calendar, MapPin, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDisplayDate } from '@/lib/utils/dateUtils'
import CreateEventModal from './components/CreateEventModal'

interface EventsListPageProps {
  embedded?: boolean
  enabled?: boolean
}

const EventsListPage = ({ embedded = false, enabled = true }: EventsListPageProps) => {
  const navigate = useNavigate()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [editEventId, setEditEventId] = useState<string | null>(null)

  const deleteEventMutation = useDeleteEvent()
  const bulkDeleteEventsMutation = useBulkDeleteEvents()

  const { data: eventsData, isLoading } = useListEvents({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: searchTerm || undefined,
    eventType: eventTypeFilter !== 'all' ? (eventTypeFilter as Event['eventType']) : undefined,
  })

  // Ensure events is always an array
  const events: Event[] = Array.isArray(eventsData?.data?.events)
    ? eventsData.data.events
    : Array.isArray(eventsData?.data?.records)
      ? eventsData.data.records
      : Array.isArray(eventsData?.data)
        ? eventsData.data
        : []
  const paginationInfo = eventsData?.data?.pagination

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
        const poster = row.getValue('poster') as string
        return (
          <div className="w-24 h-16 rounded-lg overflow-hidden">
            {poster ? (
              <img
                src={poster}
                alt={row.original.title}
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

      {embedded && selectedIds.length > 0 && (
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
          <PaginatedDataTable
            columns={columns}
            isDataLoading={isLoading}
            paginatedData={{
              pageSize: pagination.pageSize,
              pageIndex: pagination.pageIndex,
              totalRecords: paginationInfo?.total || events.length,
              data: events,
            }}
            pagination={pagination}
            setPagination={setPagination}
            sorting={[]}
            setSorting={() => {}}
          />
        </CardContent>
      </Card>

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
    </div>
  )
}

export default EventsListPage
