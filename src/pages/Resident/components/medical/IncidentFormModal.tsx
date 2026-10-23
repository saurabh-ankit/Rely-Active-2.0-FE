import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mic, Trash2, Upload } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateResidentIncidentMutation, useUpdateResidentIncidentMutation } from '@/hooks/react-query/resident'
import {
  INCIDENT_SEVERITY_OPTIONS,
  INCIDENT_TYPE_OPTIONS,
  IncidentSeverity,
  IncidentType,
} from '@/lib/constants/incident'
import type { ResidentIncidentItem } from '@/lib/types/resident'
import { getFileUrl } from '@/lib/utils'
import {
  fromDateTimeInputValue,
  isNotFutureDateTimeInput,
  isValidDateTimeInput,
  toDateTimeInputValue,
} from './clinicalFormUtils'
import { ImagePreviewLightbox } from './ImagePreviewLightbox'

const MAX_PHOTOS = 5
const MAX_FILE_BYTES = 10 * 1024 * 1024

const incidentSchema = z.object({
  incidentType: z.enum([
    IncidentType.FALL_INJURY,
    IncidentType.SKIN_WOUND,
    IncidentType.BEHAVIOR,
    IncidentType.ENV_TEMP,
    IncidentType.BATHROOM,
    IncidentType.REFUSAL,
    IncidentType.OTHER,
  ]),
  severity: z.enum([IncidentSeverity.LOW, IncidentSeverity.MODERATE, IncidentSeverity.HIGH, IncidentSeverity.CRITICAL]),
  incidentAt: z
    .string()
    .refine(isValidDateTimeInput, 'Incident date and time is required')
    .refine(isNotFutureDateTimeInput, 'Incident time cannot be in the future'),
  notes: z.string().trim().max(5000, 'Notes must be 5000 characters or fewer'),
})

type IncidentFormValues = z.infer<typeof incidentSchema>

interface IncidentFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  item?: ResidentIncidentItem | null
}

const IncidentFormModal = ({ open, onOpenChange, residentId, item }: IncidentFormModalProps) => {
  const createMutation = useCreateResidentIncidentMutation(residentId)
  const updateMutation = useUpdateResidentIncidentMutation(residentId)
  const isPending = createMutation.isPending || updateMutation.isPending
  const isEdit = !!item
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const voiceInputRef = useRef<HTMLInputElement | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [voiceNote, setVoiceNote] = useState<File | null>(null)
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([])
  const [removeVoiceNote, setRemoveVoiceNote] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      incidentType: item?.incidentType ?? IncidentType.FALL_INJURY,
      severity: item?.severity ?? IncidentSeverity.LOW,
      incidentAt: toDateTimeInputValue(item?.incidentAt),
      notes: item?.notes ?? '',
    },
  })

  const keptExistingPhotos = (item?.photos ?? []).filter((photo) => !removedPhotoIds.includes(photo.id))
  const keptExistingVoiceNotes = removeVoiceNote || voiceNote ? [] : (item?.voiceNotes ?? [])
  const maxNewPhotos = Math.max(0, MAX_PHOTOS - keptExistingPhotos.length)
  const remainingPhotoSlots = Math.max(0, maxNewPhotos - photos.length)
  const hasExistingMedia = isEdit && item && (keptExistingPhotos.length > 0 || keptExistingVoiceNotes.length > 0)

  const onPhotosSelected = (files: FileList | null) => {
    if (!files?.length) return
    setFileError(null)
    const next: File[] = [...photos]
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setFileError('Photos must be image files')
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        setFileError('Each file must be 10MB or smaller')
        continue
      }
      if (next.length >= maxNewPhotos) break
      next.push(file)
    }
    setPhotos(next.slice(0, maxNewPhotos))
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const onVoiceSelected = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setFileError(null)
    if (!file.type.startsWith('audio/') && file.type !== 'video/webm') {
      setFileError('Voice note must be an audio file')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError('Each file must be 10MB or smaller')
      return
    }
    setVoiceNote(file)
    setRemoveVoiceNote(false)
    if (voiceInputRef.current) voiceInputRef.current.value = ''
  }

  const onSubmit = (values: IncidentFormValues) => {
    setFileError(null)
    const formData = new FormData()
    formData.append('incidentType', values.incidentType)
    formData.append('severity', values.severity)
    formData.append('incidentAt', fromDateTimeInputValue(values.incidentAt))
    formData.append('notes', values.notes || '')
    photos.forEach((photo) => formData.append('photos', photo))
    if (voiceNote) formData.append('voiceNote', voiceNote)
    if (isEdit) {
      if (removedPhotoIds.length > 0) formData.append('removePhotoIds', removedPhotoIds.join(','))
      if (removeVoiceNote) formData.append('removeVoiceNote', 'true')
    }

    const onSuccess = () => onOpenChange(false)
    if (item) updateMutation.mutate({ id: item.id, payload: formData }, { onSuccess })
    else createMutation.mutate(formData, { onSuccess })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Incident' : 'Add Incident'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this incident record. You can remove existing media or add new files.'
              : 'Log an incident for this resident.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Controller
                control={control}
                name="incidentType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCIDENT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Controller
                control={control}
                name="severity"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCIDENT_SEVERITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="incident-at">
              Date & Time <span className="text-red-500">*</span>
            </Label>
            <Input id="incident-at" type="datetime-local" max={toDateTimeInputValue()} {...register('incidentAt')} />
            {errors.incidentAt && <p className="text-xs text-red-500">{errors.incidentAt.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="incident-notes">Notes</Label>
            <Textarea id="incident-notes" rows={3} placeholder="Optional notes" {...register('notes')} />
            {errors.notes && <p className="text-xs text-red-500">{errors.notes.message}</p>}
          </div>

          {hasExistingMedia && item && (
            <div className="space-y-2 rounded-xl border bg-slate-50 p-3 text-xs dark:bg-slate-800/40">
              <p className="font-semibold text-gray-700 dark:text-gray-200">Existing media</p>
              {keptExistingPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keptExistingPhotos.map((photo) => {
                    const url = getFileUrl(photo.url)
                    return (
                      <div key={photo.id} className="relative">
                        <button
                          type="button"
                          title={photo.name || 'View photo'}
                          onClick={() => setPreviewUrl(url)}
                          className="h-16 w-16 cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:ring-2 hover:ring-[#005390]/40 dark:border-gray-700"
                        >
                          <img src={url} alt={photo.name || 'Incident photo'} className="h-full w-full object-cover" />
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white p-0 shadow dark:bg-slate-900"
                          onClick={() => setRemovedPhotoIds((prev) => [...prev, photo.id])}
                          aria-label="Remove photo"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
              {keptExistingVoiceNotes.map((note) => (
                <div key={note.id} className="flex items-center gap-2">
                  <audio controls preload="none" src={getFileUrl(note.url)} className="h-9 min-w-0 flex-1">
                    <track kind="captions" />
                  </audio>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveVoiceNote(true)}
                    aria-label="Remove voice note"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Photos {remainingPhotoSlots > 0 ? `(up to ${remainingPhotoSlots} more)` : '(limit reached)'}</Label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={remainingPhotoSlots <= 0}
              onChange={(e) => onPhotosSelected(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={remainingPhotoSlots <= 0}
              onClick={() => photoInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Add photos
            </Button>
            {photos.length > 0 && (
              <ul className="space-y-1 text-xs text-gray-600">
                {photos.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label>Voice note</Label>
            <input
              ref={voiceInputRef}
              type="file"
              accept="audio/*,video/webm"
              className="hidden"
              onChange={(e) => onVoiceSelected(e.target.files)}
            />
            <Button type="button" variant="outline" onClick={() => voiceInputRef.current?.click()}>
              <Mic className="mr-2 h-4 w-4" />
              {voiceNote || keptExistingVoiceNotes.length > 0 ? 'Replace voice note' : 'Add voice note'}
            </Button>
            {voiceNote && (
              <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                <span className="truncate">{voiceNote.name}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setVoiceNote(null)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                </Button>
              </div>
            )}
          </div>

          {fileError && <p className="text-xs text-red-500">{fileError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#005390] hover:bg-[#004a80] text-white">
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>

      <ImagePreviewLightbox url={previewUrl} alt="Incident photo" onClose={() => setPreviewUrl(null)} />
    </Dialog>
  )
}

export default IncidentFormModal
