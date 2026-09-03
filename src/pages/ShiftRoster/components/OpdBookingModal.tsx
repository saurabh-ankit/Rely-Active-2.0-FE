import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useBookOpdSlot, useCancelOpdBooking, useGetOpdSlots } from '@/hooks/react-query/rosterManagement'
import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

interface OpdBookingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dateId: string
  dutyLabel?: string
  locationId?: string
}

interface ResidentOption {
  id: string
  label: string
}

export function OpdBookingModal({ open, onOpenChange, dateId, dutyLabel, locationId }: OpdBookingModalProps) {
  const { data: slotsResponse, isLoading } = useGetOpdSlots(dateId, { enabled: open && !!dateId })
  const bookMutation = useBookOpdSlot()
  const cancelMutation = useCancelOpdBooking()

  const [residents, setResidents] = useState<ResidentOption[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [selectedResidentId, setSelectedResidentId] = useState('')
  const [notes, setNotes] = useState('')

  const slots = slotsResponse?.data || []

  useEffect(() => {
    if (!open) return
    const fetchResidents = async () => {
      try {
        const url = locationId ? API_ENDPOINTS.modules.residents(locationId) : API_ENDPOINTS.resident.getAll
        const res = await api.get(url)
        const list = (res.data?.data || res.data || []) as Array<{
          id: string
          firstName?: string
          lastName?: string
          residentCode?: string
        }>
        setResidents(
          list.map((r) => ({
            id: r.id,
            label: `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.residentCode || r.id,
          })),
        )
      } catch {
        setResidents([])
      }
    }
    fetchResidents()
  }, [open, locationId])

  const handleBook = async () => {
    if (!selectedSlotId || !selectedResidentId) return
    const slot = slots.find((s: { id: string }) => s.id === selectedSlotId)
    if (slot?.status === 'FULL' || slot?.status === 'BLOCKED') return
    await bookMutation.mutateAsync({
      slotId: selectedSlotId,
      payload: { residentId: selectedResidentId, notes: notes || undefined },
    })
    setSelectedSlotId('')
    setSelectedResidentId('')
    setNotes('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>OPD Slot Booking</DialogTitle>
          <DialogDescription>{dutyLabel || 'Book residents into available consultation slots.'}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading slots...</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No OPD slots generated for this session.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {slots.map(
                (slot: {
                  id: string
                  slotNumber: number
                  scheduledStart: string
                  scheduledEnd: string
                  bookedCount: number
                  maxCapacity: number
                  status: string
                }) => {
                  const isDisabled = slot.status === 'FULL' || slot.status === 'BLOCKED' || slot.status === 'CANCELLED'
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                        selectedSlotId === slot.id ? 'border-primary bg-primary/5' : 'border-border'
                      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span>
                        Slot {slot.slotNumber}:{' '}
                        {new Date(slot.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                        {new Date(slot.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Badge variant={slot.status === 'FULL' ? 'destructive' : 'secondary'}>
                        {slot.bookedCount}/{slot.maxCapacity} · {slot.status}
                      </Badge>
                    </button>
                  )
                },
              )}
            </div>

            <div className="grid gap-2">
              <Label>Resident</Label>
              <Select value={selectedResidentId} onValueChange={setSelectedResidentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resident" />
                </SelectTrigger>
                <SelectContent>
                  {residents.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional booking notes" />
            </div>

            {selectedSlotId && (
              <div className="rounded-md border p-3 space-y-2">
                <p className="text-sm font-medium">Existing bookings</p>
                {(slots.find((s: { id: string }) => s.id === selectedSlotId)?.bookings || []).map(
                  (b: { id: string; resident?: { firstName?: string; lastName?: string }; residentId: string }) => (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <span>
                        {b.resident?.firstName ? `${b.resident.firstName} ${b.resident.lastName || ''}` : b.residentId}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          cancelMutation.mutate({ bookingId: b.id, cancelledReason: 'Cancelled from roster UI' })
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleBook} disabled={!selectedSlotId || !selectedResidentId || bookMutation.isPending}>
            Book Slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
