import { useState } from 'react'
import { XCircle } from 'lucide-react'
import apiClient from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { Ticket } from '@/lib/types'
import { notifyError, notifySuccess } from '@/utils/toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MAX_REASON = 1000

interface Props {
  ticket: Ticket
  locationId: string | null
  /** Name of the staff member working on it, to warn that it leaves their list. */
  assigneeName: string | null
  onClose: () => void
  /** Gets the ticket as saved (status CANCELLED, shown as Closed). */
  onSuccess: (updated: Partial<Ticket>) => void
}

/**
 * Closes an Open / In Progress ticket without completing it (raised by mistake, duplicate, …).
 * Mount it only while open.
 */
export function CloseTicketDialog({ ticket, locationId, assigneeName, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!reason.trim()) {
      notifyError('Add a reason for closing the ticket')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await apiClient.post(API_ENDPOINTS.tickets.close(ticket.id, locationId), { reason: reason.trim() })
      notifySuccess('Ticket closed')
      onSuccess((res.data?.data || {}) as Partial<Ticket>)
      onClose()
    } catch (err) {
      notifyError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not close the ticket',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center bg-gray-50/50 pr-12">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <XCircle className="w-5 h-5" />
            </div>
            <DialogHeader className="gap-0.5">
              <DialogTitle className="text-base font-bold text-gray-900">Close Ticket</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-mono">
                Ticket #{ticket.ticketNumber}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 text-xs text-rose-800 font-semibold space-y-1">
            <p>The ticket will be closed without being completed. It will not be billed or sent for feedback.</p>
            {assigneeName && <p>It will be removed from {assigneeName}&rsquo;s work list.</p>}
          </div>

          <div>
            <Label htmlFor="close-reason" className="block text-xs font-bold text-gray-700 mb-1">
              Reason for closing *
            </Label>
            <Textarea
              id="close-reason"
              rows={3}
              maxLength={MAX_REASON}
              placeholder="e.g. Raised by mistake, duplicate of another ticket"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium focus-visible:outline-none focus-visible:border-rose-400 resize-none"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border-none cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !reason.trim()}
              className="px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" /> {isSubmitting ? 'Closing...' : 'Close Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
