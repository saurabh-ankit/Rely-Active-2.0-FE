import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useBookAppointment } from '@/hooks/react-query/appointments'
import { useResidentsQuery } from '@/hooks/react-query/resident'
import type { AppointmentSlotDetail } from '@/lib/types/appointment'

interface BookAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shiftEmployeeDateId: string
  slots: AppointmentSlotDetail[]
}

export const BookAppointmentDialog = ({
  open,
  onOpenChange,
  shiftEmployeeDateId,
  slots,
}: BookAppointmentDialogProps) => {
  const [residentId, setResidentId] = useState('')
  const [slotTimeRange, setSlotTimeRange] = useState('')
  const [notes, setNotes] = useState('')

  const { data: residents = [] } = useResidentsQuery(undefined, open)
  const bookMutation = useBookAppointment()

  const availableSlots = useMemo(
    () => slots.filter((s) => s.isAvailable !== false && !s.isBooked && !s.isPast),
    [slots],
  )

  const handleSubmit = () => {
    if (!residentId || !slotTimeRange) return
    bookMutation.mutate(
      {
        shiftEmployeeDateId,
        data: {
          residentId,
          familyMemberId: null,
          slotTimeRange,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: () => {
          setResidentId('')
          setSlotTimeRange('')
          setNotes('')
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
          <DialogDescription>
            Assign a resident to an available slot. Family members book from their own app login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="book-resident">
              Resident <span className="text-rose-500">*</span>
            </Label>
            <Select value={residentId} onValueChange={setResidentId}>
              <SelectTrigger id="book-resident" className="mt-2 w-full">
                <SelectValue placeholder="Select resident" />
              </SelectTrigger>
              <SelectContent>
                {residents.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {`${r.firstName || ''} ${r.lastName || ''}`.trim() || r.username || r.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="book-slot">
              Available Slot <span className="text-rose-500">*</span>
            </Label>
            <Select value={slotTimeRange} onValueChange={setSlotTimeRange}>
              <SelectTrigger id="book-slot" className="mt-2 w-full">
                <SelectValue placeholder={availableSlots.length ? 'Select slot' : 'No slots available'} />
              </SelectTrigger>
              <SelectContent>
                {availableSlots.map((s) => (
                  <SelectItem key={s.slotTimeRange} value={s.slotTimeRange}>
                    {s.slotTimeRange}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="book-notes">Notes (Optional)</Label>
            <Textarea
              id="book-notes"
              className="mt-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!residentId || !slotTimeRange || bookMutation.isPending || availableSlots.length === 0}
            className="bg-[#005390] hover:bg-[#004070] text-white"
          >
            {bookMutation.isPending ? 'Booking...' : 'Book Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BookAppointmentDialog
