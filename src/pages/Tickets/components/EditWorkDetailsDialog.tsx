import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Lock, Mic, Pencil, X } from 'lucide-react'
import apiClient from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { Ticket } from '@/lib/types'
import { notifyError, notifySuccess } from '@/utils/toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SaveButton } from '@/components/common/SaveButton'
import { useSavedFlash } from '@/hooks/useSavedFlash'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// Same limits the server (and the Complete Ticket dialog) applies
const MAX_PHOTOS = 10
const MAX_VOICE_NOTES = 5
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_NOTES = 2000

/** File URLs saved in the ticket's work details (the editable ones). */
function getWorkFileUrls(ticket: Ticket | null, field: 'photos' | 'voiceNotes'): string[] {
  if (!ticket) return []
  let atts: unknown = ticket.attachments
  if (typeof atts === 'string') {
    try {
      atts = JSON.parse(atts)
    } catch {
      return []
    }
  }
  const files = (atts as { workDetails?: Record<string, unknown> } | null)?.workDetails?.[field]
  if (!Array.isArray(files)) return []
  return files
    .map((f) => (typeof f === 'string' ? f : (f as { url?: unknown })?.url))
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
}

const RemoveButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className="absolute top-0.5 right-0.5 rounded-full bg-black/60 text-white p-0.5 cursor-pointer"
  >
    <X className="w-3 h-3" />
  </button>
)

interface Props {
  isOpen: boolean
  ticket: Ticket | null
  locationId: string | null
  onClose: () => void
  /** Gets the ticket as saved. */
  onSuccess: (updated: Partial<Ticket>) => void
}

/**
 * Lets an admin correct a completed ticket's report: the same fields as Complete Ticket
 * (notes, invoice amount, photos, voice notes). Mount it only while open.
 */
export function EditWorkDetailsDialog({ isOpen, ticket, locationId, onClose, onSuccess }: Props) {
  const savedPhotos = useMemo(() => getWorkFileUrls(ticket, 'photos'), [ticket])
  const savedVoiceNotes = useMemo(() => getWorkFileUrls(ticket, 'voiceNotes'), [ticket])
  const savedNotes = ticket?.resolutionNotes || ''
  const savedAmount =
    ticket?.invoiceAmount === null || ticket?.invoiceAmount === undefined ? '' : String(ticket.invoiceAmount)

  const [notes, setNotes] = useState(savedNotes)
  const [amount, setAmount] = useState(savedAmount)
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([])
  const [addedPhotos, setAddedPhotos] = useState<File[]>([])
  const [removedVoice, setRemovedVoice] = useState<string[]>([])
  const [addedVoice, setAddedVoice] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { saved, flashSaved } = useSavedFlash()

  const photoPreviews = useMemo(() => addedPhotos.map((f) => URL.createObjectURL(f)), [addedPhotos])
  useEffect(() => () => photoPreviews.forEach((url) => URL.revokeObjectURL(url)), [photoPreviews])
  const voicePreviews = useMemo(() => addedVoice.map((f) => URL.createObjectURL(f)), [addedVoice])
  useEffect(() => () => voicePreviews.forEach((url) => URL.revokeObjectURL(url)), [voicePreviews])

  const keptPhotos = savedPhotos.filter((url) => !removedPhotos.includes(url))
  const keptVoice = savedVoiceNotes.filter((url) => !removedVoice.includes(url))
  const photoCount = keptPhotos.length + addedPhotos.length
  const voiceCount = keptVoice.length + addedVoice.length

  // Billed on a resident invoice: the amount is locked, the rest can still be fixed
  const amountLocked = Boolean(ticket?.isInvoiced)
  const notesChanged = notes.trim() !== savedNotes.trim()
  const amountChanged = !amountLocked && amount.trim() !== savedAmount
  const hasChanges =
    notesChanged ||
    amountChanged ||
    removedPhotos.length > 0 ||
    addedPhotos.length > 0 ||
    removedVoice.length > 0 ||
    addedVoice.length > 0

  const addFiles = (
    picked: FileList | null,
    kind: 'image' | 'audio',
    keptCount: number,
    current: File[],
    max: number,
    set: (files: File[]) => void,
  ) => {
    if (!picked) return
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
      if (keptCount + next.length >= max) {
        notifyError(`A ticket can have up to ${max} ${kind === 'image' ? 'photos' : 'voice notes'}`)
        break
      }
      next.push(file)
    }
    set(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket || isSubmitting || !hasChanges) return
    if (!notes.trim()) {
      notifyError('Resolution notes cannot be empty')
      return
    }
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      if (notesChanged) formData.append('notes', notes.trim())
      if (amountChanged) formData.append('invoiceAmount', amount.trim())
      removedPhotos.forEach((url) => formData.append('removePhotoUrls', url))
      removedVoice.forEach((url) => formData.append('removeVoiceNoteUrls', url))
      addedPhotos.forEach((f) => formData.append('photos', f))
      addedVoice.forEach((f) => formData.append('voiceNotes', f))

      const res = await apiClient.patch(API_ENDPOINTS.tickets.editWorkDetails(ticket.id, locationId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      notifySuccess('Work details updated')
      const updated = (res.data?.data || {}) as Partial<Ticket>
      // ✓ Saved on the button for a moment, then update the ticket and close
      flashSaved(() => {
        onSuccess(updated)
        onClose()
      })
    } catch (err) {
      notifyError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not update the work details',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={Boolean(isOpen && ticket)}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose()
      }}
    >
      {isOpen && ticket && (
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center bg-gray-50/50 pr-12">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-[#005390]">
                <Pencil className="w-5 h-5" />
              </div>
              <DialogHeader className="gap-0.5">
                <DialogTitle className="text-base font-bold text-gray-900">Edit Work Details</DialogTitle>
                <DialogDescription className="text-xs text-gray-500 font-mono">
                  Ticket #{ticket.ticketNumber}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            <div>
              <Label htmlFor="edit-notes" className="block text-xs font-bold text-gray-700 mb-1">
                Resolution Notes *
              </Label>
              <Textarea
                id="edit-notes"
                rows={3}
                maxLength={MAX_NOTES}
                placeholder="What was done to fix the issue?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-medium focus-visible:outline-none focus-visible:border-[#005390] resize-none"
              />
            </div>

            <div>
              <Label htmlFor="edit-invoice" className="block text-xs font-bold text-gray-700 mb-1">
                Invoice Amount (₹)
              </Label>
              <Input
                id="edit-invoice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                disabled={amountLocked}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {amountLocked ? (
                <p className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> An invoice has been generated for this ticket, so the amount is locked.
                </p>
              ) : (
                <p className="text-[10px] text-gray-500 mt-1">Leave blank to remove the amount.</p>
              )}
            </div>

            {/* Photos */}
            <div>
              <span className="block text-xs font-bold text-gray-700 mb-1">
                Photos ({photoCount}/{MAX_PHOTOS})
              </span>
              <div className="flex flex-wrap gap-2">
                {keptPhotos.map((url) => (
                  <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt="Work completion" className="w-full h-full object-cover" />
                    <RemoveButton label="Remove photo" onClick={() => setRemovedPhotos((prev) => [...prev, url])} />
                  </div>
                ))}
                {photoPreviews.map((url, i) => (
                  <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-[#005390]/40">
                    <img src={url} alt={addedPhotos[i]?.name || 'New photo'} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-[#005390]/80 text-white text-[9px] font-bold text-center">
                      New
                    </span>
                    <RemoveButton
                      label="Remove new photo"
                      onClick={() => setAddedPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    />
                  </div>
                ))}
                {photoCount < MAX_PHOTOS && (
                  <Label
                    htmlFor="edit-photos"
                    className="w-16 h-16 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-0.5 text-[10px] text-gray-500 font-semibold cursor-pointer hover:bg-gray-100"
                  >
                    <ImagePlus className="w-4 h-4 text-[#005390]" />
                    Add
                  </Label>
                )}
                <input
                  id="edit-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files, 'image', keptPhotos.length, addedPhotos, MAX_PHOTOS, setAddedPhotos)
                    e.target.value = ''
                  }}
                />
              </div>
              {removedPhotos.length > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setRemovedPhotos([])}
                  className="text-[#005390] text-[11px] font-bold p-0 h-auto mt-1 cursor-pointer"
                >
                  Undo removing {removedPhotos.length} photo
                  {removedPhotos.length > 1 ? 's' : ''}
                </Button>
              )}
            </div>

            {/* Voice notes */}
            <div>
              <span className="block text-xs font-bold text-gray-700 mb-1">
                Voice Notes ({voiceCount}/{MAX_VOICE_NOTES})
              </span>
              <div className="space-y-2">
                {keptVoice.map((url) => (
                  <div key={url} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
                    <audio controls src={url} preload="metadata" className="h-8 flex-1 min-w-0">
                      <track kind="captions" />
                    </audio>
                    <button
                      type="button"
                      aria-label="Remove voice note"
                      onClick={() => setRemovedVoice((prev) => [...prev, url])}
                      className="rounded-full p-1 text-gray-500 hover:bg-gray-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {voicePreviews.map((url, i) => (
                  <div
                    key={url}
                    className="flex items-center gap-2 rounded-xl border-2 border-[#005390]/30 bg-blue-50/40 p-2"
                  >
                    <span className="text-[9px] font-bold text-white bg-[#005390]/80 rounded px-1.5 py-0.5">New</span>
                    <audio controls src={url} className="h-8 flex-1 min-w-0">
                      <track kind="captions" />
                    </audio>
                    <button
                      type="button"
                      aria-label={`Remove ${addedVoice[i]?.name || 'new voice note'}`}
                      onClick={() => setAddedVoice((prev) => prev.filter((_, idx) => idx !== i))}
                      className="rounded-full p-1 text-gray-500 hover:bg-gray-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {voiceCount < MAX_VOICE_NOTES && (
                  <Label
                    htmlFor="edit-voice"
                    className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-xs text-gray-600 font-semibold cursor-pointer hover:bg-gray-100"
                  >
                    <Mic className="w-4 h-4 text-[#005390]" />
                    Upload audio file
                  </Label>
                )}
                <input
                  id="edit-voice"
                  type="file"
                  accept="audio/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files, 'audio', keptVoice.length, addedVoice, MAX_VOICE_NOTES, setAddedVoice)
                    e.target.value = ''
                  }}
                />
              </div>
              {removedVoice.length > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setRemovedVoice([])}
                  className="text-[#005390] text-[11px] font-bold p-0 h-auto mt-1 cursor-pointer"
                >
                  Undo removing {removedVoice.length} voice note
                  {removedVoice.length > 1 ? 's' : ''}
                </Button>
              )}
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
              <SaveButton
                type="submit"
                size="sm"
                saving={isSubmitting}
                saved={saved}
                disabled={!hasChanges || !notes.trim()}
                className="gap-1.5 px-5 bg-[#005390] hover:bg-[#004273] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </SaveButton>
            </div>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}
