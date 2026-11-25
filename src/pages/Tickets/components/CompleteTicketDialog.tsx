import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ImagePlus, Mic, X } from 'lucide-react'
import apiClient from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { Ticket } from '@/lib/types'
import { notifyError, notifySuccess } from '@/utils/toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// Same limits the server (and the L3 app) applies
const MAX_PHOTOS = 10
const MAX_VOICE_NOTES = 5
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_NOTES = 2000

interface Props {
  isOpen: boolean
  ticket: Ticket | null
  locationId: string | null
  /** The admin is the assignee: completing closes the ticket straight away. */
  isSelf: boolean
  /** Name of the staff member the work is completed for (when not self). */
  assigneeName: string
  onClose: () => void
  /** Gets the ticket as saved (status CLOSED or RESOLVED). */
  onSuccess: (updated: Partial<Ticket>) => void
}

/** Collects the completion details staff enter in the L3 app: notes, invoice amount, photos, voice notes. */
export function CompleteTicketDialog({ isOpen, ticket, locationId, isSelf, assigneeName, onClose, onSuccess }: Props) {
  const [notes, setNotes] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [voiceNotes, setVoiceNotes] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Leave a fresh form for the next ticket
  const close = () => {
    setNotes('')
    setInvoiceAmount('')
    setPhotos([])
    setVoiceNotes([])
    onClose()
  }

  const photoPreviews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos])
  useEffect(() => () => photoPreviews.forEach((url) => URL.revokeObjectURL(url)), [photoPreviews])
  const voicePreviews = useMemo(() => voiceNotes.map((f) => URL.createObjectURL(f)), [voiceNotes])
  useEffect(() => () => voicePreviews.forEach((url) => URL.revokeObjectURL(url)), [voicePreviews])

  const addFiles = (
    picked: FileList | null,
    kind: 'image' | 'audio',
    current: File[],
    max: number,
    set: (files: File[]) => void,
  ) => {
    if (!picked) return
    const label = kind === 'image' ? 'photos' : 'voice notes'
    const next = [...current]
    for (const file of Array.from(picked)) {
      if (!file.type.startsWith(`${kind}/`)) {
        notifyError(`"${file.name}" is not ${kind === 'image' ? 'an image' : 'an audio file'}`)
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        notifyError(`"${file.name}" is larger than 10MB`)
        continue
      }
      if (next.length >= max) {
        notifyError(`You can add up to ${max} ${label}`)
        break
      }
      next.push(file)
    }
    set(next)
  }

  const closesTicket = isSelf
  const notStarted = Boolean(ticket && !ticket.workStartedAt)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket || isSubmitting) return
    if (!notes.trim()) {
      notifyError('Add resolution notes to complete the ticket')
      return
    }
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('notes', notes.trim())
      if (invoiceAmount.trim()) formData.append('invoiceAmount', invoiceAmount.trim())
      photos.forEach((f) => formData.append('photos', f))
      voiceNotes.forEach((f) => formData.append('voiceNotes', f))

      const res = await apiClient.post(API_ENDPOINTS.tickets.complete(ticket.id, locationId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      notifySuccess(closesTicket ? 'Ticket completed and closed' : 'Ticket marked as completed')
      onSuccess((res.data?.data || {}) as Partial<Ticket>)
      close()
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not complete the ticket'
      notifyError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={Boolean(isOpen && ticket)}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) close()
      }}
    >
      {isOpen && ticket && (
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center bg-gray-50/50 pr-12">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-[#005390]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <DialogHeader className="gap-0.5">
                <DialogTitle className="text-base font-bold text-gray-900">Complete Ticket</DialogTitle>
                <DialogDescription className="text-xs text-gray-500 font-mono">
                  Ticket #{ticket.ticketNumber}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-[#005390] font-semibold space-y-1">
              {isSelf ? (
                <p>You are completing your own ticket. It will be closed once you submit.</p>
              ) : (
                <p>
                  You are completing this ticket on behalf of {assigneeName}. It will then wait for Verify &amp; Close.
                </p>
              )}
              {notStarted && <p>Work was not started yet, so it will be marked as started now.</p>}
            </div>

            <div>
              <Label htmlFor="complete-notes" className="block text-xs font-bold text-gray-700 mb-1">
                Resolution Notes *
              </Label>
              <Textarea
                id="complete-notes"
                rows={3}
                maxLength={MAX_NOTES}
                placeholder="What was done to fix the issue?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium focus-visible:outline-none focus-visible:border-[#005390] resize-none"
              />
            </div>

            <div>
              <Label htmlFor="complete-invoice" className="block text-xs font-bold text-gray-700 mb-1">
                Invoice Amount (₹)
              </Label>
              <Input
                id="complete-invoice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium"
              />
            </div>

            {/* Photos */}
            <div>
              <span className="block text-xs font-bold text-gray-700 mb-1">
                Photos ({photos.length}/{MAX_PHOTOS})
              </span>
              <div className="flex flex-wrap gap-2">
                {photoPreviews.map((url, i) => (
                  <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt={photos[i]?.name || 'Photo'} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 rounded-full bg-black/60 text-white p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <Label
                    htmlFor="complete-photos"
                    className="w-16 h-16 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-0.5 text-[10px] text-gray-500 font-semibold cursor-pointer hover:bg-gray-100"
                  >
                    <ImagePlus className="w-4 h-4 text-[#005390]" />
                    Add
                  </Label>
                )}
                <input
                  id="complete-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files, 'image', photos, MAX_PHOTOS, setPhotos)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>

            {/* Voice notes */}
            <div>
              <span className="block text-xs font-bold text-gray-700 mb-1">
                Voice Notes ({voiceNotes.length}/{MAX_VOICE_NOTES})
              </span>
              <div className="space-y-2">
                {voiceNotes.map((file, i) => (
                  <div
                    key={voicePreviews[i]}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2"
                  >
                    <audio controls src={voicePreviews[i]} className="h-8 flex-1 min-w-0">
                      <track kind="captions" />
                    </audio>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => setVoiceNotes((prev) => prev.filter((_, idx) => idx !== i))}
                      className="rounded-full p-1 text-gray-500 hover:bg-gray-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {voiceNotes.length < MAX_VOICE_NOTES && (
                  <Label
                    htmlFor="complete-voice"
                    className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-xs text-gray-600 font-semibold cursor-pointer hover:bg-gray-100"
                  >
                    <Mic className="w-4 h-4 text-[#005390]" />
                    Upload audio file
                  </Label>
                )}
                <input
                  id="complete-voice"
                  type="file"
                  accept="audio/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files, 'audio', voiceNotes, MAX_VOICE_NOTES, setVoiceNotes)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={close}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border-none cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !notes.trim()}
                className="px-5 bg-[#005390] hover:bg-[#004273] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  'Saving...'
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> {closesTicket ? 'Complete & Close' : 'Mark Completed'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
