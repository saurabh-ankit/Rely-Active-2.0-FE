import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mic, RotateCcw, Square, Trash2, Upload } from 'lucide-react'
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

const getSupportedAudioMimeType = () => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return ''
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return ''
}

const formatRecordingTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [photos, setPhotos] = useState<File[]>([])
  const [voiceNote, setVoiceNote] = useState<File | null>(null)
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([])
  const [removeVoiceNote, setRemoveVoiceNote] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  const audioPreviewUrl = useMemo(() => {
    if (!voiceNote) return null
    return URL.createObjectURL(voiceNote)
  }, [voiceNote])

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl)
      }
    }
  }, [audioPreviewUrl])

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.stop()
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.stop()
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null
      }
      setIsRecording(false)
      setRecordingSeconds(0)
    }
    onOpenChange(nextOpen)
  }

  const startRecording = async () => {
    setFileError(null)
    if (!navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setFileError('Audio recording is not supported in this browser.')
      return
    }

    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.stop()
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordingStreamRef.current = stream

      const mimeType = getSupportedAudioMimeType()
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {}
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const resolvedType = mediaRecorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(audioChunksRef.current, { type: resolvedType })
        const extension = resolvedType.includes('mp4') ? 'mp4' : resolvedType.includes('ogg') ? 'ogg' : 'webm'
        const audioFile = new File([blob], `incident_voice_${Date.now()}.${extension}`, {
          type: resolvedType,
        })

        if (audioFile.size > MAX_FILE_BYTES) {
          setFileError('Recorded voice note exceeds the 10MB limit')
        } else {
          setVoiceNote(audioFile)
          setRemoveVoiceNote(false)
        }

        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach((track) => track.stop())
          recordingStreamRef.current = null
        }
        setIsRecording(false)
        setRecordingSeconds(0)
      }

      mediaRecorder.start(250)
      setIsRecording(true)
      setRecordingSeconds(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    } catch (err: unknown) {
      console.error('Microphone error:', err)
      const errName = (err as { name?: string })?.name
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setFileError('Microphone permission was denied. Please allow microphone access in your browser.')
      } else {
        setFileError('Unable to access microphone. Please check your audio settings.')
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null
      }
      setIsRecording(false)
      setRecordingSeconds(0)
    }
  }

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const cancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop())
      recordingStreamRef.current = null
    }
    audioChunksRef.current = []
    setIsRecording(false)
    setRecordingSeconds(0)
  }

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
    cancelRecording()
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

            {isRecording ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3 animate-in fade-in dark:border-rose-900/50 dark:bg-rose-950/20">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-600" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-rose-900 dark:text-rose-200">Recording audio...</span>
                    <span className="font-mono text-[11px] text-rose-700 dark:text-rose-300">
                      {formatRecordingTime(recordingSeconds)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={cancelRecording}
                    className="h-8 px-2.5 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={stopRecording}
                    className="h-8 gap-1.5 bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 shadow-xs cursor-pointer"
                  >
                    <Square className="h-3 w-3 fill-white" />
                    Stop ({formatRecordingTime(recordingSeconds)})
                  </Button>
                </div>
              </div>
            ) : voiceNote ? (
              <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 min-w-0">
                    <Mic className="h-4 w-4 text-[#005390] shrink-0" />
                    <span className="truncate">{voiceNote.name}</span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      ({(voiceNote.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={startRecording}
                      className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300"
                      title="Record new voice note to replace"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Re-record
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setVoiceNote(null)}
                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50"
                      aria-label="Remove voice note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {audioPreviewUrl && (
                  <audio controls preload="metadata" src={audioPreviewUrl} className="h-9 w-full">
                    <track kind="captions" />
                  </audio>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={startRecording}
                  className="gap-2 text-[#005390] border-blue-200 hover:bg-blue-50 hover:text-[#004273]"
                >
                  <Mic className="h-4 w-4 text-[#005390]" />
                  {keptExistingVoiceNotes.length > 0 ? 'Record replacement voice note' : 'Add voice note'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => voiceInputRef.current?.click()}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  or upload audio file
                </Button>
              </div>
            )}
          </div>

          {fileError && <p className="text-xs text-red-500">{fileError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || isRecording}
              className="bg-[#005390] hover:bg-[#004a80] text-white"
            >
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
